// lib/pattern-analyzer.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface TradeEntry {
  id: string
  ticker: string
  action: '매수' | '매도'
  price: number
  quantity: number
  total_amount: number
  date: string
  note: string | null
  followed_signal?: boolean | null
  followed_stop_loss?: boolean | null
  exit_reason?: string | null
  emotion_at_entry?: string | null
  created_at: string
}

export interface PatternInsights {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  avgWinPercent: number
  avgLossPercent: number

  // 신호 추종 패턴
  signalFollowedTrades: number
  signalNotFollowedTrades: number
  signalFollowedWinRate: number
  signalNotFollowedWinRate: number

  // 손절 준수 패턴
  stopLossFollowedTrades: number
  stopLossNotFollowedTrades: number
  stopLossFollowedAvgLoss: number
  stopLossNotFollowedAvgLoss: number

  // 퇴출 이유 분석
  exitReasons: Record<string, { count: number; winRate: number }>

  // 감정 패턴
  emotionPatterns: Record<string, { count: number; winRate: number; avgReturn: number }>

  // 최고/최악 거래
  bestTrade: { ticker: string; return: number; date: string } | null
  worstTrade: { ticker: string; return: number; date: string } | null
}

interface TickerTrades {
  buys: TradeEntry[]
  sells: TradeEntry[]
}

