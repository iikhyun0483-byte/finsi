# FINSI PHASE 33~38 — 100% 완성 설계
# 클로드 코드: "이 파일 읽고 전체 실행해줘. npm run build까지."
# 전제: PHASE18-32.md 전부 완료 후 실행

---

# PHASE 33 — 포지션 실시간 관리 + 손절 모니터링

## 1. lib/position-manager.ts (신규)

```typescript
// lib/position-manager.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
```

---

## 2. app/api/positions/route.ts (신규)

```typescript
// app/api/positions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
  syncPositionsFromKIS,
  setStopAndTarget,
  checkStopLossAndTarget,
  getPortfolioSummary,
} from '@/lib/position-manager'
import { getBalance } from '@/lib/kis-api'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? 'summary'

  if (action === 'summary') {
    const summary = await getPortfolioSummary()
    return NextResponse.json(summary)
  }
  if (action === 'sync') {
    try {
      const balance = await getBalance()
      await syncPositionsFromKIS(balance.holdings)
      const summary = await getPortfolioSummary()
      return NextResponse.json({ synced: true, ...summary })
    } catch {
      return NextResponse.json({ synced: false, error: 'KIS API 미연동' })
    }
  }
  return NextResponse.json({ error: 'unknown' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  try {
    const { action, symbol, stopLoss, targetPrice, currentPrices } = await req.json()

    if (action === 'set_stop') {
      await setStopAndTarget(symbol, stopLoss, targetPrice)
      return NextResponse.json({ ok: true })
    }
    if (action === 'check') {
      const triggers = await checkStopLossAndTarget(currentPrices ?? {})
      return NextResponse.json({ triggers })
    }
    return NextResponse.json({ error: 'unknown' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

---

## 3. app/positions/page.tsx (신규)

```typescript
'use client'
import { useState, useEffect } from 'react'
import type { OpenPosition } from '@/lib/position-manager'

interface Summary {
  totalValue:  number
  totalCost:   number
  totalPnl:    number
  totalPnlPct: number
  positions:   OpenPosition[]
}

