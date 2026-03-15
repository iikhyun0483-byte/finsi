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

  // Kelly 음수 = 기댓값 음수 (투자 부적합)
  if (rawKelly < 0) {
    return {
      fullKelly: 0,
      adjustedKelly: 0,
      recommendedAmount: 0,
      maxAmount: Math.round(input.totalCapital * input.maxPositionPercent / 100),
      reasoning: [
        `⚠️ 기댓값 음수 (승률 ${(winRate*100).toFixed(0)}%, 손익비 ${b.toFixed(2)})`,
        `이 전략은 장기적으로 손실 예상 - 투자 부적합`,
        `승률을 높이거나 손익비를 개선하세요`,
      ],
    }
  }

  const fullKelly = rawKelly
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
