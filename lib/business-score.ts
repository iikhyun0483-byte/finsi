// lib/business-score.ts
// 창업/사업 생존 확률 분석 (핀시 확장 — 인간 재무 의사결정)

export interface BusinessInput {
  monthlyRevenue: number        // 월 매출
  monthlyFixedCost: number      // 월 고정비
  monthlyVariableCostRate: number // 변동비율 (0~1)
  cashReserve: number           // 보유 현금
  monthlyGrowthRate: number     // 월 성장률 (소수)
  runway?: number               // 런웨이 (개월, 미입력 시 자동 계산)
}

export interface BusinessResult {
  breakEvenRevenue: number      // 손익분기 매출
  currentMargin: number         // 현재 영업이익률
  runway: number                // 현금 소진까지 개월
  survivalProb: number          // 12개월 생존 확률
  verdict: '안정' | '주의' | '위험' | '즉시조치'
  recommendations: string[]
}

export function scoreBusiness(input: BusinessInput): BusinessResult {
  const {
    monthlyRevenue,
    monthlyFixedCost,
    monthlyVariableCostRate,
    cashReserve,
    monthlyGrowthRate,
  } = input

  const variableCost = monthlyRevenue * monthlyVariableCostRate
  const totalCost = monthlyFixedCost + variableCost
  const monthlyProfit = monthlyRevenue - totalCost
  const currentMargin = monthlyRevenue > 0 ? monthlyProfit / monthlyRevenue : -1

  const breakEvenRevenue = monthlyFixedCost / (1 - monthlyVariableCostRate)

  // 런웨이 계산
  let runway: number
  if (monthlyProfit >= 0) {
    runway = 999 // 흑자 — 무한 런웨이
  } else {
    const burnRate = Math.abs(monthlyProfit)
    runway = cashReserve / burnRate
  }

  // 12개월 생존 시뮬레이션
  let cash = cashReserve
  let revenue = monthlyRevenue
  let survived = 0
  for (let m = 0; m < 12; m++) {
    const cost = monthlyFixedCost + revenue * monthlyVariableCostRate
    cash += revenue - cost
    revenue *= (1 + monthlyGrowthRate)
    if (cash >= 0) survived++
  }
  const survivalProb = survived / 12

  // 판단
  let verdict: BusinessResult['verdict']
  if (runway >= 18 && currentMargin >= 0.1) verdict = '안정'
  else if (runway >= 6 && currentMargin >= 0) verdict = '주의'
  else if (runway >= 3) verdict = '위험'
  else verdict = '즉시조치'

  // 권고사항
  const recommendations: string[] = []
  if (currentMargin < 0) recommendations.push(`손익분기점까지 월 ${(breakEvenRevenue - monthlyRevenue).toLocaleString()}원 매출 필요`)
  if (runway < 6) recommendations.push(`현금 ${runway.toFixed(1)}개월치 남음 — 즉시 비용 절감 또는 자금 조달`)
  if (monthlyVariableCostRate > 0.6) recommendations.push('변동비율이 높음 — 원가 구조 재검토 필요')
  if (monthlyGrowthRate <= 0) recommendations.push('성장이 정체됨 — 매출 확대 전략 수립 필요')
  if (recommendations.length === 0) recommendations.push('현재 재무 구조 안정적 — 성장 투자 검토 가능')

  return { breakEvenRevenue, currentMargin, runway, survivalProb, verdict, recommendations }
}
