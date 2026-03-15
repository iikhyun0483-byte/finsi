// lib/position-manager.ts
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

// Yahoo Finance로 가격 업데이트 (KIS 대체)
export async function updatePricesFromYahoo(): Promise<{ updated: number; failed: string[] }> {
  const { data: positions } = await supabase
    .from('open_positions')
    .select('symbol, quantity, avg_price')
    .eq('status', 'OPEN')

  if (!positions || positions.length === 0) {
    return { updated: 0, failed: [] }
  }

  let updated = 0
  const failed: string[] = []

  for (const pos of positions) {
    const price = await fetchYahooPrice(pos.symbol)

    if (price !== null) {
      const pnl = (price - pos.avg_price) * pos.quantity
      const pnlPct = (price - pos.avg_price) / pos.avg_price

      await supabase
        .from('open_positions')
        .update({
          current_price: price,
          unrealized_pnl: pnl,
          unrealized_pct: pnlPct,
          updated_at: new Date().toISOString()
        })
        .eq('symbol', pos.symbol)
      updated++
    } else {
      failed.push(pos.symbol)
    }
  }

  console.log(`✅ Yahoo price update: ${updated} updated, ${failed.length} failed`)
  return { updated, failed }
}

export interface OpenPosition {
  id:            string
  symbol:        string
  quantity:      number
  avgPrice:      number
  currentPrice:  number
  stopLoss:      number | null
  targetPrice:   number | null
  unrealizedPnl: number
  unrealizedPct: number
  status:        'OPEN' | 'STOPPED' | 'TARGETED' | 'CLOSED'
}

// KIS 잔고 → open_positions 동기화
export async function syncPositionsFromKIS(
  holdings: Array<{ symbol: string; quantity: number; currentPrice: number; avgPrice?: number }>
): Promise<void> {
  for (const h of holdings) {
    const avgPrice = h.avgPrice ?? h.currentPrice
    const pnl      = (h.currentPrice - avgPrice) * h.quantity
    const pnlPct   = avgPrice > 0 ? (h.currentPrice - avgPrice) / avgPrice : 0

    await supabase.from('open_positions').upsert({
      symbol:         h.symbol,
      quantity:       h.quantity,
      avg_price:      avgPrice,
      current_price:  h.currentPrice,
      unrealized_pnl: pnl,
      unrealized_pct: pnlPct,
      status:         'OPEN',
    }, { onConflict: 'symbol' })
  }

  // KIS에 없는 포지션은 CLOSED 처리
  const { data: existing } = await supabase
    .from('open_positions')
    .select('symbol')
    .eq('status', 'OPEN')

  const kisSymbols = new Set(holdings.map(h => h.symbol))
  const toClose    = (existing ?? []).filter(p => !kisSymbols.has(p.symbol))

  for (const p of toClose) {
    await supabase.from('open_positions')
      .update({ status: 'CLOSED' })
      .eq('symbol', p.symbol)
  }
}

// 손절/목표가 설정
export async function setStopAndTarget(
  symbol:      string,
  stopLoss:    number,
  targetPrice: number
): Promise<void> {
  await supabase.from('open_positions')
    .update({ stop_loss: stopLoss, target_price: targetPrice })
    .eq('symbol', symbol)
}

// 손절/목표가 체크 — 자동매매 활성화 시 자동 청산 트리거
export async function checkStopLossAndTarget(
  currentPrices: Record<string, number>
): Promise<Array<{ symbol: string; action: 'STOP' | 'TARGET'; price: number }>> {
  const { data: positions } = await supabase
    .from('open_positions')
    .select('*')
    .eq('status', 'OPEN')

  const triggers: Array<{ symbol: string; action: 'STOP' | 'TARGET'; price: number }> = []

  for (const pos of positions ?? []) {
    const price = currentPrices[pos.symbol]
    if (!price) continue

    // 현재가 업데이트
    const pnlPct = (price - pos.avg_price) / pos.avg_price
    await supabase.from('open_positions')
      .update({
        current_price:  price,
        unrealized_pnl: (price - pos.avg_price) * pos.quantity,
        unrealized_pct: pnlPct,
      })
      .eq('symbol', pos.symbol)

    if (pos.stop_loss && price <= pos.stop_loss) {
      triggers.push({ symbol: pos.symbol, action: 'STOP', price })
      await supabase.from('open_positions')
        .update({ status: 'STOPPED' })
        .eq('symbol', pos.symbol)
    } else if (pos.target_price && price >= pos.target_price) {
      triggers.push({ symbol: pos.symbol, action: 'TARGET', price })
      await supabase.from('open_positions')
        .update({ status: 'TARGETED' })
        .eq('symbol', pos.symbol)
    }
  }

  return triggers
}

// 포트폴리오 전체 손익
export async function getPortfolioSummary(): Promise<{
  totalValue:    number
  totalCost:     number
  totalPnl:      number
  totalPnlPct:   number
  positions:     OpenPosition[]
}> {
  const { data } = await supabase
    .from('open_positions')
    .select('*')
    .eq('status', 'OPEN')
    .order('unrealized_pnl', { ascending: true })

  const positions = (data ?? []).map(p => ({
    id:            p.id,
    symbol:        p.symbol,
    quantity:      p.quantity,
    avgPrice:      p.avg_price,
    currentPrice:  p.current_price,
    stopLoss:      p.stop_loss,
    targetPrice:   p.target_price,
    unrealizedPnl: p.unrealized_pnl,
    unrealizedPct: p.unrealized_pct,
    status:        p.status,
  }))

  const totalCost  = positions.reduce((s, p) => s + p.avgPrice * p.quantity, 0)
  const totalValue = positions.reduce((s, p) => s + p.currentPrice * p.quantity, 0)
  const totalPnl   = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? totalPnl / totalCost : 0

  return { totalValue, totalCost, totalPnl, totalPnlPct, positions }
}
