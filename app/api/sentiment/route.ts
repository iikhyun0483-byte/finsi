// app/api/sentiment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchFearGreed, analyzeNewsSentiment, analyzeCommunityScore, calcCompositeSentiment, getContrarianSignal } from '@/lib/sentiment'

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
      const { data, error } = await supabase
        .from('sentiment_scores')
        .select('*')
        .eq('symbol', symbol)
        .eq('score_date', today)
        .single()

      // PGRST116 = not found는 정상, 나머지 에러는 로깅
      if (error && error.code !== 'PGRST116') {
        console.error('[Sentiment API] DB query error:', error)
      }

      if (data) {
        const contrarian = getContrarianSignal(data.composite)
        return NextResponse.json({ data, contrarian, cached: true })
      }

      // 없으면 실시간 계산 (병렬 처리)
      const [fearGreed, newsScore, communityScore] = await Promise.all([
        fetchFearGreed(),
        analyzeNewsSentiment(symbol),
        analyzeCommunityScore(symbol)
      ])

      // TODO: Google Trends API 연동 예정 (현재는 중립값 50)
      const searchTrend = 50

      const { composite, signal } = calcCompositeSentiment(fearGreed, newsScore, communityScore, searchTrend)
      const contrarian = getContrarianSignal(composite)

      const record = {
        symbol, score_date: today,
        fear_greed: fearGreed,
        news_score: newsScore,
        community_score: communityScore,
        search_trend: searchTrend,
        composite,
        signal,
      }

      const { error: upsertError } = await supabase
        .from('sentiment_scores')
        .upsert(record, { onConflict: 'symbol,score_date' })

      if (upsertError) {
        console.error('[Sentiment API] DB upsert error:', upsertError)
      }

      return NextResponse.json({ data: record, contrarian, cached: false })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