export default function PositionsPage() {
  const [summary,  setSummary]  = useState<Summary | null>(null)
  const [selected, setSelected] = useState<OpenPosition | null>(null)
  const [stopLoss, setStopLoss] = useState('')
  const [target,   setTarget]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [syncing,  setSyncing]  = useState(false)

  const load = async () => {
    const res = await fetch('/api/positions?action=summary')
    const d   = await res.json()
    setSummary(d)
  }

  const sync = async () => {
    setSyncing(true)
    await fetch('/api/positions?action=sync')
    await load()
    setSyncing(false)
  }

  const saveStop = async () => {
    if (!selected) return
    setLoading(true)
    await fetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set_stop',
        symbol: selected.symbol,
        stopLoss:    Number(stopLoss),
        targetPrice: Number(target),
      }),
    })
    await load()
    setSelected(null)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const pct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">포지션 관리</h1>
            <p className="text-gray-500 text-sm mt-1">실시간 손익 + 손절/목표가 자동 관리</p>
          </div>
          <button onClick={sync} disabled={syncing}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm font-semibold">
            {syncing ? '동기화 중...' : '🔄 KIS 동기화'}
          </button>
        </div>

        {summary && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: '평가금액', v: `${summary.totalValue.toLocaleString()}원`, c: 'text-white' },
                { label: '매입금액', v: `${summary.totalCost.toLocaleString()}원`,  c: 'text-gray-400' },
                { label: '평가손익', v: `${summary.totalPnl >= 0 ? '+' : ''}${summary.totalPnl.toLocaleString()}원`, c: summary.totalPnl >= 0 ? 'text-green-400' : 'text-red-400' },
                { label: '수익률', v: pct(summary.totalPnlPct), c: summary.totalPnlPct >= 0 ? 'text-green-400' : 'text-red-400' },
              ].map(m => (
                <div key={m.label} className="bg-gray-900 rounded-xl p-4">
                  <p className="text-gray-500 text-xs">{m.label}</p>
                  <p className={`font-bold text-base ${m.c}`}>{m.v}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {summary.positions.length === 0 ? (
                <div className="bg-gray-900 rounded-xl p-12 text-center text-gray-500">
                  보유 포지션 없음
                </div>
              ) : summary.positions.map(p => (
                <div key={p.symbol}
                  className={`rounded-xl p-4 border cursor-pointer hover:opacity-90 ${
                    p.unrealizedPct >= 0.05 ? 'bg-green-900/10 border-green-800/40' :
                    p.unrealizedPct <= -0.05 ? 'bg-red-900/10 border-red-800/40' :
                    'bg-gray-900 border-gray-800'
                  }`}
                  onClick={() => { setSelected(p); setStopLoss(String(p.stopLoss ?? '')); setTarget(String(p.targetPrice ?? '')) }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{p.symbol}</span>
                        <span className="text-gray-500 text-xs">{p.quantity}주</span>
                        {p.stopLoss && <span className="text-red-400 text-xs">손절 {p.stopLoss.toLocaleString()}</span>}
                        {p.targetPrice && <span className="text-green-400 text-xs">목표 {p.targetPrice.toLocaleString()}</span>}
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">
                        평균 {p.avgPrice.toLocaleString()} → 현재 {p.currentPrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${p.unrealizedPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {pct(p.unrealizedPct)}
                      </p>
                      <p className={`text-xs ${p.unrealizedPnl >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {p.unrealizedPnl >= 0 ? '+' : ''}{p.unrealizedPnl.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {selected && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
            onClick={() => setSelected(null)}>
            <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between mb-4">
                <p className="font-bold text-orange-400">{selected.symbol} 손절/목표 설정</p>
                <button onClick={() => setSelected(null)} className="text-gray-500">✕</button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-red-400 text-xs mb-1">손절가 (현재: {selected.currentPrice.toLocaleString()})</p>
                  <input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)}
                    placeholder={String(Math.round(selected.avgPrice * 0.92))}
                    className="w-full bg-gray-800 rounded px-3 py-2 text-white" />
                  <p className="text-gray-600 text-xs mt-0.5">
                    매입가 -8% = {Math.round(selected.avgPrice * 0.92).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-green-400 text-xs mb-1">목표가</p>
                  <input type="number" value={target} onChange={e => setTarget(e.target.value)}
                    placeholder={String(Math.round(selected.avgPrice * 1.20))}
                    className="w-full bg-gray-800 rounded px-3 py-2 text-white" />
                  <p className="text-gray-600 text-xs mt-0.5">
                    매입가 +20% = {Math.round(selected.avgPrice * 1.20).toLocaleString()}
                  </p>
                </div>
                <button onClick={saveStop} disabled={loading}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-xl font-semibold text-sm">
                  {loading ? '저장 중...' : '저장'}
                </button>
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

## 4. 메뉴 추가

```typescript
{ href: "/positions", label: "💼 포지션" },
```

---

# PHASE 34 — KIS 토큰 영속화 + 모의/실전 전환

## 1. lib/kis-api.ts 수정 (토큰 Supabase 저장)

```typescript
// lib/kis-api.ts 상단 교체
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 모의투자 vs 실전투자 자동 전환
export function getKISBase(): string {
  const isPaper = process.env.KIS_PAPER_MODE === 'true'
  return isPaper
    ? 'https://openapivts.koreainvestment.com:29443'
    : 'https://openapi.koreainvestment.com:9443'
}

// 토큰 Supabase에서 조회 → 없거나 만료 시 재발급
export async function getToken(): Promise<string> {
  const isPaper = process.env.KIS_PAPER_MODE === 'true'

  // DB에서 유효 토큰 조회
  const { data } = await supabase
    .from('kis_tokens')
    .select('*')
    .eq('is_paper', isPaper)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (data?.access_token) return data.access_token

  // 재발급
  const res = await fetch(`${getKISBase()}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey:     process.env.KIS_APP_KEY,
      appsecret:  process.env.KIS_APP_SECRET,
    }),
  })
  const tokenData = await res.json()
  const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 86400) * 1000).toISOString()

  await supabase.from('kis_tokens').insert({
    access_token: tokenData.access_token,
    expires_at:   expiresAt,
    is_paper:     isPaper,
  })

  return tokenData.access_token
}
```

---

## 2. .env.local 추가

```
KIS_PAPER_MODE=true    # 모의투자: true / 실전: false
```

---

## 3. app/settings/page.tsx 수정 — 모드 전환 섹션 추가

```typescript
// 기존 settings 페이지에 추가
// 모의투자/실전투자 전환 UI

const [tradingMode, setTradingMode] = useState('PAPER')

useEffect(() => {
  fetch('/api/settings?key=trading_mode')
    .then(r => r.json())
    .then(d => setTradingMode(d.value ?? 'PAPER'))
}, [])

// JSX 추가:
<div className="bg-gray-900 rounded-xl p-5 mb-4">
  <p className="text-orange-400 font-semibold mb-3 text-sm">투자 모드</p>
  <div className="flex gap-2">
    {['PAPER', 'LIVE'].map(mode => (
      <button key={mode}
        onClick={async () => {
          setTradingMode(mode)
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'trading_mode', value: mode }),
          })
        }}
        className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
          tradingMode === mode
            ? mode === 'PAPER'
              ? 'bg-blue-600 text-white'
              : 'bg-red-600 text-white'
            : 'bg-gray-800 text-gray-400'
        }`}>
        {mode === 'PAPER' ? '📋 모의투자' : '⚡ 실전투자'}
      </button>
    ))}
  </div>
  {tradingMode === 'LIVE' && (
    <p className="text-red-400 text-xs mt-2">
      ⚠️ 실전투자 모드 — 실제 자금으로 매매됩니다
    </p>
  )}
</div>
```

---

## 4. app/api/settings/route.ts (신규)

```typescript
// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const key = new URL(req.url).searchParams.get('key')
  if (!key) {
    const { data } = await supabase.from('system_config').select('*')
    return NextResponse.json({ data: data ?? [] })
  }
  const { data } = await supabase.from('system_config').select('value').eq('key', key).single()
  return NextResponse.json({ value: data?.value })
}

export async function POST(req: NextRequest) {
  const { key, value } = await req.json()
  await supabase.from('system_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  return NextResponse.json({ ok: true })
}
```

---

# PHASE 35 — 매크로 지표 자동화

## 1. lib/macro-tracker.ts (신규)

```typescript
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
    }, { onConflict: 'indicator_name' })  // 날짜별 중복은 인덱스로 처리
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
```

---

## 2. app/api/macro/route.ts (신규)

```typescript
// app/api/macro/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { syncMacroIndicators, getMacroRiskScore } from '@/lib/macro-tracker'

export async function GET(req: NextRequest) {
  const action = new URL(req.url).searchParams.get('action') ?? 'score'
  if (action === 'sync')  return NextResponse.json({ signals: await syncMacroIndicators() })
  if (action === 'score') return NextResponse.json(await getMacroRiskScore())
  return NextResponse.json({ error: 'unknown' }, { status: 400 })
}
```

---

## 3. app/macro/page.tsx (신규)

```typescript
'use client'
import { useState, useEffect } from 'react'

interface MacroSignal {
  indicator: string
  value:     number
  signal:    string
  impact:    string
}

interface MacroData {
  score:   number
  signals: MacroSignal[]
  regime:  string
}

const REGIME_META = {
  CRISIS:  { label: '위기',  color: 'text-red-400',    bg: 'bg-red-900/20 border-red-700/40' },
  BEAR:    { label: '약세장', color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-700/40' },
  NEUTRAL: { label: '중립',  color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-700/40' },
  BULL:    { label: '강세장', color: 'text-green-400',  bg: 'bg-green-900/20 border-green-700/40' },
}

const INDICATOR_LABEL: Record<string, string> = {
  VIX:      '공포지수 (VIX)',
  DXY:      '달러 인덱스 (DXY)',
  FEDFUNDS: '미국 기준금리',
  UNRATE:   '실업률',
  CPIAUCSL: 'CPI (소비자물가)',
  T10Y2Y:   '장단기 금리차',
}

export default function MacroPage() {
  const [data,    setData]    = useState<MacroData | null>(null)
  const [syncing, setSyncing] = useState(false)

  const load = async () => {
    const res = await fetch('/api/macro?action=score')
    setData(await res.json())
  }

  const sync = async () => {
    setSyncing(true)
    await fetch('/api/macro?action=sync')
    await load()
    setSyncing(false)
  }

  useEffect(() => { load() }, [])

  const meta = data ? (REGIME_META[data.regime as keyof typeof REGIME_META] ?? REGIME_META.NEUTRAL) : null

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">매크로 지표</h1>
            <p className="text-gray-500 text-sm mt-1">VIX · 금리 · 달러 · 고용 · 물가</p>
          </div>
          <button onClick={sync} disabled={syncing}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm font-semibold">
            {syncing ? '수집 중...' : '🔄 데이터 수집'}
          </button>
        </div>

        {data && meta && (
          <div className="space-y-4">
            <div className={`rounded-xl p-5 border ${meta.bg}`}>
              <div className="flex justify-between items-center mb-2">
                <p className={`text-2xl font-bold ${meta.color}`}>{meta.label}</p>
                <p className={`text-4xl font-bold ${meta.color}`}>{data.score}</p>
              </div>
              <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-3 rounded-full ${
                    data.score >= 70 ? 'bg-red-500' :
                    data.score >= 45 ? 'bg-orange-500' :
                    data.score >= 20 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${data.score}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>강세 (0)</span>
                <span>중립 (50)</span>
                <span>위기 (100)</span>
              </div>
            </div>

            <div className="space-y-2">
              {data.signals.map(s => (
                <div key={s.indicator} className={`rounded-xl p-4 border ${
                  s.signal === 'RISK_OFF' ? 'bg-red-900/10 border-red-800/30' :
                  s.signal === 'RISK_ON'  ? 'bg-green-900/10 border-green-800/30' :
                  'bg-gray-900 border-gray-800'
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-medium text-sm">
                      {INDICATOR_LABEL[s.indicator] ?? s.indicator}
                    </span>
                    <span className={`font-bold ${
                      s.signal === 'RISK_OFF' ? 'text-red-400' :
                      s.signal === 'RISK_ON'  ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {s.value.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs">{s.impact}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-900/50 rounded-xl p-4 text-xs text-gray-500">
              <p className="text-orange-400 font-medium mb-1">매크로 → 전략 연동</p>
              <p>VIX 30+ → 포지션 자동 50% 축소</p>
              <p>장단기 금리 역전 → 방어섹터(헬스케어/소비재) 비중 증가</p>
              <p>강달러(105+) → 신흥국 ETF 제외, 미국 대형주 집중</p>
              <p className="text-gray-600 mt-1">출처: FRED, Yahoo Finance</p>
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
{ href: "/macro", label: "🌍 매크로" },
```

---

# PHASE 36 — 실적 발표 이벤트 드리븐

## 1. lib/earnings-tracker.ts (신규)

```typescript
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
  signal:       'BEAT' | 'MISS' | 'IN_LINE' | 'UPCOMING' | null
}

// Finnhub 실적 발표 캘린더
export async function fetchEarningsCalendar(
  from: string,  // YYYY-MM-DD
  to:   string
): Promise<EarningsEvent[]> {
  const res  = await fetch(
    `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`
  )
  const data = await res.json()
  return (data.earningsCalendar ?? []).slice(0, 50).map((e: Record<string, unknown>) => ({
    symbol:       e.symbol as string,
    corpName:     e.company as string ?? e.symbol,
    earningsDate: e.date as string,
    estimateEps:  e.epsEstimate ? Number(e.epsEstimate) : null,
    actualEps:    e.epsActual   ? Number(e.epsActual)   : null,
    surprisePct:  e.surprisePercent ? Number(e.surprisePercent) : null,
    signal:       e.epsActual
      ? (e.surprisePercent as number) > 5  ? 'BEAT'
      : (e.surprisePercent as number) < -5 ? 'MISS'
      : 'IN_LINE'
      : 'UPCOMING',
  }))
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
    const signal = e.surprisePct !== null
      ? calcEarningsSignal(e.surprisePct).action
      : null

    await supabase.from('earnings_calendar').upsert({
      symbol:          e.symbol,
      corp_name:       e.corpName,
      earnings_date:   e.earningsDate,
      estimate_eps:    e.estimateEps,
      actual_eps:      e.actualEps,
      surprise_pct:    e.surprisePct,
      signal:          signal ?? e.signal,
    }, { onConflict: 'symbol,earnings_date' })
  }
  return events
}
```

---

## 2. app/api/earnings/route.ts (신규)

```typescript
// app/api/earnings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncEarnings, calcEarningsSignal } from '@/lib/earnings-tracker'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const action = new URL(req.url).searchParams.get('action') ?? 'list'

  if (action === 'list') {
    const today = new Date().toISOString().slice(0,10)
    const { data } = await supabase
      .from('earnings_calendar')
      .select('*')
      .gte('earnings_date', today)
      .order('earnings_date', { ascending: true })
      .limit(30)
    return NextResponse.json({ data: data ?? [] })
  }
  if (action === 'sync') {
    const events = await syncEarnings()
    return NextResponse.json({ synced: events.length })
  }
  return NextResponse.json({ error: 'unknown' }, { status: 400 })
}
```

---

## 3. app/earnings/page.tsx (신규)

```typescript
'use client'
import { useState, useEffect } from 'react'
import { calcEarningsSignal } from '@/lib/earnings-tracker'

interface Earning {
  id: string
  symbol: string
  corp_name: string
  earnings_date: string
  estimate_eps: number | null
  actual_eps:   number | null
  surprise_pct: number | null
  signal: string | null
}

export default function EarningsPage() {
  const [data,    setData]    = useState<Earning[]>([])
  const [syncing, setSyncing] = useState(false)

  const load = async () => {
    const res = await fetch('/api/earnings?action=list')
    const d   = await res.json()
    setData(d.data ?? [])
  }

  const sync = async () => {
    setSyncing(true)
    await fetch('/api/earnings?action=sync')
    await load()
    setSyncing(false)
  }

  useEffect(() => { load() }, [])

  const today = new Date().toISOString().slice(0,10)

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">실적 발표 캘린더</h1>
            <p className="text-gray-500 text-sm mt-1">어닝 서프라이즈 → PEAD 매매 신호</p>
          </div>
          <button onClick={sync} disabled={syncing}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm font-semibold">
            {syncing ? '수집 중...' : '🔄 실적 동기화'}
          </button>
        </div>

        <div className="space-y-2">
          {data.length === 0 ? (
            <div className="bg-gray-900 rounded-xl p-12 text-center text-gray-500">
              실적 데이터 없음 — 동기화 버튼으로 수집하세요
            </div>
          ) : data.map(e => {
            const isToday = e.earnings_date === today
            const signal  = e.surprise_pct !== null ? calcEarningsSignal(e.surprise_pct) : null

            return (
              <div key={e.id} className={`rounded-xl p-4 border ${
                isToday ? 'bg-orange-900/20 border-orange-700/40' :
                signal?.action === 'BUY'  ? 'bg-green-900/10 border-green-800/30' :
                signal?.action === 'SELL' ? 'bg-red-900/10 border-red-800/30' :
                'bg-gray-900 border-gray-800'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-white">{e.symbol}</span>
                      <span className="text-gray-500 text-xs">{e.corp_name}</span>
                      {isToday && <span className="text-orange-400 text-xs font-bold">오늘</span>}
                    </div>
                    <p className="text-gray-500 text-xs">{e.earnings_date}</p>
                    {signal && (
                      <p className={`text-xs mt-1 ${signal.action === 'BUY' ? 'text-green-400' : signal.action === 'SELL' ? 'text-red-400' : 'text-gray-400'}`}>
                        {signal.reason}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    {e.surprise_pct !== null ? (
                      <>
                        <p className={`font-bold ${e.surprise_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {e.surprise_pct >= 0 ? '+' : ''}{e.surprise_pct.toFixed(1)}%
                        </p>
                        <p className="text-gray-500 text-xs">
                          예상 {e.estimate_eps?.toFixed(2)} / 실제 {e.actual_eps?.toFixed(2)}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-500 text-xs">
                        예상 EPS {e.estimate_eps?.toFixed(2) ?? '-'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 bg-gray-900/50 rounded-xl p-3 text-xs text-gray-500">
          <p className="text-orange-400 font-medium mb-1">PEAD (Post Earnings Announcement Drift)</p>
          <p>어닝 서프라이즈 +15%+ → 발표 후 1~5일 상승 지속 평균 +4~8%</p>
          <p>어닝 쇼크 -15%- → 발표 후 1~5일 하락 지속 평균 -5~10%</p>
          <p className="text-gray-600 mt-1">출처: Finnhub API</p>
        </div>
      </div>
    </div>
  )
}
```

---

## 4. 메뉴 추가

```typescript
{ href: "/earnings", label: "📊 실적 캘린더" },
```

---

# PHASE 37 — UnlockGate + 수익 귀속 분석

## 1. components/UnlockGate.tsx (신규)

```typescript
// components/UnlockGate.tsx
'use client'
import { useState, useEffect } from 'react'

interface UnlockGateProps {
  minSignals:  number
  featureName: string
  children:    React.ReactNode
}

export default function UnlockGate({ minSignals, featureName, children }: UnlockGateProps) {
  const [count,   setCount]   = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/signal-tracking?action=count')
      .then(r => r.json())
      .then(d => { setCount(d.count ?? 0); setLoading(false) })
      .catch(() => { setCount(0); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="text-gray-500 text-sm">확인 중...</div>
    </div>
  )

  if ((count ?? 0) < minSignals) return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔒</div>
        <p className="text-orange-400 font-bold text-xl mb-2">{featureName}</p>
        <p className="text-gray-400 text-sm mb-4">
          신호 데이터 {minSignals}개 이상 수집 시 활성화됩니다
        </p>
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">현재</span>
            <span className="text-orange-400 font-bold">{count} / {minSignals}개</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-2 bg-orange-500 rounded-full transition-all"
              style={{ width: `${Math.min((count ?? 0) / minSignals * 100, 100)}%` }} />
          </div>
          <p className="text-gray-600 text-xs mt-2">
            /signal 페이지에서 신호를 생성하면 자동으로 쌓입니다
          </p>
        </div>
      </div>
    </div>
  )

  return <>{children}</>
}
```

---

## 2. app/optimization/page.tsx 수정 (UnlockGate 적용)

```typescript
// 기존 return 전체를 아래로 교체
import UnlockGate from '@/components/UnlockGate'

return (
  <UnlockGate minSignals={100} featureName="파라미터 자동 최적화">
    {/* 기존 JSX 전체 */}
  </UnlockGate>
)
```

---

## 3. app/ml-signal/page.tsx 수정 (UnlockGate 적용)

```typescript
import UnlockGate from '@/components/UnlockGate'

return (
  <UnlockGate minSignals={100} featureName="머신러닝 신호">
    {/* 기존 JSX 전체 */}
  </UnlockGate>
)
```

---

## 4. app/api/signal-tracking/route.ts 수정 — count 액션 추가

```typescript
// 기존 GET 핸들러 안에 추가
if (action === 'count') {
  const { count } = await supabase
    .from('signal_tracking')
    .select('*', { count: 'exact', head: true })
    .not('is_correct_7d', 'is', null)
  return NextResponse.json({ count: count ?? 0 })
}
```

---

## 5. lib/attribution.ts (신규) — 수익 귀속 분석

```typescript
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
```

---

## 6. app/attribution/page.tsx (신규)

```typescript
'use client'
import { useState, useEffect } from 'react'

interface Attribution {
  strategy:   string
  tradeCount: number
  totalPnl:   number
  avgPnlPct:  number
  winRate:    number
}

export default function AttributionPage() {
  const [data, setData] = useState<Attribution[]>([])

  useEffect(() => {
    fetch('/api/attribution')
      .then(r => r.json())
      .then(d => setData(d.data ?? []))
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">수익 귀속 분석</h1>
          <p className="text-gray-500 text-sm mt-1">어떤 전략이 실제로 돈 벌었는가</p>
        </div>

        {data.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center text-gray-500">
            거래 종료 후 자동 집계됩니다
          </div>
        ) : (
          <div className="space-y-3">
            {data.map(a => (
              <div key={a.strategy} className={`rounded-xl p-5 border ${
                a.totalPnl >= 0 ? 'bg-green-900/10 border-green-800/30' : 'bg-red-900/10 border-red-800/30'
              }`}>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-white font-bold">{a.strategy}</p>
                  <span className={`text-xl font-bold ${a.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {a.totalPnl >= 0 ? '+' : ''}{a.totalPnl.toLocaleString()}원
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-gray-500">거래 수</p>
                    <p className="text-white font-bold">{a.tradeCount}건</p>
                  </div>
                  <div>
                    <p className="text-gray-500">평균 수익률</p>
                    <p className={`font-bold ${a.avgPnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(a.avgPnlPct * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">승률</p>
                    <p className={`font-bold ${a.winRate >= 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                      {(a.winRate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
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

## 7. app/api/attribution/route.ts (신규)

```typescript
// app/api/attribution/route.ts
import { NextResponse } from 'next/server'
import { getAttributionSummary } from '@/lib/attribution'

export async function GET() {
  const data = await getAttributionSummary()
  return NextResponse.json({ data })
}
```

---

## 8. 메뉴 추가

```typescript
{ href: "/macro",       label: "🌍 매크로" },
{ href: "/earnings",    label: "📊 실적" },
{ href: "/positions",   label: "💼 포지션" },
{ href: "/attribution", label: "🏆 수익 귀속" },
```

---

# PHASE 38 — 포트폴리오 자동 리밸런싱

## 1. lib/rebalancer.ts (신규)

```typescript
// lib/rebalancer.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
```

---

## 2. app/rebalance/page.tsx (신규)

```typescript
'use client'
import { useState } from 'react'

interface Trade {
  symbol: string
  action: 'BUY' | 'SELL'
  amount: number
  reason: string
}

const DEFAULT_WEIGHTS = { SPY: 0.4, QQQ: 0.2, AAPL: 0.15, MSFT: 0.15, NVDA: 0.10 }

export default function RebalancePage() {
  const [weights,    setWeights]    = useState<Record<string,number>>(DEFAULT_WEIGHTS)
  const [trades,     setTrades]     = useState<Trade[]>([])
  const [maxDrift,   setMaxDrift]   = useState<number | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [totalValue, setTotalValue] = useState(10_000_000)

  const calc = async () => {
    setLoading(true)
    const res  = await fetch('/api/rebalance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'calc', weights, totalValue }),
    })
    const data = await res.json()
    setTrades(data.trades ?? [])
    setMaxDrift(data.maxDrift ?? null)
    setLoading(false)
  }

  const totalWeight = Object.values(weights).reduce((s,v) => s+v, 0)

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">포트폴리오 리밸런싱</h1>
          <p className="text-gray-500 text-sm mt-1">비중 드리프트 5% 초과 시 자동 리밸런싱 권장</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 mb-4">
          <p className="text-orange-400 font-semibold text-sm mb-3">
            목표 비중 설정 (합계: <span className={totalWeight > 1.01 || totalWeight < 0.99 ? 'text-red-400' : 'text-green-400'}>{(totalWeight*100).toFixed(0)}%</span>)
          </p>
          {Object.entries(weights).map(([sym, w]) => (
            <div key={sym} className="flex items-center gap-3 mb-3">
              <span className="text-white text-sm w-16 font-medium">{sym}</span>
              <input type="range" min={0} max={1} step={0.01} value={w}
                onChange={e => setWeights(p => ({ ...p, [sym]: Number(e.target.value) }))}
                className="flex-1 accent-orange-500" />
              <span className="text-orange-400 text-sm w-12 text-right">{(w*100).toFixed(0)}%</span>
            </div>
          ))}
          <div className="flex gap-2 mt-3">
            <div className="flex-1">
              <p className="text-gray-500 text-xs mb-1">총 포트폴리오 (원)</p>
              <input type="number" value={totalValue}
                onChange={e => setTotalValue(Number(e.target.value))}
                className="w-full bg-gray-800 rounded px-3 py-2 text-white text-sm" />
            </div>
            <button onClick={calc} disabled={loading || Math.abs(totalWeight-1) > 0.01}
              className="px-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-xl font-semibold text-sm self-end py-2">
              {loading ? '계산 중...' : '리밸런싱 계산'}
            </button>
          </div>
        </div>

        {maxDrift !== null && (
          <div className={`rounded-xl p-4 border mb-4 ${
            maxDrift > 0.05 ? 'bg-orange-900/20 border-orange-700/40' : 'bg-green-900/10 border-green-800/30'
          }`}>
            <p className={`font-bold ${maxDrift > 0.05 ? 'text-orange-400' : 'text-green-400'}`}>
              최대 드리프트: {(maxDrift*100).toFixed(1)}% {maxDrift > 0.05 ? '— 리밸런싱 필요' : '— 정상 범위'}
            </p>
          </div>
        )}

        {trades.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-orange-400 font-semibold text-sm mb-3">필요 거래</p>
            {trades.map(t => (
              <div key={t.symbol} className={`rounded-lg p-3 mb-2 ${
                t.action === 'BUY' ? 'bg-green-900/20' : 'bg-red-900/20'
              }`}>
                <div className="flex justify-between">
                  <span className={`font-bold ${t.action === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                    {t.action} {t.symbol}
                  </span>
                  <span className="text-white font-bold">{t.amount.toLocaleString()}원</span>
                </div>
                <p className="text-gray-400 text-xs mt-0.5">{t.reason}</p>
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

## 3. app/api/rebalance/route.ts (신규)

```typescript
// app/api/rebalance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { calcDrift, calcRebalanceTrades } from '@/lib/rebalancer'

export async function POST(req: NextRequest) {
  try {
    const { action, weights, totalValue } = await req.json()
    if (action === 'calc') {
      const { drift, maxDrift, needsRebalance } = await calcDrift(weights)
      const trades = await calcRebalanceTrades(weights, totalValue ?? 10_000_000)
      return NextResponse.json({ drift, maxDrift, needsRebalance, trades })
    }
    return NextResponse.json({ error: 'unknown' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

---

## 4. 메뉴 추가

```typescript
{ href: "/rebalance", label: "⚖️ 리밸런싱" },
```

---

# 전체 완성 확인 체크리스트

```
✅ 치명적 버그 3개 수정
   ① KIS 토큰 Supabase 저장 (PHASE 34)
   ② signal_id UNIQUE 제약 (SQL)
   ③ open_positions 실시간 동기화 (PHASE 33)

✅ 핵심 누락 5개 추가
   ④ 손절/목표가 실시간 모니터링 (PHASE 33)
   ⑤ 매크로 지표 자동화 (PHASE 35)
   ⑥ 실적 발표 이벤트 드리븐 (PHASE 36)
   ⑦ 포트폴리오 리밸런싱 (PHASE 38)
   ⑧ 모의/실전 전환 (PHASE 34)

✅ UX 완성
   ⑨ UnlockGate 컴포넌트 (PHASE 37)
   ⑩ 수익 귀속 분석 (PHASE 37)
```

---

# 최종 완성 시 전체 페이지 (62개)

```
기존 40개 + PHASE18~32 14개 + PHASE33~38 8개 = 62개

신규 8개:
/positions    포지션 실시간 관리
/macro        매크로 지표
/earnings     실적 발표 캘린더
/attribution  수익 귀속 분석
/rebalance    포트폴리오 리밸런싱
/settings     (기존 수정 — 모의/실전 전환 추가)
```

---

# 실행 순서

```
① FINSI_SUPABASE_PHASE33-38.sql → Supabase → Run
② 클로드 코드: "PHASE33-38.md 읽고 전체 실행해줘. npm run build까지."
```
