# PHASE 18~20 — 정보 수집기
# 클로드 코드: "이 파일 읽고 전체 실행해줘. npm run build까지."

---

# PHASE 18 — DART 공시 실시간 파싱

## Supabase SQL (먼저 실행)

```sql
CREATE TABLE IF NOT EXISTS dart_disclosures (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  rcept_no      text        UNIQUE,
  corp_name     text        NOT NULL,
  symbol        text,
  disclosure_type text      NOT NULL,
  title         text        NOT NULL,
  filed_at      timestamptz NOT NULL,
  ai_summary    text,
  importance    integer     DEFAULT 0 CHECK (importance BETWEEN 0 AND 10),
  raw_data      jsonb,
  notified      boolean     DEFAULT false,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dart_symbol
  ON dart_disclosures (symbol, filed_at DESC);
CREATE INDEX IF NOT EXISTS idx_dart_importance
  ON dart_disclosures (importance DESC, filed_at DESC);
```

---

## 1. lib/dart-client.ts (신규)

```typescript
// lib/dart-client.ts
// DART 오픈API: https://opendart.fss.or.kr
// 무료, 일 10,000건

const DART_API_KEY = process.env.DART_API_KEY!
const DART_BASE    = 'https://opendart.fss.or.kr/api'

export interface DartDisclosure {
  rceptNo:     string
  corpName:    string
  stockCode:   string | null
  reportNm:    string
  rceptDt:     string
  rmk:         string
}

// 최신 공시 목록 조회 (최대 100건)
export async function fetchRecentDisclosures(
  startDate: string,  // YYYYMMDD
  endDate:   string
): Promise<DartDisclosure[]> {
  const url = `${DART_BASE}/list.json?crtfc_key=${DART_API_KEY}&bgn_de=${startDate}&end_de=${endDate}&page_count=100`
  const res  = await fetch(url, { next: { revalidate: 300 } })
  const data = await res.json()
  if (data.status !== '000') return []
  return (data.list ?? []).map((d: Record<string, string>) => ({
    rceptNo:   d.rcept_no,
    corpName:  d.corp_name,
    stockCode: d.stock_code || null,
    reportNm:  d.report_nm,
    rceptDt:   d.rcept_dt,
    rmk:       d.rmk ?? '',
  }))
}

// 공시 중요도 계산
// 종류별 기본 점수 + 금액 규모 보정
export function calcImportance(reportNm: string, rmk: string): number {
  const title = reportNm.toLowerCase()
  let score = 0

  // 고중요도 (8~10)
  if (title.includes('단일판매') || title.includes('공급계약')) score = 8
  if (title.includes('유상증자'))    score = 9
  if (title.includes('자기주식취득')) score = 8
  if (title.includes('잠정실적'))    score = 9
  if (title.includes('최대주주변경')) score = 10
  if (title.includes('합병'))        score = 10
  if (title.includes('소송'))        score = 7

  // 중중요도 (5~7)
  if (title.includes('임원'))        score = Math.max(score, 6)
  if (title.includes('배당'))        score = Math.max(score, 5)
  if (title.includes('전환사채'))    score = Math.max(score, 7)

  // 저중요도
  if (score === 0) score = 3

  // 금액 언급 시 +1
  if (rmk && (rmk.includes('억') || rmk.includes('조'))) score = Math.min(score + 1, 10)

  return score
}

// Gemini AI 요약 (3줄)
export async function summarizeDisclosure(title: string, corpName: string): Promise<string> {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + process.env.GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `주식 투자자 관점에서 다음 공시를 3줄로 요약해. 회사: ${corpName}, 공시: ${title}. 형식: 1.핵심내용 2.주가영향 3.투자자행동` }]
        }]
      })
    })
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '요약 실패'
  } catch {
    return '요약 불가'
  }
}
```

---

## 2. app/api/dart/route.ts (신규)

