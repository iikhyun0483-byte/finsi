// lib/regime-detection.ts

export type Regime = 'bull' | 'bear' | 'neutral' | 'crisis'

export interface RegimeInput {
  returns: number[]
  vix?: number
  lookbackDays: number        // 반드시 명시
  tradingDaysPerYear: number  // 반드시 명시
}

export interface RegimeResult {
  current: Regime
  probability: Record<Regime, number>
  currentVolatility: number
  currentAnnualReturn: number
}

export function detectRegime(input: RegimeInput): RegimeResult {
  const { returns, vix, lookbackDays, tradingDaysPerYear } = input
  const window = Math.min(lookbackDays, returns.length)
  const recent = returns.slice(-window)

  if (recent.length < 3) {
    return { current: 'neutral',
             probability: { bull:0.25, bear:0.25, neutral:0.5, crisis:0 },
             currentVolatility: 0, currentAnnualReturn: 0 }
  }

  const mean = recent.reduce((a, b) => a + b, 0) / recent.length
  const annualReturn = mean * tradingDaysPerYear
  const std = Math.sqrt(recent.reduce((a, b) => a + (b - mean) ** 2, 0) / recent.length)
  const annualVol = std * Math.sqrt(tradingDaysPerYear)

  let current: Regime
  const prob: Record<Regime, number> = { bull:0, bear:0, neutral:0, crisis:0 }

  if (vix != null && vix >= 35) {
    current = 'crisis'; prob.crisis = 0.75; prob.bear = 0.25
  } else if (vix != null && vix >= 28 && annualReturn < 0) {
    current = 'bear'; prob.bear = 0.65; prob.neutral = 0.25; prob.crisis = 0.10
  } else if (annualReturn > 0.10 && annualVol < 0.25) {
    current = 'bull'; prob.bull = 0.70; prob.neutral = 0.30
  } else if (annualReturn < -0.15 || annualVol > 0.35) {
    current = 'bear'; prob.bear = 0.65; prob.neutral = 0.25; prob.bull = 0.10
  } else {
    current = 'neutral'; prob.neutral = 0.55; prob.bull = 0.25; prob.bear = 0.20
  }

  return { current, probability: prob, currentVolatility: annualVol, currentAnnualReturn: annualReturn }
}
