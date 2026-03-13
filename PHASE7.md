# PHASE 7 — 이자 계산 엔진 + 대출 적정성 + 집매수vs전세 + 사업계산 페이지
# 돈 빌리면 이자가 얼마인지, 감당 가능한지, 사는게 나은지 전세가 나은지

---

## 핵심 원칙
- 모든 금리, 기간, 금액 사용자가 입력
- 원리금균등(원금+이자 고정) vs 원금균등(원금 고정, 이자 감소) 둘 다 지원
- 마감 날짜 또는 기간으로 계산

---

## STEP 1. lib/loan-calculator.ts 생성

```typescript
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
```

---

## STEP 2. lib/buy-vs-rent.ts 생성

```typescript
// lib/buy-vs-rent.ts
// 집 매수 vs 전세 비교 — 한국 부동산 구조 반영

export interface BuyVsRentInput {
  // 공통
  currentAssets: number          // 현재 보유 자산
  monthlyIncome: number
  analysisYears: number          // 비교 기간 (년)

  // 매수 옵션
  buyPrice: number               // 집 매수가
  downPayment: number            // 계약금/자기자본
  mortgagePrincipal: number      // 주택담보대출 원금
  mortgageAnnualRate: number     // 대출 금리
  mortgageMonths: number         // 대출 기간 (개월)
  propertyTaxRate: number        // 재산세율 (연, 소수) 예: 0.004
  maintenanceFeeMonthly: number  // 월 관리비
  homeAppreciationRate: number   // 연 집값 상승률 (소수)

  // 전세 옵션
  jeonseDeposit: number          // 전세 보증금
  jeonseDepositLoanRate: number  // 전세 대출 금리 (소수) — 자기자본으로 충당하면 0
  jeonseMonthlyFee: number       // 월 관리비
  jeonseAppreciationRate: number // 연 전세가 상승률 (소수) — 재계약시 인상분

  // 투자 수익률 (전세 선택 시 보증금 차액 투자)
  investmentReturn: number       // 연 투자수익률 (소수)
  investmentVolatility: number   // 연 변동성 (소수)
}

export interface BuyVsRentResult {
  years: number
  // 매수
  buyNetWorth: number            // 분석 기간 후 순자산 (집 팔면)
  buyTotalCost: number           // 총 지출 (대출이자 + 세금 + 관리비)
  buyMonthlyCost: number         // 월평균 비용
  buyFinalHomeValue: number      // 분석 기간 후 집 가치
  buyRemainingDebt: number       // 잔여 부채
  // 전세
  rentNetWorth: number           // 분석 기간 후 순자산 (투자 수익 포함)
  rentTotalCost: number          // 총 지출 (전세 이자비용 + 관리비 + 전세가 인상분)
  rentMonthlyCost: number        // 월평균 비용
  // 비교
  winner: '매수' | '전세' | '동일'
  difference: number             // 순자산 차이
  breakEvenYear: number | null   // 매수가 전세보다 유리해지는 시점
  yearlyComparison: {
    year: number
    buyNetWorth: number
    rentNetWorth: number
  }[]
}

export function calcBuyVsRent(input: BuyVsRentInput): BuyVsRentResult {
  const {
    currentAssets, analysisYears,
    buyPrice, downPayment, mortgagePrincipal, mortgageAnnualRate, mortgageMonths,
    propertyTaxRate, maintenanceFeeMonthly, homeAppreciationRate,
    jeonseDeposit, jeonseDepositLoanRate, jeonseMonthlyFee, jeonseAppreciationRate,
    investmentReturn,
  } = input

  const monthlyMortgageRate = mortgageAnnualRate / 12
  const factor = mortgageMonths > 0 && monthlyMortgageRate > 0
    ? Math.pow(1 + monthlyMortgageRate, mortgageMonths)
    : 1
  const monthlyMortgagePayment = monthlyMortgageRate > 0
    ? mortgagePrincipal * monthlyMortgageRate * factor / (factor - 1)
    : mortgagePrincipal / mortgageMonths

  const yearlyComparison: BuyVsRentResult['yearlyComparison'] = []
  let buyDebt = mortgagePrincipal
  let rentInvestment = currentAssets - jeonseDeposit  // 전세 선택 시 차액 투자

  let buyTotalCost = 0
  let rentTotalCost = 0
  let currentJeonseDeposit = jeonseDeposit
  let breakEvenYear: number | null = null

  for (let y = 1; y <= analysisYears; y++) {
    // 매수 — 연간 비용
    const annualMortgagePayment = Math.min(monthlyMortgagePayment * 12, buyDebt * (1 + mortgageAnnualRate))
    const annualInterest = buyDebt * mortgageAnnualRate
    const annualPrincipalPayment = Math.min(annualMortgagePayment - annualInterest, buyDebt)
    buyDebt = Math.max(0, buyDebt - annualPrincipalPayment)
    const homeValue = buyPrice * Math.pow(1 + homeAppreciationRate, y)
    const annualPropertyTax = homeValue * propertyTaxRate
    const annualMaintenance = maintenanceFeeMonthly * 12
    buyTotalCost += annualInterest + annualPropertyTax + annualMaintenance

    const buyNetWorth = homeValue - buyDebt

    // 전세 — 연간 비용
    const annualJeonseInterest = currentJeonseDeposit * jeonseDepositLoanRate
    const annualRentMaintenance = jeonseMonthlyFee * 12
    rentTotalCost += annualJeonseInterest + annualRentMaintenance

    // 2년마다 전세 재계약 (전세가 인상)
    if (y % 2 === 0) {
      const newDeposit = currentJeonseDeposit * (1 + jeonseAppreciationRate * 2)
      const depositIncrease = newDeposit - currentJeonseDeposit
      rentTotalCost += depositIncrease  // 추가 보증금 비용
      currentJeonseDeposit = newDeposit
    }

    // 전세 선택 시 투자 자산 성장
    rentInvestment = rentInvestment * (1 + investmentReturn)
    const rentNetWorth = rentInvestment + (currentAssets - jeonseDeposit > 0 ? 0 : 0)

    yearlyComparison.push({ year: y, buyNetWorth, rentNetWorth })

    // 손익분기점
    if (breakEvenYear === null && buyNetWorth > rentNetWorth) {
      breakEvenYear = y
    }
  }

  const finalBuy = yearlyComparison[yearlyComparison.length - 1]
  const buyFinalHomeValue = buyPrice * Math.pow(1 + homeAppreciationRate, analysisYears)

  const winner: BuyVsRentResult['winner'] =
    Math.abs(finalBuy.buyNetWorth - finalBuy.rentNetWorth) < 1_000_000 ? '동일'
    : finalBuy.buyNetWorth > finalBuy.rentNetWorth ? '매수' : '전세'

  return {
    years: analysisYears,
    buyNetWorth: finalBuy.buyNetWorth,
    buyTotalCost,
    buyMonthlyCost: buyTotalCost / (analysisYears * 12),
    buyFinalHomeValue,
    buyRemainingDebt: buyDebt,
    rentNetWorth: finalBuy.rentNetWorth,
    rentTotalCost,
    rentMonthlyCost: rentTotalCost / (analysisYears * 12),
    winner,
    difference: Math.abs(finalBuy.buyNetWorth - finalBuy.rentNetWorth),
    breakEvenYear,
    yearlyComparison,
  }
}
```

