// app/api/lifecycle/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { runLifecycle, LifecycleInput } from '@/lib/lifecycle-model'
import { runMonteCarlo } from '@/lib/monte-carlo'

export async function POST(req: NextRequest) {
  try {
    const body: LifecycleInput & { simulations: number } = await req.json()

    // 필수 입력 검증
    const required = ['currentAge', 'retirementAge', 'deathAge', 'currentAssets',
                      'monthlyIncome', 'monthlyExpense', 'investmentReturn',
                      'retirementMonthlyExpense', 'pensionMonthly', 'pensionStartAge']
    for (const key of required) {
      if ((body as any)[key] == null) {
        return NextResponse.json({ error: `${key} 값이 없습니다` }, { status: 400 })
      }
    }

    // 논리 관계 검증
    if (body.retirementAge <= body.currentAge) {
      return NextResponse.json({ error: `은퇴 나이(${body.retirementAge})는 현재 나이(${body.currentAge})보다 커야 합니다` }, { status: 400 })
    }
    if (body.deathAge <= body.retirementAge) {
      return NextResponse.json({ error: `기대 수명(${body.deathAge})은 은퇴 나이(${body.retirementAge})보다 커야 합니다` }, { status: 400 })
    }
    if (body.investmentVolatility <= 0) {
      return NextResponse.json({ error: '연 변동성은 0보다 커야 합니다' }, { status: 400 })
    }

    const lifecycleResult = runLifecycle(body)

    // 은퇴 후 몬테카를로 — 시뮬레이션 횟수도 사용자 입력
    const remainingYears = body.deathAge - body.retirementAge
    const mcResult = remainingYears > 0 && body.simulations > 0
      ? runMonteCarlo({
          initialCapital: lifecycleResult.retirementAssets,
          periodicContribution: -body.retirementMonthlyExpense,
          contributionUnit: 'monthly',
          annualReturn: body.investmentReturn,
          annualVolatility: body.investmentVolatility,
          timeRange: { value: remainingYears, unit: 'year' },
          simulations: body.simulations,
          withdrawalRate: 0,
          targetAmount: null,
        })
      : null

    return NextResponse.json({ lifecycle: lifecycleResult, montecarlo: mcResult })
  } catch (e) {
    console.error('[lifecycle API]', e)
    return NextResponse.json({ error: `서버 오류: ${(e as Error).message}` }, { status: 500 })
  }
}
