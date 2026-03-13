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