---

## STEP 3. app/api/finance-calc/route.ts 생성

```typescript
// app/api/finance-calc/route.ts
// 대출 계산 / 대출 적정성 / 매수vs전세 통합 API

import { NextRequest, NextResponse } from 'next/server'
import { calcLoan, calcLoanAffordability } from '@/lib/loan-calculator'
import { calcBuyVsRent } from '@/lib/buy-vs-rent'
import { scoreBusiness } from '@/lib/business-score'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { calcType, ...params } = body

    if (!calcType) {
      return NextResponse.json({ error: 'calcType 필수: loan | affordability | buyvsrent | business' }, { status: 400 })
    }

    let result: any

    if (calcType === 'loan') {
      if (params.principal == null || params.annualRate == null || params.months == null) {
        return NextResponse.json({ error: '대출 원금, 연이율, 기간(개월) 필수' }, { status: 400 })
      }
      result = calcLoan(params)

    } else if (calcType === 'affordability') {
      if (params.monthlyIncome == null || params.newLoanPayment == null) {
        return NextResponse.json({ error: '월소득, 신규대출 월납입액 필수' }, { status: 400 })
      }
      result = calcLoanAffordability(params)

    } else if (calcType === 'buyvsrent') {
      if (params.buyPrice == null || params.jeonseDeposit == null) {
        return NextResponse.json({ error: '매수가, 전세 보증금 필수' }, { status: 400 })
      }
      result = calcBuyVsRent(params)

    } else if (calcType === 'business') {
      if (params.monthlyRevenue == null || params.monthlyFixedCost == null) {
        return NextResponse.json({ error: '월매출, 월고정비 필수' }, { status: 400 })
      }
      result = scoreBusiness(params)

    } else {
      return NextResponse.json({ error: `알 수 없는 calcType: ${calcType}` }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (e) {
    console.error('[finance-calc API]', e)
    return NextResponse.json({ error: `서버 오류: ${(e as Error).message}` }, { status: 500 })
  }
}
```