export async function analyzePatterns(): Promise<PatternInsights> {
  const { data } = await supabase
    .from('trade_journal')
    .select('*')
    .order('date', { ascending: true })

  const entries = (data || []) as TradeEntry[]

  // 티커별로 매수/매도 그룹화
  const byTicker: Record<string, TickerTrades> = {}
  entries.forEach(e => {
    if (!byTicker[e.ticker]) {
      byTicker[e.ticker] = { buys: [], sells: [] }
    }
    if (e.action === '매수') byTicker[e.ticker].buys.push(e)
    else byTicker[e.ticker].sells.push(e)
  })

  // 거래 쌍 매칭 (FIFO)
  const tradePairs: Array<{
    buy: TradeEntry
    sell: TradeEntry
    returnPct: number
    profit: number
  }> = []

  Object.values(byTicker).forEach(ticker => {
    const buys = [...ticker.buys]
    const sells = [...ticker.sells]

    sells.forEach(sell => {
      if (buys.length === 0) return

      let remainingQty = sell.quantity
      while (remainingQty > 0 && buys.length > 0) {
        const buy = buys[0]
        const matchQty = Math.min(remainingQty, buy.quantity)

        const buyAmount = buy.price * matchQty
        const sellAmount = sell.price * matchQty
        const profit = sellAmount - buyAmount
        const returnPct = (profit / buyAmount) * 100

        tradePairs.push({
          buy: { ...buy, quantity: matchQty },
          sell: { ...sell, quantity: matchQty },
          returnPct,
          profit,
        })

        buy.quantity -= matchQty
        if (buy.quantity <= 0) buys.shift()
        remainingQty -= matchQty
      }
    })
  })

  // 기본 통계
  const totalTrades = tradePairs.length
  const winningTrades = tradePairs.filter(p => p.returnPct > 0).length
  const losingTrades = tradePairs.filter(p => p.returnPct < 0).length
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

  const wins = tradePairs.filter(p => p.returnPct > 0)
  const losses = tradePairs.filter(p => p.returnPct < 0)
  const avgWinPercent = wins.length > 0
    ? wins.reduce((s, p) => s + p.returnPct, 0) / wins.length
    : 0
  const avgLossPercent = losses.length > 0
    ? Math.abs(losses.reduce((s, p) => s + p.returnPct, 0) / losses.length)
    : 0

  // 신호 추종 패턴
  const signalFollowed = tradePairs.filter(p => p.buy.followed_signal === true)
  const signalNotFollowed = tradePairs.filter(p => p.buy.followed_signal === false)
  const signalFollowedWinRate = signalFollowed.length > 0
    ? (signalFollowed.filter(p => p.returnPct > 0).length / signalFollowed.length) * 100
    : 0
  const signalNotFollowedWinRate = signalNotFollowed.length > 0
    ? (signalNotFollowed.filter(p => p.returnPct > 0).length / signalNotFollowed.length) * 100
    : 0

  // 손절 준수 패턴
  const stopLossFollowed = tradePairs.filter(p => p.sell.followed_stop_loss === true && p.returnPct < 0)
  const stopLossNotFollowed = tradePairs.filter(p => p.sell.followed_stop_loss === false && p.returnPct < 0)
  const stopLossFollowedAvgLoss = stopLossFollowed.length > 0
    ? Math.abs(stopLossFollowed.reduce((s, p) => s + p.returnPct, 0) / stopLossFollowed.length)
    : 0
  const stopLossNotFollowedAvgLoss = stopLossNotFollowed.length > 0
    ? Math.abs(stopLossNotFollowed.reduce((s, p) => s + p.returnPct, 0) / stopLossNotFollowed.length)
    : 0

  // 퇴출 이유 분석
  const exitReasons: Record<string, { count: number; wins: number }> = {}
  tradePairs.forEach(p => {
    const reason = p.sell.exit_reason || '미기재'
    if (!exitReasons[reason]) exitReasons[reason] = { count: 0, wins: 0 }
    exitReasons[reason].count++
    if (p.returnPct > 0) exitReasons[reason].wins++
  })
  const exitReasonsResult: Record<string, { count: number; winRate: number }> = {}
  Object.entries(exitReasons).forEach(([reason, data]) => {
    exitReasonsResult[reason] = {
      count: data.count,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    }
  })

  // 감정 패턴
  const emotionPatterns: Record<string, { count: number; wins: number; totalReturn: number }> = {}
  tradePairs.forEach(p => {
    const emotion = p.buy.emotion_at_entry || '미기재'
    if (!emotionPatterns[emotion]) emotionPatterns[emotion] = { count: 0, wins: 0, totalReturn: 0 }
    emotionPatterns[emotion].count++
    if (p.returnPct > 0) emotionPatterns[emotion].wins++
    emotionPatterns[emotion].totalReturn += p.returnPct
  })
  const emotionPatternsResult: Record<string, { count: number; winRate: number; avgReturn: number }> = {}
  Object.entries(emotionPatterns).forEach(([emotion, data]) => {
    emotionPatternsResult[emotion] = {
      count: data.count,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      avgReturn: data.count > 0 ? data.totalReturn / data.count : 0,
    }
  })

  // 최고/최악 거래
  const sortedByReturn = [...tradePairs].sort((a, b) => b.returnPct - a.returnPct)
  const bestTrade = sortedByReturn.length > 0
    ? { ticker: sortedByReturn[0].buy.ticker, return: sortedByReturn[0].returnPct, date: sortedByReturn[0].sell.date }
    : null
  const worstTrade = sortedByReturn.length > 0
    ? { ticker: sortedByReturn[sortedByReturn.length - 1].buy.ticker, return: sortedByReturn[sortedByReturn.length - 1].returnPct, date: sortedByReturn[sortedByReturn.length - 1].sell.date }
    : null

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    avgWinPercent,
    avgLossPercent,
    signalFollowedTrades: signalFollowed.length,
    signalNotFollowedTrades: signalNotFollowed.length,
    signalFollowedWinRate,
    signalNotFollowedWinRate,
    stopLossFollowedTrades: stopLossFollowed.length,
    stopLossNotFollowedTrades: stopLossNotFollowed.length,
    stopLossFollowedAvgLoss,
    stopLossNotFollowedAvgLoss,
    exitReasons: exitReasonsResult,
    emotionPatterns: emotionPatternsResult,
    bestTrade,
    worstTrade,
  }
}
