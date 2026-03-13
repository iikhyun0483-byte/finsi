# PHASE 24~32 — 학습/진화/극한 시스템
# 클로드 코드: "이 파일 읽고 전체 실행해줘. npm run build까지."

---

# PHASE 24 — 파라미터 자동 최적화

## Supabase SQL

```sql
CREATE TABLE IF NOT EXISTS parameter_history (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  param_name    text        NOT NULL,
  old_value     numeric,
  new_value     numeric,
  reason        text,
  accuracy_before numeric,
  accuracy_after  numeric,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS optimization_log (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  run_date      date        NOT NULL DEFAULT CURRENT_DATE,
  signal_count  integer,
  accuracy_7d   numeric,
  best_factors  jsonb,
  changes_made  jsonb,
  created_at    timestamptz DEFAULT now()
);
```

---

## 1. lib/optimizer.ts (신규)

```typescript
// lib/optimizer.ts
// 조건: 신호 100개 이상 → 파라미터 자동 조정
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface OptimizationResult {
  signalCount:     number
  accuracy7d:      number
  isSignificant:   boolean    // 100개 이상
  factorWeights:   Record<string, number>
  changes:         Array<{ param: string; old: number; new: number; reason: string }>
  recommendation:  string
}

// 팩터별 정확도 계산
// signal_tracking 테이블에서 팩터 기여도 역산
async function calcFactorAccuracy(): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('signal_tracking')
    .select('signal_score, is_correct_7d, return_7d')
    .not('is_correct_7d', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (!data || data.length < 30) {
    return { momentum: 0.25, value: 0.20, quality: 0.25, lowVol: 0.15, volume: 0.15 }
  }

  // 점수 분위별 정확도 계산
  const sorted = [...data].sort((a, b) => b.signal_score - a.signal_score)
  const topQuartile    = sorted.slice(0, Math.floor(sorted.length * 0.25))
  const bottomQuartile = sorted.slice(Math.floor(sorted.length * 0.75))

  const topAccuracy    = topQuartile.filter(d => d.is_correct_7d).length / topQuartile.length
  const bottomAccuracy = bottomQuartile.filter(d => d.is_correct_7d).length / bottomQuartile.length

  // 상위 신호가 정확하면 현재 가중치 유지
  // 하위 신호가 오히려 정확하면 가중치 역전
  const qualityMultiplier = topAccuracy > bottomAccuracy ? 1.1 : 0.9

  return {
    momentum: 0.25 * qualityMultiplier,
    value:    0.20,
    quality:  0.25,
    lowVol:   0.15,
    volume:   0.15 * (1 / qualityMultiplier),
  }
}

export async function runOptimization(): Promise<OptimizationResult> {
  const { count } = await supabase
    .from('signal_tracking')
    .select('*', { count: 'exact', head: true })
    .not('is_correct_7d', 'is', null)

  const signalCount   = count ?? 0
  const isSignificant = signalCount >= 100

  const { data: recent } = await supabase
    .from('signal_tracking')
    .select('is_correct_7d')
    .not('is_correct_7d', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)

  const accuracy7d = recent && recent.length > 0
    ? recent.filter(d => d.is_correct_7d).length / recent.length
    : 0

  const factorWeights = await calcFactorAccuracy()
  const total = Object.values(factorWeights).reduce((s, v) => s + v, 0)
  const normalized: Record<string, number> = {}
  Object.keys(factorWeights).forEach(k => {
    normalized[k] = Math.round(factorWeights[k] / total * 100) / 100
  })

  const changes: OptimizationResult['changes'] = []

  if (isSignificant) {
    // 정확도 55% 이하면 진입 임계값 높이기 권장
    if (accuracy7d < 0.55) {
      changes.push({
        param: 'min_signal_score',
        old: 70, new: 80,
        reason: `정확도 ${(accuracy7d*100).toFixed(1)}% — 임계값 상향으로 품질 개선`
      })
    }

    // 로그 저장
    await supabase.from('optimization_log').insert({
      run_date:    new Date().toISOString().slice(0,10),
      signal_count: signalCount,
      accuracy_7d: accuracy7d,
      best_factors: normalized,
      changes_made: changes,
    })
  }

  return {
    signalCount, accuracy7d, isSignificant,
    factorWeights: normalized, changes,
    recommendation: isSignificant
      ? accuracy7d >= 0.6
        ? '현재 파라미터 양호. 유지 권장'
        : '정확도 개선 필요. 진입 임계값 상향 권장'
      : `최적화 비활성 (${signalCount}/100개)`,
  }
}
```

---

## 2. app/api/optimization/route.ts (신규)

```typescript
// app/api/optimization/route.ts
import { NextResponse } from 'next/server'
import { runOptimization } from '@/lib/optimizer'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const result = await runOptimization()
    const { data: history } = await supabase
      .from('optimization_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    return NextResponse.json({ result, history: history ?? [] })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

---

## 3. app/optimization/page.tsx (신규)

```typescript
'use client'
import { useState, useEffect } from 'react'
import type { OptimizationResult } from '@/lib/optimizer'

