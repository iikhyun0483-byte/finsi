// app/api/monte-carlo/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { runMonteCarlo } from '@/lib/monte-carlo'
import { parseTimeInput } from '@/lib/time-utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      initialCapital, periodicContribution, contributionUnit,
      annualReturn, annualVolatility,
      timeInput, timeRange,
      simulations, withdrawalRate, targetAmount,
    } = body

    if (initialCapital == null || annualReturn == null || annualVolatility == null)
      return NextResponse.json({ error: '초기 자산, 수익률, 변동성은 필수입니다' }, { status: 400 })
    if (!timeInput && !timeRange)
      return NextResponse.json({ error: '기간 또는 마감 날짜를 입력하세요' }, { status: 400 })
    if (!simulations || simulations < 100)
      return NextResponse.json({ error: '시뮬레이션 횟수는 최소 100회입니다' }, { status: 400 })

    const result = runMonteCarlo({
      initialCapital,
      periodicContribution: periodicContribution ?? 0,
      contributionUnit: contributionUnit ?? 'monthly',
      annualReturn,
      annualVolatility,
      timeRange: timeRange ?? parseTimeInput(timeInput),
      simulations,
      withdrawalRate: withdrawalRate ?? 0,
      targetAmount: targetAmount ?? null,
    })

    return NextResponse.json(result)
  } catch (e) {
    console.error('[monte-carlo API]', e)
    return NextResponse.json({ error: `서버 오류: ${(e as Error).message}` }, { status: 500 })
  }
}
