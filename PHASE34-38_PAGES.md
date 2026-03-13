# FINSI PHASE 34~38 누락 페이지 완성
# 클로드 코드: "이 파일 읽고 전체 실행해줘. npm run build까지."

---

# PHASE 34 — 모의/실전 전환 (settings 수정)

## app/api/settings/route.ts (신규)

```typescript
// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')

  if (key) {
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', key)
      .single()
    return NextResponse.json({ value: data?.value ?? null })
  }

  const { data } = await supabase
    .from('system_config')
    .select('*')
    .order('key')
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const { key, value } = await req.json()
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key, value 필수' }, { status: 400 })
    }
    await supabase.from('system_config').upsert(
      { key, value: String(value), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

---

# PHASE 35 — 매크로 지표 페이지

## app/api/macro/route.ts (신규)

```typescript
// app/api/macro/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { syncMacroIndicators, getMacroRiskScore } from '@/lib/macro-tracker'

export async function GET(req: NextRequest) {
  const action = new URL(req.url).searchParams.get('action') ?? 'score'
  try {
    if (action === 'sync') {
      const signals = await syncMacroIndicators()
      return NextResponse.json({ signals })
    }
    if (action === 'score') {
      const result = await getMacroRiskScore()
      return NextResponse.json(result)
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

## app/macro/page.tsx (신규)

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'

interface MacroSignal {
  indicator: string
  value: number
  signal: string
  impact: string
}

interface MacroData {
  score: number
  signals: MacroSignal[]
  regime: 'CRISIS' | 'BEAR' | 'NEUTRAL' | 'BULL'
}

const REGIME_META = {
  CRISIS:  { label: '위기',   color: 'text-red-400',    bg: 'bg-red-900/20 border-red-700/40',       bar: 'bg-red-500' },
  BEAR:    { label: '약세장', color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-700/40', bar: 'bg-orange-500' },
  NEUTRAL: { label: '중립',   color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-700/40', bar: 'bg-yellow-500' },
  BULL:    { label: '강세장', color: 'text-green-400',  bg: 'bg-green-900/20 border-green-700/40',   bar: 'bg-green-500' },
}

const INDICATOR_LABEL: Record<string, string> = {
  VIX:      '공포지수 (VIX)',
  DXY:      '달러 인덱스 (DXY)',
  FEDFUNDS: '미국 기준금리',
  UNRATE:   '실업률',
  CPIAUCSL: 'CPI (소비자물가)',
  T10Y2Y:   '장단기 금리차 (경기침체 선행)',
}

const SIGNAL_COLOR: Record<string, string> = {
  RISK_OFF: 'text-red-400',
  RISK_ON:  'text-green-400',
  NEUTRAL:  'text-yellow-400',
}

const SIGNAL_BG: Record<string, string> = {
  RISK_OFF: 'bg-red-900/10 border-red-800/30',
  RISK_ON:  'bg-green-900/10 border-green-800/30',
  NEUTRAL:  'bg-gray-900 border-gray-800',
}

export default function MacroPage() {
  const [data,    setData]    = useState<MacroData | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/macro?action=score')
      const json = await res.json()
      if (json.score !== undefined) setData(json)
    } catch {}
    setLoading(false)
  }, [])

  const sync = async () => {
    setSyncing(true)
    try {
      await fetch('/api/macro?action=sync')
      setLastSync(new Date().toLocaleTimeString('ko-KR'))
      await load()
    } catch {}
    setSyncing(false)
  }

  useEffect(() => { load() }, [load])

  const meta = data ? REGIME_META[data.regime] : null

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">매크로 지표</h1>
            <p className="text-gray-500 text-sm mt-1">
              VIX · 달러 · 금리 · 고용 · 물가 — 실시간 리스크 점수
            </p>
          </div>
          <div className="text-right">
            <button
              onClick={sync}
              disabled={syncing}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm font-semibold"
            >
              {syncing ? '수집 중...' : '🔄 데이터 수집'}
            </button>
            {lastSync && (
              <p className="text-gray-600 text-xs mt-1">마지막: {lastSync}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-16">로딩 중...</div>
        ) : !data || data.signals.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-lg mb-2">데이터 없음</p>
            <p className="text-gray-600 text-sm mb-4">
              상단 버튼으로 매크로 데이터를 수집하세요
            </p>
            <button
              onClick={sync}
              disabled={syncing}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-xl text-sm font-semibold"
            >
              {syncing ? '수집 중...' : '지금 수집'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 종합 리스크 점수 */}
            <div className={`rounded-xl p-5 border ${meta?.bg}`}>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-gray-400 text-xs mb-1">매크로 리스크 점수</p>
                  <p className={`text-3xl font-bold ${meta?.color}`}>{meta?.label}</p>
                </div>
                <p className={`text-5xl font-bold ${meta?.color}`}>{data.score}</p>
              </div>
              <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${meta?.bar}`}
                  style={{ width: `${data.score}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>강세 (0)</span>
                <span>중립 (50)</span>
                <span>위기 (100)</span>
              </div>
            </div>

            {/* 개별 지표 */}
            <div className="space-y-2">
              {data.signals.map((s) => (
                <div
                  key={s.indicator}
                  className={`rounded-xl p-4 border ${SIGNAL_BG[s.signal] ?? 'bg-gray-900 border-gray-800'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">
                        {INDICATOR_LABEL[s.indicator] ?? s.indicator}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">{s.impact}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className={`font-bold text-lg ${SIGNAL_COLOR[s.signal] ?? 'text-gray-400'}`}>
                        {s.value.toFixed(2)}
                      </p>
                      <p className={`text-xs ${SIGNAL_COLOR[s.signal] ?? 'text-gray-500'}`}>
                        {s.signal === 'RISK_OFF' ? '위험' : s.signal === 'RISK_ON' ? '안전' : '중립'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 전략 가이드 */}
            <div className="bg-gray-900/50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
              <p className="text-orange-400 font-medium mb-2">매크로 → 전략 자동 연동</p>
              <p>VIX 30+ → 포지션 자동 50% 축소 권장</p>
              <p>장단기 금리차 역전 → 방어섹터 비중 증가</p>
              <p>강달러(105+) → 신흥국 ETF 제외</p>
              <p>극단 위기(80+) → 현금 비중 최대화</p>
              <p className="text-gray-700 mt-1">출처: FRED, Yahoo Finance (무료 API)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

# PHASE 36 — 실적 발표 페이지

## app/api/earnings/route.ts (신규)

```typescript
// app/api/earnings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncEarnings } from '@/lib/earnings-tracker'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? 'list'
  const symbol = searchParams.get('symbol')

  try {
    if (action === 'list') {
      const today = new Date().toISOString().slice(0, 10)
      let query = supabase
        .from('earnings_calendar')
        .select('*')
        .gte('earnings_date', today)
        .order('earnings_date', { ascending: true })
        .limit(50)
      if (symbol) query = query.eq('symbol', symbol)
      const { data } = await query
      return NextResponse.json({ data: data ?? [] })
    }

    if (action === 'recent') {
      // 최근 실적 발표 결과 (서프라이즈 포함)
      const { data } = await supabase
        .from('earnings_calendar')
        .select('*')
        .not('actual_eps', 'is', null)
        .order('earnings_date', { ascending: false })
        .limit(20)
      return NextResponse.json({ data: data ?? [] })
    }

    if (action === 'sync') {
      const events = await syncEarnings()
      return NextResponse.json({ synced: events.length })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

## app/earnings/page.tsx (신규)

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'

interface Earning {
  id: string
  symbol: string
  corp_name: string | null
  earnings_date: string
  estimate_eps: number | null
  actual_eps: number | null
  surprise_pct: number | null
  signal: string | null
}

function SurpriseTag({ pct }: { pct: number }) {
  const color =
    pct > 15 ? 'bg-green-600' :
    pct > 5  ? 'bg-green-800' :
    pct < -15 ? 'bg-red-600' :
    pct < -5  ? 'bg-red-800' : 'bg-gray-700'
  return (
    <span className={`${color} text-white text-xs px-2 py-0.5 rounded-full font-bold`}>
      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

function SignalBadge({ signal }: { signal: string | null }) {
  if (!signal || signal === 'UPCOMING') return (
    <span className="text-gray-500 text-xs">발표 예정</span>
  )
  const meta: Record<string, { color: string; label: string }> = {
    BUY:     { color: 'text-green-400', label: '매수' },
    SELL:    { color: 'text-red-400',   label: '매도' },
    HOLD:    { color: 'text-gray-400',  label: '중립' },
    BEAT:    { color: 'text-green-400', label: 'BEAT' },
    MISS:    { color: 'text-red-400',   label: 'MISS' },
    IN_LINE: { color: 'text-gray-400',  label: '부합' },
  }
  const m = meta[signal] ?? { color: 'text-gray-400', label: signal }
  return <span className={`text-xs font-bold ${m.color}`}>{m.label}</span>
}

export default function EarningsPage() {
  const [upcoming, setUpcoming] = useState<Earning[]>([])
  const [recent,   setRecent]   = useState<Earning[]>([])
  const [tab,      setTab]      = useState<'upcoming' | 'recent'>('upcoming')
  const [syncing,  setSyncing]  = useState(false)
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    const [u, r] = await Promise.all([
      fetch('/api/earnings?action=list').then(res => res.json()),
      fetch('/api/earnings?action=recent').then(res => res.json()),
    ])
    setUpcoming(u.data ?? [])
    setRecent(r.data ?? [])
    setLoading(false)
  }, [])

  const sync = async () => {
    setSyncing(true)
    await fetch('/api/earnings?action=sync')
    await load()
    setSyncing(false)
  }

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().slice(0, 10)
  const displayList = tab === 'upcoming' ? upcoming : recent

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">실적 발표 캘린더</h1>
            <p className="text-gray-500 text-sm mt-1">
              어닝 서프라이즈 → PEAD 매매 신호
            </p>
          </div>
          <button
            onClick={sync}
            disabled={syncing}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm font-semibold"
          >
            {syncing ? '수집 중...' : '🔄 동기화'}
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-4">
          {([['upcoming', '📅 예정'], ['recent', '📊 결과']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-16">로딩 중...</div>
        ) : displayList.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
            <p className="text-gray-400 mb-3">데이터 없음</p>
            <button
              onClick={sync}
              disabled={syncing}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm"
            >
              {syncing ? '수집 중...' : '동기화'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {displayList.map((e) => {
              const isToday = e.earnings_date === today
              const hasSurprise = e.surprise_pct !== null
              return (
                <div
                  key={e.id}
                  className={`rounded-xl p-4 border transition-colors ${
                    isToday
                      ? 'bg-orange-900/20 border-orange-700/40'
                      : hasSurprise && e.surprise_pct! > 5
                      ? 'bg-green-900/10 border-green-800/30'
                      : hasSurprise && e.surprise_pct! < -5
                      ? 'bg-red-900/10 border-red-800/30'
                      : 'bg-gray-900 border-gray-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-white">{e.symbol}</span>
                        {e.corp_name && (
                          <span className="text-gray-500 text-xs">{e.corp_name}</span>
                        )}
                        {isToday && (
                          <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                            오늘
                          </span>
                        )}
                        <SignalBadge signal={e.signal} />
                      </div>
                      <p className="text-gray-500 text-xs">{e.earnings_date}</p>
                      {hasSurprise && e.surprise_pct! > 5 && (
                        <p className="text-green-400 text-xs mt-1">
                          PEAD 효과 — 발표 후 3~5일 상승 모멘텀 가능성
                        </p>
                      )}
                      {hasSurprise && e.surprise_pct! < -5 && (
                        <p className="text-red-400 text-xs mt-1">
                          어닝 쇼크 — 발표 후 하락 압력 지속 가능성
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      {hasSurprise ? (
                        <div className="space-y-1">
                          <SurpriseTag pct={e.surprise_pct!} />
                          <p className="text-gray-500 text-xs">
                            예상 {e.estimate_eps?.toFixed(2) ?? '-'} / 실제 {e.actual_eps?.toFixed(2) ?? '-'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-xs">
                          예상 EPS<br />
                          <span className="text-white font-medium">
                            {e.estimate_eps?.toFixed(2) ?? '-'}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-4 bg-gray-900/50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
          <p className="text-orange-400 font-medium mb-1">PEAD (Post Earnings Announcement Drift)</p>
          <p>서프라이즈 +15%+ → 1~5일 평균 +4~8% 추가 상승</p>
          <p>쇼크 -15%- → 1~5일 평균 -5~10% 추가 하락</p>
          <p>진입 타이밍: 발표 당일 종가 또는 익일 시가</p>
          <p className="text-gray-700 mt-1">출처: Finnhub API</p>
        </div>
      </div>
    </div>
  )
}
```

---

# PHASE 37 — 수익 귀속 분석 페이지

## app/api/attribution/route.ts (신규)

```typescript
// app/api/attribution/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAttributionSummary, recordAttribution } from '@/lib/attribution'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const action = new URL(req.url).searchParams.get('action') ?? 'summary'
  try {
    if (action === 'summary') {
      const data = await getAttributionSummary()
      return NextResponse.json({ data })
    }
    if (action === 'detail') {
      const { data } = await supabase
        .from('attribution_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      return NextResponse.json({ data: data ?? [] })
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    await recordAttribution(body)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

## app/attribution/page.tsx (신규)

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'

interface Attribution {
  strategy: string
  tradeCount: number
  totalPnl: number
  avgPnlPct: number
  winRate: number
}

interface TradeDetail {
  id: string
  symbol: string
  strategy: string | null
  entry_price: number
  exit_price: number | null
  pnl: number | null
  pnl_pct: number | null
  holding_days: number | null
  closed_at: string | null
  created_at: string
}

export default function AttributionPage() {
  const [summary, setSummary] = useState<Attribution[]>([])
  const [detail,  setDetail]  = useState<TradeDetail[]>([])
  const [tab,     setTab]     = useState<'summary' | 'detail'>('summary')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [s, d] = await Promise.all([
      fetch('/api/attribution?action=summary').then(r => r.json()),
      fetch('/api/attribution?action=detail').then(r => r.json()),
    ])
    setSummary(s.data ?? [])
    setDetail(d.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const totalPnl  = summary.reduce((s, a) => s + a.totalPnl, 0)
  const bestStrat = summary[0]

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">수익 귀속 분석</h1>
          <p className="text-gray-500 text-sm mt-1">
            어떤 전략이 실제로 돈 벌었는가
          </p>
        </div>

        {/* 요약 카드 */}
        {summary.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-500 text-xs">총 실현 손익</p>
              <p className={`font-bold text-xl ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString()}원
              </p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-500 text-xs">전략 수</p>
              <p className="font-bold text-xl text-white">{summary.length}개</p>
            </div>
            {bestStrat && (
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-gray-500 text-xs">최고 전략</p>
                <p className="font-bold text-orange-400 text-sm truncate">{bestStrat.strategy}</p>
                <p className="text-green-400 text-xs">
                  +{bestStrat.totalPnl.toLocaleString()}원
                </p>
              </div>
            )}
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-2 mb-4">
          {([['summary', '전략별 요약'], ['detail', '거래 내역']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-16">로딩 중...</div>
        ) : tab === 'summary' ? (
          summary.length === 0 ? (
            <div className="bg-gray-900 rounded-xl p-12 text-center text-gray-500">
              <p>거래 종료 후 자동 집계됩니다</p>
              <p className="text-xs mt-2">포지션 청산 시 /api/attribution POST로 기록</p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.map((a) => (
                <div
                  key={a.strategy}
                  className={`rounded-xl p-5 border ${
                    a.totalPnl >= 0
                      ? 'bg-green-900/10 border-green-800/30'
                      : 'bg-red-900/10 border-red-800/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-white font-bold">{a.strategy}</p>
                    <span className={`text-xl font-bold ${a.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {a.totalPnl >= 0 ? '+' : ''}{a.totalPnl.toLocaleString()}원
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-black/20 rounded-lg p-2">
                      <p className="text-gray-500">거래 수</p>
                      <p className="text-white font-bold">{a.tradeCount}건</p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-2">
                      <p className="text-gray-500">평균 수익률</p>
                      <p className={`font-bold ${a.avgPnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(a.avgPnlPct * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-2">
                      <p className="text-gray-500">승률</p>
                      <p className={`font-bold ${a.winRate >= 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                        {(a.winRate * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  {/* 수익률 바 */}
                  <div className="mt-3">
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${a.winRate >= 0.5 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${a.winRate * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          detail.length === 0 ? (
            <div className="bg-gray-900 rounded-xl p-12 text-center text-gray-500">
              거래 내역 없음
            </div>
          ) : (
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800 text-left">
                      <th className="p-3 font-normal">종목</th>
                      <th className="p-3 font-normal">전략</th>
                      <th className="p-3 font-normal text-right">진입</th>
                      <th className="p-3 font-normal text-right">청산</th>
                      <th className="p-3 font-normal text-right">손익</th>
                      <th className="p-3 font-normal text-right">보유일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.map((d) => (
                      <tr key={d.id} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                        <td className="p-3 text-white font-medium">{d.symbol}</td>
                        <td className="p-3 text-gray-400">{d.strategy ?? '-'}</td>
                        <td className="p-3 text-right text-gray-300">
                          {d.entry_price.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-gray-300">
                          {d.exit_price?.toLocaleString() ?? '-'}
                        </td>
                        <td className={`p-3 text-right font-bold ${
                          (d.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {d.pnl != null
                            ? `${d.pnl >= 0 ? '+' : ''}${d.pnl.toLocaleString()}`
                            : '-'}
                        </td>
                        <td className="p-3 text-right text-gray-500">
                          {d.holding_days != null ? `${d.holding_days}일` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
```

---

# PHASE 38 — 포트폴리오 리밸런싱 페이지

## app/api/rebalance/route.ts (신규)

```typescript
// app/api/rebalance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcDrift, calcRebalanceTrades, logRebalance } from '@/lib/rebalancer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data } = await supabase
    .from('rebalance_log')
    .select('*')
    .order('rebalance_date', { ascending: false })
    .limit(10)
  return NextResponse.json({ history: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const { action, weights, totalValue } = await req.json()

    if (action === 'calc') {
      const tv = totalValue ?? 10_000_000
      const { drift, maxDrift, needsRebalance } = await calcDrift(weights)
      const trades = await calcRebalanceTrades(weights, tv)
      return NextResponse.json({ drift, maxDrift, needsRebalance, trades })
    }

    if (action === 'log') {
      const { before, after, trades, driftScore } = await req.json()
      await logRebalance(before, after, trades, driftScore)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

## app/rebalance/page.tsx (신규)

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'

interface Trade {
  symbol: string
  action: 'BUY' | 'SELL'
  amount: number
  reason: string
}

interface DriftItem {
  target: number
  current: number
  diff: number
}

interface RebalanceLog {
  id: string
  rebalance_date: string
  drift_score: number | null
  trades_executed: Trade[] | null
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  SPY: 0.40,
  QQQ: 0.20,
  AAPL: 0.15,
  MSFT: 0.15,
  NVDA: 0.10,
}

export default function RebalancePage() {
  const [weights,    setWeights]    = useState<Record<string, number>>(DEFAULT_WEIGHTS)
  const [newSymbol,  setNewSymbol]  = useState('')
  const [totalValue, setTotalValue] = useState(10_000_000)
  const [drift,      setDrift]      = useState<Record<string, DriftItem> | null>(null)
  const [maxDrift,   setMaxDrift]   = useState<number | null>(null)
  const [trades,     setTrades]     = useState<Trade[]>([])
  const [history,    setHistory]    = useState<RebalanceLog[]>([])
  const [loading,    setLoading]    = useState(false)

  const loadHistory = useCallback(async () => {
    const res = await fetch('/api/rebalance')
    const d   = await res.json()
    setHistory(d.history ?? [])
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0)
  const isValid     = Math.abs(totalWeight - 1) <= 0.01

  const calc = async () => {
    if (!isValid) return
    setLoading(true)
    const res  = await fetch('/api/rebalance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'calc', weights, totalValue }),
    })
    const data = await res.json()
    setDrift(data.drift ?? null)
    setMaxDrift(data.maxDrift ?? null)
    setTrades(data.trades ?? [])
    setLoading(false)
  }

  const addSymbol = () => {
    const sym = newSymbol.trim().toUpperCase()
    if (!sym || weights[sym] !== undefined) return
    setWeights(p => ({ ...p, [sym]: 0 }))
    setNewSymbol('')
  }

  const removeSymbol = (sym: string) => {
    setWeights(p => {
      const next = { ...p }
      delete next[sym]
      return next
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">포트폴리오 리밸런싱</h1>
          <p className="text-gray-500 text-sm mt-1">
            비중 드리프트 5% 이상 시 리밸런싱 권장
          </p>
        </div>

        {/* 비중 설정 */}
        <div className="bg-gray-900 rounded-xl p-5 mb-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-orange-400 font-semibold text-sm">목표 비중 설정</p>
            <span className={`text-sm font-bold ${isValid ? 'text-green-400' : 'text-red-400'}`}>
              합계 {(totalWeight * 100).toFixed(0)}%
              {!isValid && ' ⚠️ 100% 맞춰야 함'}
            </span>
          </div>

          <div className="space-y-3 mb-4">
            {Object.entries(weights).map(([sym, w]) => (
              <div key={sym} className="flex items-center gap-3">
                <span className="text-white text-sm font-medium w-14 shrink-0">{sym}</span>
                <input
                  type="range"
                  min={0} max={1} step={0.01}
                  value={w}
                  onChange={e => setWeights(p => ({ ...p, [sym]: Number(e.target.value) }))}
                  className="flex-1 accent-orange-500"
                />
                <span className="text-orange-400 text-sm w-10 text-right shrink-0">
                  {(w * 100).toFixed(0)}%
                </span>
                <button
                  onClick={() => removeSymbol(sym)}
                  className="text-gray-600 hover:text-red-400 text-xs shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* 종목 추가 */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="종목 추가 (예: TSLA)"
              value={newSymbol}
              onChange={e => setNewSymbol(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && addSymbol()}
              className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-white text-sm"
            />
            <button
              onClick={addSymbol}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
            >
              추가
            </button>
          </div>

          {/* 총 자산 */}
          <div className="mb-4">
            <p className="text-gray-500 text-xs mb-1">총 포트폴리오 금액 (원)</p>
            <input
              type="number"
              value={totalValue}
              onChange={e => setTotalValue(Number(e.target.value))}
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>

          <button
            onClick={calc}
            disabled={loading || !isValid}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-xl font-semibold text-sm"
          >
            {loading ? '계산 중...' : '리밸런싱 계산'}
          </button>
        </div>

        {/* 드리프트 현황 */}
        {maxDrift !== null && (
          <div className={`rounded-xl p-4 border mb-4 ${
            maxDrift > 0.05
              ? 'bg-orange-900/20 border-orange-700/40'
              : 'bg-green-900/10 border-green-800/30'
          }`}>
            <div className="flex justify-between items-center">
              <p className={`font-bold ${maxDrift > 0.05 ? 'text-orange-400' : 'text-green-400'}`}>
                최대 드리프트: {(maxDrift * 100).toFixed(1)}%
              </p>
              <span className={`text-sm ${maxDrift > 0.05 ? 'text-orange-300' : 'text-green-300'}`}>
                {maxDrift > 0.05 ? '리밸런싱 필요' : '정상 범위'}
              </span>
            </div>

            {drift && Object.entries(drift).length > 0 && (
              <div className="mt-3 space-y-1">
                {Object.entries(drift).map(([sym, d]) => (
                  <div key={sym} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 w-12">{sym}</span>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 bg-orange-500 rounded-full"
                        style={{ width: `${Math.min(d.current * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-gray-400 w-20 text-right">
                      {(d.current * 100).toFixed(1)}% / {(d.target * 100).toFixed(0)}%
                    </span>
                    <span className={`w-14 text-right font-bold ${
                      Math.abs(d.diff) > 0.05 ? 'text-orange-400' : 'text-gray-500'
                    }`}>
                      {d.diff >= 0 ? '+' : ''}{(d.diff * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 필요 거래 */}
        {trades.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4 mb-4">
            <p className="text-orange-400 font-semibold text-sm mb-3">
              필요 거래 ({trades.length}건)
            </p>
            <div className="space-y-2">
              {trades.map((t, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-3 flex justify-between items-center ${
                    t.action === 'BUY' ? 'bg-green-900/20' : 'bg-red-900/20'
                  }`}
                >
                  <div>
                    <span className={`font-bold text-sm ${
                      t.action === 'BUY' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {t.action === 'BUY' ? '매수' : '매도'} {t.symbol}
                    </span>
                    <p className="text-gray-500 text-xs mt-0.5">{t.reason}</p>
                  </div>
                  <span className="text-white font-bold text-sm">
                    {t.amount.toLocaleString()}원
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 리밸런싱 이력 */}
        {history.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-orange-400 font-semibold text-sm mb-3">리밸런싱 이력</p>
            {history.map((h) => (
              <div key={h.id} className="flex justify-between items-center py-2 border-b border-gray-800/40 text-xs">
                <span className="text-gray-400">{h.rebalance_date}</span>
                <span className="text-orange-400">
                  드리프트 {h.drift_score != null ? `${(h.drift_score * 100).toFixed(1)}%` : '-'}
                </span>
                <span className="text-gray-400">
                  {h.trades_executed ? `${(h.trades_executed as Trade[]).length}건 실행` : '-'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

# 메뉴 추가 (components/Navigation 또는 layout 파일 수정)

```typescript
// 기존 메뉴에 아래 항목 추가
{ href: "/macro",       label: "🌍 매크로" },
{ href: "/earnings",    label: "📊 실적" },
{ href: "/attribution", label: "🏆 수익 귀속" },
{ href: "/rebalance",   label: "⚖️ 리밸런싱" },
```

---

# settings 페이지 모의/실전 전환 섹션 추가

```typescript
// app/settings/page.tsx 하단에 섹션 추가
// 기존 파일 읽고 아래 섹션을 적절한 위치에 삽입

// 추가할 state
const [tradingMode, setTradingMode] = useState<string>('PAPER')
const [kisReady,    setKisReady]    = useState<string>('false')

// useEffect에 추가
useEffect(() => {
  fetch('/api/settings?key=trading_mode')
    .then(r => r.json()).then(d => setTradingMode(d.value ?? 'PAPER'))
  fetch('/api/settings?key=kis_ready')
    .then(r => r.json()).then(d => setKisReady(d.value ?? 'false'))
}, [])

const saveSetting = async (key: string, value: string) => {
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  })
}

// 추가할 JSX 섹션
<div className="bg-gray-900 rounded-xl p-5 mb-4">
  <p className="text-orange-400 font-semibold mb-4 text-sm">투자 모드</p>
  <div className="flex gap-3 mb-3">
    {(['PAPER', 'LIVE'] as const).map(mode => (
      <button
        key={mode}
        onClick={async () => {
          setTradingMode(mode)
          await saveSetting('trading_mode', mode)
        }}
        className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors ${
          tradingMode === mode
            ? mode === 'PAPER'
              ? 'bg-blue-600 text-white'
              : 'bg-red-600 text-white'
            : 'bg-gray-800 text-gray-400 hover:text-white'
        }`}
      >
        {mode === 'PAPER' ? '📋 모의투자' : '⚡ 실전투자'}
      </button>
    ))}
  </div>
  {tradingMode === 'PAPER' && (
    <p className="text-blue-400 text-xs">
      모의투자 서버 (openapivts.koreainvestment.com) — 실제 자금 미사용
    </p>
  )}
  {tradingMode === 'LIVE' && (
    <p className="text-red-400 text-xs font-medium">
      ⚠️ 실전투자 — 실제 자금으로 매매됩니다. 신중하게 사용하세요.
    </p>
  )}

  <div className="mt-4 pt-4 border-t border-gray-800">
    <p className="text-orange-400 font-semibold mb-3 text-sm">KIS API 상태</p>
    <div className="flex gap-3">
      {(['false', 'true'] as const).map(val => (
        <button
          key={val}
          onClick={async () => {
            setKisReady(val)
            await saveSetting('kis_ready', val)
          }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            kisReady === val
              ? val === 'true'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          {val === 'false' ? '🔒 미연동' : '✅ 연동됨'}
        </button>
      ))}
    </div>
    {kisReady === 'false' && (
      <p className="text-gray-500 text-xs mt-2">
        .env.local에 KIS_APP_KEY, KIS_APP_SECRET, KIS_ACCOUNT_NO 설정 후 연동됨으로 변경
      </p>
    )}
  </div>
</div>
```

---

# 완료 후 확인

```bash
npm run build
# 예상: 66~68 pages
# /macro /earnings /attribution /rebalance 접속 확인
# /settings 모의/실전 전환 동작 확인
```
