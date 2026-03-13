// app/api/factor-score/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { screenUniverse, parseFundamentals, parsePriceArray, type FactorWeights } from '@/lib/factor-model'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const weights: FactorWeights = {
      momentum: body.weights?.momentum ?? 0.25,
      value:    body.weights?.value    ?? 0.20,
      quality:  body.weights?.quality  ?? 0.25,
      lowVol:   body.weights?.lowVol   ?? 0.15,
      volume:   body.weights?.volume   ?? 0.15,
    }

    const total = Object.values(weights).reduce((s, w) => s + w, 0)
    if (Math.abs(total - 1) > 0.1) {
      return NextResponse.json({ error: '가중치 합계가 1에서 너무 벗어납니다' }, { status: 400 })
    }

    if (!body.universeData || body.universeData.length === 0) {
      return NextResponse.json({ error: '유니버스 데이터를 함께 전송하세요' }, { status: 400 })
    }

    // 서버에서 안전하게 파싱 — 클라이언트에서 보낸 raw 데이터 정규화
    const universe = body.universeData.map((u: Record<string, unknown>) => ({
      symbol:       String(u.symbol),
      prices:       parsePriceArray((u.prices as unknown[]) ?? []),
      fundamentals: parseFundamentals((u.fundamentals as Record<string, unknown>) ?? {}),
    }))

    const scores = screenUniverse(universe, weights)
    return NextResponse.json({ scores, weights, total: scores.length })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
