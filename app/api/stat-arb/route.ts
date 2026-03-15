// app/api/stat-arb/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { analyzePairWithCache, generatePairSignal, toPricePoints, alignPricesByDate } from '@/lib/stat-arb'

export async function POST(req: NextRequest) {
  try {
    const { pairs, entryThreshold = 2.0, exitThreshold = 0.5 } = await req.json()

    if (!pairs || pairs.length === 0) {
      return NextResponse.json({ error: '페어 데이터가 없습니다' }, { status: 400 })
    }

    const results = await Promise.all(
      pairs.map(async (p: Record<string, unknown>) => {
        // 서버에서 명시적으로 가격 추출 및 날짜 정렬
        const pricePoints1 = toPricePoints((p.prices1 as unknown[]) ?? [])
        const pricePoints2 = toPricePoints((p.prices2 as unknown[]) ?? [])

        // 날짜 기준 정렬 (교집합)
        const { aligned1, aligned2 } = alignPricesByDate(pricePoints1, pricePoints2)

        // Supabase 캐싱 적용
        const analysis = await analyzePairWithCache(
          String(p.symbol1), String(p.symbol2),
          aligned1, aligned2
        )

        const signal = generatePairSignal(analysis, entryThreshold, exitThreshold)
        return { analysis, signal }
      })
    )

    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
