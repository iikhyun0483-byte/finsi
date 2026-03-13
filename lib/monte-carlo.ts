// lib/monte-carlo.ts
// GBM 몬테카를로 — 시간 단위 완전 자유

import { TimeRange, toDays, toYears, toMonths } from './time-utils'

export interface MonteCarloInput {
  initialCapital: number
  periodicContribution: number          // 정기 기여금 (음수 = 인출)
  contributionUnit: 'daily' | 'monthly' | 'yearly'
  annualReturn: number                  // 연 기대수익률 (소수)
  annualVolatility: number              // 연 변동성 (소수)
  timeRange: TimeRange                  // 자유 단위
  simulations: number                   // 호출자가 명시
  withdrawalRate: number                // 연 인출률 (0이면 없음)
  targetAmount: number | null           // 목표 금액 (null이면 계산 안 함)
}

export interface MonteCarloResult {
  days: number
  timeLabel: string
  median: number
  percentile5: number
  percentile10: number
  percentile25: number
  percentile75: number
  percentile90: number
  percentile95: number
  mean: number
  survivalRate: number
  bankruptcyRate: number
  targetReachRate: number
  mddMedian: number
  paths: number[][]
  pathDates: string[]
}

function gaussianRandom(): number {
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2)
}

function formatTimeLabel(days: number): string {
  if (days < 1) return `${Math.round(days * 24)}시간`
  if (days < 7) return `${Math.round(days)}일`
  if (days < 30) return `${Math.round(days / 7)}주`
  if (days < 365) return `${Math.round(toMonths(days))}개월`
  return `${(days / 365.25).toFixed(1)}년`
}

export function runMonteCarlo(input: MonteCarloInput): MonteCarloResult {
  const days = toDays(input.timeRange)
  const months = toMonths(days)

  // 스텝: 90일 이하면 일봉, 초과하면 월봉
  const useDaily = days <= 90
  const steps = useDaily ? Math.ceil(days) : Math.ceil(months)
  const stepYears = useDaily ? (1 / 365.25) : (1 / 12)

  const stepReturn = (1 + input.annualReturn) ** stepYears - 1
  const stepVol = input.annualVolatility * Math.sqrt(stepYears)

  // 스텝당 기여금
  const annualContrib =
    input.contributionUnit === 'daily' ? input.periodicContribution * 365.25
    : input.contributionUnit === 'monthly' ? input.periodicContribution * 12
    : input.periodicContribution
  const stepContrib = useDaily ? annualContrib / 365.25 : annualContrib / 12

  // 스텝당 인출
  const annualWithdrawal = input.withdrawalRate * input.initialCapital
  const stepWithdrawal = useDaily ? annualWithdrawal / 365.25 : annualWithdrawal / 12

  const finals: number[] = []
  const mdds: number[] = []
  const paths: number[][] = []

  for (let s = 0; s < input.simulations; s++) {
    let capital = input.initialCapital
    let peak = capital
    let mdd = 0
    const path: number[] = [capital]

    for (let t = 0; t < steps; t++) {
      const r = stepReturn + stepVol * gaussianRandom()
      capital = capital * (1 + r) + stepContrib - stepWithdrawal
      if (capital < 0) capital = 0
      if (capital > peak) peak = capital
      const dd = peak > 0 ? (peak - capital) / peak : 0
      if (dd > mdd) mdd = dd
      if (s < 200) path.push(capital)
    }

    finals.push(capital)
    mdds.push(mdd)
    if (s < 200) paths.push(path)
  }

  finals.sort((a, b) => a - b)
  mdds.sort((a, b) => a - b)

  const pct = (p: number) => finals[Math.floor((input.simulations - 1) * p)]
  const mean = finals.reduce((a, b) => a + b, 0) / input.simulations

  // x축 날짜
  const pathDates: string[] = []
  const now = new Date()
  for (let i = 0; i <= steps; i++) {
    const d = new Date(now)
    if (useDaily) d.setDate(d.getDate() + i)
    else d.setMonth(d.getMonth() + i)
    pathDates.push(d.toISOString().split('T')[0])
  }

  return {
    days,
    timeLabel: formatTimeLabel(days),
    median: pct(0.5),
    percentile5: pct(0.05),
    percentile10: pct(0.10),
    percentile25: pct(0.25),
    percentile75: pct(0.75),
    percentile90: pct(0.90),
    percentile95: pct(0.95),
    mean,
    survivalRate: finals.filter(f => f >= input.initialCapital).length / input.simulations,
    bankruptcyRate: finals.filter(f => f <= 0).length / input.simulations,
    targetReachRate: input.targetAmount != null
      ? finals.filter(f => f >= input.targetAmount!).length / input.simulations
      : 0,
    mddMedian: mdds[Math.floor((input.simulations - 1) * 0.5)],
    paths,
    pathDates,
  }
}
