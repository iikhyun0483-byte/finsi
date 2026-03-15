import { NextRequest, NextResponse } from 'next/server'
import { trainAndPredict, ensembleSignal } from '@/lib/ml-signal'

export async function GET() {
  return NextResponse.json({ message: 'ML Signal API - Use POST for predictions' })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { signalScore, factorScore } = body

    // 입력 검증
    if (typeof signalScore !== 'number' || typeof factorScore !== 'number') {
      return NextResponse.json(
        { error: 'Invalid input: signalScore and factorScore must be numbers' },
        { status: 400 }
      )
    }

    // ML 예측 실행
    const prediction = await trainAndPredict({
      signalScore,
      factorScore,
    })

    // 앙상블 점수 계산
    const ensemble = ensembleSignal(
      signalScore,
      prediction.probability,
      prediction.sampleCount
    )

    return NextResponse.json({
      prediction,
      ensemble,
      success: true,
    })
  } catch (error) {
    console.error('[ML Signal] Error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Prediction failed' },
      { status: 500 }
    )
  }
}