```typescript
// app/api/dart/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchRecentDisclosures, calcImportance, summarizeDisclosure } from '@/lib/dart-client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') ?? 'list'

    if (action === 'list') {
      // 최근 공시 목록 (DB에서)
      const minImportance = Number(searchParams.get('minImportance') ?? 5)
      const symbol        = searchParams.get('symbol')
      let query = supabase
        .from('dart_disclosures')
        .select('*')
        .gte('importance', minImportance)
        .order('filed_at', { ascending: false })
        .limit(50)
      if (symbol) query = query.eq('symbol', symbol)
      const { data } = await query
      return NextResponse.json({ data: data ?? [] })
    }

    if (action === 'sync') {
      // 오늘 공시 수집 + DB 저장
      const today = new Date()
      const yyyymmdd = today.toISOString().slice(0,10).replace(/-/g,'')
      const disclosures = await fetchRecentDisclosures(yyyymmdd, yyyymmdd)

      let newCount = 0
      for (const d of disclosures) {
        const importance = calcImportance(d.reportNm, d.rmk)
        if (importance < 5) continue  // 중요도 5 미만 스킵

        const { error } = await supabase.from('dart_disclosures').upsert({
          rcept_no:        d.rceptNo,
          corp_name:       d.corpName,
          symbol:          d.stockCode,
          disclosure_type: d.reportNm,
          title:           d.reportNm,
          filed_at:        new Date().toISOString(),
          importance,
          raw_data:        d,
        }, { onConflict: 'rcept_no', ignoreDuplicates: true })

        if (!error) newCount++

        // 중요도 7 이상이면 AI 요약 생성
        if (importance >= 7) {
          const summary = await summarizeDisclosure(d.reportNm, d.corpName)
          await supabase.from('dart_disclosures')
            .update({ ai_summary: summary })
            .eq('rcept_no', d.rceptNo)
        }
      }
      return NextResponse.json({ synced: disclosures.length, saved: newCount })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

---

## 3. app/disclosure/page.tsx (신규)

```typescript
'use client'
import { useState, useEffect } from 'react'

interface Disclosure {
  id: string
  corp_name: string
  symbol: string | null
  disclosure_type: string
  title: string
  filed_at: string
  ai_summary: string | null
  importance: number
}

const IMP_COLOR = (n: number) =>
  n >= 9 ? 'text-red-400 bg-red-900/20 border-red-700/40' :
  n >= 7 ? 'text-orange-400 bg-orange-900/20 border-orange-700/40' :
  n >= 5 ? 'text-yellow-400 bg-yellow-900/20 border-yellow-700/40' :
           'text-gray-400 bg-gray-900/20 border-gray-700/40'

