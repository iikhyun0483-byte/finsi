// app/api/macro/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { syncMacroIndicators, getMacroRiskScore } from '@/lib/macro-tracker'

export async function GET(req: NextRequest) {
  const action = new URL(req.url).searchParams.get('action') ?? 'score'
  try {
    if (action === 'sync') {
      const signals = await syncMacroIndicators()
      return NextResponse.json({ signals })
    }
    if (action === 'score') {
      const result = await getMacroRiskScore()
      return NextResponse.json(result)
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
