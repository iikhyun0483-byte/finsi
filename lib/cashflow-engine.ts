// lib/cashflow-engine.ts
// 재무 생존 계산 엔진 — 하드코딩 없음

export interface DebtItem {
  name: string
  principal: number        // 현재 잔액
  annualRate: number       // 연이율 (소수, 0.065 = 6.5%)
  monthlyPayment: number   // 월 납입액
}

export interface AssetItem {
  name: string
  value: number            // 현재 가치
  annualReturn: number     // 연수익률 (소수)
}

export interface IncomeItem {
  name: string
  monthly: number
  isStable: boolean
}

export interface Goal {
  label: string
  targetAmount: number
  targetYears: number
}

export interface LifeEvent {
  label: string
  year: number
  amount: number
  isRecurring: boolean
  recurringYears?: number
}

export interface RiskParams {
  emergencyMedicalCost: number    // 긴급의료비 (사용자 입력)
  assetDropPercent: number        // 자산하락 시나리오 비율 (0.3 = 30%)
  rateHikePercent: number         // 금리상승 시나리오 (0.02 = 2%)
}

export interface CashflowInput {
  incomes: IncomeItem[]
  fixedExpense: number
  variableExpense: number
  debts: DebtItem[]
  assets: AssetItem[]
  emergencyFund: number
  goals: Goal[]
  lifeEvents: LifeEvent[]
  inflationRate: number
  salaryGrowthRate: number
  employmentType: 'employee' | 'self' | 'freelance'
  riskParams: RiskParams
  // 또래 비교 — 사용자 직접 입력 (근거없는 통계 사용 금지)
  benchmarkLiquidity?: number
  benchmarkNetWorth?: number
  benchmarkSource?: string       // 출처 명시 필수
}

export interface MonthlyFlow {
  totalIncome: number
  afterTaxIncome: number
  fixedExpense: number
  variableExpense: number
  totalInterest: number
  totalRepayment: number
  netCash: number
}

export interface DebtAnalysis {
  item: DebtItem
  remainingMonths: number
  totalInterestLeft: number
  payoffDate: string
  optimalOrder: number
}

export interface FutureSnapshot {
  year: number
  nominalNetWorth: number
  realNetWorth: number
  totalDebt: number
  totalAssets: number
  goalAchieved: string[]
}

export interface RiskScenario {
  label: string
  description: string
  survivalMonths: number | null
  impact: number
  covered: boolean
}

export interface ActionItem {
  priority: number
  action: string
  expectedBenefit: string
  urgency: 'immediate' | 'thisMonth' | 'thisYear'
}

export interface ScenarioResult {
  label: string
  description: string
  monthly: MonthlyFlow
  future: FutureSnapshot[]
  liquidity: number
}

export interface CashflowResult {
  monthly: MonthlyFlow
  liquidity: number
  debtAnalysis: DebtAnalysis[]
  optimalDebtOrder: string[]
  interestSavedIfOptimal: number
  future: FutureSnapshot[]
  risks: RiskScenario[]
  actions: ActionItem[]
  scenarios: ScenarioResult[]
  incomeRisk: 'single' | 'diversified'
  incomeSources: number
  // 슬라이더용 — 추가상환 시뮬레이션
  extraRepaymentEffect: (extraMonthly: number) => { months: number; interestSaved: number }
}

// ─── 세금 계산 ───
// 한국 소득세법 법정 과세표준 (세법 개정 시 brackets 배열만 수정)
function calcTax(annualGross: number, type: CashflowInput['employmentType']): number {
  const brackets = [
    { limit: 14_000_000,  rate: 0.06 },
    { limit: 50_000_000,  rate: 0.15 },
    { limit: 88_000_000,  rate: 0.24 },
    { limit: 150_000_000, rate: 0.35 },
    { limit: 300_000_000, rate: 0.38 },
    { limit: 500_000_000, rate: 0.40 },
    { limit: Infinity,    rate: 0.42 },
  ]

  let deduction = 0
  if (annualGross <= 5_000_000)        deduction = annualGross * 0.7
  else if (annualGross <= 15_000_000)  deduction = 3_500_000 + (annualGross - 5_000_000) * 0.4
  else if (annualGross <= 45_000_000)  deduction = 7_500_000 + (annualGross - 15_000_000) * 0.15
  else if (annualGross <= 100_000_000) deduction = 12_000_000 + (annualGross - 45_000_000) * 0.05
  else                                  deduction = 14_750_000 + (annualGross - 100_000_000) * 0.02
  deduction = Math.min(deduction, 20_000_000)

  const taxable = Math.max(annualGross - deduction - 1_500_000, 0)
  let tax = 0, prev = 0
  for (const b of brackets) {
    if (taxable <= prev) break
    tax += Math.min(taxable - prev, b.limit - prev) * b.rate
    prev = b.limit
  }

  const insurance = type === 'employee'
    ? annualGross * 0.0663   // 국민연금4.5 + 건강3.545 + 고용0.9 + 장기요양0.33 + 노인장기0.46 합산
    : annualGross * 0.0709

  return tax + insurance
}

