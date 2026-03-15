// lib/sentiment.ts

export interface SentimentData {
  fearGreed:      number   // 0~100 (0=극단적공포, 100=극단적탐욕)
  newsScore:      number   // -1~1
  communityScore: number   // -1~1
  searchTrend:    number   // 0~100
  composite:      number   // 0~100
  signal:         'EXTREME_FEAR'|'FEAR'|'NEUTRAL'|'GREED'|'EXTREME_GREED'
}

// Fear & Greed Index API (무료)
export async function fetchFearGreed(): Promise<number> {
  try {
    const res  = await fetch('https://api.alternative.me/fng/?limit=1', { next: { revalidate: 3600 } })
    if (!res.ok) {
      console.warn('[Sentiment] Fear&Greed API error:', res.status)
      return 50
    }
    const data = await res.json()
    return Number(data.data?.[0]?.value ?? 50)
  } catch (error) {
    console.error('[Sentiment] Fear&Greed fetch failed:', error)
    return 50
  }
}

// 뉴스 감정 분석 (Gemini 활용)
export async function analyzeNewsSentiment(symbol: string): Promise<number> {
  try {
    // Finnhub API 키 체크
    if (!process.env.FINNHUB_API_KEY) {
      console.warn('[Sentiment] FINNHUB_API_KEY not set - news sentiment disabled')
      return 0
    }

    // MARKET 심볼이면 SPY로 대체 (S&P500 대표)
    const targetSymbol = symbol === 'MARKET' ? 'SPY' : symbol

    const newsRes = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${targetSymbol}&from=${getDateStr(-7)}&to=${getDateStr(0)}&token=${process.env.FINNHUB_API_KEY}`
    )

    if (!newsRes.ok) {
      console.warn('[Sentiment] Finnhub API error:', newsRes.status)
      return 0
    }

    const news = await newsRes.json()
    if (!Array.isArray(news) || news.length === 0) {
      console.log('[Sentiment] No news found for', targetSymbol)
      return 0
    }

    // Gemini API 키 체크
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[Sentiment] GEMINI_API_KEY not set - using neutral sentiment')
      return 0
    }

    const headlines = news.slice(0, 10).map((n: Record<string,string>) => n.headline).join('\n')
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `다음 뉴스 헤드라인들의 투자 감정을 -1(매우부정)~+1(매우긍정) 숫자 하나로만 답해:\n${headlines}` }]
          }]
        })
      }
    )

    if (!res.ok) {
      console.warn('[Sentiment] Gemini API error:', res.status)
      return 0
    }

    const data = await res.json()
    const text  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '0'
    const score = parseFloat(text.match(/-?\d+\.?\d*/)?.[0] ?? '0')
    return isFinite(score) ? Math.max(-1, Math.min(1, score)) : 0
  } catch (error) {
    console.error('[Sentiment] News sentiment analysis failed:', error)
    return 0
  }
}

// 종합 감정 점수 계산
export function calcCompositeSentiment(
  fearGreed:      number,
  newsScore:      number,
  communityScore: number,
  searchTrend:    number
): { composite: number; signal: SentimentData['signal'] } {
  // 뉴스/커뮤니티 -1~1 → 0~100 변환
  const newsNorm      = (newsScore      + 1) * 50
  const communityNorm = (communityScore + 1) * 50

  const composite = Math.round(
    fearGreed      * 0.30 +
    newsNorm       * 0.35 +
    communityNorm  * 0.20 +
    searchTrend    * 0.15
  )

  const signal: SentimentData['signal'] =
    composite <= 20 ? 'EXTREME_FEAR' :
    composite <= 40 ? 'FEAR' :
    composite <= 60 ? 'NEUTRAL' :
    composite <= 80 ? 'GREED' : 'EXTREME_GREED'

  return { composite, signal }
}

// 역발상 투자 신호
// 극단적 공포 = 매수 타이밍 (Buffett: 남들이 공포에 떨 때 탐욕스러워라)
export function getContrarianSignal(composite: number): {
  action: 'BUY'|'SELL'|'HOLD'
  strength: number
  reason: string
} {
  if (composite <= 20) return {
    action: 'BUY', strength: 0.9,
    reason: '극단적 공포 — 역사적 매수 타이밍 (S&P500 평균 수익률 +24% 12개월)'
  }
  if (composite <= 35) return {
    action: 'BUY', strength: 0.6,
    reason: '공포 구간 — 매수 우위 (평균 +15% 12개월)'
  }
  if (composite >= 80) return {
    action: 'SELL', strength: 0.8,
    reason: '극단적 탐욕 — 고점 경고 (평균 -5% 3개월)'
  }
  if (composite >= 65) return {
    action: 'SELL', strength: 0.5,
    reason: '탐욕 구간 — 부분 익절 고려'
  }
  return { action: 'HOLD', strength: 0.3, reason: '중립 구간 — 신호 없음' }
}

// Reddit 커뮤니티 감정 분석 (무료)
export async function analyzeCommunityScore(symbol: string): Promise<number> {
  try {
    // MARKET 심볼은 건너뛰기
    if (symbol === 'MARKET') return 0

    // Reddit API (무료, 키 불필요)
    const res = await fetch(
      `https://www.reddit.com/r/wallstreetbets/search.json?q=${symbol}&sort=new&limit=25&t=week`,
      { headers: { 'User-Agent': 'finsi-sentiment-bot/1.0' } }
    )

    if (!res.ok) {
      console.warn('[Sentiment] Reddit API error:', res.status)
      return 0
    }

    const data = await res.json()
    const posts = data?.data?.children ?? []

    if (posts.length === 0) return 0

    // 긍정/부정 키워드 기반 간단 분석
    const positiveWords = ['moon', 'bullish', 'calls', 'rocket', '🚀', 'buy', 'long', 'gain']
    const negativeWords = ['bearish', 'puts', 'short', 'sell', 'loss', 'dump', 'crash']

    let score = 0
    posts.forEach((post: any) => {
      const title = (post?.data?.title ?? '').toLowerCase()
      const upvotes = post?.data?.ups ?? 0
      const weight = Math.min(upvotes / 100, 1) // 최대 가중치 1

      positiveWords.forEach(word => {
        if (title.includes(word)) score += (0.1 * weight)
      })
      negativeWords.forEach(word => {
        if (title.includes(word)) score -= (0.1 * weight)
      })
    })

    // -1 ~ 1 범위로 정규화
    return Math.max(-1, Math.min(1, score / posts.length))
  } catch (error) {
    console.error('[Sentiment] Community score failed:', error)
    return 0
  }
}

function getDateStr(daysOffset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().slice(0, 10)
}
