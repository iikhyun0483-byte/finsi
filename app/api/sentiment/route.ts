// app/api/sentiment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchFearGreed, analyzeNewsSentiment, calcCompositeSentiment, getContrarianSignal } from '@/lib/sentiment'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol') ?? 'MARKET'
    const action = searchParams.get('action') ?? 'get'

    if (action === 'get') {
      // DB에서 오늘 데이터 조회
      const today = new Date().toISOString().slice(0,10)
      const { data } = await supabase
        .from('sentiment_scores')
        .select('*')
        .eq('symbol', symbol)
        .eq('score_date', today)
        .single()

      if (data) return NextResponse.json({ data, cached: true })

      // 없으면 실시간 계산
      const fearGreed  = await fetchFearGreed()
      const newsScore  = symbol !== 'MARKET' ? await analyzeNewsSentiment(symbol) : 0
      const { composite, signal } = calcCompositeSentiment(fearGreed, newsScore, 0, 50)
      const contrarian = getContrarianSignal(composite)

      const record = {
        symbol, score_date: today,
        fear_greed: fearGreed, news_score: newsScore,
        community_score: 0, search_trend: 50,
        composite, signal,
      }
      await supabase.from('sentiment_scores').upsert(record, { onConflict: 'symbol,score_date' })

      return NextResponse.json({ data: record, contrarian, cached: false })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