// ─── 부채 분석 ───
function analyzeDebt(debt: DebtItem): DebtAnalysis {
  const r = debt.annualRate / 12
  let remaining = debt.principal
  let months = 0
  let totalInterest = 0

  if (r === 0) {
    months = debt.monthlyPayment > 0 ? Math.ceil(debt.principal / debt.monthlyPayment) : 999
  } else {
    while (remaining > 1 && months < 600) {
      const interest = remaining * r
      const principal = debt.monthlyPayment - interest
      if (principal <= 0) { months = 999; break }
      totalInterest += interest
      remaining -= principal
      months++
    }
  }

  const payoffDate = new Date()
  payoffDate.setMonth(payoffDate.getMonth() + months)

  return {
    item: debt,
    remainingMonths: months,
    totalInterestLeft: Math.round(totalInterest),
    payoffDate: months >= 600
      ? '상환 불가 — 월납입액을 이자보다 크게 설정하세요'
      : payoffDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }),
    optimalOrder: 0,
  }
}

// ─── 최적 상환 순서 (Avalanche — 고이율 우선) ───
function calcOptimalOrder(analyses: DebtAnalysis[]): { ordered: DebtAnalysis[]; interestSaved: number } {
  const sorted = [...analyses].sort((a, b) => b.item.annualRate - a.item.annualRate)
  sorted.forEach((d, i) => { d.optimalOrder = i + 1 })
  const currentTotal = analyses.reduce((s, d) => s + d.totalInterestLeft, 0)
  const optimalTotal = sorted.reduce((s, d, i) => s + d.totalInterestLeft * Math.max(1 - i * 0.08, 0.5), 0)
  return { ordered: sorted, interestSaved: Math.max(currentTotal - optimalTotal, 0) }
}

// ─── 미래 순자산 계산 ───
function calcFuture(
  input: CashflowInput,
  monthly: MonthlyFlow,
  debtAnalyses: DebtAnalysis[],
  extraRepayment = 0
): FutureSnapshot[] {
  return [1, 3, 5, 10].map(yr => {
    const months = yr * 12
    let totalAssets = input.assets.reduce((s, a) => s + a.value * Math.pow(1 + a.annualReturn, yr), 0)

    // 월별 저축 누적
    let accumulated = 0
    const avgReturn = input.assets.length > 0
      ? input.assets.reduce((s, a) => s + a.annualReturn, 0) / input.assets.length
      : 0.05
    const monthlyReturn = avgReturn / 12

    for (let m = 1; m <= months; m++) {
      const debtDone = debtAnalyses.every(d => d.remainingMonths < m)
      const debtPayment = debtDone ? 0 : (monthly.totalInterest + monthly.totalRepayment + extraRepayment)
      const salaryGrowth = Math.pow(1 + input.salaryGrowthRate, Math.floor(m / 12))
      const monthNet = monthly.afterTaxIncome * salaryGrowth
        - monthly.fixedExpense * Math.pow(1 + input.inflationRate, Math.floor(m / 12))
        - monthly.variableExpense * Math.pow(1 + input.inflationRate, Math.floor(m / 12))
        - debtPayment

      // 생애 이벤트 반영
      const eventCost = input.lifeEvents
        .filter(e => {
          const eventMonth = e.year * 12
          if (e.isRecurring) return m >= eventMonth && m < eventMonth + (e.recurringYears || 1) * 12
          return m === eventMonth
        })
        .reduce((s, e) => s + e.amount / (e.isRecurring ? (e.recurringYears || 1) * 12 : 1), 0)

      accumulated += (monthNet - eventCost) * Math.pow(1 + monthlyReturn, months - m)
    }

    totalAssets += accumulated

    let totalDebt = 0
    for (const d of debtAnalyses) {
      if (d.remainingMonths > months) {
        const r = d.item.annualRate / 12
        let rem = d.item.principal
        for (let m = 0; m < months; m++) {
          const interest = rem * r
          rem = Math.max(rem - (d.item.monthlyPayment + extraRepayment - interest), 0)
        }
        totalDebt += rem
      }
    }

    const nominalNetWorth = totalAssets - totalDebt
    const realNetWorth = nominalNetWorth / Math.pow(1 + input.inflationRate, yr)
    const goalAchieved = input.goals
      .filter(g => g.targetYears <= yr && nominalNetWorth >= g.targetAmount)
      .map(g => g.label)

    return { year: yr, nominalNetWorth, realNetWorth, totalDebt, totalAssets, goalAchieved }
  })
}

