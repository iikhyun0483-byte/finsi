// lib/loan-calculator.ts
// 대출 이자 계산 엔진 — 하드코딩 없음

export type RepaymentType = 'equal-payment' | 'equal-principal'
// equal-payment: 원리금균등 (매월 납입액 동일)
// equal-principal: 원금균등 (매월 원금 동일, 이자 감소)

export interface LoanInput {
  principal: number          // 대출 원금 (원)
  annualRate: number         // 연 이자율 (소수, 예: 0.045)
  months: number             // 대출 기간 (개월)
  repaymentType: RepaymentType
  startDate?: string         // 시작일 (ISO) — 없으면 오늘
  gracePeriodMonths?: number // 거치 기간 (이자만 납입) — 기본 0
}

export interface LoanScheduleRow {
  month: number
  date: string
  payment: number          // 납입액
  principal: number        // 원금 상환
  interest: number         // 이자
  remainingBalance: number // 잔액
}

export interface LoanResult {
  monthlyPayment: number         // 원리금균등일 때 고정 납입액
  firstMonthPayment: number      // 첫 달 납입액 (원금균등 기준)
  lastMonthPayment: number       // 마지막 달 납입액
  totalPayment: number           // 총 납입액
  totalInterest: number          // 총 이자
  totalPrincipal: number         // 총 원금
  interestRatio: number          // 이자 비율 (총이자/원금)
  schedule: LoanScheduleRow[]    // 월별 상환 일정 전체
  breakEvenMonth: number         // 원금 50% 상환 완료 시점 (개월)
  repaymentType: RepaymentType
}

export function calcLoan(input: LoanInput): LoanResult {
  const {
    principal, annualRate, months, repaymentType,
    gracePeriodMonths = 0,
  } = input

  const monthlyRate = annualRate / 12
  const startDate = input.startDate ? new Date(input.startDate) : new Date()
  const schedule: LoanScheduleRow[] = []

  let totalPayment = 0
  let totalInterest = 0
  let remainingBalance = principal

  if (repaymentType === 'equal-payment') {
    // 원리금균등: M = P * r(1+r)^n / ((1+r)^n - 1)
    const graceInterest = monthlyRate > 0 ? principal * monthlyRate : 0
    let monthlyPayment: number

    if (monthlyRate === 0) {
      monthlyPayment = principal / months
    } else {
      const factor = Math.pow(1 + monthlyRate, months - gracePeriodMonths)
      monthlyPayment = monthlyRate > 0
        ? principal * monthlyRate * factor / (factor - 1)
        : principal / (months - gracePeriodMonths)
    }

    // 거치 기간
    for (let m = 1; m <= gracePeriodMonths; m++) {
      const date = new Date(startDate)
      date.setMonth(date.getMonth() + m)
      const interest = graceInterest
      schedule.push({
        month: m, date: date.toISOString().split('T')[0],
        payment: interest, principal: 0, interest,
        remainingBalance: principal,
      })
      totalPayment += interest
      totalInterest += interest
    }

    // 상환 기간
    for (let m = 1; m <= months - gracePeriodMonths; m++) {
      const date = new Date(startDate)
      date.setMonth(date.getMonth() + gracePeriodMonths + m)
      const interest = remainingBalance * monthlyRate
      const principalPart = monthlyPayment - interest
      remainingBalance = Math.max(0, remainingBalance - principalPart)
      const actualPayment = remainingBalance < 1 ? monthlyPayment + remainingBalance : monthlyPayment

      schedule.push({
        month: gracePeriodMonths + m,
        date: date.toISOString().split('T')[0],
        payment: actualPayment,
        principal: principalPart,
        interest,
        remainingBalance,
      })
      totalPayment += actualPayment
      totalInterest += interest
    }

    const breakEvenMonth = schedule.findIndex(r => r.remainingBalance <= principal / 2) + 1

    return {
      monthlyPayment,
      firstMonthPayment: monthlyPayment,
      lastMonthPayment: schedule[schedule.length - 1]?.payment ?? monthlyPayment,
      totalPayment,
      totalInterest,
      totalPrincipal: principal,
      interestRatio: totalInterest / principal,
      schedule,
      breakEvenMonth,
      repaymentType,
    }

  } else {
    // 원금균등: 매월 원금 = P/n, 이자는 잔액 × 월이자율
    const monthlyPrincipal = principal / (months - gracePeriodMonths)
    const graceInterest = principal * monthlyRate
    let firstMonthPayment = 0
    let lastMonthPayment = 0

    // 거치 기간
    for (let m = 1; m <= gracePeriodMonths; m++) {
      const date = new Date(startDate)
      date.setMonth(date.getMonth() + m)
      schedule.push({
        month: m, date: date.toISOString().split('T')[0],
        payment: graceInterest, principal: 0, interest: graceInterest,
        remainingBalance: principal,
      })
      totalPayment += graceInterest
      totalInterest += graceInterest
    }

    // 상환 기간
    for (let m = 1; m <= months - gracePeriodMonths; m++) {
      const date = new Date(startDate)
      date.setMonth(date.getMonth() + gracePeriodMonths + m)
      const interest = remainingBalance * monthlyRate
      remainingBalance = Math.max(0, remainingBalance - monthlyPrincipal)
      const payment = monthlyPrincipal + interest

      if (m === 1) firstMonthPayment = payment
      if (m === months - gracePeriodMonths) lastMonthPayment = payment

      schedule.push({
        month: gracePeriodMonths + m,
        date: date.toISOString().split('T')[0],
        payment, principal: monthlyPrincipal, interest,
        remainingBalance,
      })
      totalPayment += payment
      totalInterest += interest
    }

    const breakEvenMonth = Math.ceil((months - gracePeriodMonths) / 2) + gracePeriodMonths

    return {
      monthlyPayment: firstMonthPayment,
      firstMonthPayment,
      lastMonthPayment,
      totalPayment,
      totalInterest,
      totalPrincipal: principal,
      interestRatio: totalInterest / principal,
      schedule,
      breakEvenMonth,
      repaymentType,
    }
  }
}

