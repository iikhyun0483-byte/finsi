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