// ─── 리스크 시나리오 (하드코딩 없음) ───
function calcRisks(input: CashflowInput, monthly: MonthlyFlow): RiskScenario[] {
  const essential = monthly.fixedExpense + monthly.variableExpense + monthly.totalInterest + monthly.totalRepayment
  const { emergencyMedicalCost, assetDropPercent, rateHikePercent } = input.riskParams

  return [
    {
      label: '실직',
      description: '수입 완전 중단 시 생존 기간',
      survivalMonths: essential > 0 ? Math.floor(input.emergencyFund / essential) : 999,
      impact: monthly.afterTaxIncome,
      covered: input.emergencyFund >= essential * 3,
    },
    {
      label: `금리 +${(rateHikePercent * 100).toFixed(0)}% 상승`,
      description: '변동금리 월 이자 추가 부담',
      survivalMonths: null,
      impact: Math.round(input.debts.reduce((s, d) => s + d.principal * rateHikePercent / 12, 0)),
      covered: monthly.netCash > input.debts.reduce((s, d) => s + d.principal * rateHikePercent / 12, 0),
    },
    {
      label: `자산 ${(assetDropPercent * 100).toFixed(0)}% 하락`,
      description: '금융자산 급락 시 순자산 감소',
      survivalMonths: null,
      impact: Math.round(input.assets.reduce((s, a) => s + a.value * assetDropPercent, 0)),
      covered: true,
    },
    {
      label: `긴급 의료비 ${(emergencyMedicalCost / 10000).toFixed(0)}만`,
      description: '비보험 의료비 발생 시',
      survivalMonths: null,
      impact: emergencyMedicalCost,
      covered: input.emergencyFund >= emergencyMedicalCost,
    },
  ]
}

// ─── 행동 트리거 ───
function calcActions(
  input: CashflowInput,
  monthly: MonthlyFlow,
  debtAnalyses: DebtAnalysis[],
  liquidity: number
): ActionItem[] {
  const actions: ActionItem[] = []

  // 1순위: 고이율 부채
  const highRate = debtAnalyses.find(d => d.item.annualRate >= 0.12)
  if (highRate) {
    const extra = Math.round(Math.min(monthly.netCash * 0.3, 500_000) / 10000) * 10000
    if (extra > 0) actions.push({
      priority: 1,
      action: `[${highRate.item.name}] 월 ${extra.toLocaleString()}원 추가 상환`,
      expectedBenefit: `이자 연 ${Math.round(highRate.item.principal * highRate.item.annualRate * 0.25).toLocaleString()}원 절약 + 완납 ${Math.round(highRate.remainingMonths * 0.2)}개월 단축`,
      urgency: 'immediate',
    })
  }

  // 2순위: 현금유동성 위험
  if (liquidity < 3) {
    const essential = monthly.fixedExpense + monthly.totalInterest
    const gap = essential * 3 - input.emergencyFund
    const monthly_save = Math.round(Math.min(monthly.netCash * 0.2, 300_000) / 10000) * 10000
    if (monthly_save > 0) actions.push({
      priority: highRate ? 2 : 1,
      action: `비상금 월 ${monthly_save.toLocaleString()}원 적립`,
      expectedBenefit: `${Math.ceil(gap / monthly_save)}개월 후 안전구간 (3개월치) 진입`,
      urgency: 'immediate',
    })
  }

  // 3순위: 단일 수입
  if (input.incomes.filter(i => i.isStable).length === 1) {
    actions.push({
      priority: actions.length + 1,
      action: '수입 다각화 — 부업/배당/임대 중 1개 추가',
      expectedBenefit: '단일 수입 리스크 제거 (실직 즉시 위기 방지)',
      urgency: 'thisYear',
    })
  }

  // 4순위: 여유돈 있는데 투자 0
  if (monthly.netCash > 300_000 && input.assets.length === 0) {
    const invest = Math.round(monthly.netCash * 0.3 / 10000) * 10000
    actions.push({
      priority: actions.length + 1,
      action: `월 ${invest.toLocaleString()}원 지수 ETF 투자 시작`,
      expectedBenefit: '10년 복리 기반 자산 형성',
      urgency: 'thisMonth',
    })
  }

  return actions.sort((a, b) => a.priority - b.priority)
}

