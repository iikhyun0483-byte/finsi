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
