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
