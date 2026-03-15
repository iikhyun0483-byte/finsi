// lib/rebalancer.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Yahoo Finance에서 실시간 가격 조회
async function fetchYahooPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
    )

    if (!res.ok) {
      console.warn(`⚠️ Yahoo Finance price error for ${symbol}: ${res.status}`)
      return null
    }

    const data = await res.json()
    const price = data.chart?.result?.[0]?.meta?.regularMarketPrice ?? null

    if (price !== null) {
      console.log(`✅ ${symbol} price: $${price.toFixed(2)}`)
    }

    return price
  } catch (e) {
    console.warn(`⚠️ Failed to fetch price for ${symbol}:`, e)
    return null
  }
}

// open_positions의 current_price 업데이트
export async function updateCurrentPrices(): Promise<{ updated: number; failed: string[] }> {
  const { data: positions } = await supabase
    .from('open_positions')
    .select('id, symbol')
    .eq('status', 'OPEN')

  if (!positions || positions.length === 0) {
    return { updated: 0, failed: [] }
  }

  let updated = 0
  const failed: string[] = []

  for (const pos of positions) {
    const price = await fetchYahooPrice(pos.symbol)

    if (price !== null) {
      await supabase
        .from('open_positions')
        .update({
          current_price: price,
          updated_at: new Date().toISOString()
        })
        .eq('id', pos.id)
      updated++
    } else {
      failed.push(pos.symbol)
    }
  }

  console.log(`✅ Price update: ${updated} updated, ${failed.length} failed`)
  return { updated, failed }
}

interface RebalanceTrade {
  symbol:    string
  action:    'BUY' | 'SELL'
  amount:    number
  reason:    string
}

// 드리프트 계산 — 목표 비중 대비 현재 비중 차이
export async function calcDrift(
  targetWeights: Record<string, number>  // { 'SPY': 0.4, 'QQQ': 0.3, ... }
): Promise<{
  drift:        Record<string, { target: number; current: number; diff: number }>
  maxDrift:     number
  needsRebalance: boolean
}> {
  const { data: positions } = await supabase
    .from('open_positions')
    .select('symbol, current_price, quantity')
    .eq('status', 'OPEN')

  const totalValue = (positions ?? []).reduce(
    (s, p) => s + p.current_price * p.quantity, 0
  )
  if (totalValue === 0) return { drift: {}, maxDrift: 0, needsRebalance: false }

  const currentWeights: Record<string, number> = {}
  for (const p of positions ?? []) {
    currentWeights[p.symbol] = (p.current_price * p.quantity) / totalValue
  }

  const drift: Record<string, { target: number; current: number; diff: number }> = {}
  let maxDrift = 0

  for (const [sym, target] of Object.entries(targetWeights)) {
    const current = currentWeights[sym] ?? 0
    const diff    = Math.abs(target - current)
    drift[sym]    = { target, current, diff }
    maxDrift      = Math.max(maxDrift, diff)
  }

  return { drift, maxDrift, needsRebalance: maxDrift > 0.05 }
}

// 리밸런싱 거래 계산
export async function calcRebalanceTrades(
  targetWeights: Record<string, number>,
  totalPortfolioValue: number
): Promise<RebalanceTrade[]> {
  const { data: positions } = await supabase
    .from('open_positions')
    .select('symbol, current_price, quantity')
    .eq('status', 'OPEN')

  const currentValues: Record<string, number> = {}
  for (const p of positions ?? []) {
    currentValues[p.symbol] = p.current_price * p.quantity
  }

  const trades: RebalanceTrade[] = []
  for (const [sym, targetWeight] of Object.entries(targetWeights)) {
    const targetValue  = totalPortfolioValue * targetWeight
    const currentValue = currentValues[sym] ?? 0
    const diff         = targetValue - currentValue

    if (Math.abs(diff) < 10000) continue  // 1만원 미만 무시

    trades.push({
      symbol: sym,
      action: diff > 0 ? 'BUY' : 'SELL',
      amount: Math.abs(diff),
      reason: `목표 ${(targetWeight*100).toFixed(0)}% / 현재 ${((currentValue/totalPortfolioValue)*100).toFixed(0)}%`,
    })
  }

  return trades.sort((a, b) => b.amount - a.amount)
}

export async function logRebalance(
  before: Record<string, number>,
  after:  Record<string, number>,
  trades: RebalanceTrade[],
  driftScore: number
): Promise<void> {
  await supabase.from('rebalance_log').insert({
    rebalance_date: new Date().toISOString().slice(0,10),
    before_weights: before,
    after_weights:  after,
    trades_executed: trades,
    drift_score:    driftScore,
  })
}
