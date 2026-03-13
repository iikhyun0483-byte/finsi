// lib/lifecycle-model.ts
// 인간 전체 재무 생애 모델 — 하드코딩 없음

export type LifePhase =
  | '학생기' | '사회초년생' | '성장기' | '전성기'
  | '준비기' | '은퇴초기' | '은퇴후기' | '말년기'

export interface LifeEvent {
  age: number           // 발생 나이
  label: string
  amount: number        // 양수=지출, 음수=수입
  recurring: boolean
  recurringUntilAge?: number  // recurring이면 종료 나이
}

export interface LifecycleInput {
  currentAge: number
  retirementAge: number
  deathAge: number
  currentAssets: number
  currentLiabilities: number
  liabilitiesAnnualInterest?: number  // 연 이자 총합 (원) — 자산관리에서 가져옴
  // 소득/지출 — 사용자가 입력한 그대로 사용
  monthlyIncome: number
  monthlyExpense: number
  // 변화율 — 사용자가 입력
  incomeGrowthRate: number          // 연 소득 증가율 (소수)
  expenseInflationRate: number      // 연 지출 물가 상승률 (소수)
  investmentReturn: number          // 연 투자수익률 (소수)
  investmentVolatility: number      // 연 투자 변동성 (소수) — 몬테카를로용, 반드시 명시
  // 은퇴 후
  retirementMonthlyExpense: number  // 은퇴 후 월 지출 — 반드시 명시
  pensionMonthly: number            // 국민연금 월 수령액 — 0이면 없음
  pensionStartAge: number           // 연금 수령 시작 나이
  // 이벤트 — 사용자가 추가한 것만
  events: LifeEvent[]
}

export interface YearlySnapshot {
  age: number
  year: number
  phase: LifePhase
  assets: number
  liabilities: number
  netWorth: number
  annualIncome: number
  annualExpense: number
  annualSaving: number
  cashflowPositive: boolean
  triggeredEvents: string[]
}

export interface LifecycleResult {
  snapshots: YearlySnapshot[]
  bankruptcyAge: number | null
  peakNetWorthAge: number
  peakNetWorth: number
  retirementAssets: number
  finalNetWorth: number
  totalLifetimeIncome: number
  totalLifetimeExpense: number
  survivalOk: boolean
  // 현금흐름 전환점
  cashflowTurningPoints: { age: number; label: string }[]
}

function getPhase(age: number, retirementAge: number): LifePhase {
  if (age < 23) return '학생기'
  if (age < 30) return '사회초년생'
  if (age < 40) return '성장기'
  if (age < 50) return '전성기'
  if (age < retirementAge) return '준비기'
  if (age < 70) return '은퇴초기'
  if (age < 80) return '은퇴후기'
  return '말년기'
}

export function runLifecycle(input: LifecycleInput): LifecycleResult {
  const snapshots: YearlySnapshot[] = []
  let assets = input.currentAssets
  const liabilities = input.currentLiabilities
  let peakNetWorth = assets - liabilities
  let peakNetWorthAge = input.currentAge
  let bankruptcyAge: number | null = null
  let retirementAssets = 0
  let totalIncome = 0
  let totalExpense = 0
  const cashflowTurningPoints: { age: number; label: string }[] = []
  let prevCashflowPositive: boolean | null = null

  const currentYear = new Date().getFullYear()

  for (let age = input.currentAge; age <= input.deathAge; age++) {
    const yearsFromNow = age - input.currentAge
    const year = currentYear + yearsFromNow
    const isRetired = age >= input.retirementAge
    const hasPension = age >= input.pensionStartAge && input.pensionMonthly > 0

    // 소득 계산
    let annualIncome: number
    if (isRetired) {
      annualIncome = hasPension ? input.pensionMonthly * 12 : 0
    } else {
      annualIncome = input.monthlyIncome * 12 * (1 + input.incomeGrowthRate) ** yearsFromNow
    }

    // 지출 계산
    let annualExpense: number
    if (isRetired) {
      annualExpense = input.retirementMonthlyExpense * 12
        * (1 + input.expenseInflationRate) ** yearsFromNow
    } else {
      annualExpense = input.monthlyExpense * 12
        * (1 + input.expenseInflationRate) ** yearsFromNow
    }

    // 부채 이자를 지출에 포함
    const annualDebtInterest = !isRetired ? (input.liabilitiesAnnualInterest ?? 0) : 0
    annualExpense += annualDebtInterest

    // 이벤트 적용
    const triggeredEvents: string[] = []
    let eventImpact = 0
    for (const ev of input.events) {
      const applies = ev.recurring
        ? age >= ev.age && age <= (ev.recurringUntilAge ?? ev.age)
        : age === ev.age
      if (applies) {
        eventImpact += ev.amount
        triggeredEvents.push(ev.label)
      }
    }

    // 은퇴 시점 기록
    if (age === input.retirementAge) retirementAssets = assets

    // 자산 운용
    const annualSaving = annualIncome - annualExpense - eventImpact
    assets = assets * (1 + input.investmentReturn) + annualSaving
    if (assets < 0) {
      if (bankruptcyAge === null) bankruptcyAge = age
      assets = 0
    }

    totalIncome += annualIncome
    totalExpense += annualExpense

    const netWorth = assets - liabilities
    if (netWorth > peakNetWorth) {
      peakNetWorth = netWorth
      peakNetWorthAge = age
    }

    // 현금흐름 전환점
    const cashflowPositive = annualSaving >= 0
    if (prevCashflowPositive !== null && cashflowPositive !== prevCashflowPositive) {
      cashflowTurningPoints.push({
        age,
        label: cashflowPositive ? `${age}세 현금흐름 흑자 전환` : `${age}세 현금흐름 적자 전환`,
      })
    }
    prevCashflowPositive = cashflowPositive

    snapshots.push({
      age, year, phase: getPhase(age, input.retirementAge),
      assets, liabilities, netWorth,
      annualIncome, annualExpense, annualSaving,
      cashflowPositive,
      triggeredEvents,
    })
  }

  return {
    snapshots,
    bankruptcyAge,
    peakNetWorthAge,
    peakNetWorth,
    retirementAssets,
    finalNetWorth: snapshots[snapshots.length - 1]?.netWorth ?? 0,
    totalLifetimeIncome: totalIncome,
    totalLifetimeExpense: totalExpense,
    survivalOk: bankruptcyAge === null,
    cashflowTurningPoints,
  }
}
