// lib/walk-forward.ts
// 워크포워드 검증 — 백테스트 과적합 방지

export interface WalkForwardConfig {
  trainRatio: number      // 훈련 기간 비율 (예: 0.7 = 70%)
  windows: number         // 검증 창 수 (예: 10)
  strategy: (trainData: number[], testData: number[]) => WalkForwardSegment
}

export interface WalkForwardSegment {
  trainReturn: number
  testReturn: number
  winRate: number
  maxDrawdown: number
  sharpe: number
}

export interface WalkForwardResult {
  segments: WalkForwardSegment[]
  avgTestReturn: number
  avgWinRate: number
  avgSharpe: number
  consistency: number       // 양수 수익 구간 비율
  overfit: boolean          // 훈련 > 테스트 * 2 이면 과적합 의심
  verdict: '검증 통과' | '과적합 의심' | '전략 부적합'
}

export function runWalkForward(
  prices: number[],
  config: WalkForwardConfig
): WalkForwardResult {
  const { trainRatio, windows, strategy } = config
  const totalLen = prices.length
  const windowSize = Math.floor(totalLen / (windows + 1))

  const segments: WalkForwardSegment[] = []

  for (let w = 0; w < windows; w++) {
    const start = w * windowSize
    const trainEnd = start + Math.floor(windowSize * trainRatio * (windows / (windows - w + 1)))
    const testEnd = Math.min(start + windowSize + Math.floor(windowSize / windows), totalLen)

    if (trainEnd >= testEnd || testEnd > totalLen) break

    const trainPrices = prices.slice(start, trainEnd)
    const testPrices = prices.slice(trainEnd, testEnd)

    if (trainPrices.length < 5 || testPrices.length < 2) continue

    const trainReturns = trainPrices.slice(1).map((p, i) => (p - trainPrices[i]) / trainPrices[i])
    const testReturns = testPrices.slice(1).map((p, i) => (p - testPrices[i]) / testPrices[i])

    const seg = strategy(trainReturns, testReturns)
    segments.push(seg)
  }

  if (segments.length === 0) {
    return {
      segments: [],
      avgTestReturn: 0,
      avgWinRate: 0,
      avgSharpe: 0,
      consistency: 0,
      overfit: false,
      verdict: '전략 부적합',
    }
  }

  const avgTrainReturn = segments.reduce((s, g) => s + g.trainReturn, 0) / segments.length
  const avgTestReturn = segments.reduce((s, g) => s + g.testReturn, 0) / segments.length
  const avgWinRate = segments.reduce((s, g) => s + g.winRate, 0) / segments.length
  const avgSharpe = segments.reduce((s, g) => s + g.sharpe, 0) / segments.length
  const consistency = segments.filter(g => g.testReturn > 0).length / segments.length
  const overfit = avgTrainReturn > avgTestReturn * 2

  let verdict: WalkForwardResult['verdict']
  if (!overfit && consistency >= 0.6 && avgSharpe >= 0.5) verdict = '검증 통과'
  else if (overfit) verdict = '과적합 의심'
  else verdict = '전략 부적합'

  return { segments, avgTestReturn, avgWinRate, avgSharpe, consistency, overfit, verdict }
}