---

## STEP 4. app/finance/page.tsx 생성
# 대출 계산 + 대출 적정성 + 집매수vs전세 + 사업계산 통합 페이지

```typescript
'use client'
import { useState, useEffect, useRef } from 'react'
import { formatKRW } from '@/lib/format'

type CalcMode = 'loan' | 'affordability' | 'buyvsrent' | 'business'

const MODES: { key: CalcMode; label: string; icon: string; desc: string }[] = [
  { key: 'loan', label: '대출 계산기', icon: '🏦', desc: '이자·월납입·상환 일정' },
  { key: 'affordability', label: '대출 적정성', icon: '⚖️', desc: 'DTI·DSR·감당 가능 금액' },
  { key: 'buyvsrent', label: '매수 vs 전세', icon: '🏠', desc: '어느 쪽이 유리한가' },
  { key: 'business', label: '사업 생존 계산', icon: '🚀', desc: '런웨이·손익분기·생존 확률' },
]

export default function FinancePage() {
  const [mode, setMode] = useState<CalcMode>('loan')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 대출 계산기
  const [loan, setLoan] = useState({
    principal: '', annualRate: '', months: '',
    repaymentType: 'equal-payment' as 'equal-payment' | 'equal-principal',
    gracePeriodMonths: '0', startDate: '',
  })

  // 대출 적정성
  const [afford, setAfford] = useState({
    monthlyIncome: '', monthlyExpense: '', existingDebtPayment: '',
    newLoanPayment: '', totalAssets: '', loanPrincipal: '',
  })

  // 매수 vs 전세
  const [bvr, setBvr] = useState({
    currentAssets: '', monthlyIncome: '', analysisYears: '',
    buyPrice: '', downPayment: '', mortgagePrincipal: '',
    mortgageAnnualRate: '', mortgageMonths: '',
    propertyTaxRate: '0.4', maintenanceFeeMonthly: '',
    homeAppreciationRate: '',
    jeonseDeposit: '', jeonseDepositLoanRate: '',
    jeonseMonthlyFee: '', jeonseAppreciationRate: '',
    investmentReturn: '', investmentVolatility: '',
  })

  // 사업
  const [biz, setBiz] = useState({
    monthlyRevenue: '', monthlyFixedCost: '',
    monthlyVariableCostRate: '', cashReserve: '', monthlyGrowthRate: '',
  })

  const n = (v: string) => parseFloat(v) || 0
  const pct = (v: string) => parseFloat(v) / 100 || 0

  // 입력 바뀌면 자동 계산
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => calculate(), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [mode, loan, afford, bvr, biz])

  async function calculate() {
    setError(null)
    let body: any = { calcType: mode }

    if (mode === 'loan') {
      if (!loan.principal || !loan.annualRate || !loan.months) return
      body = { ...body, principal: n(loan.principal), annualRate: pct(loan.annualRate),
                months: n(loan.months), repaymentType: loan.repaymentType,
                gracePeriodMonths: n(loan.gracePeriodMonths),
                startDate: loan.startDate || undefined }
    } else if (mode === 'affordability') {
      if (!afford.monthlyIncome || !afford.newLoanPayment) return
      body = { ...body, monthlyIncome: n(afford.monthlyIncome),
                monthlyExpense: n(afford.monthlyExpense),
                existingDebtPayment: n(afford.existingDebtPayment),
                newLoanPayment: n(afford.newLoanPayment),
                totalAssets: n(afford.totalAssets),
                loanPrincipal: n(afford.loanPrincipal) }
    } else if (mode === 'buyvsrent') {
      if (!bvr.buyPrice || !bvr.jeonseDeposit || !bvr.analysisYears) return
      body = { ...body,
                currentAssets: n(bvr.currentAssets),
                monthlyIncome: n(bvr.monthlyIncome),
                analysisYears: n(bvr.analysisYears),
                buyPrice: n(bvr.buyPrice), downPayment: n(bvr.downPayment),
                mortgagePrincipal: n(bvr.mortgagePrincipal),
                mortgageAnnualRate: pct(bvr.mortgageAnnualRate),
                mortgageMonths: n(bvr.mortgageMonths),
                propertyTaxRate: pct(bvr.propertyTaxRate),
                maintenanceFeeMonthly: n(bvr.maintenanceFeeMonthly),
                homeAppreciationRate: pct(bvr.homeAppreciationRate),
                jeonseDeposit: n(bvr.jeonseDeposit),
                jeonseDepositLoanRate: pct(bvr.jeonseDepositLoanRate),
                jeonseMonthlyFee: n(bvr.jeonseMonthlyFee),
                jeonseAppreciationRate: pct(bvr.jeonseAppreciationRate),
                investmentReturn: pct(bvr.investmentReturn),
                investmentVolatility: pct(bvr.investmentVolatility) }
    } else if (mode === 'business') {
      if (!biz.monthlyRevenue || !biz.monthlyFixedCost) return
      body = { ...body,
                monthlyRevenue: n(biz.monthlyRevenue),
                monthlyFixedCost: n(biz.monthlyFixedCost),
                monthlyVariableCostRate: pct(biz.monthlyVariableCostRate),
                cashReserve: n(biz.cashReserve),
                monthlyGrowthRate: pct(biz.monthlyGrowthRate) }
    }

    setLoading(true)
    try {
      const res = await fetch('/api/finance-calc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const ic = "w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none text-sm"
  const lc = "text-gray-400 text-xs mb-1 block"

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-bold">💰 재무 계산기</h1>
          <p className="text-gray-400 text-sm mt-1">
            대출·적정성·매수vs전세·사업 — 숫자 입력 즉시 계산
          </p>
        </div>

        {/* 모드 선택 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {MODES.map(m => (
            <button key={m.key} onClick={() => { setMode(m.key); setResult(null) }}
              className={`p-4 rounded-xl text-left transition-all ${
                mode === m.key ? 'bg-orange-500 text-white' : 'bg-[#1a2035] text-gray-300 hover:bg-[#242b45]'
              }`}>
              <div className="text-2xl mb-1">{m.icon}</div>
              <div className="font-semibold text-sm">{m.label}</div>
              <div className={`text-xs mt-0.5 ${mode === m.key ? 'text-orange-100' : 'text-gray-500'}`}>{m.desc}</div>
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">

          {/* 입력 패널 */}
          <div className="bg-[#1a2035] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">입력</h3>
              {loading && <span className="text-orange-400 text-xs animate-pulse">계산 중...</span>}
            </div>

            {/* 대출 계산기 */}
            {mode === 'loan' && (
              <>
                <div><label className={lc}>대출 원금 (원) *</label>
                  <input type="number" placeholder="예: 300000000" value={loan.principal}
                    onChange={e => setLoan(v => ({ ...v, principal: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>연 이자율 (%) *</label>
                  <input type="number" step="0.1" placeholder="예: 4.5" value={loan.annualRate}
                    onChange={e => setLoan(v => ({ ...v, annualRate: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>대출 기간 (개월) *</label>
                  <input type="number" placeholder="예: 360 (30년)" value={loan.months}
                    onChange={e => setLoan(v => ({ ...v, months: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>상환 방식</label>
                  <select value={loan.repaymentType}
                    onChange={e => setLoan(v => ({ ...v, repaymentType: e.target.value as any }))}
                    className={ic}>
                    <option value="equal-payment">원리금균등 (매월 동일 납입)</option>
                    <option value="equal-principal">원금균등 (원금 고정, 이자 감소)</option>
                  </select></div>
                <div><label className={lc}>거치 기간 (개월, 이자만 납입)</label>
                  <input type="number" placeholder="예: 0" value={loan.gracePeriodMonths}
                    onChange={e => setLoan(v => ({ ...v, gracePeriodMonths: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>대출 시작일 (선택)</label>
                  <input type="date" value={loan.startDate}
                    onChange={e => setLoan(v => ({ ...v, startDate: e.target.value }))} className={ic} /></div>
              </>
            )}

            {/* 대출 적정성 */}
            {mode === 'affordability' && (
              <>
                <div><label className={lc}>월 소득 (원) *</label>
                  <input type="number" placeholder="예: 5000000" value={afford.monthlyIncome}
                    onChange={e => setAfford(v => ({ ...v, monthlyIncome: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>월 지출 (원, 대출 제외)</label>
                  <input type="number" placeholder="예: 2000000" value={afford.monthlyExpense}
                    onChange={e => setAfford(v => ({ ...v, monthlyExpense: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>기존 부채 월 납입액 (원)</label>
                  <input type="number" placeholder="예: 500000" value={afford.existingDebtPayment}
                    onChange={e => setAfford(v => ({ ...v, existingDebtPayment: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>신규 대출 월 납입액 (원) *</label>
                  <input type="number" placeholder="예: 1500000" value={afford.newLoanPayment}
                    onChange={e => setAfford(v => ({ ...v, newLoanPayment: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>총 자산 (원)</label>
                  <input type="number" placeholder="예: 200000000" value={afford.totalAssets}
                    onChange={e => setAfford(v => ({ ...v, totalAssets: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>대출 원금 (원)</label>
                  <input type="number" placeholder="예: 300000000" value={afford.loanPrincipal}
                    onChange={e => setAfford(v => ({ ...v, loanPrincipal: e.target.value }))} className={ic} /></div>
              </>
            )}

            {/* 매수 vs 전세 */}
            {mode === 'buyvsrent' && (
              <>
                <div><label className={lc}>비교 기간 (년) *</label>
                  <input type="number" placeholder="예: 10" value={bvr.analysisYears}
                    onChange={e => setBvr(v => ({ ...v, analysisYears: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>매수 — 집 가격 (원) *</label>
                  <input type="number" placeholder="예: 800000000" value={bvr.buyPrice}
                    onChange={e => setBvr(v => ({ ...v, buyPrice: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>매수 — 대출 원금 (원)</label>
                  <input type="number" placeholder="예: 400000000" value={bvr.mortgagePrincipal}
                    onChange={e => setBvr(v => ({ ...v, mortgagePrincipal: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>매수 — 대출 금리 (%)</label>
                  <input type="number" step="0.1" placeholder="예: 4.5" value={bvr.mortgageAnnualRate}
                    onChange={e => setBvr(v => ({ ...v, mortgageAnnualRate: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>매수 — 대출 기간 (개월)</label>
                  <input type="number" placeholder="예: 360" value={bvr.mortgageMonths}
                    onChange={e => setBvr(v => ({ ...v, mortgageMonths: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>매수 — 집값 연 상승률 (%)</label>
                  <input type="number" step="0.1" placeholder="예: 3" value={bvr.homeAppreciationRate}
                    onChange={e => setBvr(v => ({ ...v, homeAppreciationRate: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>매수 — 월 관리비 (원)</label>
                  <input type="number" placeholder="예: 300000" value={bvr.maintenanceFeeMonthly}
                    onChange={e => setBvr(v => ({ ...v, maintenanceFeeMonthly: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>전세 — 보증금 (원) *</label>
                  <input type="number" placeholder="예: 500000000" value={bvr.jeonseDeposit}
                    onChange={e => setBvr(v => ({ ...v, jeonseDeposit: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>전세 — 대출 금리 (%, 없으면 0)</label>
                  <input type="number" step="0.1" placeholder="예: 2.5" value={bvr.jeonseDepositLoanRate}
                    onChange={e => setBvr(v => ({ ...v, jeonseDepositLoanRate: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>전세 — 연 전세가 상승률 (%)</label>
                  <input type="number" step="0.1" placeholder="예: 3" value={bvr.jeonseAppreciationRate}
                    onChange={e => setBvr(v => ({ ...v, jeonseAppreciationRate: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>차액 투자 수익률 (%)</label>
                  <input type="number" step="0.1" placeholder="예: 7" value={bvr.investmentReturn}
                    onChange={e => setBvr(v => ({ ...v, investmentReturn: e.target.value }))} className={ic} /></div>
              </>
            )}

            {/* 사업 계산 */}
            {mode === 'business' && (
              <>
                <div><label className={lc}>월 매출 (원) *</label>
                  <input type="number" placeholder="예: 10000000" value={biz.monthlyRevenue}
                    onChange={e => setBiz(v => ({ ...v, monthlyRevenue: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>월 고정비 (원) *</label>
                  <input type="number" placeholder="예: 5000000" value={biz.monthlyFixedCost}
                    onChange={e => setBiz(v => ({ ...v, monthlyFixedCost: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>변동비율 (매출 대비 %, 예: 재료비)</label>
                  <input type="number" placeholder="예: 30" value={biz.monthlyVariableCostRate}
                    onChange={e => setBiz(v => ({ ...v, monthlyVariableCostRate: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>보유 현금 (런웨이 계산용, 원)</label>
                  <input type="number" placeholder="예: 30000000" value={biz.cashReserve}
                    onChange={e => setBiz(v => ({ ...v, cashReserve: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>월 매출 성장률 (%)</label>
                  <input type="number" step="0.1" placeholder="예: 5" value={biz.monthlyGrowthRate}
                    onChange={e => setBiz(v => ({ ...v, monthlyGrowthRate: e.target.value }))} className={ic} /></div>
              </>
            )}
          </div>

          {/* 결과 패널 */}
          <div className="bg-[#1a2035] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">결과</h3>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm mb-3">{error}</div>
            )}

            {!result && !loading && (
              <p className="text-gray-500 text-sm">숫자를 입력하면 자동으로 계산됩니다</p>
            )}

            {/* 대출 결과 */}
            {result && mode === 'loan' && (
              <div className="space-y-3">
                {[
                  { label: loan.repaymentType === 'equal-payment' ? '월 납입액 (고정)' : '첫 달 납입액',
                    value: formatKRW(result.monthlyPayment ?? result.firstMonthPayment), color: 'text-orange-400' },
                  ...(loan.repaymentType === 'equal-principal' ? [
                    { label: '마지막 달 납입액', value: formatKRW(result.lastMonthPayment), color: 'text-green-400' },
                  ] : []),
                  { label: '총 납입액', value: formatKRW(result.totalPayment), color: 'text-white' },
                  { label: '총 이자', value: formatKRW(result.totalInterest), color: 'text-red-400' },
                  { label: '이자 비율', value: `${(result.interestRatio * 100).toFixed(1)}%`, color: 'text-yellow-400' },
                  { label: '원금 50% 상환 시점', value: `${result.breakEvenMonth}개월 후`, color: 'text-blue-400' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center py-2 border-b border-gray-800">
                    <span className="text-gray-400 text-sm">{r.label}</span>
                    <span className={`font-semibold ${r.color}`}>{r.value}</span>
                  </div>
                ))}

                {/* 상환 일정 미리보기 (12개월) */}
                {result.schedule?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-400 text-xs mb-2">상환 일정 (처음 12개월)</p>
                    <div className="overflow-x-auto max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-[#1a2035]">
                          <tr className="text-gray-500">
                            <th className="text-left py-1">월</th>
                            <th className="text-right py-1">납입액</th>
                            <th className="text-right py-1">원금</th>
                            <th className="text-right py-1">이자</th>
                            <th className="text-right py-1">잔액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.schedule.slice(0, 12).map((row: any) => (
                            <tr key={row.month} className="border-t border-gray-800">
                              <td className="py-1 text-gray-400">{row.month}월</td>
                              <td className="py-1 text-right text-white">{formatKRW(row.payment)}</td>
                              <td className="py-1 text-right text-blue-400">{formatKRW(row.principal)}</td>
                              <td className="py-1 text-right text-red-400">{formatKRW(row.interest)}</td>
                              <td className="py-1 text-right text-gray-300">{formatKRW(row.remainingBalance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 대출 적정성 결과 */}
            {result && mode === 'affordability' && (
              <div className="space-y-3">
                <div className={`text-center py-3 rounded-xl font-bold text-lg ${
                  result.verdict === '여유' ? 'bg-green-900/40 text-green-400' :
                  result.verdict === '적정' ? 'bg-blue-900/40 text-blue-400' :
                  result.verdict === '주의' ? 'bg-yellow-900/40 text-yellow-400' :
                  result.verdict === '위험' ? 'bg-orange-900/40 text-orange-400' :
                  'bg-red-900/40 text-red-400'
                }`}>
                  {result.verdict}
                </div>
                {[
                  { label: 'DTI (총부채상환비율)', value: `${(result.dti * 100).toFixed(1)}%`,
                    color: result.dti < 0.4 ? 'text-green-400' : result.dti < 0.5 ? 'text-yellow-400' : 'text-red-400' },
                  { label: '월 여유 현금', value: formatKRW(result.surplus),
                    color: result.surplus >= 0 ? 'text-green-400' : 'text-red-400' },
                  { label: '최대 감당 가능 대출', value: formatKRW(result.maxAffordableLoan), color: 'text-blue-400' },
                  { label: 'LTV (담보인정비율)', value: `${(result.ltv * 100).toFixed(1)}%`,
                    color: result.ltv < 0.6 ? 'text-green-400' : result.ltv < 0.8 ? 'text-yellow-400' : 'text-red-400' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400 text-sm">{r.label}</span>
                    <span className={`font-semibold ${r.color}`}>{r.value}</span>
                  </div>
                ))}
                <div className="space-y-1 mt-2">
                  {result.reasons?.map((r: string, i: number) => (
                    <p key={i} className="text-gray-400 text-xs">• {r}</p>
                  ))}
                </div>
              </div>
            )}

            {/* 매수 vs 전세 결과 */}
            {result && mode === 'buyvsrent' && (
              <div className="space-y-3">
                <div className={`text-center py-3 rounded-xl font-bold text-xl ${
                  result.winner === '매수' ? 'bg-blue-900/40 text-blue-400' :
                  result.winner === '전세' ? 'bg-green-900/40 text-green-400' :
                  'bg-gray-800 text-gray-300'
                }`}>
                  {result.winner} 유리 ({formatKRW(result.difference)} 차이)
                </div>
                {[
                  { label: `매수 순자산 (${result.years}년 후)`, value: formatKRW(result.buyNetWorth), color: 'text-blue-400' },
                  { label: `전세 순자산 (${result.years}년 후)`, value: formatKRW(result.rentNetWorth), color: 'text-green-400' },
                  { label: '매수 월평균 비용', value: formatKRW(result.buyMonthlyCost), color: 'text-orange-400' },
                  { label: '전세 월평균 비용', value: formatKRW(result.rentMonthlyCost), color: 'text-orange-400' },
                  { label: '매수 유리 전환 시점',
                    value: result.breakEvenYear ? `${result.breakEvenYear}년 후` : '분석 기간 내 없음',
                    color: result.breakEvenYear ? 'text-yellow-400' : 'text-gray-400' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400 text-sm">{r.label}</span>
                    <span className={`font-semibold ${r.color}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 사업 결과 */}
            {result && mode === 'business' && (
              <div className="space-y-3">
                <div className={`text-center py-3 rounded-xl font-bold text-xl ${
                  result.verdict === '안정' ? 'bg-green-900/40 text-green-400' :
                  result.verdict === '주의' ? 'bg-yellow-900/40 text-yellow-400' :
                  result.verdict === '위험' ? 'bg-orange-900/40 text-orange-400' :
                  'bg-red-900/40 text-red-400'
                }`}>
                  {result.verdict}
                </div>
                {[
                  { label: '영업이익률', value: `${(result.currentMargin * 100).toFixed(1)}%`,
                    color: result.currentMargin >= 0.1 ? 'text-green-400' : result.currentMargin >= 0 ? 'text-yellow-400' : 'text-red-400' },
                  { label: '손익분기 매출', value: formatKRW(result.breakEvenRevenue), color: 'text-blue-400' },
                  { label: '런웨이 (현금 소진까지)',
                    value: result.runway >= 999 ? '흑자 — 소진 없음' : `${result.runway.toFixed(1)}개월`,
                    color: result.runway >= 12 ? 'text-green-400' : result.runway >= 6 ? 'text-yellow-400' : 'text-red-400' },
                  { label: '12개월 생존 확률', value: `${(result.survivalProb * 100).toFixed(0)}%`,
                    color: result.survivalProb >= 0.8 ? 'text-green-400' : result.survivalProb >= 0.5 ? 'text-yellow-400' : 'text-red-400' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400 text-sm">{r.label}</span>
                    <span className={`font-semibold ${r.color}`}>{r.value}</span>
                  </div>
                ))}
                <div className="space-y-1 mt-2">
                  {result.recommendations?.map((r: string, i: number) => (
                    <p key={i} className="text-gray-400 text-xs">• {r}</p>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
```

---

## STEP 5. 네비게이션 추가

```typescript
{ href: '/finance', label: '💰 재무계산기' }
```

---

## STEP 6. lifecycle API에서 이자 반영

app/api/lifecycle/route.ts 에서 부채 이자 비용을 연간 지출에 포함:

lifecycle model에 `currentLiabilitiesAnnualInterest` 필드 추가:

```typescript
// 부채가 있으면 이자를 연간 지출에 자동 반영
// liabilities 배열을 받아서 총 이자 계산
export interface LifecycleInput {
  // ... 기존 필드 ...
  liabilitiesAnnualInterest?: number  // 연 이자 총합 (원) — 자산관리에서 가져옴
}
```

lib/lifecycle-model.ts의 `annualExpense` 계산 부분에 추가:

```typescript
// 부채 이자를 지출에 포함
const annualDebtInterest = !isRetired ? (input.liabilitiesAnnualInterest ?? 0) : 0
annualExpense += annualDebtInterest
```

---

## STEP 7. 완료 확인

```bash
cd E:\dev\finsi
npx tsc --noEmit
npm run build
```

에러 없으면 PHASE 7 완료.
