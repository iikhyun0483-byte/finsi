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
