// lib/earnings-tracker.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface EarningsEvent {
  symbol:       string
  corpName:     string
  earningsDate: string
  estimateEps:  number | null
  actualEps:    number | null
  surprisePct:  number | null
  signal:       'BUY' | 'SELL' | 'HOLD' | 'UPCOMING' | null
}

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY

// Finnhub 실적 발표 캘린더
export async function fetchEarningsCalendar(
  from: string,  // YYYY-MM-DD
  to:   string
): Promise<EarningsEvent[]> {
  // API 키 검증
  if (!FINNHUB_API_KEY || FINNHUB_API_KEY === 'your_api_key') {
    console.warn('⚠️ FINNHUB_API_KEY not configured')
    throw new Error('FINNHUB_API_KEY가 설정되지 않았습니다. .env.local에 API 키를 추가하세요.')
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) {
      console.warn(`⚠️ Finnhub API error: ${res.status}`)
      if (res.status === 429) {
        throw new Error('Finnhub API Rate Limit 초과 (60 calls/min)')
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error('Finnhub API 키가 유효하지 않습니다')
      }
      throw new Error(`Finnhub API 오류 (${res.status})`)
    }

    const data = await res.json()
    return (data.earningsCalendar ?? []).slice(0, 50).map((e: Record<string, unknown>) => {
      const surprisePct = e.surprisePercent ? Number(e.surprisePercent) : null

      // 신호 생성 (BUY/SELL/HOLD로 통일)
      let signal: 'BUY' | 'SELL' | 'HOLD' | 'UPCOMING' = 'UPCOMING'
      if (e.epsActual && surprisePct !== null) {
        if (surprisePct > 5) signal = 'BUY'
        else if (surprisePct < -5) signal = 'SELL'
        else signal = 'HOLD'
      }

      return {
        symbol:       e.symbol as string,
        corpName:     e.company as string ?? e.symbol,
        earningsDate: e.date as string,
        estimateEps:  e.epsEstimate ? Number(e.epsEstimate) : null,
        actualEps:    e.epsActual   ? Number(e.epsActual)   : null,
        surprisePct,
        signal,
      }
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('FINNHUB_API_KEY')) {
      throw error
    }
    console.error('⚠️ Failed to fetch earnings calendar:', error)
    throw new Error('실적 캘린더 조회 실패')
  }
}

// EPS 서프라이즈 → 매매 신호
// 어닝 서프라이즈는 발표 직후 1~3일 모멘텀 지속 (Post Earnings Announcement Drift)
export function calcEarningsSignal(surprisePct: number): {
  action:   'BUY' | 'SELL' | 'HOLD'
  strength: number
  reason:   string
} {
  if (surprisePct > 15) return {
    action: 'BUY', strength: 0.85,
    reason: `어닝 서프라이즈 +${surprisePct.toFixed(1)}% — PEAD 효과로 3~5일 상승 지속 가능성`
  }
  if (surprisePct > 5) return {
    action: 'BUY', strength: 0.60,
    reason: `어닝 서프라이즈 +${surprisePct.toFixed(1)}% — 단기 모멘텀 양호`
  }
  if (surprisePct < -15) return {
    action: 'SELL', strength: 0.85,
    reason: `어닝 쇼크 ${surprisePct.toFixed(1)}% — 매도 압력 3~5일 지속 가능성`
  }
  if (surprisePct < -5) return {
    action: 'SELL', strength: 0.60,
    reason: `어닝 미스 ${surprisePct.toFixed(1)}% — 단기 하락 압력`
  }
  return { action: 'HOLD', strength: 0.2, reason: '컨센서스 부합 — 중립' }
}

// DB 저장 + 신호 생성
export async function syncEarnings(): Promise<EarningsEvent[]> {
  const today    = new Date().toISOString().slice(0,10)
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10)
  const events   = await fetchEarningsCalendar(today, nextWeek)

  for (const e of events) {
    await supabase.from('earnings_calendar').upsert({
      symbol:          e.symbol,
      corp_name:       e.corpName,
      earnings_date:   e.earningsDate,
      estimate_eps:    e.estimateEps,
      actual_eps:      e.actualEps,
      surprise_pct:    e.surprisePct,
      signal:          e.signal,
      updated_at:      new Date().toISOString(),
    }, { onConflict: 'symbol,earnings_date' })
  }
  return events
}
