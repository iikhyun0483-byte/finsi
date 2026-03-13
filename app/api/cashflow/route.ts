// app/api/cashflow/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { calcCashflow, CashflowInput } from '@/lib/cashflow-engine'

export async function POST(req: NextRequest) {
  try {
    const body: CashflowInput = await req.json()

    // 필수 검증
    if (!body.incomes?.length)
      return NextResponse.json({ error: '수입을 최소 1개 입력하세요' }, { status: 400 })
    if (body.fixedExpense == null)
      return NextResponse.json({ error: '월 고정지출을 입력하세요' }, { status: 400 })
    if (!body.riskParams)
      return NextResponse.json({ error: '리스크 파라미터를 입력하세요' }, { status: 400 })

    // 부채 논리 검증
    for (const d of body.debts ?? []) {
      const minPayment = d.principal * d.annualRate / 12
      if (d.monthlyPayment > 0 && d.monthlyPayment <= minPayment) {
        return NextResponse.json({
          error: `[${d.name}] 월납입액(${d.monthlyPayment.toLocaleString()}원)이 이자(${Math.round(minPayment).toLocaleString()}원)보다 적습니다. 원금이 줄지 않습니다.`
        }, { status: 400 })
      }
    }

    const result = calcCashflow(body)

    // 함수는 JSON 직렬화 불가 — 제외 후 반환
    const { extraRepaymentEffect, ...serializable } = result
    return NextResponse.json(serializable)

  } catch (e) {
    console.error('[cashflow]', e)
    return NextResponse.json({ error: `서버 오류: ${(e as Error).message}` }, { status: 500 })
  }
}
