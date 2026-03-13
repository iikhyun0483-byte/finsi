# PHASE 11 — 통계적 차익거래 (수정본 v2)
# 클로드 코드: "이 파일 읽고 전체 실행해줘. npm run build까지."
# 수정: 가격 데이터 파싱 명시화 / Z-스코어 게이지 한도 버그 수정

## 신규 파일 3개. 기존 파일 건드리지 않음.

---

## 1. lib/stat-arb.ts (신규)

```typescript
// lib/stat-arb.ts

export interface PairAnalysis {
  symbol1: string
  symbol2: string
  correlation: number
  hedgeRatio: number
  currentZScore: number
  spreadMean: number
  spreadStd: number
  halfLife: number
  isPaired: boolean
  dataPoints: number     // 실제 사용된 데이터 포인트 수
}

export interface PairSignal {
  pair: string
  signal: 'LONG_SPREAD' | 'SHORT_SPREAD' | 'NEUTRAL' | 'EXIT'
  currentZScore: number
  halfLife: number
  confidence: number
  action: string
}

// 가격 배열 안전 추출 — 객체 배열 or 숫자 배열 모두 처리
export function extractCloseprices(raw: unknown[]): number[] {
  if (!Array.isArray(raw)) return []
  return raw.map(item => {
    if (typeof item === 'number' && isFinite(item)) return item
    if (typeof item === 'object' && item !== null) {
      const r = item as Record<string, unknown>
      const v = Number(r.close ?? r.price ?? r.c ?? r.value ?? 0)
      return isFinite(v) ? v : 0
    }
    return 0
  }).filter(v => v > 0)
}

function ols(y: number[], x: number[]) {
  const n = Math.min(y.length, x.length)
  if (n < 10) return { beta: 1, alpha: 0, residuals: [] as number[] }
  const xm = x.slice(0,n).reduce((s,v)=>s+v,0)/n
  const ym = y.slice(0,n).reduce((s,v)=>s+v,0)/n
  let cov=0, varx=0
  for (let i=0;i<n;i++) { cov+=(x[i]-xm)*(y[i]-ym); varx+=(x[i]-xm)**2 }
  const beta  = varx>0 ? cov/varx : 1
  const alpha = ym - beta*xm
  const residuals = y.slice(0,n).map((yi,i) => yi - alpha - beta*x[i])
  return { beta, alpha, residuals }
}

function pearson(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length)
  if (n < 10) return 0
  const xm=x.slice(0,n).reduce((s,v)=>s+v,0)/n
  const ym=y.slice(0,n).reduce((s,v)=>s+v,0)/n
  let cov=0,sx=0,sy=0
  for (let i=0;i<n;i++) { cov+=(x[i]-xm)*(y[i]-ym); sx+=(x[i]-xm)**2; sy+=(y[i]-ym)**2 }
  return Math.sqrt(sx*sy)>0 ? cov/Math.sqrt(sx*sy) : 0
}

function calcHalfLife(spread: number[]) {
  const n = spread.length-1
  if (n < 10) return 999
  const lag   = spread.slice(0,n)
  const delta = spread.slice(1).map((s,i) => s-spread[i])
  const { beta } = ols(delta, lag)
  return beta < 0 ? -Math.log(2)/beta : 999
}

export function analyzePair(
  symbol1: string, symbol2: string,
  prices1: number[], prices2: number[],
  lookback = 252
): PairAnalysis {
  const n  = Math.min(prices1.length, prices2.length, lookback)
  const p1 = prices1.slice(-n)
  const p2 = prices2.slice(-n)

  if (n < 20) {
    return {
      symbol1, symbol2, correlation: 0, hedgeRatio: 1,
      currentZScore: 0, spreadMean: 0, spreadStd: 0,
      halfLife: 999, isPaired: false, dataPoints: n,
    }
  }

  const corr = pearson(p1, p2)
  const { beta, residuals } = ols(p1, p2)
  if (residuals.length === 0) {
    return {
      symbol1, symbol2, correlation: corr, hedgeRatio: beta,
      currentZScore: 0, spreadMean: 0, spreadStd: 0,
      halfLife: 999, isPaired: false, dataPoints: n,
    }
  }

  const mean  = residuals.reduce((s,r)=>s+r,0)/residuals.length
  const std   = Math.sqrt(residuals.reduce((s,r)=>s+(r-mean)**2,0)/residuals.length)
  const z     = std>0 ? (residuals[residuals.length-1]-mean)/std : 0
  const hl    = calcHalfLife(residuals)
  const isPaired = Math.abs(corr)>=0.8 && hl>=5 && hl<=60

  return {
    symbol1, symbol2, correlation: corr, hedgeRatio: beta,
    currentZScore: z, spreadMean: mean, spreadStd: std,
    halfLife: hl, isPaired, dataPoints: n,
  }
}

export function generatePairSignal(
  analysis: PairAnalysis,
  entryThreshold = 2.0,
  exitThreshold  = 0.5
): PairSignal {
  const pair = `${analysis.symbol1}/${analysis.symbol2}`
  const z    = analysis.currentZScore
  let signal: PairSignal['signal'] = 'NEUTRAL'
  let action = '진입 조건 미충족'

  if (!analysis.isPaired) {
    action = analysis.dataPoints < 20
      ? '데이터 부족 (20일 이상 필요)'
      : '공적분 관계 불충분 — 거래 부적합'
  } else if (z > entryThreshold) {
    signal = 'SHORT_SPREAD'
    action = `${analysis.symbol1} 매도 + ${analysis.symbol2} 매수\n(스프레드 +${z.toFixed(2)}σ 과확대 → 수렴 예상)`
  } else if (z < -entryThreshold) {
    signal = 'LONG_SPREAD'
    action = `${analysis.symbol1} 매수 + ${analysis.symbol2} 매도\n(스프레드 ${z.toFixed(2)}σ 과축소 → 확대 예상)`
  } else if (Math.abs(z) < exitThreshold) {
    signal = 'EXIT'
    action = `스프레드 수렴 완료 (Z=${z.toFixed(2)}) — 포지션 청산 타이밍`
  } else {
    action = `Z=${z.toFixed(2)} — 진입 임계값(±${entryThreshold}) 미달`
  }

  const confidence = analysis.isPaired
    ? Math.min(Math.abs(z)/3 * Math.abs(analysis.correlation), 1)
    : 0

  return { pair, signal, currentZScore: z, halfLife: analysis.halfLife, confidence, action }
}

export const KNOWN_PAIRS = [
  { symbol1: 'SPY',     symbol2: 'QQQ',     label: 'S&P500 vs 나스닥' },
  { symbol1: 'GLD',     symbol2: 'SLV',     label: '금 vs 은' },
  { symbol1: 'XLE',     symbol2: 'XOM',     label: '에너지ETF vs 엑슨모빌' },
  { symbol1: 'BTC-USD', symbol2: 'ETH-USD', label: '비트코인 vs 이더리움' },
  { symbol1: 'XLF',     symbol2: 'JPM',     label: '금융ETF vs JP모건' },
  { symbol1: 'QQQ',     symbol2: 'NVDA',    label: '나스닥 vs 엔비디아' },
]
```