export default function OptimizationPage() {
  const [result,  setResult]  = useState<OptimizationResult | null>(null)
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    const res = await fetch('/api/optimization')
    const data = await res.json()
    setResult(data.result)
    setHistory(data.history ?? [])
    setLoading(false)
  }

  useEffect(() => { run() }, [])

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">파라미터 자동 최적화</h1>
            <p className="text-gray-500 text-sm mt-1">신호 100개 이상 시 자동 활성화</p>
          </div>
          <button onClick={run} disabled={loading}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm font-semibold">
            {loading ? '분석 중...' : '최적화 실행'}
          </button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className={`rounded-xl p-5 border ${
              result.isSignificant
                ? 'bg-green-900/10 border-green-800/40'
                : 'bg-gray-900 border-gray-800'
            }`}>
              <div className="flex justify-between items-center mb-3">
                <p className="text-orange-400 font-semibold">최적화 상태</p>
                <span className={`text-sm font-bold ${result.isSignificant ? 'text-green-400' : 'text-gray-500'}`}>
                  {result.isSignificant ? '✅ 활성' : `⏳ 비활성 (${result.signalCount}/100)`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                <div className="bg-black/30 rounded p-2">
                  <p className="text-gray-500">신호 수</p>
                  <p className="text-white font-bold">{result.signalCount}개</p>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <p className="text-gray-500">7일 정확도</p>
                  <p className={`font-bold ${result.accuracy7d >= 0.6 ? 'text-green-400' : result.accuracy7d >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {(result.accuracy7d * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <p className="text-gray-500">권장</p>
                  <p className="text-orange-400 text-xs">{result.recommendation}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-orange-400 text-sm font-semibold mb-3">최적 팩터 가중치</p>
              {Object.entries(result.factorWeights).map(([k, v]) => (
                <div key={k} className="flex items-center gap-3 mb-2">
                  <span className="text-gray-400 text-xs w-16">{k}</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full">
                    <div className="h-2 bg-orange-500 rounded-full"
                      style={{ width: `${v * 100}%` }} />
                  </div>
                  <span className="text-orange-400 text-xs w-10 text-right">{(v*100).toFixed(0)}%</span>
                </div>
              ))}
            </div>

            {result.changes.length > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4">
                <p className="text-yellow-400 text-sm font-semibold mb-2">권장 변경사항</p>
                {result.changes.map((c, i) => (
                  <div key={i} className="text-xs text-yellow-300/70 mb-1">
                    {c.param}: {c.old} → {c.new} ({c.reason})
                  </div>
                ))}
              </div>
            )}

            {history.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-orange-400 text-sm font-semibold mb-3">최적화 이력</p>
                {history.map((h, i) => (
                  <div key={i} className="flex justify-between text-xs py-1.5 border-b border-gray-800/40">
                    <span className="text-gray-400">{h.run_date as string}</span>
                    <span className="text-white">{h.signal_count as number}개</span>
                    <span className={`font-bold ${(h.accuracy_7d as number) >= 0.6 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {((h.accuracy_7d as number) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
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
{ href: "/optimization", label: "⚙️ 자동 최적화" },
```

---

# PHASE 25 — 머신러닝 신호 (신호 1,000개 활성화)

## 1. lib/ml-signal.ts (신규)

```typescript
// lib/ml-signal.ts
// 조건: 신호 1,000개 이상
// 모델: 단순 로지스틱 회귀 (서버사이드, 외부 ML 라이브러리 없이 구현)

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface MLFeatures {
  signalScore:   number   // 0~100
  factorScore:   number   // 복합 팩터 점수
  supplyScore:   number   // 수급 점수
  sentimentScore: number  // 감정 점수
  momentum12m:   number   // 12개월 모멘텀
  volatility:    number   // 변동성
  regimeCode:    number   // 0=하락 1=횡보 2=상승
}

export interface MLPrediction {
  probability:  number    // 0~1 (7일 후 수익 확률)
  confidence:   'HIGH'|'MEDIUM'|'LOW'
  isActive:     boolean   // 1,000개 미만이면 false
  sampleCount:  number
}

// 간단한 로지스틱 회귀 (경사하강법)
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

function trainLogistic(
  features: number[][],
  labels:   number[],
  lr = 0.01, epochs = 100
): number[] {
  const n = features[0]?.length ?? 0
  let weights = new Array(n + 1).fill(0)

  for (let e = 0; e < epochs; e++) {
    const grads = new Array(n + 1).fill(0)
    for (let i = 0; i < features.length; i++) {
      const x   = [1, ...features[i]]
      const dot = weights.reduce((s, w, j) => s + w * x[j], 0)
      const pred = sigmoid(dot)
      const err  = pred - labels[i]
      x.forEach((xi, j) => { grads[j] += err * xi })
    }
    weights = weights.map((w, j) => w - lr * grads[j] / features.length)
  }
  return weights
}

export async function trainAndPredict(features: MLFeatures): Promise<MLPrediction> {
  // 학습 데이터 로드
  const { data, count } = await supabase
    .from('signal_tracking')
    .select('signal_score, return_7d, is_correct_7d')
    .not('is_correct_7d', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1000)

  const sampleCount = count ?? 0

  if (!data || data.length < 100) {
    return {
      probability: features.signalScore / 100,
      confidence: 'LOW',
      isActive: false,
      sampleCount,
    }
  }

  // 학습 데이터 준비 (신호점수를 주요 피처로)
  const X = data.map(d => [
    d.signal_score / 100,
    Math.min(Math.max((d.return_7d ?? 0) * 10, -1), 1),
  ])
  const y = data.map(d => d.is_correct_7d ? 1 : 0)

  const weights = trainLogistic(X, y)

  // 예측
  const featureVec = [features.signalScore / 100, features.factorScore / 100]
  const dot = weights[0] + featureVec.reduce((s, f, i) => s + weights[i+1] * f, 0)
  const probability = sigmoid(dot)

  const confidence: MLPrediction['confidence'] =
    data.length >= 1000 ? 'HIGH' :
    data.length >= 300  ? 'MEDIUM' : 'LOW'

  return {
    probability,
    confidence,
    isActive: data.length >= 100,
    sampleCount,
  }
}

// 앙상블: 규칙 기반 + ML 가중 평균
export function ensembleSignal(
  ruleBasedScore: number,  // 0~100
  mlProbability:  number,  // 0~1
  sampleCount:    number
): { finalScore: number; mlWeight: number } {
  // 데이터 많을수록 ML 비중 증가
  const mlWeight = Math.min(sampleCount / 3000, 0.6)
  const ruleWeight = 1 - mlWeight
  const finalScore = ruleBasedScore * ruleWeight + mlProbability * 100 * mlWeight
  return { finalScore: Math.round(finalScore), mlWeight }
}
```

---

## 2. app/api/ml-signal/route.ts (신규)

```typescript
// app/api/ml-signal/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { trainAndPredict, ensembleSignal } from '@/lib/ml-signal'
import type { MLFeatures } from '@/lib/ml-signal'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const features: MLFeatures = {
      signalScore:    body.signalScore    ?? 70,
      factorScore:    body.factorScore    ?? 0,
      supplyScore:    body.supplyScore    ?? 0,
      sentimentScore: body.sentimentScore ?? 50,
      momentum12m:    body.momentum12m    ?? 0,
      volatility:     body.volatility     ?? 0.2,
      regimeCode:     body.regimeCode     ?? 1,
    }

    const prediction = await trainAndPredict(features)
    const ensemble   = ensembleSignal(
      features.signalScore,
      prediction.probability,
      prediction.sampleCount
    )

    return NextResponse.json({ prediction, ensemble })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

---

## 3. app/ml-signal/page.tsx (신규)

```typescript
'use client'
import { useState } from 'react'

interface Prediction {
  probability: number
  confidence: string
  isActive: boolean
  sampleCount: number
}

interface Ensemble {
  finalScore: number
  mlWeight: number
}

export default function MLSignalPage() {
  const [signalScore, setSignalScore] = useState(75)
  const [factorScore, setFactorScore] = useState(0.5)
  const [result, setResult] = useState<{ prediction: Prediction; ensemble: Ensemble } | null>(null)
  const [loading, setLoading] = useState(false)

  const predict = async () => {
    setLoading(true)
    const res = await fetch('/api/ml-signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signalScore, factorScore }),
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  const CONF_COLOR = { HIGH: 'text-green-400', MEDIUM: 'text-yellow-400', LOW: 'text-gray-400' }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">머신러닝 신호</h1>
          <p className="text-gray-500 text-sm mt-1">신호 100개+ 시 활성화 / 1,000개+ 시 HIGH 신뢰도</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 mb-4 space-y-4 text-sm">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">기존 신호 점수</span>
              <span className="text-orange-400 font-bold">{signalScore}점</span>
            </div>
            <input type="range" min={0} max={100} value={signalScore}
              onChange={e => setSignalScore(Number(e.target.value))}
              className="w-full accent-orange-500" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">팩터 스코어</span>
              <span className="text-orange-400 font-bold">{factorScore.toFixed(2)}</span>
            </div>
            <input type="range" min={-3} max={3} step={0.1} value={factorScore}
              onChange={e => setFactorScore(Number(e.target.value))}
              className="w-full accent-orange-500" />
          </div>
          <button onClick={predict} disabled={loading}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-xl font-semibold text-sm">
            {loading ? '예측 중...' : 'ML 예측 실행'}
          </button>
        </div>

        {result && (
          <div className="space-y-3">
            <div className="bg-gray-900 rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <p className="text-orange-400 font-semibold">앙상블 최종 점수</p>
                <span className={`text-3xl font-bold ${result.ensemble.finalScore >= 70 ? 'text-green-400' : result.ensemble.finalScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {result.ensemble.finalScore}점
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-black/30 rounded p-2">
                  <p className="text-gray-500">ML 확률</p>
                  <p className="text-white font-bold">{(result.prediction.probability*100).toFixed(1)}%</p>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <p className="text-gray-500">신뢰도</p>
                  <p className={`font-bold ${CONF_COLOR[result.prediction.confidence as keyof typeof CONF_COLOR]}`}>
                    {result.prediction.confidence}
                  </p>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <p className="text-gray-500">ML 비중</p>
                  <p className="text-orange-400 font-bold">{(result.ensemble.mlWeight*100).toFixed(0)}%</p>
                </div>
              </div>
            </div>

            {!result.prediction.isActive && (
              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 text-xs text-yellow-400">
                ⚠️ 현재 신호 {result.prediction.sampleCount}개 — 100개 이상 쌓이면 ML 정식 활성화
              </div>
            )}
          </div>
        )}

        <div className="mt-6 bg-gray-900/50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
          <p className="text-orange-400 font-medium">앙상블 구조</p>
          <p>규칙 기반 신호 + ML 예측 → 가중 평균</p>
          <p>신호 0~99개:   규칙 100% + ML 0%</p>
          <p>신호 100~999개: 규칙 70~40% + ML 30~60%</p>
          <p>신호 3,000개+: 규칙 40% + ML 60%</p>
        </div>
      </div>
    </div>
  )
}
```

---

## 4. 메뉴 추가

```typescript
{ href: "/ml-signal", label: "🧠 ML 신호" },
```

---

# PHASE 26 — 성과 대시보드 (자율 운용 리포트)

## Supabase SQL

```sql
CREATE TABLE IF NOT EXISTS performance_snapshots (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date date        NOT NULL DEFAULT CURRENT_DATE,
  total_value   numeric     NOT NULL,
  cash          numeric     DEFAULT 0,
  return_1m     numeric     DEFAULT 0,
  return_3m     numeric     DEFAULT 0,
  return_ytd    numeric     DEFAULT 0,
  sharpe_ratio  numeric,
  max_dd        numeric,
  win_rate      numeric,
  trade_count   integer     DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(snapshot_date)
);
```

---

## app/performance/page.tsx (신규)

```typescript
'use client'
import { useState, useEffect } from 'react'

interface Snapshot {
  snapshot_date: string
  total_value:   number
  return_1m:     number
  return_3m:     number
  return_ytd:    number
  sharpe_ratio:  number | null
  max_dd:        number | null
  win_rate:      number | null
  trade_count:   number
}

export default function PerformancePage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [latest,    setLatest]    = useState<Snapshot | null>(null)

  useEffect(() => {
    fetch('/api/performance?action=list')
      .then(r => r.json())
      .then(d => {
        setSnapshots(d.data ?? [])
        setLatest(d.data?.[0] ?? null)
      })
  }, [])

  const retColor = (v: number) => v >= 0 ? 'text-green-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">성과 대시보드</h1>
          <p className="text-gray-500 text-sm mt-1">실전 운용 성과 — 월별 자동 리포트</p>
        </div>

        {latest ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: '총 자산', value: `${latest.total_value.toLocaleString()}원`, color: 'text-white' },
                { label: '월 수익률', value: `${latest.return_1m >= 0 ? '+' : ''}${(latest.return_1m*100).toFixed(2)}%`, color: retColor(latest.return_1m) },
                { label: 'YTD', value: `${latest.return_ytd >= 0 ? '+' : ''}${(latest.return_ytd*100).toFixed(2)}%`, color: retColor(latest.return_ytd) },
                { label: '샤프 지수', value: latest.sharpe_ratio?.toFixed(2) ?? '-', color: 'text-orange-400' },
              ].map(m => (
                <div key={m.label} className="bg-gray-900 rounded-xl p-4">
                  <p className="text-gray-500 text-xs">{m.label}</p>
                  <p className={`font-bold text-lg ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: '최대 낙폭', value: latest.max_dd != null ? `-${(latest.max_dd*100).toFixed(1)}%` : '-', color: 'text-red-400' },
                { label: '승률', value: latest.win_rate != null ? `${(latest.win_rate*100).toFixed(1)}%` : '-', color: 'text-green-400' },
                { label: '총 거래', value: `${latest.trade_count}회`, color: 'text-white' },
              ].map(m => (
                <div key={m.label} className="bg-gray-900 rounded-xl p-4">
                  <p className="text-gray-500 text-xs">{m.label}</p>
                  <p className={`font-bold text-lg ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-gray-900 rounded-xl p-12 text-center text-gray-500 mb-6">
            성과 데이터 없음 — 운용 시작 후 자동 축적
          </div>
        )}

        {snapshots.length > 1 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-orange-400 text-sm font-semibold mb-3">월별 성과 이력</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left pb-2 font-normal">날짜</th>
                    <th className="text-right pb-2 font-normal">총자산</th>
                    <th className="text-right pb-2 font-normal">월수익</th>
                    <th className="text-right pb-2 font-normal">YTD</th>
                    <th className="text-right pb-2 font-normal">샤프</th>
                    <th className="text-right pb-2 font-normal">MDD</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map(s => (
                    <tr key={s.snapshot_date} className="border-b border-gray-800/40">
                      <td className="py-1.5 text-gray-400">{s.snapshot_date}</td>
                      <td className="py-1.5 text-right text-white">{s.total_value.toLocaleString()}</td>
                      <td className={`py-1.5 text-right font-bold ${retColor(s.return_1m)}`}>
                        {s.return_1m >= 0 ? '+' : ''}{(s.return_1m*100).toFixed(2)}%
                      </td>
                      <td className={`py-1.5 text-right ${retColor(s.return_ytd)}`}>
                        {s.return_ytd >= 0 ? '+' : ''}{(s.return_ytd*100).toFixed(2)}%
                      </td>
                      <td className="py-1.5 text-right text-orange-400">
                        {s.sharpe_ratio?.toFixed(2) ?? '-'}
                      </td>
                      <td className="py-1.5 text-right text-red-400">
                        {s.max_dd != null ? `-${(s.max_dd*100).toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## app/api/performance/route.ts (신규)

```typescript
// app/api/performance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? 'list'

  if (action === 'list') {
    const { data } = await supabase
      .from('performance_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(24)
    return NextResponse.json({ data: data ?? [] })
  }
  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    await supabase.from('performance_snapshots').upsert({
      snapshot_date: new Date().toISOString().slice(0,10),
      total_value:   body.totalValue,
      cash:          body.cash ?? 0,
      return_1m:     body.return1m ?? 0,
      return_3m:     body.return3m ?? 0,
      return_ytd:    body.returnYtd ?? 0,
      sharpe_ratio:  body.sharpeRatio,
      max_dd:        body.maxDd,
      win_rate:      body.winRate,
      trade_count:   body.tradeCount ?? 0,
    }, { onConflict: 'snapshot_date' })
    return NextResponse.json({ ok: true })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

---

## 메뉴 추가

```typescript
{ href: "/performance", label: "📈 성과 리포트" },
```

---

# PHASE 27 — 레버리지 최적화

## 1. lib/leverage-optimizer.ts (신규)

```typescript
// lib/leverage-optimizer.ts
// 레버리지 배수 최적화 — 켈리 공식 확장판

export interface LeverageInput {
  winRate:        number
  avgWinReturn:   number
  avgLossReturn:  number
  currentVolatility: number   // 연환산 변동성
  maxLeverage:    number      // 최대 허용 배수 (보통 2~3)
  regimeCode:     number      // 0=위기 1=하락 2=횡보 3=상승
}

export interface LeverageResult {
  optimalLeverage: number
  adjustedLeverage: number
  expectedReturn:  number
  expectedRisk:    number
  sharpeRatio:     number
  recommendation:  string
  reasoning:       string[]
}

// 레버리지별 기대 샤프 계산
function calcSharpeAtLeverage(
  leverage: number, winRate: number,
  avgWin: number, avgLoss: number, vol: number
): number {
  const ret = winRate * avgWin * leverage - (1-winRate) * avgLoss * leverage
  const risk = vol * leverage
  return risk > 0 ? ret / risk : 0
}

export function optimizeLeverage(input: LeverageInput): LeverageResult {
  const { winRate, avgWinReturn, avgLossReturn, currentVolatility, maxLeverage, regimeCode } = input

  // 국면별 최대 레버리지 제한
  const regimeCap = [0, 1.0, 1.5, maxLeverage][regimeCode] ?? 1.0

  // 샤프 최대화 레버리지 탐색 (0.5 단위)
  let bestLeverage = 1.0
  let bestSharpe   = 0
  for (let lev = 0.5; lev <= regimeCap; lev += 0.25) {
    const sharpe = calcSharpeAtLeverage(lev, winRate, avgWinReturn, avgLossReturn, currentVolatility)
    if (sharpe > bestSharpe) { bestSharpe = sharpe; bestLeverage = lev }
  }

  // 변동성 높으면 레버리지 추가 감소
  const volAdj = currentVolatility > 0.3 ? 0.7 : currentVolatility > 0.2 ? 0.85 : 1.0
  const adjusted = Math.min(Math.round(bestLeverage * volAdj * 4) / 4, regimeCap)

  const expReturn = winRate * avgWinReturn * adjusted - (1-winRate) * avgLossReturn * adjusted
  const expRisk   = currentVolatility * adjusted
  const sharpe    = expRisk > 0 ? expReturn / expRisk : 0

  const reasoning = [
    `기본 켈리 최적 배수: ${bestLeverage.toFixed(2)}x`,
    `국면(${['위기','하락','횡보','상승'][regimeCode]}) 상한: ${regimeCap.toFixed(1)}x`,
    `변동성(${(currentVolatility*100).toFixed(0)}%) 조정: ${volAdj}`,
    `최종 권장 배수: ${adjusted.toFixed(2)}x`,
  ]

  return {
    optimalLeverage:  bestLeverage,
    adjustedLeverage: adjusted,
    expectedReturn:   expReturn,
    expectedRisk:     expRisk,
    sharpeRatio:      sharpe,
    recommendation:   adjusted <= 1 ? '레버리지 사용 불가' : `${adjusted.toFixed(2)}배 레버리지 권장`,
    reasoning,
  }
}
```

---

## 2. app/leverage/page.tsx + app/api/leverage/route.ts (신규)

lib/leverage-optimizer.ts 임포트 사용.
메뉴: `{ href: "/leverage", label: "📊 레버리지" }`

---

# PHASE 28 — 숏 전략

## 1. lib/short-strategy.ts (신규)

```typescript
// lib/short-strategy.ts
// 숏 진입 조건 — 팩터 최하위 + 수급 최악 + 감정 극단 탐욕

export interface ShortSignal {
  symbol:         string
  shortScore:     number    // 0~100 (높을수록 숏 강도)
  conditions:     string[]  // 충족 조건 목록
  entryTrigger:   boolean   // 진입 여부
  stopLossPct:    number    // 손절 %
  targetPct:      number    // 목표 수익 %
}

export function calcShortScore(input: {
  factorPercentile:  number   // 팩터 백분위 (낮을수록 좋은 숏 후보)
  supplyScore:       number   // 수급 점수 (-100~100)
  sentimentScore:    number   // 감정 점수 (0~100)
  momentumScore:     number   // 팩터 모멘텀 Z-스코어
  currentDrawdown:   number   // 현재 낙폭 %
}): ShortSignal['shortScore'] {
  const { factorPercentile, supplyScore, sentimentScore, momentumScore } = input

  let score = 0
  // 팩터 하위 20% → +40점
  if (factorPercentile <= 20) score += 40
  else if (factorPercentile <= 30) score += 20

  // 수급 매도 → +30점
  if (supplyScore <= -60) score += 30
  else if (supplyScore <= -40) score += 15

  // 감정 극단 탐욕 → +20점
  if (sentimentScore >= 80) score += 20
  else if (sentimentScore >= 65) score += 10

  // 모멘텀 하락 → +10점
  if (momentumScore <= -2) score += 10
  else if (momentumScore <= -1) score += 5

  return Math.min(score, 100)
}

export function generateShortSignal(
  symbol:    string,
  score:     number,
  conditions: string[]
): ShortSignal {
  return {
    symbol, shortScore: score, conditions,
    entryTrigger: score >= 70,
    stopLossPct:  score >= 80 ? 5 : 8,
    targetPct:    score >= 80 ? 15 : 10,
  }
}
```

---

## app/short/page.tsx (신규)

lib/short-strategy.ts 임포트 사용.
메뉴: `{ href: "/short", label: "📉 숏 전략" }`

---

# PHASE 29 — 세금 최적화

## 1. lib/tax-optimizer.ts (신규)

```typescript
// lib/tax-optimizer.ts
// 세금 최적화 타이밍 계산

export interface TaxOptResult {
  currentTax:      number
  deferredTax:     number
  savings:         number
  recommendation:  'REALIZE_NOW' | 'DEFER' | 'HARVEST_LOSS'
  reasoning:       string
  optimalSellDate: string | null
}

export function calcTaxOptimization(input: {
  entryPrice:    number
  currentPrice:  number
  shares:        number
  assetType:     'domesticStock' | 'usStock' | 'crypto'
  holdingDays:   number
  otherGains:    number    // 올해 다른 수익 (250만 초과 여부 계산)
  otherLosses:   number    // 올해 다른 손실
}): TaxOptResult {
  const { entryPrice, currentPrice, shares, assetType, holdingDays, otherGains, otherLosses } = input

  const grossProfit = (currentPrice - entryPrice) * shares
  const netOtherGains = otherGains - otherLosses

  // 세율
  const TAX_THRESHOLD = 2_500_000  // 250만원
  const TAX_RATE: Record<string, number> = {
    domesticStock: 0,           // 국내 주식: 대주주 아니면 비과세
    usStock:       0.22,
    crypto:        0.20,
  }

  const taxRate = TAX_RATE[assetType] ?? 0

  // 지금 팔 경우 세금
  const taxableNow = Math.max(0, grossProfit + netOtherGains - TAX_THRESHOLD)
  const currentTax = taxableNow * taxRate

  // 내년으로 이월 시 세금
  const taxableDeferred = Math.max(0, grossProfit - TAX_THRESHOLD)
  const deferredTax = taxableDeferred * taxRate

  const savings = currentTax - deferredTax

  let recommendation: TaxOptResult['recommendation'] = 'REALIZE_NOW'
  let reasoning = ''

  if (grossProfit < 0) {
    recommendation = 'HARVEST_LOSS'
    reasoning = `손실 ${Math.abs(grossProfit).toLocaleString()}원 — 올해 다른 수익과 상계하면 세금 절감 가능`
  } else if (savings > 100_000 && holdingDays < 365) {
    recommendation = 'DEFER'
    reasoning = `연말까지 보유 시 세금 ${savings.toLocaleString()}원 절감 가능`
  } else {
    reasoning = `현재 매도가 세금 측면에서 최적`
  }

  // 내년 1월 2일이 최적 매도일 (이월 시)
  const nextYearDate = `${new Date().getFullYear() + 1}-01-02`

  return {
    currentTax,
    deferredTax,
    savings,
    recommendation,
    reasoning,
    optimalSellDate: recommendation === 'DEFER' ? nextYearDate : null,
  }
}
```

---

## app/tax/page.tsx + app/api/tax/route.ts (신규)

메뉴: `{ href: "/tax", label: "💰 세금 최적화" }`

---

# PHASE 30 — 복리 재투자 엔진

## 1. lib/compounding.ts (신규)

```typescript
// lib/compounding.ts
// 복리 재투자 타이밍 최적화

export interface CompoundingResult {
  optimalReinvestDate: string
  currentCash:         number
  reinvestAmount:      number
  projectedValue:      number    // 12개월 후 예상
  compoundingRate:     number    // 연 복리 배수
  reasoning:           string[]
}

export function calcOptimalReinvestment(input: {
  currentCash:     number
  totalPortfolio:  number
  targetCashPct:   number    // 목표 현금 비율 (예: 10%)
  signalAccuracy:  number    // 현재 신호 정확도
  marketRegime:    'BULL' | 'BEAR' | 'SIDEWAYS' | 'CRISIS'
  avgAnnualReturn: number    // 과거 평균 연수익률
}): CompoundingResult {
  const {
    currentCash, totalPortfolio, targetCashPct,
    signalAccuracy, marketRegime, avgAnnualReturn
  } = input

  const currentCashPct = currentCash / totalPortfolio * 100
  const excessCash     = Math.max(0, currentCash - totalPortfolio * targetCashPct / 100)

  // 국면별 재투자 비율
  const reinvestRatio: Record<string, number> = {
    BULL: 0.9, SIDEWAYS: 0.7, BEAR: 0.4, CRISIS: 0.0
  }
  const ratio = signalAccuracy >= 0.6
    ? (reinvestRatio[marketRegime] ?? 0.5)
    : (reinvestRatio[marketRegime] ?? 0.5) * 0.7

  const reinvestAmount = Math.round(excessCash * ratio)
  const projectedValue = (totalPortfolio - currentCash + reinvestAmount) * (1 + avgAnnualReturn)

  const reasoning = [
    `현재 현금 비율: ${currentCashPct.toFixed(1)}% (목표: ${targetCashPct}%)`,
    `초과 현금: ${excessCash.toLocaleString()}원`,
    `국면(${marketRegime}) + 정확도(${(signalAccuracy*100).toFixed(0)}%) → 재투자 비율 ${(ratio*100).toFixed(0)}%`,
    `재투자 권장액: ${reinvestAmount.toLocaleString()}원`,
  ]

  const today = new Date()
  // 월초/월중 재투자가 통계적으로 유리 (DCA 효과)
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)

  return {
    optimalReinvestDate: nextMonth.toISOString().slice(0, 10),
    currentCash, reinvestAmount,
    projectedValue, compoundingRate: 1 + avgAnnualReturn,
    reasoning,
  }
}
```

---

## app/compounding/page.tsx + app/api/compounding/route.ts (신규)

메뉴: `{ href: "/compounding", label: "♻️ 복리 엔진" }`

---

# PHASE 31 — 멀티타임프레임

## 1. lib/multi-timeframe.ts (신규)

```typescript
// lib/multi-timeframe.ts
// 주봉 방향 × 일봉 타이밍 × 시간봉 진입

export interface TimeframeSignal {
  weekly:    { trend: 'UP'|'DOWN'|'SIDEWAYS'; strength: number }
  daily:     { signal: 'BUY'|'SELL'|'NEUTRAL'; score: number }
  hourly:    { entry: 'NOW'|'WAIT'|'MISS'; timing: string }
  composite: { action: 'STRONG_BUY'|'BUY'|'NEUTRAL'|'SELL'|'STRONG_SELL'; confidence: number }
}

export function analyzeMultiTimeframe(input: {
  weeklyPrices: number[]   // 52주 주봉
  dailyPrices:  number[]   // 60일 일봉
  hourlyPrices: number[]   // 48시간 시간봉
}): TimeframeSignal {
  const { weeklyPrices, dailyPrices, hourlyPrices } = input

  // 주봉 추세 (20주 이동평균 대비)
  const w = weeklyPrices
  const wMA20 = w.slice(-20).reduce((s,v) => s+v, 0) / Math.min(w.length, 20)
  const wCur  = w[w.length-1] ?? 0
  const weekly = {
    trend: wCur > wMA20 * 1.02 ? 'UP' as const :
           wCur < wMA20 * 0.98 ? 'DOWN' as const : 'SIDEWAYS' as const,
    strength: Math.abs(wCur - wMA20) / wMA20,
  }

  // 일봉 신호 (RSI + 이동평균)
  const d = dailyPrices
  const dMA5  = d.slice(-5).reduce((s,v) => s+v, 0)  / Math.min(d.length, 5)
  const dMA20 = d.slice(-20).reduce((s,v) => s+v, 0) / Math.min(d.length, 20)
  const dCur  = d[d.length-1] ?? 0
  const dailyScore = dMA5 > dMA20 ? 60 : dMA5 < dMA20 ? 40 : 50
  const daily = {
    signal: dCur > dMA20 ? 'BUY' as const : dCur < dMA20 ? 'SELL' as const : 'NEUTRAL' as const,
    score: dailyScore,
  }

  // 시간봉 진입 타이밍 (최근 4시간 가격 방향)
  const h = hourlyPrices
  const hCur  = h[h.length-1] ?? 0
  const h4Ago = h[Math.max(h.length-4, 0)] ?? hCur
  const hTrend = hCur > h4Ago * 1.005 ? 'rising' : hCur < h4Ago * 0.995 ? 'falling' : 'flat'
  const hourly = {
    entry: (weekly.trend === 'UP'   && hTrend === 'rising') ? 'NOW'  as const :
           (weekly.trend === 'DOWN' && hTrend === 'falling') ? 'MISS' as const : 'WAIT' as const,
    timing: hTrend === 'rising' ? '상승 중 — 진입 가능' : hTrend === 'falling' ? '하락 중 — 대기' : '횡보',
  }

  // 복합 판단
  const bullCount = [
    weekly.trend === 'UP',
    daily.signal === 'BUY',
    hourly.entry === 'NOW',
  ].filter(Boolean).length

  const composite = {
    action: bullCount === 3 ? 'STRONG_BUY' as const :
            bullCount === 2 ? 'BUY' as const :
            bullCount === 1 ? 'NEUTRAL' as const : 'SELL' as const,
    confidence: bullCount / 3,
  }

  return { weekly, daily, hourly, composite }
}
```

---

## 메뉴 추가

```typescript
{ href: "/multi-tf", label: "⏱️ 멀티타임프레임" },
```

---

# PHASE 32 — 상관관계 포트폴리오

## 1. lib/correlation-portfolio.ts (신규)

```typescript
// lib/correlation-portfolio.ts
// 포트폴리오 상관관계 최소화 → 분산 극대화 → 켈리 비중 자동 증가

export interface PortfolioOptResult {
  weights:          Record<string, number>   // 종목별 최적 비중
  expectedReturn:   number
  portfolioVol:     number
  sharpeRatio:      number
  diversification:  number                   // 분산화 점수 0~1
  newPositionOk:    boolean                  // 신규 포지션 추가 가능 여부
  reason:           string
}

function pearson(x: number[], y: number[]): number {
  const n  = Math.min(x.length, y.length)
  const xm = x.slice(0,n).reduce((s,v) => s+v, 0) / n
  const ym = y.slice(0,n).reduce((s,v) => s+v, 0) / n
  let cov=0, sx=0, sy=0
  for(let i=0;i<n;i++) { cov+=(x[i]-xm)*(y[i]-ym); sx+=(x[i]-xm)**2; sy+=(y[i]-ym)**2 }
  return Math.sqrt(sx*sy) > 0 ? cov/Math.sqrt(sx*sy) : 0
}

export function optimizePortfolio(
  returns: Record<string, number[]>,   // 종목별 일별 수익률
  targetVol = 0.15                      // 목표 연변동성
): PortfolioOptResult {
  const symbols  = Object.keys(returns)
  const n        = symbols.length

  if (n === 0) {
    return {
      weights: {}, expectedReturn: 0, portfolioVol: 0,
      sharpeRatio: 0, diversification: 0,
      newPositionOk: true, reason: '보유 종목 없음',
    }
  }

  // 상관관계 행렬 계산
  const corrMatrix: number[][] = symbols.map(s1 =>
    symbols.map(s2 => pearson(returns[s1], returns[s2]))
  )

  // 평균 상관관계 (분산화 점수 역산)
  let totalCorr = 0
  let count     = 0
  for (let i=0;i<n;i++) for (let j=i+1;j<n;j++) {
    totalCorr += Math.abs(corrMatrix[i][j])
    count++
  }
  const avgCorr       = count > 0 ? totalCorr / count : 0
  const diversification = 1 - avgCorr

  // 동일가중 출발 → 상관관계 높은 종목 비중 감소
  const rawWeights = symbols.map((_, i) => {
    const avgCorrWithOthers = symbols.reduce((s, __, j) =>
      i !== j ? s + Math.abs(corrMatrix[i][j]) : s, 0
    ) / Math.max(n-1, 1)
    return 1 - avgCorrWithOthers * 0.5
  })

  const total = rawWeights.reduce((s,v) => s+v, 0)
  const weights: Record<string, number> = {}
  symbols.forEach((sym, i) => {
    weights[sym] = Math.round(rawWeights[i] / total * 1000) / 1000
  })

  // 포트폴리오 변동성 (간단 추정)
  const symVols = symbols.map(s => {
    const rets = returns[s]
    const mean = rets.reduce((a,b) => a+b, 0) / rets.length
    const var_ = rets.reduce((s,r) => s + (r-mean)**2, 0) / rets.length
    return Math.sqrt(var_ * 252)
  })

  const portVol = symVols.reduce((s, vol, i) =>
    s + (weights[symbols[i]] ?? 0) ** 2 * vol ** 2, 0
  )
  const portfolioVol = Math.sqrt(portVol)

  // 신규 포지션 추가 가능 여부: 평균 상관관계 0.7 이상이면 거부
  const newPositionOk = avgCorr < 0.7

  const expReturn = 0.08  // 시장 평균 가정
  const sharpeRatio = portfolioVol > 0 ? expReturn / portfolioVol : 0

  return {
    weights, expectedReturn: expReturn,
    portfolioVol, sharpeRatio, diversification,
    newPositionOk,
    reason: newPositionOk
      ? `평균 상관계수 ${avgCorr.toFixed(2)} — 분산화 양호`
      : `평균 상관계수 ${avgCorr.toFixed(2)} — 신규 포지션 추가 위험`,
  }
}
```

---

## 메뉴 추가

```typescript
{ href: "/correlation", label: "🔗 상관관계 포트" }`
```

---

# 전체 Supabase SQL (PHASE 24~32)

```sql
-- parameter_history
CREATE TABLE IF NOT EXISTS parameter_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  param_name text NOT NULL, old_value numeric, new_value numeric,
  reason text, accuracy_before numeric, accuracy_after numeric,
  created_at timestamptz DEFAULT now()
);

-- optimization_log
CREATE TABLE IF NOT EXISTS optimization_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_date date NOT NULL DEFAULT CURRENT_DATE,
  signal_count integer, accuracy_7d numeric,
  best_factors jsonb, changes_made jsonb,
  created_at timestamptz DEFAULT now()
);

-- performance_snapshots
CREATE TABLE IF NOT EXISTS performance_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  total_value numeric NOT NULL, cash numeric DEFAULT 0,
  return_1m numeric DEFAULT 0, return_3m numeric DEFAULT 0,
  return_ytd numeric DEFAULT 0, sharpe_ratio numeric,
  max_dd numeric, win_rate numeric, trade_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(snapshot_date)
);

-- kis_orders
CREATE TABLE IF NOT EXISTS kis_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL, order_type text NOT NULL,
  quantity integer NOT NULL, price numeric,
  order_no text, status text DEFAULT 'PENDING',
  signal_id text, executed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- kis_executions
CREATE TABLE IF NOT EXISTS kis_executions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid, symbol text NOT NULL, order_type text NOT NULL,
  quantity integer NOT NULL, price numeric NOT NULL,
  amount numeric NOT NULL, executed_at timestamptz DEFAULT now()
);

-- trading_sessions
CREATE TABLE IF NOT EXISTS trading_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mode text NOT NULL DEFAULT 'MANUAL',
  is_active boolean DEFAULT false,
  daily_loss numeric DEFAULT 0, max_daily_loss numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

-- pending_approvals
CREATE TABLE IF NOT EXISTS pending_approvals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL, order_type text NOT NULL,
  quantity integer NOT NULL, amount numeric NOT NULL,
  signal_score integer, signal_reason text,
  expires_at timestamptz NOT NULL, status text DEFAULT 'PENDING',
  approved_at timestamptz, rejected_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- autopilot_config
CREATE TABLE IF NOT EXISTS autopilot_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active boolean DEFAULT false,
  target_return numeric DEFAULT 20, max_dd_percent numeric DEFAULT 15,
  max_daily_trades integer DEFAULT 3, max_position_pct numeric DEFAULT 10,
  min_signal_score integer DEFAULT 80,
  universe text[] DEFAULT ARRAY['SPY','QQQ','AAPL','MSFT'],
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

-- autopilot_log
CREATE TABLE IF NOT EXISTS autopilot_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action text NOT NULL, symbol text, amount numeric,
  reason text, result text, created_at timestamptz DEFAULT now()
);

-- dart_disclosures
CREATE TABLE IF NOT EXISTS dart_disclosures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rcept_no text UNIQUE, corp_name text NOT NULL, symbol text,
  disclosure_type text NOT NULL, title text NOT NULL,
  filed_at timestamptz NOT NULL, ai_summary text,
  importance integer DEFAULT 0, raw_data jsonb,
  notified boolean DEFAULT false, created_at timestamptz DEFAULT now()
);

-- supply_demand
CREATE TABLE IF NOT EXISTS supply_demand (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL, trade_date date NOT NULL,
  foreign_net numeric DEFAULT 0, inst_net numeric DEFAULT 0,
  retail_net numeric DEFAULT 0, program_net numeric DEFAULT 0,
  supply_score numeric DEFAULT 0, created_at timestamptz DEFAULT now(),
  UNIQUE(symbol, trade_date)
);

-- insider_trades
CREATE TABLE IF NOT EXISTS insider_trades (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text NOT NULL, insider_name text,
  trade_type text, shares numeric, price numeric,
  trade_date date, report_date date, created_at timestamptz DEFAULT now()
);

-- sentiment_scores
CREATE TABLE IF NOT EXISTS sentiment_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol text, score_date date NOT NULL DEFAULT CURRENT_DATE,
  fear_greed integer, news_score numeric,
  community_score numeric, search_trend numeric,
  composite numeric, signal text, created_at timestamptz DEFAULT now(),
  UNIQUE(symbol, score_date)
);
```

---

# 실행 순서

```
① Supabase SQL 전체 실행