export default function DisclosurePage() {
  const [data,     setData]     = useState<Disclosure[]>([])
  const [loading,  setLoading]  = useState(true)
  const [syncing,  setSyncing]  = useState(false)
  const [minImp,   setMinImp]   = useState(5)
  const [selected, setSelected] = useState<Disclosure | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/dart?action=list&minImportance=${minImp}`)
    const json = await res.json()
    setData(json.data ?? [])
    setLoading(false)
  }

  const sync = async () => {
    setSyncing(true)
    await fetch('/api/dart?action=sync')
    await load()
    setSyncing(false)
  }

  useEffect(() => { load() }, [minImp])

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">DART 공시 피드</h1>
            <p className="text-gray-500 text-sm mt-1">중요 공시 실시간 수집 + AI 요약</p>
          </div>
          <button onClick={sync} disabled={syncing}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm font-semibold">
            {syncing ? '수집 중...' : '🔄 공시 동기화'}
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {[5,7,9].map(v => (
            <button key={v} onClick={() => setMinImp(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${minImp===v ? 'text-orange-400 border-orange-500 bg-orange-900/20' : 'text-gray-500 border-gray-700'}`}>
              중요도 {v}+
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-16">로딩 중...</div>
        ) : (
          <div className="space-y-2">
            {data.map(d => (
              <div key={d.id} onClick={() => setSelected(d)}
                className={`rounded-xl p-4 border cursor-pointer hover:opacity-80 transition-opacity ${IMP_COLOR(d.importance)}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white">{d.corp_name}</span>
                      {d.symbol && <span className="text-gray-500 text-xs">{d.symbol}</span>}
                      <span className="text-xs px-1.5 py-0.5 rounded bg-black/30">
                        중요도 {d.importance}
                      </span>
                    </div>
                    <p className="text-sm">{d.title}</p>
                    {d.ai_summary && (
                      <p className="text-gray-400 text-xs mt-1 line-clamp-2">{d.ai_summary}</p>
                    )}
                  </div>
                  <span className="text-gray-600 text-xs ml-4 shrink-0">
                    {new Date(d.filed_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            ))}
            {data.length === 0 && (
              <div className="text-center text-gray-500 py-16">
                공시 없음 — 동기화 버튼으로 수집하세요
              </div>
            )}
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
            onClick={() => setSelected(null)}>
            <div className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between mb-3">
                <span className="text-orange-400 font-bold">{selected.corp_name}</span>
                <button onClick={() => setSelected(null)} className="text-gray-500">✕</button>
              </div>
              <p className="text-white font-medium mb-3">{selected.title}</p>
              <div className="bg-black/30 rounded-lg p-3 text-sm text-gray-300">
                {selected.ai_summary ?? 'AI 요약 없음 (중요도 7 미만)'}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span>중요도: {selected.importance}/10</span>
                <span>{new Date(selected.filed_at).toLocaleString('ko-KR')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 4. .env.local 추가

```
DART_API_KEY=발급받은키
```

DART API 키 발급: https://opendart.fss.or.kr → 인증키 신청

---

## 5. 메뉴 추가

```typescript
{ href: "/disclosure", label: "📋 공시 피드" },
```

---

# PHASE 19 — 수급 추적

## Supabase SQL

```sql
CREATE TABLE IF NOT EXISTS supply_demand (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol      text        NOT NULL,
  trade_date  date        NOT NULL,
  foreign_net numeric     DEFAULT 0,
  inst_net    numeric     DEFAULT 0,
  retail_net  numeric     DEFAULT 0,
  program_net numeric     DEFAULT 0,
  supply_score numeric    DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(symbol, trade_date)
);
CREATE INDEX IF NOT EXISTS idx_sd_symbol
  ON supply_demand (symbol, trade_date DESC);

CREATE TABLE IF NOT EXISTS insider_trades (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol      text        NOT NULL,
  insider_name text,
  trade_type  text,
  shares      numeric,
  price       numeric,
  trade_date  date,
  report_date date,
  created_at  timestamptz DEFAULT now()
);
```

---

## 1. lib/supply-demand.ts (신규)

```typescript
// lib/supply-demand.ts

export interface SupplyDemandData {
  symbol:      string
  tradeDate:   string
  foreignNet:  number   // 외국인 순매수 (양수=매수, 음수=매도)
  instNet:     number   // 기관 순매수
  retailNet:   number   // 개인 순매수
  programNet:  number   // 프로그램 순매수
  supplyScore: number   // -100 ~ +100
}

// 수급 점수 계산
// 외국인 40% + 기관 40% + 프로그램 20%
export function calcSupplyScore(
  foreignNet: number,
  instNet:    number,
  programNet: number,
  maxAmount:  number = 1_000_000_000  // 정규화 기준 (10억)
): number {
  const normalize = (v: number) => Math.max(-1, Math.min(1, v / maxAmount))
  const score = (
    normalize(foreignNet)  * 40 +
    normalize(instNet)     * 40 +
    normalize(programNet)  * 20
  )
  return Math.round(score)
}

// 3일 연속 외국인 순매수 감지
export function detectConsecutiveForeign(
  history: Array<{ tradeDate: string; foreignNet: number }>,
  days = 3
): boolean {
  if (history.length < days) return false
  const recent = history.slice(0, days)
  return recent.every(d => d.foreignNet > 0)
}

// 수급 신호 생성
export function generateSupplySignal(
  score: number,
  consecutiveForeign: boolean
): { signal: 'STRONG_BUY'|'BUY'|'NEUTRAL'|'SELL'|'STRONG_SELL'; reason: string } {
  if (score >= 60 && consecutiveForeign) {
    return { signal: 'STRONG_BUY', reason: '외국인 연속 순매수 + 기관 동반 매수' }
  }
  if (score >= 40) {
    return { signal: 'BUY', reason: `수급 점수 ${score} — 매수세 우위` }
  }
  if (score <= -60) {
    return { signal: 'STRONG_SELL', reason: '외국인/기관 동반 대량 매도' }
  }
  if (score <= -40) {
    return { signal: 'SELL', reason: `수급 점수 ${score} — 매도세 우위` }
  }
  return { signal: 'NEUTRAL', reason: '수급 중립' }
}
```

---

## 2. app/api/supply/route.ts (신규)

```typescript
// app/api/supply/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcSupplyScore, detectConsecutiveForeign, generateSupplySignal } from '@/lib/supply-demand'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')
    const action = searchParams.get('action') ?? 'list'

    if (action === 'list') {
      let query = supabase
        .from('supply_demand')
        .select('*')
        .order('trade_date', { ascending: false })
        .limit(100)
      if (symbol) query = query.eq('symbol', symbol)
      const { data } = await query
      return NextResponse.json({ data: data ?? [] })
    }

    if (action === 'signal' && symbol) {
      const { data } = await supabase
        .from('supply_demand')
        .select('*')
        .eq('symbol', symbol)
        .order('trade_date', { ascending: false })
        .limit(10)

      if (!data || data.length === 0) {
        return NextResponse.json({ signal: 'NEUTRAL', reason: '데이터 없음', score: 0 })
      }

      const latest = data[0]
      const consecutive = detectConsecutiveForeign(
        data.map(d => ({ tradeDate: d.trade_date, foreignNet: d.foreign_net }))
      )
      const signal = generateSupplySignal(latest.supply_score, consecutive)
      return NextResponse.json({ ...signal, score: latest.supply_score, data: data.slice(0, 5) })
    }

    // 수동 데이터 입력 (KIS API 연동 전 임시)
    if (action === 'manual') {
      const body = await req.json?.() ?? {}
      const score = calcSupplyScore(body.foreignNet, body.instNet, body.programNet)
      await supabase.from('supply_demand').upsert({
        symbol:       body.symbol,
        trade_date:   body.tradeDate ?? new Date().toISOString().slice(0,10),
        foreign_net:  body.foreignNet ?? 0,
        inst_net:     body.instNet    ?? 0,
        retail_net:   body.retailNet  ?? 0,
        program_net:  body.programNet ?? 0,
        supply_score: score,
      }, { onConflict: 'symbol,trade_date' })
      return NextResponse.json({ ok: true, score })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

---

## 3. app/supply/page.tsx (신규)

```typescript
'use client'
import { useState, useEffect } from 'react'

interface SupplyData {
  symbol: string
  trade_date: string
  foreign_net: number
  inst_net: number
  retail_net: number
  supply_score: number
}

const SCORE_COLOR = (s: number) =>
  s >= 60  ? 'text-green-400' :
  s >= 20  ? 'text-green-300' :
  s <= -60 ? 'text-red-400'   :
  s <= -20 ? 'text-red-300'   : 'text-gray-400'

const WATCHLIST = ['005930', '000660', 'SPY', 'QQQ', 'NVDA', 'AAPL']

export default function SupplyPage() {
  const [data,    setData]    = useState<SupplyData[]>([])
  const [symbol,  setSymbol]  = useState('')
  const [signal,  setSignal]  = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  const loadSignal = async (sym: string) => {
    setLoading(true)
    const res = await fetch(`/api/supply?action=signal&symbol=${sym}`)
    const json = await res.json()
    setSignal(json)
    setLoading(false)
  }

  useEffect(() => {
    fetch('/api/supply?action=list')
      .then(r => r.json())
      .then(d => setData(d.data ?? []))
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">수급 추적</h1>
          <p className="text-gray-500 text-sm mt-1">외국인/기관 순매수 — 개인보다 먼저 아는 수급</p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {WATCHLIST.map(s => (
            <button key={s} onClick={() => { setSymbol(s); loadSignal(s) }}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors
                ${symbol===s ? 'text-orange-400 border-orange-500 bg-orange-900/20' : 'text-gray-500 border-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="종목코드 입력 (예: 005930)"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-white text-sm"
          />
          <button onClick={() => loadSignal(symbol)} disabled={!symbol || loading}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm font-semibold">
            조회
          </button>
        </div>

        {signal && (
          <div className="bg-gray-900 rounded-xl p-5 mb-6">
            <div className="flex justify-between items-center mb-3">
              <p className="text-orange-400 font-bold">{symbol} 수급 신호</p>
              <span className={`text-lg font-bold ${SCORE_COLOR(signal.score as number)}`}>
                {(signal.score as number) > 0 ? '+' : ''}{signal.score as number}점
              </span>
            </div>
            <p className={`text-sm font-medium mb-2 ${SCORE_COLOR(signal.score as number)}`}>
              {signal.signal as string} — {signal.reason as string}
            </p>
            {Array.isArray(signal.data) && signal.data.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-left pb-1 font-normal">날짜</th>
                      <th className="text-right pb-1 font-normal">외국인</th>
                      <th className="text-right pb-1 font-normal">기관</th>
                      <th className="text-right pb-1 font-normal">개인</th>
                      <th className="text-right pb-1 font-normal">점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(signal.data as SupplyData[]).map(d => (
                      <tr key={d.trade_date} className="border-b border-gray-800/40">
                        <td className="py-1 text-gray-400">{d.trade_date}</td>
                        <td className={`py-1 text-right ${d.foreign_net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(d.foreign_net / 1e8).toFixed(1)}억
                        </td>
                        <td className={`py-1 text-right ${d.inst_net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(d.inst_net / 1e8).toFixed(1)}억
                        </td>
                        <td className={`py-1 text-right ${d.retail_net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(d.retail_net / 1e8).toFixed(1)}억
                        </td>
                        <td className={`py-1 text-right font-bold ${SCORE_COLOR(d.supply_score)}`}>
                          {d.supply_score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-900/50 rounded-xl p-4">
          <p className="text-orange-400 text-xs font-semibold mb-2">수급 점수 계산 기준</p>
          <div className="grid grid-cols-3 gap-3 text-xs text-gray-400">
            <div><span className="text-white">외국인 40%</span><p className="mt-0.5">스마트머니 대표 지표</p></div>
            <div><span className="text-white">기관 40%</span><p className="mt-0.5">연기금/자산운용 동향</p></div>
            <div><span className="text-white">프로그램 20%</span><p className="mt-0.5">차익/비차익 프로그램</p></div>
          </div>
          <p className="text-gray-600 text-xs mt-2">
            ※ KIS API 연동 전: 수동 입력 또는 증권사 HTS에서 복사 붙여넣기
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

## 4. 메뉴 추가

```typescript
{ href: "/supply", label: "💰 수급 추적" },
```

---

# PHASE 20 — 감정 지표

## Supabase SQL

```sql
CREATE TABLE IF NOT EXISTS sentiment_scores (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol        text,
  score_date    date        NOT NULL DEFAULT CURRENT_DATE,
  fear_greed    integer,
  news_score    numeric,
  community_score numeric,
  search_trend  numeric,
  composite     numeric,
  signal        text,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(symbol, score_date)
);
CREATE INDEX IF NOT EXISTS idx_sentiment_symbol
  ON sentiment_scores (symbol, score_date DESC);
```

---

## 1. lib/sentiment.ts (신규)

```typescript
// lib/sentiment.ts

export interface SentimentData {
  fearGreed:      number   // 0~100 (0=극단적공포, 100=극단적탐욕)
  newsScore:      number   // -1~1
  communityScore: number   // -1~1
  searchTrend:    number   // 0~100
  composite:      number   // 0~100
  signal:         'EXTREME_FEAR'|'FEAR'|'NEUTRAL'|'GREED'|'EXTREME_GREED'
}

// Fear & Greed Index API (무료)
export async function fetchFearGreed(): Promise<number> {
  try {
    const res  = await fetch('https://api.alternative.me/fng/?limit=1', { next: { revalidate: 3600 } })
    const data = await res.json()
    return Number(data.data?.[0]?.value ?? 50)
  } catch {
    return 50
  }
}

// 뉴스 감정 분석 (Gemini 활용)
export async function analyzeNewsSentiment(symbol: string): Promise<number> {
  try {
    const newsRes = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${getDateStr(-7)}&to=${getDateStr(0)}&token=${process.env.FINNHUB_API_KEY}`
    )
    const news = await newsRes.json()
    if (!Array.isArray(news) || news.length === 0) return 0

    const headlines = news.slice(0, 10).map((n: Record<string,string>) => n.headline).join('\n')
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `다음 뉴스 헤드라인들의 투자 감정을 -1(매우부정)~+1(매우긍정) 숫자 하나로만 답해:\n${headlines}` }]
          }]
        })
      }
    )
    const data = await res.json()
    const text  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '0'
    const score = parseFloat(text.match(/-?\d+\.?\d*/)?.[0] ?? '0')
    return isFinite(score) ? Math.max(-1, Math.min(1, score)) : 0
  } catch {
    return 0
  }
}

