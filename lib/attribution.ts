// lib/attribution.ts
// "이 수익이 어느 신호에서 났는가"
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 포지션 종료 시 귀속 기록
export async function recordAttribution(data: {
  signalId:    string | null
  symbol:      string
  entryPrice:  number
  exitPrice:   number
  quantity:    number
  strategy:    string
  factorScores?: Record<string, number>
}): Promise<void> {
  const pnl      = (data.exitPrice - data.entryPrice) * data.quantity
  const pnlPct   = (data.exitPrice - data.entryPrice) / data.entryPrice

  await supabase.from('attribution_log').insert({
    signal_id:    data.signalId,
    symbol:       data.symbol,
    entry_price:  data.entryPrice,
    exit_price:   data.exitPrice,
    pnl,
    pnl_pct:      pnlPct,
    strategy:     data.strategy,
    factor_scores: data.factorScores ?? {},
    closed_at:    new Date().toISOString(),
  })
}

// 전략별 성과 요약
export async function getAttributionSummary(): Promise<Array<{
  strategy:   string
  tradeCount: number
  totalPnl:   number
  avgPnlPct:  number
  winRate:    number
}>> {
  const { data } = await supabase
    .from('attribution_log')
    .select('strategy, pnl, pnl_pct')
    .not('pnl', 'is', null)

  if (!data || data.length === 0) return []

  const byStrategy: Record<string, typeof data> = {}
  for (const d of data) {
    const s = d.strategy ?? 'UNKNOWN'
    if (!byStrategy[s]) byStrategy[s] = []
    byStrategy[s].push(d)
  }

  return Object.entries(byStrategy).map(([strategy, trades]) => ({
    strategy,
    tradeCount: trades.length,
    totalPnl:   trades.reduce((s, t) => s + (t.pnl ?? 0), 0),
    avgPnlPct:  trades.reduce((s, t) => s + (t.pnl_pct ?? 0), 0) / trades.length,
    winRate:    trades.filter(t => (t.pnl ?? 0) > 0).length / trades.length,
  })).sort((a, b) => b.totalPnl - a.totalPnl)
}
