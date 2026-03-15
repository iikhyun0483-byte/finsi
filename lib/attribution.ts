// lib/attribution.ts
// "이 수익이 어느 신호에서 났는가"
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 전략명 정규화 (대문자 + 공백 제거)
function normalizeStrategy(strategy: string): string {
  return strategy.trim().toUpperCase().replace(/\s+/g, '_')
}

// 포지션 종료 시 귀속 기록
export async function recordAttribution(data: {
  signalId:     string | null
  symbol:       string
  entryPrice:   number
  exitPrice:    number
  quantity:     number
  strategy:     string
  entryDate:    string  // 추가: 진입 날짜 (ISO string)
  factorScores?: Record<string, number>
}): Promise<void> {
  // 입력 검증
  if (!data.symbol || data.symbol.trim() === '') {
    throw new Error('종목 심볼은 필수입니다')
  }
  if (data.entryPrice <= 0) {
    throw new Error('진입 가격은 0보다 커야 합니다')
  }
  if (data.exitPrice <= 0) {
    throw new Error('청산 가격은 0보다 커야 합니다')
  }
  if (data.quantity <= 0) {
    throw new Error('수량은 0보다 커야 합니다')
  }
  if (!data.strategy || data.strategy.trim() === '') {
    throw new Error('전략명은 필수입니다')
  }

  // PnL 계산
  const pnl      = (data.exitPrice - data.entryPrice) * data.quantity
  const pnlPct   = (data.exitPrice - data.entryPrice) / data.entryPrice

  // 보유 기간 계산 (일 단위)
  const entryTime = new Date(data.entryDate).getTime()
  const exitTime  = Date.now()
  const holdingDays = Math.round((exitTime - entryTime) / 86400000)

  const { error } = await supabase.from('attribution_log').insert({
    signal_id:     data.signalId,
    symbol:        data.symbol.toUpperCase(),
    entry_price:   data.entryPrice,
    exit_price:    data.exitPrice,
    quantity:      data.quantity,
    pnl,
    pnl_pct:       pnlPct,
    strategy:      normalizeStrategy(data.strategy),
    factor_scores: data.factorScores ?? {},
    holding_days:  holdingDays >= 0 ? holdingDays : 0,
    closed_at:     new Date().toISOString(),
  })

  if (error) {
    console.error('❌ Failed to record attribution:', error)
    throw new Error(`Attribution 기록 실패: ${error.message}`)
  }

  console.log(`✅ Attribution recorded: ${data.symbol} ${data.strategy} PnL=${pnl.toLocaleString()}원`)
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
