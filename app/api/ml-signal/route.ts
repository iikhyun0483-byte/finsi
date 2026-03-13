// app/api/ml-signal/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { trainAndPredict, ensembleSignal } from '@/lib/ml-signal'
import type { MLFeatures } from '@/lib/ml-signal'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const features: MLFeatures = {
      signalScore:    body.signalScore    ?? 70,
      factorScore:    body.factorScore    ?? 0,
      supplyScore:    body.supplyScore    ?? 0,
      sentimentScore: body.sentimentScore ?? 50,
      momentum12m:    body.momentum12m    ?? 0,
      volatility:     body.volatility     ?? 0.2,
      regimeCode:     body.regimeCode     ?? 1,
    }

    const prediction = await trainAndPredict(features)
    const ensemble   = ensembleSignal(
      features.signalScore,
      prediction.probability,
      prediction.sampleCount
    )

    return NextResponse.json({ prediction, ensemble })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
