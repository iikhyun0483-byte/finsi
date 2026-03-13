// lib/advanced-kelly.ts

export interface KellyInput {
  winRate: number
  avgWinReturn: number
  avgLossReturn: number
  totalCapital: number
  regimeMultiplier: number     // 상승=1.0 횡보=0.5 하락=0.25 위기=0.0
  portfolioCorrelation: number
  kellyFraction: number        // 0.25/0.5/1.0
  maxPositionPercent: number
}

export interface KellyResult {
  fullKelly: number
  adjustedKelly: number
  recommendedAmount: number
  maxAmount: number
  reasoning: string[]
}

export function calcAdvancedKelly(input: KellyInput): KellyResult {
  const { winRate, avgWinReturn, avgLossReturn } = input
  const b = avgWinReturn / Math.max(avgLossReturn, 0.001)
  const rawKelly = (winRate * b - (1 - winRate)) / b
  const fullKelly = Math.max(rawKelly, 0)

  const regAdj  = fullKelly * input.regimeMultiplier
  const corrAdj = regAdj  * (1 - Math.abs(input.portfolioCorrelation) * 0.5)
  const final   = Math.min(Math.max(corrAdj * input.kellyFraction, 0), input.maxPositionPercent / 100)

  return {
    fullKelly,
    adjustedKelly: final,
    recommendedAmount: Math.round(input.totalCapital * final),
    maxAmount: Math.round(input.totalCapital * input.maxPositionPercent / 100),
    reasoning: [
      `기본 켈리: ${(fullKelly*100).toFixed(1)}%`,
      `국면 조정 ×${input.regimeMultiplier}: ${(regAdj*100).toFixed(1)}%`,
      `상관 조정 ρ=${input.portfolioCorrelation.toFixed(2)}: ${(corrAdj*100).toFixed(1)}%`,
      `켈리 분수 ×${input.kellyFraction}: ${(final*100).toFixed(1)}%`,
    ],
  }
}
