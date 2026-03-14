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
  if (!FRED_API_KEY || FRED_API_KEY === 'your_api_key') {
    console.warn(`⚠️ FRED_API_KEY not configured, skipping ${series}`)
    return null
  }

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${FRED_API_KEY}&sort_order=desc&limit=1&file_type=json`
    const res  = await fetch(url, { next: { revalidate: 3600 } })

    if (!res.ok) {
      console.warn(`⚠️ FRED API error for ${series}: ${res.status}`)
      return null
    }

    const data = await res.json()
    const val  = data.observations?.[0]?.value
    const result = val && val !== '.' ? Number(val) : null

    if (result !== null) {
      console.log(`✅ FRED ${series}: ${result}`)
    }

    return result
  } catch (e) {
    console.warn(`⚠️ Failed to fetch FRED ${series}:`, e)
    return null
  }
}

// VIX 조회 (Yahoo Finance)
async function fetchVIX(): Promise<number | null> {
  try {
    const res  = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d')

    if (!res.ok) {
      console.warn(`⚠️ Yahoo Finance VIX error: ${res.status}`)
      return null
    }

    const data = await res.json()
    const vix = data.chart?.result?.[0]?.meta?.regularMarketPrice ?? null

    if (vix !== null) {
      console.log(`✅ VIX: ${vix.toFixed(2)}`)
    }

    return vix
  } catch (e) {
    console.warn('⚠️ Failed to fetch VIX:', e)
    return null
  }
}

// 달러 인덱스 (DXY)
async function fetchDXY(): Promise<number | null> {
  try {
    const res  = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=1d')

    if (!res.ok) {
      console.warn(`⚠️ Yahoo Finance DXY error: ${res.status}`)
      return null
    }

    const data = await res.json()
    const dxy = data.chart?.result?.[0]?.meta?.regularMarketPrice ?? null

    if (dxy !== null) {
      console.log(`✅ DXY: ${dxy.toFixed(2)}`)
    }

    return dxy
  } catch (e) {
    console.warn('⚠️ Failed to fetch DXY:', e)
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
  console.log('📊 Starting macro indicators sync...')

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
    if (value === null) {
      console.warn(`⚠️ Skipping ${name} - no data`)
      continue
    }

    const signal = interpretMacro(name, value)
    results.push(signal)

    const { error: upsertError } = await supabase.from('macro_indicators').upsert({
      'indicator_type': name,
      '가치': value,
      '메타데이터': {
        signal: signal.signal,
        source: name === 'VIX' || name === 'DXY' ? 'Yahoo Finance' : 'FRED',
        impact: signal.impact
      }
    }, { onConflict: 'indicator_type' })

    if (upsertError) {
      console.error(`❌ Failed to save ${name} to DB:`, upsertError)
    } else {
      console.log(`✅ Saved ${name} to DB`)
    }
  }

  console.log(`✅ Macro sync completed: ${results.length} indicators`)
  return results
}

// 매크로 종합 리스크 점수 (0~100, 높을수록 리스크)
export async function getMacroRiskScore(): Promise<{
  score:   number
  signals: MacroSignal[]
  regime:  'CRISIS' | 'BEAR' | 'NEUTRAL' | 'BULL'
}> {
  console.log('📊 getMacroRiskScore: Querying DB...')

  const { data, error } = await supabase
    .from('macro_indicators')
    .select('*')

  if (error) {
    console.error('❌ getMacroRiskScore: DB query error:', error)
    return { score: 50, signals: [], regime: 'NEUTRAL' }
  }

  console.log('📊 getMacroRiskScore: DB returned', data?.length ?? 0, 'records')

  if (!data || data.length === 0) {
    console.warn('⚠️ getMacroRiskScore: No data found in DB')
    return { score: 50, signals: [], regime: 'NEUTRAL' }
  }

  // upsert with onConflict로 각 indicator당 1개 행만 존재하므로 모든 행 사용
  const latest: Record<string, number> = {}
  for (const d of data) {
    const indicatorType = d['indicator_type']
    const value = d['가치']
    latest[indicatorType] = value
    console.log(`📊 Indicator ${indicatorType}: ${value}`)
  }

  console.log('📊 Latest indicators:', Object.keys(latest))

  let riskScore = 0
  const signals: MacroSignal[] = []

  if (latest.VIX) {
    const s = interpretMacro('VIX', latest.VIX)
    signals.push(s)
    riskScore += s.signal === 'RISK_OFF' ? 30 : s.signal === 'RISK_ON' ? 0 : 15
  }
  if (latest.DXY) {
    const s = interpretMacro('DXY', latest.DXY)
    signals.push(s)
    riskScore += s.signal === 'RISK_OFF' ? 10 : 0
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
  if (latest.CPIAUCSL) {
    const s = interpretMacro('CPIAUCSL', latest.CPIAUCSL)
    signals.push(s)
    riskScore += s.signal === 'RISK_OFF' ? 10 : 0
  }

  const regime = riskScore >= 70 ? 'CRISIS' :
                 riskScore >= 45 ? 'BEAR'   :
                 riskScore >= 20 ? 'NEUTRAL' : 'BULL'

  console.log(`📊 getMacroRiskScore: Returning ${signals.length} signals, score=${riskScore}, regime=${regime}`)

  return { score: Math.min(riskScore, 100), signals, regime }
}
