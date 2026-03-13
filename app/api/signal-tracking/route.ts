// app/api/signal-tracking/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { recordSignal, updateOutcomes, getAccuracy, backfillSignals } from '@/lib/signal-tracker'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'record') {
      await recordSignal(body.symbol, body.signalType, body.signalScore, body.entryPrice)
      return NextResponse.json({ ok: true })
    }
    if (action === 'update') {
      await updateOutcomes(body.symbol, body.currentPrice)
      return NextResponse.json({ ok: true })
    }
    if (action === 'accuracy') {
      const data = await getAccuracy(body.symbol)
      return NextResponse.json({ data })
    }
    if (action === 'backfill') {
      // body.historicalSignals: 신호 엔진이 생성한 과거 신호 배열
      await backfillSignals(body.symbol, body.historicalSignals)
      return NextResponse.json({ ok: true, count: body.historicalSignals.length })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