// 대출 적정성 판단
export interface LoanAffordabilityInput {
  monthlyIncome: number        // 월 소득
  monthlyExpense: number       // 기존 월 지출 (대출 제외)
  existingDebtPayment: number  // 기존 부채 월 납입액
  newLoanPayment: number       // 신규 대출 월 납입액
  totalAssets: number          // 총 자산
  loanPrincipal: number        // 대출 원금
}

export interface LoanAffordabilityResult {
  dti: number              // DTI — 총부채상환비율 (월납입/월소득)
  dsr: number              // DSR — 총부채원리금상환비율
  ltv: number              // LTV — 담보인정비율 (대출/자산)
  surplus: number          // 월 여유 현금 (소득 - 지출 - 납입)
  verdict: '여유' | '적정' | '주의' | '위험' | '불가'
  maxAffordableLoan: number  // 현재 소득 기준 최대 감당 가능 대출액
  reasons: string[]
}

export function calcLoanAffordability(input: LoanAffordabilityInput): LoanAffordabilityResult {
  const {
    monthlyIncome, monthlyExpense, existingDebtPayment,
    newLoanPayment, totalAssets, loanPrincipal,
  } = input

  const totalDebtPayment = existingDebtPayment + newLoanPayment
  const dti = monthlyIncome > 0 ? totalDebtPayment / monthlyIncome : 1
  const dsr = monthlyIncome > 0 ? totalDebtPayment / monthlyIncome : 1
  const ltv = totalAssets > 0 ? loanPrincipal / totalAssets : 1
  const surplus = monthlyIncome - monthlyExpense - totalDebtPayment

  const reasons: string[] = []

  let verdict: LoanAffordabilityResult['verdict']
  if (dti >= 0.7) { verdict = '불가'; reasons.push(`DTI ${(dti*100).toFixed(0)}% — 소득 대비 부채 과다`) }
  else if (dti >= 0.5) { verdict = '위험'; reasons.push(`DTI ${(dti*100).toFixed(0)}% — 위험 수준`) }
  else if (dti >= 0.4) { verdict = '주의'; reasons.push(`DTI ${(dti*100).toFixed(0)}% — 주의 필요`) }
  else if (dti >= 0.25) { verdict = '적정'; reasons.push(`DTI ${(dti*100).toFixed(0)}% — 적정 범위`) }
  else { verdict = '여유'; reasons.push(`DTI ${(dti*100).toFixed(0)}% — 여유 있음`) }

  if (ltv >= 0.8) reasons.push(`LTV ${(ltv*100).toFixed(0)}% — 담보 대비 대출 과다`)
  if (surplus < 0) reasons.push(`월 여유 현금 부족 — ${Math.abs(surplus).toLocaleString()}원 적자`)
  if (surplus >= 0 && surplus < monthlyIncome * 0.1) reasons.push('월 여유 현금이 소득의 10% 미만 — 비상금 부족 위험')

  // 최대 감당 가능 대출: DTI 40% 기준
  const maxMonthlyPayment = monthlyIncome * 0.4 - existingDebtPayment
  const maxAffordableLoan = Math.max(0, maxMonthlyPayment * 12 * 20) // 20년 기준 역산

  return { dti, dsr, ltv, surplus, verdict, maxAffordableLoan, reasons }
}
