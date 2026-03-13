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
