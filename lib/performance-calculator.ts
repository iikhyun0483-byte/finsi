// lib/performance-calculator.ts
// 성과 계산 엔진 (샤프지수, MDD, 승률 등)

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface PerformanceMetrics {
  totalValue: number
  cash: number
  return1m: number
  return3m: number
  returnYtd: number
  sharpeRatio: number | null
  maxDd: number | null
  winRate: number | null
  tradeCount: number
}

// 샤프지수 계산 (연율화)
function calcSharpeRatio(returns: number[], riskFreeRate = 0.03): number {
  if (returns.length < 2) return 0

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((a, r) => a + Math.pow(r - avgReturn, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)

  if (stdDev === 0) return 0

  // 연율화 (일별 데이터 가정: 252 거래일)
  const annualizedReturn = avgReturn * 252
  const annualizedStdDev = stdDev * Math.sqrt(252)

  return annualizedStdDev > 0 ? (annualizedReturn - riskFreeRate) / annualizedStdDev : 0
}

// MDD (Maximum Drawdown) 계산
function calcMaxDrawdown(equityCurve: number[]): number {
  if (equityCurve.length < 2) return 0

  let maxDD = 0
  let peak = equityCurve[0]

  for (const value of equityCurve) {
    if (value > peak) peak = value
    const dd = peak > 0 ? (peak - value) / peak : 0
    if (dd > maxDD) maxDD = dd
  }

  return maxDD
}

// 기간별 수익률 계산
function calcPeriodReturn(
  trades: Array<{ executed_at: string; profit_loss: number }>,
  daysAgo: number
): number {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

  const periodTrades = trades.filter(t => new Date(t.executed_at) >= cutoffDate)

  if (periodTrades.length === 0) return 0

  const totalPnL = periodTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0)

  // 초기 자본 대비 수익률 (trade_history에 초기 자본 없으면 임시로 총 손익 기준)
  // 실제로는 balance API에서 총 자산을 가져와야 함
  return totalPnL
}

export async function calculatePerformance(): Promise<PerformanceMetrics> {
  try {
    // 1. trade_history에서 모든 거래 내역 조회
    const { data: trades } = await supabase
      .from('trade_history')
      .select('executed_at, profit_loss, action')
      .order('executed_at', { ascending: true })

    if (!trades || trades.length === 0) {
      // 거래 내역 없으면 기본값 반환
      return {
        totalValue: 0,
        cash: 0,
        return1m: 0,
        return3m: 0,
        returnYtd: 0,
        sharpeRatio: null,
        maxDd: null,
        winRate: null,
        tradeCount: 0,
      }
    }

    // 2. 총 거래 횟수
    const tradeCount = trades.length

    // 3. 수익률 계산 (1개월, 3개월, YTD)
    const return1m = calcPeriodReturn(trades, 30)
    const return3m = calcPeriodReturn(trades, 90)

    // YTD: 올해 1월 1일부터
    const yearStart = new Date(new Date().getFullYear(), 0, 1)
    const ytdTrades = trades.filter(t => new Date(t.executed_at) >= yearStart)
    const returnYtd = ytdTrades.reduce((sum, t) => sum + (t.profit_loss || 0), 0)

    // 4. 일별 수익률 계산 (샤프지수용)
    const dailyReturns: number[] = []
    const dailyPnL: { [date: string]: number } = {}

    trades.forEach(t => {
      const date = t.executed_at.slice(0, 10)
      dailyPnL[date] = (dailyPnL[date] || 0) + (t.profit_loss || 0)
    })

    Object.values(dailyPnL).forEach(pnl => {
      // 가정: 초기 자본 100,000,000원 (1억)
      const INITIAL_CAPITAL = 100_000_000
      dailyReturns.push(pnl / INITIAL_CAPITAL)
    })

    // 5. 샤프지수 계산
    const sharpeRatio = dailyReturns.length >= 30 ? calcSharpeRatio(dailyReturns) : null

    // 6. 자산 곡선 (Equity Curve) 생성 및 MDD 계산
    const equityCurve: number[] = []
    let cumulativePnL = 0

    Object.keys(dailyPnL)
      .sort()
      .forEach(date => {
        cumulativePnL += dailyPnL[date]
        equityCurve.push(cumulativePnL)
      })

    const maxDd = equityCurve.length >= 2 ? calcMaxDrawdown(equityCurve) : null

    // 7. 승률 계산 (수익 거래 / 총 거래)
    const winningTrades = trades.filter(t => (t.profit_loss || 0) > 0).length
    const winRate = tradeCount > 0 ? winningTrades / tradeCount : null

    // 8. 총 자산 = 누적 손익 + 초기 자본
    const INITIAL_CAPITAL = 100_000_000
    const totalPnL = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0)
    const totalValue = INITIAL_CAPITAL + totalPnL

    // 9. 현금 (임시로 총 자산의 일부로 가정, 실제로는 balance API 사용)
    const cash = totalValue * 0.3 // 30%를 현금으로 가정

    return {
      totalValue,
      cash,
      return1m: return1m / INITIAL_CAPITAL,
      return3m: return3m / INITIAL_CAPITAL,
      returnYtd: returnYtd / INITIAL_CAPITAL,
      sharpeRatio,
      maxDd,
      winRate,
      tradeCount,
    }
  } catch (error) {
    console.error('[Performance Calculator] Error:', error)
    throw error
  }
}