---

## 2. app/api/stat-arb/route.ts (신규)

```typescript
// app/api/stat-arb/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { analyzePair, generatePairSignal, extractCloseprices } from '@/lib/stat-arb'

export async function POST(req: NextRequest) {
  try {
    const { pairs, entryThreshold = 2.0, exitThreshold = 0.5 } = await req.json()

    if (!pairs || pairs.length === 0) {
      return NextResponse.json({ error: '페어 데이터가 없습니다' }, { status: 400 })
    }

    const results = pairs.map((p: Record<string, unknown>) => {
      // 서버에서 명시적으로 가격 추출 — 형식 불일치 방지
      const prices1 = extractCloseprices((p.prices1 as unknown[]) ?? [])
      const prices2 = extractCloseprices((p.prices2 as unknown[]) ?? [])
      const analysis = analyzePair(
        String(p.symbol1), String(p.symbol2),
        prices1, prices2
      )
      const signal = generatePairSignal(analysis, entryThreshold, exitThreshold)
      return { analysis, signal }
    })

    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

---

## 3. app/stat-arb/page.tsx (신규)

```typescript
'use client'
import { useState } from 'react'
import { KNOWN_PAIRS, extractCloseprices } from '@/lib/stat-arb'
import type { PairAnalysis, PairSignal } from '@/lib/stat-arb'