② 클로드 코드 순서:
   PHASE18-20.md → npm run build
   PHASE21-23.md → npm run build
   PHASE24-32.md (PHASE 24) → npm run build
   PHASE24-32.md (PHASE 25) → npm run build
   PHASE24-32.md (PHASE 26) → npm run build
   PHASE24-32.md (PHASE 27~32) → npm run build

③ .env.local 추가:
   DART_API_KEY=발급받은키
   KIS_APP_KEY=발급받은키
   KIS_APP_SECRET=발급받은시크릿
   KIS_ACCOUNT_NO=계좌번호
   KIS_BASE_URL=https://openapivts.koreainvestment.com:29443
   NEXT_PUBLIC_KIS_READY=false
```

---

# 완성 시 신규 페이지 (14개)

```
/disclosure    DART 공시 피드
/supply        수급 추적
/sentiment     감정 지표
/trading       실시간 트레이딩
/approvals     승인 대기
/autopilot     오토파일럿
/optimization  파라미터 최적화
/ml-signal     머신러닝 신호
/performance   성과 리포트
/leverage      레버리지 최적화
/short         숏 전략
/tax           세금 최적화
/compounding   복리 엔진
/correlation   상관관계 포트폴리오
```

---

# 데이터 잠금 구조

```typescript
// 각 페이지 상단에 적용
const UNLOCK_CONDITIONS = {
  '/optimization': { minSignals: 100,  message: '신호 100개 필요' },
  '/ml-signal':    { minSignals: 100,  message: '신호 100개 필요' },
  '/autopilot':    { minSignals: 30,   message: '신호 30개 필요' },
  '/leverage':     { minSignals: 50,   message: '신호 50개 필요' },
}
```
