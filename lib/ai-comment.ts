// Gemini AI 투자 코멘트 생성

export interface AICommentInput {
  symbol: string;
  score: number;
  rsi: number;
  macd: number;
  price: number;
  fearGreed: number;
  vix: number;
  fedRate: number;
  goldenCross?: boolean;
  deadCross?: boolean;
  week52High?: boolean;
  week52Low?: boolean;
}

// AI 코멘트 캐시 (1시간)
const commentCache = new Map<string, { comment: string; expiry: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1시간

export async function generateAIComment(input: AICommentInput): Promise<string> {
  // 캐시 키: symbol_score (점수가 같으면 비슷한 코멘트)
  const cacheKey = `${input.symbol}_${input.score}`;
  const cached = commentCache.get(cacheKey);

  if (cached && Date.now() < cached.expiry) {
    console.log(`💾 AI 코멘트 캐시 사용: ${cacheKey}`);
    return cached.comment;
  }
  try {
    // 서버 사이드에서만 접근 가능한 환경변수 (API route에서 호출됨)
    const apiKey = process.env.GEMINI_API_KEY;

    console.log('🤖 AI 코멘트 생성 시작...');
    console.log('API Key 존재 여부:', !!apiKey);
    console.log('API Key 길이:', apiKey?.length || 0);

    if (!apiKey || apiKey === 'your_gemini_api_key') {
      console.error('❌ GEMINI_API_KEY가 .env.local에 설정되지 않았습니다.');
      return "AI 코멘트를 생성하려면 Gemini API 키를 설정해주세요.";
    }

    const prompt = `당신은 경력 15년의 퀀트 투자 전문가입니다. 다음 데이터를 종합 분석하여 전문적이고 상세한 투자 코멘트를 한국어로 작성하세요.

📊 종목 정보:
- 종목: ${input.symbol}
- 현재가: $${input.price}
- 퀀트 점수: ${input.score}/100

📈 기술적 지표:
- RSI: ${input.rsi} ${input.rsi < 30 ? '(과매도)' : input.rsi > 70 ? '(과매수)' : '(중립)'}
- MACD: ${input.macd} ${input.macd > 0 ? '(상승 모멘텀)' : '(하락 모멘텀)'}
${input.goldenCross ? '- ✅ 골든크로스 발생 (강한 상승 신호)' : ''}
${input.deadCross ? '- ⚠️ 데드크로스 발생 (하락 신호)' : ''}
${input.week52High ? '- 🔥 52주 신고가 갱신' : ''}
${input.week52Low ? '- 📉 52주 신저가 갱신' : ''}

🌍 매크로 환경:
- 공포탐욕지수: ${input.fearGreed} ${input.fearGreed < 25 ? '(극단적 공포)' : input.fearGreed < 45 ? '(공포)' : input.fearGreed < 55 ? '(중립)' : input.fearGreed < 75 ? '(탐욕)' : '(극단적 탐욕)'}
- VIX 지수: ${input.vix} ${input.vix > 30 ? '(고변동성, 위험)' : input.vix > 20 ? '(보통)' : '(저변동성)'}
- 기준금리: ${input.fedRate}%

작성 요구사항:
1. **현재 상황 진단** (2-3문장): 기술적 지표와 매크로 환경을 종합하여 현재 종목의 상태를 설명하세요.
2. **투자 전략 제안** (2-3문장): 점수와 지표를 바탕으로 구체적인 매매 전략(진입/청산 타이밍, 비중 조절)을 제시하세요.
3. **리스크 관리** (1-2문장): 주의할 점과 손절가/익절가 가이드라인을 제시하세요.

중요: 단답이 아닌 상세하고 실용적인 분석을 제공하세요. 전문 용어를 사용하되 이해하기 쉽게 설명하세요.`;

    console.log('📡 Gemini API 호출 중...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1000,
            topP: 0.95,
            topK: 40,
          }
        }),
      }
    );

    console.log('📡 Gemini API 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API 에러 응답:', errorText);
      throw new Error(`Gemini API 오류 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Gemini API 응답 데이터:', JSON.stringify(data, null, 2));

    const comment = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI 코멘트 생성 실패";

    console.log('✅ AI 코멘트 생성 완료:', comment.substring(0, 50) + '...');

    const trimmedComment = comment.trim();

    // 캐시 저장
    commentCache.set(cacheKey, {
      comment: trimmedComment,
      expiry: Date.now() + CACHE_DURATION,
    });
    console.log(`💾 AI 코멘트 캐시 저장: ${cacheKey}`);

    return trimmedComment;
  } catch (error: any) {
    console.error('❌ AI 코멘트 생성 오류:', error);
    console.error('오류 상세:', error.message);
    console.error('오류 스택:', error.stack);
    return `AI 코멘트를 생성할 수 없습니다. 오류: ${error.message}`;
  }
}
