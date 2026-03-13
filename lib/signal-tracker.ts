// lib/signal-tracker.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface SignalAccuracy {
  symbol: string
  totalSignals: number
  accuracy7d: number
  accuracy30d: number
  avgWin7d: number
  avgLoss7d: number
  expectedValue: number
  isStatisticallySignificant: boolean   // 30개 이상 여부
}

export async function recordSignal(
  symbol: string, signalType: 'BUY'|'SELL',
  signalScore: number, entryPrice: number,
  isBackfilled = false
) {
  const today = new Date().toISOString().split('T')[0]
  // UNIQUE constraint로 중복 삽입 방지
  await supabase.from('signal_tracking').upsert({
    symbol, signal_date: today,
    signal_type: signalType, signal_score: signalScore,
    entry_price: entryPrice, is_backfilled: isBackfilled,
  }, { onConflict: 'symbol,signal_date,signal_type', ignoreDuplicates: true })
}

export async function updateOutcomes(symbol: string, currentPrice: number) {
  const now = new Date()
  for (const days of [7, 30]) {
    const d = new Date(now)
    d.setDate(d.getDate() - days)
    const dateStr   = d.toISOString().split('T')[0]
    const priceCol  = `price_${days}d`
    const returnCol = `return_${days}d`
    const correctCol= `is_correct_${days}d`

    const { data } = await supabase.from('signal_tracking')
      .select('*').eq('symbol', symbol).eq('signal_date', dateStr).is(priceCol, null)

    for (const s of data ?? []) {
      const ret     = (currentPrice - s.entry_price) / s.entry_price
      const correct = s.signal_type === 'BUY' ? ret > 0 : ret < 0
      await supabase.from('signal_tracking').update({
        [priceCol]: currentPrice, [returnCol]: ret, [correctCol]: correct,
      }).eq('id', s.id)
    }
  }
}

export async function getAccuracy(symbol: string): Promise<SignalAccuracy | null> {
  const { data } = await supabase.from('signal_tracking')
    .select('*').eq('symbol', symbol).not('is_correct_7d', 'is', null)
    .order('signal_date', { ascending: false }).limit(200)

  if (!data || data.length === 0) return null

  const n          = data.length
  const correct7d  = data.filter(d => d.is_correct_7d).length
  const correct30d = data.filter(d => d.is_correct_30d).length
  const total30d   = data.filter(d => d.is_correct_30d !== null).length
  const wins   = data.filter(d => d.is_correct_7d  && d.return_7d != null)
  const losses = data.filter(d => !d.is_correct_7d && d.return_7d != null)
  const avgWin7d  = wins.length   ? wins.reduce((s,d)=>s+Math.abs(d.return_7d),0)/wins.length   : 0
  const avgLoss7d = losses.length ? losses.reduce((s,d)=>s+Math.abs(d.return_7d),0)/losses.length : 0
  const acc = correct7d / n
  const ev  = acc * avgWin7d - (1-acc) * avgLoss7d

  return {
    symbol, totalSignals: n,
    accuracy7d: acc,
    accuracy30d: total30d>0 ? correct30d/total30d : 0,
    avgWin7d, avgLoss7d, expectedValue: ev,
    isStatisticallySignificant: n >= 30,
  }
}

// 백필: 과거 가격 배열로 신호 소급 계산
// prices: [{ date, close, score, signalType }] — 신호 엔진에서 생성한 과거 신호 목록
export async function backfillSignals(
  symbol: string,
  historicalSignals: Array<{
    date: string
    entryPrice: number
    signalType: 'BUY'|'SELL'
    signalScore: number
    price7dLater?: number
    price30dLater?: number
  }>
) {
  for (const sig of historicalSignals) {
    const ret7d  = sig.price7dLater  ? (sig.price7dLater  - sig.entryPrice) / sig.entryPrice : null
    const ret30d = sig.price30dLater ? (sig.price30dLater - sig.entryPrice) / sig.entryPrice : null
    const ok7d   = ret7d  != null ? (sig.signalType==='BUY' ? ret7d>0  : ret7d<0)  : null
    const ok30d  = ret30d != null ? (sig.signalType==='BUY' ? ret30d>0 : ret30d<0) : null

    await supabase.from('signal_tracking').upsert({
      symbol, signal_date: sig.date,
      signal_type: sig.signalType, signal_score: sig.signalScore,
      entry_price: sig.entryPrice,
      price_7d: sig.price7dLater  ?? null, return_7d:  ret7d,  is_correct_7d:  ok7d,
      price_30d: sig.price30dLater ?? null, return_30d: ret30d, is_correct_30d: ok30d,
      is_backfilled: true,
    }, { onConflict: 'symbol,signal_date,signal_type', ignoreDuplicates: true })
  }
}