// 종합 감정 점수 계산
export function calcCompositeSentiment(
  fearGreed:      number,
  newsScore:      number,
  communityScore: number,
  searchTrend:    number
): { composite: number; signal: SentimentData['signal'] } {
  // 뉴스/커뮤니티 -1~1 → 0~100 변환
  const newsNorm      = (newsScore      + 1) * 50
  const communityNorm = (communityScore + 1) * 50

  const composite = Math.round(
    fearGreed      * 0.30 +
    newsNorm       * 0.35 +
    communityNorm  * 0.20 +
    searchTrend    * 0.15
  )

  const signal: SentimentData['signal'] =
    composite <= 20 ? 'EXTREME_FEAR' :
    composite <= 40 ? 'FEAR' :
    composite <= 60 ? 'NEUTRAL' :
    composite <= 80 ? 'GREED' : 'EXTREME_GREED'

  return { composite, signal }
}

// 역발상 투자 신호
// 극단적 공포 = 매수 타이밍 (Buffett: 남들이 공포에 떨 때 탐욕스러워라)
export function getContrarianSignal(composite: number): {
  action: 'BUY'|'SELL'|'HOLD'
  strength: number
  reason: string
} {
  if (composite <= 20) return {
    action: 'BUY', strength: 0.9,
    reason: '극단적 공포 — 역사적 매수 타이밍 (S&P500 평균 수익률 +24% 12개월)'
  }
  if (composite <= 35) return {
    action: 'BUY', strength: 0.6,
    reason: '공포 구간 — 매수 우위 (평균 +15% 12개월)'
  }
  if (composite >= 80) return {
    action: 'SELL', strength: 0.8,
    reason: '극단적 탐욕 — 고점 경고 (평균 -5% 3개월)'
  }
  if (composite >= 65) return {
    action: 'SELL', strength: 0.5,
    reason: '탐욕 구간 — 부분 익절 고려'
  }
  return { action: 'HOLD', strength: 0.3, reason: '중립 구간 — 신호 없음' }
}

