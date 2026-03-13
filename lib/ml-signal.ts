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
