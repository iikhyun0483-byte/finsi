// lib/macro-tracker.ts
// FRED API + Alternative.me + Yahoo Finance
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FRED_API_KEY = process.env.FRED_API_KEY!

interface MacroSignal {
  indicator: string
  value:     number
  signal:    'RISK_ON' | 'RISK_OFF' | 'NEUTRAL'
  impact:    string
}

// FRED 데이터 조회
async function fetchFRED(series: string): Promise<number | null> {
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${FRED_API_KEY}&sort_order=desc&limit=1&file_type=json`
    const res  = await fetch(url, { next: { revalidate: 3600 } })
    const data = await res.json()
    const val  = data.observations?.[0]?.value
    return val && val !== '.' ? Number(val) : null
  } catch {
    return null
  }
}

// VIX 조회 (Yahoo Finance)
async function fetchVIX(): Promise<number | null> {
  try {
    const res  = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d')
    const data = await res.json()
    return data.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
  } catch {
    return null
  }
}

// 달러 인덱스 (DXY)
async function fetchDXY(): Promise<number | null> {
  try {
    const res  = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=1d')
    const data = await res.json()
    return data.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
  } catch {
    return null
  }
}

// 매크로 신호 해석
function interpretMacro(indicator: string, value: number): MacroSignal {
  switch (indicator) {
    case 'VIX':
      return {
        indicator, value,
        signal: value >= 30 ? 'RISK_OFF' : value <= 15 ? 'RISK_ON' : 'NEUTRAL',
        impact: value >= 30
          ? `VIX ${value.toFixed(1)} — 공포 구간. 포지션 축소 권장`
          : value <= 15
          ? `VIX ${value.toFixed(1)} — 안정 구간. 레버리지 고려 가능`
          : `VIX ${value.toFixed(1)} — 중립`,
      }
    case 'DXY':
      return {
        indicator, value,
        signal: value >= 105 ? 'RISK_OFF' : value <= 95 ? 'RISK_ON' : 'NEUTRAL',
        impact: value >= 105
          ? '강달러 — 신흥국/원자재 약세 압력'
          : '약달러 — 신흥국/원자재 강세 유리',
      }
    case 'FEDFUNDS':
      return {
        indicator, value,
        signal: value >= 5 ? 'RISK_OFF' : value <= 2 ? 'RISK_ON' : 'NEUTRAL',
        impact: `연방기금금리 ${value.toFixed(2)}% — ${value >= 5 ? '고금리 환경. 성장주 밸류에이션 압박' : '저금리 환경. 리스크온 유리'}`,
      }
    case 'UNRATE':
      return {
        indicator, value,
        signal: value >= 5 ? 'RISK_OFF' : value <= 3.5 ? 'NEUTRAL' : 'NEUTRAL',
        impact: `실업률 ${value.toFixed(1)}% — ${value >= 5 ? '경기 침체 신호' : '고용 안정'}`,
      }
    case 'CPIAUCSL':
      return {
        indicator, value,
        signal: value >= 4 ? 'RISK_OFF' : 'NEUTRAL',
        impact: `CPI ${value.toFixed(1)}% — ${value >= 4 ? '고인플레이션. 금리인상 압력' : '인플레이션 안정'}`,
      }
    default:
      return { indicator, value, signal: 'NEUTRAL', impact: '' }
  }
}

// 전체 매크로 수집 + DB 저장
export async function syncMacroIndicators(): Promise<MacroSignal[]> {
  const fetches: Array<[string, Promise<number | null>]> = [
    ['VIX',       fetchVIX()],
    ['DXY',       fetchDXY()],
    ['FEDFUNDS',  fetchFRED('FEDFUNDS')],
    ['UNRATE',    fetchFRED('UNRATE')],
    ['CPIAUCSL',  fetchFRED('CPIAUCSL')],
    ['T10Y2Y',    fetchFRED('T10Y2Y')],   // 장단기 금리차 (경기침체 선행)
  ]

  const results: MacroSignal[] = []

  for (const [name, promise] of fetches) {
    const value = await promise
    if (value === null) continue

    const signal = interpretMacro(name, value)
    results.push(signal)

    await supabase.from('macro_indicators').upsert({
      indicator_name: name,
      value,
      signal:         signal.signal,
      source:         name === 'VIX' || name === 'DXY' ? 'Yahoo Finance' : 'FRED',
      recorded_at:    new Date().toISOString(),
    }, { onConflict: 'indicator_name' })
  }

  return results
}

// 매크로 종합 리스크 점수 (0~100, 높을수록 리스크)
export async function getMacroRiskScore(): Promise<{
  score:   number
  signals: MacroSignal[]
  regime:  'CRISIS' | 'BEAR' | 'NEUTRAL' | 'BULL'
}> {
  const { data } = await supabase
    .from('macro_indicators')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(20)

  if (!data || data.length === 0) {
    return { score: 50, signals: [], regime: 'NEUTRAL' }
  }

  // 최신 값만 추출
  const latest: Record<string, number> = {}
  for (const d of data) {
    if (!latest[d.indicator_name]) latest[d.indicator_name] = d.value
  }

  let riskScore = 0
  const signals: MacroSignal[] = []

  if (latest.VIX) {
    const s = interpretMacro('VIX', latest.VIX)
    signals.push(s)
    riskScore += s.signal === 'RISK_OFF' ? 30 : s.signal === 'RISK_ON' ? 0 : 15
  }
  if (latest.T10Y2Y !== undefined) {
    signals.push({
      indicator: 'T10Y2Y', value: latest.T10Y2Y,
      signal: latest.T10Y2Y < 0 ? 'RISK_OFF' : 'NEUTRAL',
      impact: latest.T10Y2Y < 0
        ? `장단기 금리차 역전 (${latest.T10Y2Y.toFixed(2)}%) — 경기침체 12~18개월 내 가능성`
        : `금리차 정상 (${latest.T10Y2Y.toFixed(2)}%)`,
    })
    riskScore += latest.T10Y2Y < 0 ? 25 : 0
  }
  if (latest.FEDFUNDS) {
    const s = interpretMacro('FEDFUNDS', latest.FEDFUNDS)
    signals.push(s)
    riskScore += s.signal === 'RISK_OFF' ? 20 : 0
  }
  if (latest.UNRATE) {
    const s = interpretMacro('UNRATE', latest.UNRATE)
    signals.push(s)
    riskScore += s.signal === 'RISK_OFF' ? 15 : 0
  }

  const regime = riskScore >= 70 ? 'CRISIS' :
                 riskScore >= 45 ? 'BEAR'   :
                 riskScore >= 20 ? 'NEUTRAL' : 'BULL'

  return { score: Math.min(riskScore, 100), signals, regime }
}