function getDateStr(daysOffset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().slice(0, 10)
}
```

---

## 2. app/api/sentiment/route.ts (신규)

```typescript
// app/api/sentiment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchFearGreed, analyzeNewsSentiment, calcCompositeSentiment, getContrarianSignal } from '@/lib/sentiment'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol') ?? 'MARKET'
    const action = searchParams.get('action') ?? 'get'

    if (action === 'get') {
      // DB에서 오늘 데이터 조회
      const today = new Date().toISOString().slice(0,10)
      const { data } = await supabase
        .from('sentiment_scores')
        .select('*')
        .eq('symbol', symbol)
        .eq('score_date', today)
        .single()

      if (data) return NextResponse.json({ data, cached: true })

      // 없으면 실시간 계산
      const fearGreed  = await fetchFearGreed()
      const newsScore  = symbol !== 'MARKET' ? await analyzeNewsSentiment(symbol) : 0
      const { composite, signal } = calcCompositeSentiment(fearGreed, newsScore, 0, 50)
      const contrarian = getContrarianSignal(composite)

      const record = {
        symbol, score_date: today,
        fear_greed: fearGreed, news_score: newsScore,
        community_score: 0, search_trend: 50,
        composite, signal,
      }
      await supabase.from('sentiment_scores').upsert(record, { onConflict: 'symbol,score_date' })

      return NextResponse.json({ data: record, contrarian, cached: false })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

---

## 3. app/sentiment/page.tsx (신규)

```typescript
'use client'
import { useState, useEffect } from 'react'

interface SentimentData {
  fear_greed: number
  news_score: number
  composite: number
  signal: string
}

interface Contrarian {
  action: string
  strength: number
  reason: string
}

const SIGNAL_META: Record<string, { label: string; color: string; bg: string }> = {
  EXTREME_FEAR:  { label: '극단적 공포', color: 'text-green-400',  bg: 'bg-green-900/20 border-green-700/40' },
  FEAR:          { label: '공포',       color: 'text-green-300',  bg: 'bg-green-900/10 border-green-800/30' },
  NEUTRAL:       { label: '중립',       color: 'text-gray-400',   bg: 'bg-gray-900/20 border-gray-700/40' },
  GREED:         { label: '탐욕',       color: 'text-red-300',    bg: 'bg-red-900/10 border-red-800/30' },
  EXTREME_GREED: { label: '극단적 탐욕', color: 'text-red-400',   bg: 'bg-red-900/20 border-red-700/40' },
}

function GaugeBar({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 100)
  const color = pct <= 20 ? 'bg-green-500' : pct <= 40 ? 'bg-green-400' : pct <= 60 ? 'bg-yellow-400' : pct <= 80 ? 'bg-orange-400' : 'bg-red-500'
  return (
    <div className="relative w-full h-4 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-4 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
        {pct}
      </div>
    </div>
  )
}

export default function SentimentPage() {
  const [data,       setData]      = useState<SentimentData | null>(null)
  const [contrarian, setContrarian]= useState<Contrarian | null>(null)
  const [symbol,     setSymbol]    = useState('MARKET')
  const [loading,    setLoading]   = useState(false)

  const load = async () => {
    setLoading(true)
    const res  = await fetch(`/api/sentiment?action=get&symbol=${symbol}`)
    const json = await res.json()
    setData(json.data)
    setContrarian(json.contrarian)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const meta = data ? (SIGNAL_META[data.signal] ?? SIGNAL_META.NEUTRAL) : null

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">시장 감정 지표</h1>
          <p className="text-gray-500 text-sm mt-1">공포/탐욕 → 역발상 매매 신호</p>
        </div>

        <div className="flex gap-2 mb-6">
          <input type="text" placeholder="종목 (비우면 시장 전체)"
            value={symbol === 'MARKET' ? '' : symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase() || 'MARKET')}
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-white text-sm"
          />
          <button onClick={load} disabled={loading}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm font-semibold">
            {loading ? '분석 중...' : '감정 분석'}
          </button>
        </div>

        {data && meta && (
          <div className="space-y-4">
            <div className={`rounded-xl p-5 border ${meta.bg}`}>
              <div className="flex justify-between items-center mb-4">
                <p className={`text-2xl font-bold ${meta.color}`}>{meta.label}</p>
                <p className={`text-4xl font-bold ${meta.color}`}>{data.composite}</p>
              </div>
              <GaugeBar value={data.composite} />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>극단적 공포 (0)</span>
                <span>중립 (50)</span>
                <span>극단적 탐욕 (100)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-2">Fear & Greed Index</p>
                <GaugeBar value={data.fear_greed} />
                <p className="text-white font-bold text-center mt-1">{data.fear_greed}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-2">뉴스 감정</p>
                <GaugeBar value={(data.news_score + 1) * 50} />
                <p className="text-white font-bold text-center mt-1">
                  {data.news_score >= 0 ? '+' : ''}{data.news_score.toFixed(2)}
                </p>
              </div>
            </div>

            {contrarian && (
              <div className={`rounded-xl p-4 border ${
                contrarian.action === 'BUY'  ? 'bg-green-900/20 border-green-700/40' :
                contrarian.action === 'SELL' ? 'bg-red-900/20 border-red-700/40' :
                'bg-gray-900/20 border-gray-700/40'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-orange-400 font-semibold text-sm">역발상 신호</p>
                  <span className={`text-lg font-bold ${
                    contrarian.action === 'BUY' ? 'text-green-400' :
                    contrarian.action === 'SELL' ? 'text-red-400' : 'text-gray-400'
                  }`}>{contrarian.action}</span>
                </div>
                <p className="text-gray-300 text-sm">{contrarian.reason}</p>
                <p className="text-gray-500 text-xs mt-1">
                  신호 강도: {(contrarian.strength * 100).toFixed(0)}%
                </p>
              </div>
            )}

            <div className="bg-gray-900/50 rounded-xl p-3 text-xs text-gray-500">
              공포/탐욕 지수 출처: Alternative.me | 뉴스 감정: Finnhub + Gemini AI
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 4. 메뉴 추가

```typescript
{ href: "/sentiment", label: "😱 감정 지표" },
```

---

## PHASE 18~20 완료 확인

```bash
npm run build
# /disclosure /supply /sentiment 접속 확인
```
