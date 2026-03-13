// app/api/stat-arb/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { analyzePair, generatePairSignal, extractCloseprices } from '@/lib/stat-arb'

export async function POST(req: NextRequest) {
  try {
    const { pairs, entryThreshold = 2.0, exitThreshold = 0.5 } = await req.json()

    if (!pairs || pairs.length === 0) {
      return NextResponse.json({ error: '페어 데이터가 없습니다' }, { status: 400 })
    }

    const results = pairs.map((p: Record<string, unknown>) => {
      // 서버에서 명시적으로 가격 추출 — 형식 불일치 방지
      const prices1 = extractCloseprices((p.prices1 as unknown[]) ?? [])
      const prices2 = extractCloseprices((p.prices2 as unknown[]) ?? [])
      const analysis = analyzePair(
        String(p.symbol1), String(p.symbol2),
        prices1, prices2
      )
      const signal = generatePairSignal(analysis, entryThreshold, exitThreshold)
      return { analysis, signal }
    })

    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
