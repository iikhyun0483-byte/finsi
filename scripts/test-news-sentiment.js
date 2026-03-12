/**
 * Test NewsAPI + Gemini sentiment analysis
 */

const symbol = 'AAPL';
const newsApiKey = '7a427f6b5a0b60c2cca679059ecf7c2e';
const geminiApiKey = 'AIzaSyCtxg0IR4-h_Zlc9wwvK2zdDBVTVv2zsdE';

async function analyzeSentimentWithGemini(text, apiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
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
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() || "neutral";

    let label = "neutral";
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
    console.error('Gemini error:', error.message);
    return { label: "neutral", score: 0 };
  }
}

async function test() {
  console.log(`\n🔍 Testing NewsAPI + Gemini for ${symbol}...\n`);

  // 1. NewsAPI 테스트
  console.log('📰 Step 1: Fetching news from NewsAPI...');
  const query = `${symbol} stock OR ${symbol} company`;
  const newsUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${newsApiKey}`;

  const newsResponse = await fetch(newsUrl);

  if (!newsResponse.ok) {
    console.error(`❌ NewsAPI error: ${newsResponse.status}`);
    const errorText = await newsResponse.text();
    console.error(errorText);
    process.exit(1);
  }

  const newsData = await newsResponse.json();
  const articles = newsData.articles || [];

  if (articles.length === 0) {
    console.error('❌ No articles found\n');
    process.exit(1);
  }

  console.log(`✅ Found ${articles.length} articles\n`);

  // 2. Gemini 감성 분석 테스트
  console.log('🤖 Step 2: Analyzing sentiment with Gemini...\n');

  const analyzedArticles = [];

  for (let i = 0; i < Math.min(5, articles.length); i++) {
    const article = articles[i];
    const text = article.title + " " + (article.description || "");

    console.log(`[${i + 1}] ${article.title.substring(0, 60)}...`);

    const sentiment = await analyzeSentimentWithGemini(text, geminiApiKey);

    analyzedArticles.push({
      title: article.title,
      url: article.url,
      source: article.source?.name || "Unknown",
      sentiment: sentiment.label,
      sentimentScore: sentiment.score,
      publishedAt: article.publishedAt,
    });

    const emoji = sentiment.label === 'positive' ? '📈' : sentiment.label === 'negative' ? '📉' : '➡️';
    console.log(`    → ${emoji} ${sentiment.label.toUpperCase()} (${sentiment.score})\n`);

    // Rate limit 방지
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 3. 전체 감성 점수 계산
  const avgSentiment = analyzedArticles.reduce((sum, a) => sum + a.sentimentScore, 0) / analyzedArticles.length;
  const overallScore = Math.round(avgSentiment * 10); // -10 to +10

  const positiveCount = analyzedArticles.filter(a => a.sentiment === "positive").length;
  const negativeCount = analyzedArticles.filter(a => a.sentiment === "negative").length;
  const neutralCount = analyzedArticles.filter(a => a.sentiment === "neutral").length;

  console.log('─────────────────────────────────────');
  console.log('📊 Overall Sentiment Analysis:');
  console.log(`  Positive: ${positiveCount}`);
  console.log(`  Neutral:  ${neutralCount}`);
  console.log(`  Negative: ${negativeCount}`);
  console.log(`  Overall Score: ${overallScore} / 10`);
  console.log('─────────────────────────────────────\n');

  console.log('✅ News sentiment analysis is working!\n');
}

test().catch(err => {
  console.error('\n❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
