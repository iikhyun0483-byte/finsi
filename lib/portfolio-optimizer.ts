// lib/portfolio-optimizer.ts

export interface AssetInput {
  ticker: string
  expectedAnnualReturn: number   // 반드시 명시
  annualVolatility: number       // 반드시 명시
}

export interface OptimizationInput {
  assets: AssetInput[]
  riskFreeRate: number           // 반드시 명시
  minWeight: number              // 반드시 명시 (0이면 제한 없음)
  maxWeight: number              // 반드시 명시 (1이면 제한 없음)
  method: 'equal' | 'risk-parity' | 'max-sharpe' | 'min-variance'
}

export interface OptimizationResult {
  weights: { ticker: string; weight: number }[]
  portfolioReturn: number
  portfolioVolatility: number
  sharpeRatio: number
  method: string
}

export function optimizePortfolio(input: OptimizationInput): OptimizationResult {
  const { assets, riskFreeRate, minWeight, maxWeight, method } = input
  const n = assets.length
  if (n === 0) throw new Error('자산이 없습니다')

  let weights: number[]

  if (method === 'equal') {
    weights = assets.map(() => 1 / n)
  } else if (method === 'risk-parity') {
    const inv = assets.map(a => 1 / Math.max(a.annualVolatility, 1e-8))
    const total = inv.reduce((a, b) => a + b, 0)
    weights = inv.map(v => Math.min(Math.max(v / total, minWeight), maxWeight))
    const wt = weights.reduce((a, b) => a + b, 0)
    weights = weights.map(w => w / wt)
  } else if (method === 'min-variance') {
    const inv = assets.map(a => 1 / Math.max(a.annualVolatility ** 2, 1e-8))
    const total = inv.reduce((a, b) => a + b, 0)
    weights = inv.map(v => Math.min(Math.max(v / total, minWeight), maxWeight))
    const wt = weights.reduce((a, b) => a + b, 0)
    weights = weights.map(w => w / wt)
  } else {
    // max-sharpe
    weights = assets.map(() => 1 / n)
    for (let iter = 0; iter < 2000; iter++) {
      const pR = assets.reduce((s, a, i) => s + a.expectedAnnualReturn * weights[i], 0)
      const pV = Math.sqrt(assets.reduce((s, a, i) => s + (weights[i] * a.annualVolatility) ** 2, 0)) + 1e-8
      const grads = assets.map((a, i) => {
        const dR = a.expectedAnnualReturn
        const dV = weights[i] * a.annualVolatility ** 2 / pV
        return (dR * pV - (pR - riskFreeRate) * dV) / pV ** 2
      })
      weights = weights.map((w, i) => Math.min(Math.max(w + 0.005 * grads[i], minWeight), maxWeight))
      const wt = weights.reduce((a, b) => a + b, 0)
      weights = weights.map(w => w / wt)
    }
  }

  const pR = assets.reduce((s, a, i) => s + a.expectedAnnualReturn * weights[i], 0)
  const pV = Math.sqrt(assets.reduce((s, a, i) => s + (weights[i] * a.annualVolatility) ** 2, 0))

  const labels: Record<string, string> = {
    equal: '균등 배분', 'risk-parity': '리스크 패리티',
    'max-sharpe': '최대 샤프 (MVO)', 'min-variance': '최소 변동성',
  }

  return {
    weights: assets.map((a, i) => ({ ticker: a.ticker, weight: weights[i] })),
    portfolioReturn: pR,
    portfolioVolatility: pV,
    sharpeRatio: pV > 0 ? (pR - riskFreeRate) / pV : 0,
    method: labels[method],
  }
}
