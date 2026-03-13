// lib/risk-metrics.ts
// 모든 파라미터 명시 전달 — 기본값 없음

export interface RiskMetricsInput {
  returns: number[]
  riskFreeRate: number
  tradingDaysPerYear: number  // 주식 252 / 코인 365 / 채권 250
  confidence: number          // VaR 신뢰수준 예: 0.95
}

export interface RiskMetricsResult {
  sharpe: number
  sortino: number
  calmar: number
  mdd: number
  var: number
  cvar: number
  annualReturn: number
  annualVolatility: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
}

export function calcRiskMetrics(input: RiskMetricsInput): RiskMetricsResult {
  const { returns, riskFreeRate, tradingDaysPerYear, confidence } = input

  if (returns.length === 0) {
    return { sharpe:0, sortino:0, calmar:0, mdd:0, var:0, cvar:0,
             annualReturn:0, annualVolatility:0, winRate:0, avgWin:0, avgLoss:0, profitFactor:0 }
  }

  const n = returns.length
  const mean = returns.reduce((a, b) => a + b, 0) / n
  const annualReturn = mean * tradingDaysPerYear
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / n
  const annualVol = Math.sqrt(variance * tradingDaysPerYear)

  const sharpe = annualVol > 0 ? (annualReturn - riskFreeRate) / annualVol : 0

  const downReturns = returns.filter(r => r < 0)
  const downsideVar = downReturns.length > 0
    ? downReturns.reduce((a, b) => a + b ** 2, 0) / n : 0
  const downsideVol = Math.sqrt(downsideVar * tradingDaysPerYear)
  const sortino = downsideVol > 0 ? (annualReturn - riskFreeRate) / downsideVol : 0

  let cum = 1, peak = 1, mdd = 0
  for (const r of returns) {
    cum *= (1 + r)
    if (cum > peak) peak = cum
    const dd = (peak - cum) / peak
    if (dd > mdd) mdd = dd
  }

  const calmar = mdd > 0 ? annualReturn / mdd : 0

  const sorted = [...returns].sort((a, b) => a - b)
  const varIdx = Math.max(Math.floor((1 - confidence) * sorted.length), 0)
  const varValue = sorted[varIdx]
  const tail = sorted.slice(0, Math.max(varIdx, 1))
  const cvar = tail.reduce((a, b) => a + b, 0) / tail.length

  const wins = returns.filter(r => r > 0)
  const losses = returns.filter(r => r < 0)
  const winRate = n > 0 ? wins.length / n : 0
  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0
  const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0

  return { sharpe, sortino, calmar, mdd, var: varValue, cvar,
           annualReturn, annualVolatility: annualVol, winRate, avgWin, avgLoss, profitFactor }
}
