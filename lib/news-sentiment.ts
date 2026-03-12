/**
 * 뉴스 감성 분석 (NewsAPI + Gemini)
 */

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore: number; // -1 to +1
}

export interface NewsSentiment {
  symbol: string;
  articles: NewsArticle[];
  overallSentiment: number; // -10 to +10 (Layer3 점수)
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
}

// 캐시 (1시간)
const cache = new Map<string, { data: NewsSentiment; expiry: number }>();
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * 뉴스 수집 및 감성 분석
 */
export async function getNewsSentiment(symbol: string): Promise<NewsSentiment> {
  const cached = cache.get(symbol);
  if (cached && Date.now() < cached.expiry) {
    console.log(`💾 ${symbol} 뉴스 캐시 사용`);
    return cached.data;
  }

  const finnhubApiKey = process.env.FINNHUB_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!finnhubApiKey || finnhubApiKey === "your_finnhub_api_key") {
    console.warn("⚠️ FINNHUB_API_KEY 미설정 - 중립 반환");
    return getDefaultSentiment(symbol);
  }

  try {
    console.log(`📰 ${symbol} 뉴스 수집 중 (Finnhub)...`);

    // 1. Finnhub에서 뉴스 수집
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD
    const from = formatDate(sevenDaysAgo);
    const to = formatDate(today);

    const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${finnhubApiKey}`;

    console.log(`📡 Finnhub API 호출: ${symbol} (${from} ~ ${to})`);

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Finnhub API error (${response.status}):`, errorText);
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`⚠️ ${symbol} 뉴스 없음`);
      return getDefaultSentiment(symbol);
    }

    console.log(`✅ Finnhub에서 ${data.length}개 뉴스 수집`);

    // 2. Gemini로 감성 분석
    const analyzedArticles: NewsArticle[] = [];

    for (const article of data.slice(0, 5)) {
      const sentiment = await analyzeSentimentWithGemini(
        article.headline + " " + (article.summary || ""),
        geminiApiKey
      );

      analyzedArticles.push({
        title: article.headline,
        description: article.summary || "",
        url: article.url,
        publishedAt: new Date(article.datetime * 1000).toISOString(), // Unix timestamp to ISO
        source: article.source || "Unknown",
        sentiment: sentiment.label,
        sentimentScore: sentiment.score,
      });
    }

    // 3. 전체 감성 점수 계산
    const avgSentiment = analyzedArticles.reduce((sum, a) => sum + a.sentimentScore, 0) / analyzedArticles.length;
    const overallScore = Math.round(avgSentiment * 10); // -10 to +10

    const positiveCount = analyzedArticles.filter(a => a.sentiment === "positive").length;
    const negativeCount = analyzedArticles.filter(a => a.sentiment === "negative").length;
    const neutralCount = analyzedArticles.filter(a => a.sentiment === "neutral").length;

    const result: NewsSentiment = {
      symbol,
      articles: analyzedArticles,
      overallSentiment: overallScore,
      positiveCount,
      negativeCount,
      neutralCount,
    };

    // 캐시 저장
    cache.set(symbol, {
      data: result,
      expiry: Date.now() + CACHE_DURATION,
    });

    console.log(`✅ ${symbol} 뉴스 감성: ${overallScore} (긍정:${positiveCount}, 부정:${negativeCount})`);

    return result;
  } catch (error) {
    console.error(`❌ ${symbol} 뉴스 분석 실패:`, error);
    return getDefaultSentiment(symbol);
  }
}

/**
 * Gemini로 감성 분석
 */
async function analyzeSentimentWithGemini(
  text: string,
  apiKey: string | undefined
): Promise<{ label: "positive" | "negative" | "neutral"; score: number }> {
  if (!apiKey || apiKey === "your_gemini_api_key") {
    return { label: "neutral", score: 0 };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze the sentiment of this financial news. Respond with ONLY one word: "positive", "negative", or "neutral".\n\nNews: ${text}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10,
          }
        }),
      }
    );

    if (!response.ok) {
      return { label: "neutral", score: 0 };
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() || "neutral";

    let label: "positive" | "negative" | "neutral" = "neutral";
    let score = 0;

    if (result.includes("positive")) {
      label = "positive";
      score = 0.7;
    } else if (result.includes("negative")) {
      label = "negative";
      score = -0.7;
    } else {
      label = "neutral";
      score = 0;
    }

    return { label, score };
  } catch (error) {
    return { label: "neutral", score: 0 };
  }
}

/**
 * 기본값 (API 없을 때)
 */
function getDefaultSentiment(symbol: string): NewsSentiment {
  return {
    symbol,
    articles: [],
    overallSentiment: 0,
    positiveCount: 0,
    negativeCount: 0,
    neutralCount: 0,
  };
}
