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
