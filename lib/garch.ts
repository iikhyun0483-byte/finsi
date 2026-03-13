// lib/garch.ts

export interface GarchInput {
  returns: number[]
  tradingDaysPerYear: number  // 자산 유형별 — 반드시 명시
  omega?: number              // null이면 자동 추정
  alpha?: number
  beta?: number
  forecastDays: number        // 반드시 명시
}

export interface GarchResult {
  conditionalVol: number[]
  forecastVol: number
  forecastVols: number[]      // 1일 ~ forecastDays 각각
  omega: number
  alpha: number
  beta: number
  persistence: number
  halfLife: number
}

export function fitGarch(input: GarchInput): GarchResult {
  const { returns, tradingDaysPerYear, forecastDays } = input
  const longRunVar = returns.reduce((a, b) => a + b ** 2, 0) / returns.length

  const omega = input.omega ?? longRunVar * 0.05
  const alpha = input.alpha ?? 0.10
  const beta = input.beta ?? 0.85

  const h: number[] = [longRunVar]
  for (let t = 1; t < returns.length; t++) {
    h.push(Math.max(omega + alpha * returns[t - 1] ** 2 + beta * h[t - 1], 1e-10))
  }

  const forecastVols: number[] = []
  let hF = h[h.length - 1]
  const lastR = returns[returns.length - 1]

  for (let f = 1; f <= forecastDays; f++) {
    hF = f === 1
      ? omega + alpha * lastR ** 2 + beta * h[h.length - 1]
      : omega + (alpha + beta) * hF
    forecastVols.push(Math.sqrt(Math.max(hF, 0) * tradingDaysPerYear))
  }

  const persistence = alpha + beta
  const halfLife = persistence < 1 && persistence > 0
    ? Math.log(0.5) / Math.log(persistence) : Infinity

  return {
    conditionalVol: h.map(v => Math.sqrt(v * tradingDaysPerYear)),
    forecastVol: forecastVols[forecastVols.length - 1],
    forecastVols,
    omega, alpha, beta, persistence, halfLife,
  }
}