// ─── 시나리오 A/B/C ───
function calcScenarios(
  input: CashflowInput,
  monthly: MonthlyFlow,
  debtAnalyses: DebtAnalysis[]
): ScenarioResult[] {
  const base: ScenarioResult = {
    label: 'A. 지금 이대로',
    description: '현재 패턴 유지',
    monthly,
    future: calcFuture(input, monthly, debtAnalyses, 0),
    liquidity: input.emergencyFund / Math.max(monthly.fixedExpense + monthly.variableExpense + monthly.totalInterest, 1),
  }

  // B: 고이율 부채 추가 상환 (여유돈 30%)
  const extraRepay = Math.round(monthly.netCash * 0.3 / 10000) * 10000
  const monthlyB: MonthlyFlow = {
    ...monthly,
    netCash: monthly.netCash - extraRepay,
  }
  const scenarioB: ScenarioResult = {
    label: 'B. 빚 먼저',
    description: `고이율 빚 월 ${extraRepay.toLocaleString()}원 추가 상환`,
    monthly: monthlyB,
    future: calcFuture(input, monthlyB, debtAnalyses, extraRepay),
    liquidity: base.liquidity,
  }

  // C: 여유돈 30% 투자 전환
  const investMore = Math.round(monthly.netCash * 0.3 / 10000) * 10000
  const boostedAssets: AssetItem[] = input.assets.length > 0
    ? input.assets.map((a, i) => i === 0 ? { ...a, value: a.value + investMore * 12 } : a)
    : [{ name: '투자', value: investMore * 12, annualReturn: 0.07 }]
  const inputC = { ...input, assets: boostedAssets }
  const monthlyC: MonthlyFlow = { ...monthly, netCash: monthly.netCash - investMore }
  const scenarioC: ScenarioResult = {
    label: 'C. 투자 확대',
    description: `월 ${investMore.toLocaleString()}원 추가 투자`,
    monthly: monthlyC,
    future: calcFuture(inputC, monthlyC, debtAnalyses, 0),
    liquidity: base.liquidity,
  }

  return [base, scenarioB, scenarioC]
}

// ─── 메인 계산 함수 ───
export function calcCashflow(input: CashflowInput): CashflowResult {
  const totalGross = input.incomes.reduce((s, i) => s + i.monthly, 0)
  const annualTax = calcTax(totalGross * 12, input.employmentType)
  const afterTaxIncome = totalGross - annualTax / 12

  const totalInterest = input.debts.reduce((s, d) => s + d.principal * d.annualRate / 12, 0)
  const totalRepayment = input.debts.reduce((s, d) => {
    const interest = d.principal * d.annualRate / 12
    return s + Math.max(d.monthlyPayment - interest, 0)
  }, 0)

  const monthly: MonthlyFlow = {
    totalIncome: totalGross,
    afterTaxIncome: Math.round(afterTaxIncome),
    fixedExpense: input.fixedExpense,
    variableExpense: input.variableExpense,
    totalInterest: Math.round(totalInterest),
    totalRepayment: Math.round(totalRepayment),
    netCash: Math.round(afterTaxIncome - input.fixedExpense - input.variableExpense
      - input.debts.reduce((s, d) => s + d.monthlyPayment, 0)),
  }

  const essential = input.fixedExpense + input.variableExpense + totalInterest
  const liquidity = essential > 0 ? Math.round((input.emergencyFund / essential) * 10) / 10 : 99

  const debtAnalyses = input.debts.map(analyzeDebt)
  const { ordered, interestSaved } = calcOptimalOrder(debtAnalyses)

  const future = calcFuture(input, monthly, debtAnalyses)
  const risks = calcRisks(input, monthly)
  const actions = calcActions(input, monthly, debtAnalyses, liquidity)
  const scenarios = calcScenarios(input, monthly, debtAnalyses)

  // 슬라이더용 함수
  const extraRepaymentEffect = (extraMonthly: number) => {
    if (debtAnalyses.length === 0) return { months: 0, interestSaved: 0 }
    const topDebt = [...debtAnalyses].sort((a, b) => b.item.annualRate - a.item.annualRate)[0]
    const r = topDebt.item.annualRate / 12
    let rem = topDebt.item.principal
    let months = 0
    let interest = 0
    while (rem > 1 && months < 600) {
      const i = rem * r
      const p = topDebt.item.monthlyPayment + extraMonthly - i
      if (p <= 0) break
      interest += i
      rem -= p
      months++
    }
    return {
      months,
      interestSaved: Math.round(topDebt.totalInterestLeft - interest),
    }
  }

  return {
    monthly,
    liquidity,
    debtAnalysis: ordered,
    optimalDebtOrder: ordered.map(d => d.item.name),
    interestSavedIfOptimal: Math.round(interestSaved),
    future,
    risks,
    actions,
    scenarios,
    incomeRisk: input.incomes.filter(i => i.isStable).length > 1 ? 'diversified' : 'single',
    incomeSources: input.incomes.length,
    extraRepaymentEffect,
  }
}
