// app/api/macro/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { syncMacroIndicators, getMacroRiskScore } from '@/lib/macro-tracker'

export async function GET(req: NextRequest) {
  const action = new URL(req.url).searchParams.get('action') ?? 'score'
  try {
    if (action === 'sync') {
      const result = await syncMacroIndicators()
      return NextResponse.json({
        success: true,
        signals: result.signals,
        usedFallback: result.usedFallback,
        fallbackIndicators: result.fallbackIndicators
      })
    }
    if (action === 'score') {
      const result = await getMacroRiskScore()
      return NextResponse.json(result)
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[Macro API] Error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