interface PairResult { analysis: PairAnalysis; signal: PairSignal }

const SIG_STYLE = {
  LONG_SPREAD:  { bg:'bg-green-900/20', border:'border-green-700/40', text:'text-green-400',  label:'매수 스프레드' },
  SHORT_SPREAD: { bg:'bg-red-900/20',   border:'border-red-700/40',   text:'text-red-400',    label:'매도 스프레드' },
  EXIT:         { bg:'bg-yellow-900/20',border:'border-yellow-700/40',text:'text-yellow-400', label:'청산' },
  NEUTRAL:      { bg:'bg-gray-900/20',  border:'border-gray-700/40',  text:'text-gray-400',   label:'관망' },
}

// Z-스코어 게이지 — 한도 처리 버그 수정
function ZGauge({ z, entry }: { z: number; entry: number }) {
  // 최대 ±entry*1.5 범위 표시. 50%가 중심(0)
  const maxRange = entry * 1.5
  // pct: 0~50 (절반 너비)
  const pct = Math.min(Math.abs(z) / maxRange * 50, 50)
  const isPositive = z >= 0
  const exceeded = Math.abs(z) >= entry
  const barColor = exceeded
    ? (isPositive ? 'bg-red-500' : 'bg-green-500')
    : 'bg-gray-500'
  // left: 양수면 50%서 오른쪽, 음수면 50-pct%서 시작
  const left  = isPositive ? 50 : 50 - pct
  const width = pct

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>-{entry.toFixed(1)}σ</span>
        <span className="text-gray-500">0</span>
        <span>+{entry.toFixed(1)}σ</span>
      </div>
      <div className="relative w-full h-2 bg-gray-800 rounded-full">
        {/* 중앙선 */}
        <div className="absolute top-0 left-1/2 w-px h-2 bg-gray-600 z-10" />
        {/* 진입 임계값 표시선 */}
        <div className="absolute top-0 h-2 w-px bg-gray-600 opacity-50"
          style={{ left: `${50 - 50/1.5}%` }} />
        <div className="absolute top-0 h-2 w-px bg-gray-600 opacity-50"
          style={{ left: `${50 + 50/1.5}%` }} />
        {/* Z 바 */}
        <div className={`absolute top-0 h-2 rounded-full transition-all ${barColor}`}
          style={{ left: `${left}%`, width: `${width}%` }} />
      </div>
      <div className="flex justify-center mt-1">
        <span className={`text-xs font-bold ${exceeded ? (isPositive ? 'text-red-400' : 'text-green-400') : 'text-gray-400'}`}>
          Z = {z > 0 ? '+' : ''}{z.toFixed(3)}
        </span>
      </div>
    </div>
  )
}

