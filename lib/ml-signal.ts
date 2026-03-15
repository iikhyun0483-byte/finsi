// lib/ml-signal.ts
// 조건: 신호 1,000개 이상
// 모델: 단순 로지스틱 회귀 (서버사이드, 외부 ML 라이브러리 없이 구현)

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface MLFeatures {
  signalScore:   number   // 0~100 (규칙 기반 신호 점수)
  factorScore:   number   // -3~3 (팩터 스코어)
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

  // 1. settings에서 저장된 weights 확인
  const { data: settings } = await supabase
    .from('settings')
    .select('ml_weights, ml_trained_at, ml_sample_count')
    .eq('user_id', 'default')
    .single()

  let weights: number[]

  // 2. 재학습 조건: weights 없거나, 샘플 개수가 20% 이상 증가했을 때
  const shouldRetrain = !settings?.ml_weights ||
    !settings?.ml_sample_count ||
    data.length > (settings.ml_sample_count * 1.2)

  if (shouldRetrain) {
    console.log(`[ML] 재학습 시작 (샘플: ${data.length}개)`)

    // 학습 데이터 준비
    const X = data.map(d => [
      d.signal_score / 100,
      Math.min(Math.max((d.return_7d ?? 0) * 10, -1), 1),
    ])
    const y = data.map(d => d.is_correct_7d ? 1 : 0)

    // 학습 실행
    weights = trainLogistic(X, y)

    // 3. 학습된 weights를 settings에 저장
    await supabase.from('settings').upsert({
      user_id: 'default',
      ml_weights: weights,
      ml_trained_at: new Date().toISOString(),
      ml_sample_count: data.length,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })

    console.log(`[ML] 학습 완료 및 저장 (weights: ${weights.length}개)`)
  } else {
    // 저장된 weights 재사용
    weights = settings.ml_weights as number[]
    console.log(`[ML] 저장된 weights 재사용 (마지막 학습: ${settings.ml_trained_at})`)
  }

  // 4. 예측
  const featureVec = [features.signalScore / 100, features.factorScore]
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