export default function StatArbPage() {
  const [entryThreshold, setEntry] = useState(2.0)
  const [exitThreshold,  setExit]  = useState(0.5)
  const [results,  setResults]     = useState<PairResult[]>([])
  const [loading,  setLoading]     = useState(false)
  const [error,    setError]       = useState<string | null>(null)
  const [warnings, setWarnings]    = useState<string[]>([])

  const runAnalysis = async () => {
    setError(null); setWarnings([]); setLoading(true)
    try {
      const pairsRaw = await Promise.all(
        KNOWN_PAIRS.map(async p => {
          const [r1, r2] = await Promise.allSettled([
            fetch(`/api/realtime-prices?symbol=${encodeURIComponent(p.symbol1)}`).then(r=>r.json()),
            fetch(`/api/realtime-prices?symbol=${encodeURIComponent(p.symbol2)}`).then(r=>r.json()),
          ])
          const d1 = r1.status==='fulfilled' ? r1.value : {}
          const d2 = r2.status==='fulfilled' ? r2.value : {}
          // 다양한 응답 구조 대응
          const raw1 = d1.prices ?? d1.history ?? d1.data ?? []
          const raw2 = d2.prices ?? d2.history ?? d2.data ?? []
          return {
            symbol1: p.symbol1, symbol2: p.symbol2,
            prices1: raw1,  // 서버에서 extractCloseprices로 처리
            prices2: raw2,
          }
        })
      )

      // 데이터 경고 수집
      const warns: string[] = []
      pairsRaw.forEach(p => {
        const n1 = extractCloseprices(p.prices1).length
        const n2 = extractCloseprices(p.prices2).length
        if (n1 < 20) warns.push(`${p.symbol1}: 데이터 ${n1}개 (20개 이상 필요)`)
        if (n2 < 20) warns.push(`${p.symbol2}: 데이터 ${n2}개 (20개 이상 필요)`)
      })
      setWarnings(warns)

      const res = await fetch('/api/stat-arb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairs: pairsRaw, entryThreshold, exitThreshold }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResults(data.results ?? [])
    } catch(e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const actionSignals = results.filter(r =>
    r.signal.signal === 'LONG_SPREAD' || r.signal.signal === 'SHORT_SPREAD'
  )

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">통계적 차익거래</h1>
          <p className="text-gray-500 text-sm mt-1">
            페어 트레이딩 — 시장 방향 무관, 스프레드 수렴 수익 (Engle-Granger)
          </p>
        </div>

        {/* 설정 */}
        <div className="bg-gray-900 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-6 items-end">
            <div>
              <p className="text-orange-400 text-xs font-semibold mb-1">
                진입 임계값: ±{entryThreshold.toFixed(1)}σ
              </p>
              <input type="range" min={1.0} max={3.0} step={0.1}
                value={entryThreshold}
                onChange={e => setEntry(Number(e.target.value))}
                className="w-40 accent-orange-500"
              />
              <p className="text-gray-600 text-xs">높을수록 신호 드물지만 정확도↑</p>
            </div>
            <div>
              <p className="text-orange-400 text-xs font-semibold mb-1">
                청산 임계값: ±{exitThreshold.toFixed(1)}σ
              </p>
              <input type="range" min={0.1} max={1.0} step={0.1}
                value={exitThreshold}
                onChange={e => setExit(Number(e.target.value))}
                className="w-40 accent-orange-500"
              />
            </div>
            <button onClick={runAnalysis} disabled={loading}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-xl font-semibold text-sm transition-colors">
              {loading ? '분석 중...' : '페어 분석 실행'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm mb-4">{error}</div>
        )}
        {warnings.length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3 text-yellow-400 text-xs mb-4">
            <p className="font-medium mb-1">⚠️ 데이터 경고</p>
            {warnings.map((w,i) => <p key={i}>{w}</p>)}
          </div>
        )}

        {/* 액션 신호 요약 */}
        {actionSignals.length > 0 && (
          <div className="bg-orange-900/20 border border-orange-700/40 rounded-xl p-4 mb-4">
            <p className="text-orange-400 font-semibold text-sm mb-2">
              🔴 진입 신호 {actionSignals.length}개
            </p>
            {actionSignals.map(r => (
              <div key={r.signal.pair} className="text-xs text-gray-300 mb-1">
                <span className="font-bold">{r.signal.pair}</span>
                <span className="text-gray-500 ml-2">{SIG_STYLE[r.signal.signal].label}</span>
                <span className="text-orange-400 ml-2">Z={r.signal.currentZScore.toFixed(2)}</span>
                <span className="text-gray-500 ml-2">신뢰도 {(r.signal.confidence*100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}

        {/* 페어 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map(({ analysis, signal }) => {
            const meta = KNOWN_PAIRS.find(p =>
              p.symbol1===analysis.symbol1 && p.symbol2===analysis.symbol2
            )
            const col = SIG_STYLE[signal.signal]

            return (
              <div key={signal.pair}
                className={`rounded-xl p-4 border ${col.bg} ${col.border}`}>

                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-white font-bold">{signal.pair}</p>
                    <p className="text-gray-500 text-xs">{meta?.label}</p>
                    <p className="text-gray-600 text-xs">데이터 {analysis.dataPoints}개</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${col.text} bg-black/30`}>
                      {col.label}
                    </span>
                    {!analysis.isPaired && analysis.dataPoints >= 20 && (
                      <p className="text-gray-600 text-xs mt-1">공적분 약함</p>
                    )}
                  </div>
                </div>

                <ZGauge z={signal.currentZScore} entry={entryThreshold} />

                <div className="grid grid-cols-3 gap-2 text-xs mt-3 mb-3">
                  <div className="bg-black/20 rounded p-2">
                    <p className="text-gray-500">상관계수</p>
                    <p className={`font-bold ${Math.abs(analysis.correlation)>=0.8?'text-green-400':'text-red-400'}`}>
                      {analysis.correlation.toFixed(3)}
                    </p>
                  </div>
                  <div className="bg-black/20 rounded p-2">
                    <p className="text-gray-500">반감기</p>
                    <p className={`font-bold ${analysis.halfLife<=60?'text-green-400':'text-gray-400'}`}>
                      {analysis.halfLife>500 ? '∞' : `${analysis.halfLife.toFixed(0)}일`}
                    </p>
                  </div>
                  <div className="bg-black/20 rounded p-2">
                    <p className="text-gray-500">신뢰도</p>
                    <p className="text-orange-400 font-bold">
                      {(signal.confidence*100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div className="bg-black/20 rounded p-2">
                  <p className="text-gray-500 text-xs mb-0.5">행동 지침</p>
                  <p className={`text-xs font-medium whitespace-pre-line ${col.text}`}>
                    {signal.action}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {results.length === 0 && !loading && (
          <div className="bg-gray-900 rounded-xl p-16 text-center">
            <p className="text-gray-500">페어 분석 실행 버튼을 누르세요</p>
            <p className="text-gray-600 text-xs mt-2">6개 페어 동시 분석 — Engle-Granger 공적분 검정</p>
          </div>
        )}

        <div className="mt-6 bg-gray-900 rounded-xl p-4">
          <p className="text-orange-400 text-xs font-semibold mb-2">페어 트레이딩 원리</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-400">
            <div>
              <span className="text-white font-medium">공적분</span>
              <p className="mt-0.5">상관계수 0.8+, 반감기 5~60일 동시 만족 시 유효한 페어</p>
            </div>
            <div>
              <span className="text-white font-medium">Z-스코어</span>
              <p className="mt-0.5">±{entryThreshold.toFixed(1)}σ 초과 시 진입. ±{exitThreshold.toFixed(1)}σ 이하 시 청산</p>
            </div>
            <div>
              <span className="text-white font-medium">반감기</span>
              <p className="mt-0.5">평균회귀 소요 시간. 5일 미만=노이즈, 60일 초과=회귀 너무 느림</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 4. 메뉴 추가

```typescript
{ href: "/stat-arb", label: "⚡ 차익거래" },
```

---

## 완료 확인

```bash
npm run build
# localhost:3000/stat-arb 접속
# 분석 실행 → Z-스코어 게이지 정상 표시 확인
# 데이터 부족 종목은 경고 표시 확인
```
