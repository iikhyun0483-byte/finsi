/**
 * 재무제표 데이터 (Financial Modeling Prep API)
 * https://financialmodelingprep.com
 */

export interface FundamentalData {
  symbol: string;
  per: number | null;        // Price to Earnings Ratio
  pbr: number | null;        // Price to Book Ratio
  roe: number | null;        // Return on Equity
  debtToEquity: number | null;  // Debt to Equity
  revenueGrowth: number | null; // Revenue Growth YoY
  grossMargin: number | null;   // Gross Margin
  operatingMargin: number | null; // Operating Margin
}

// 캐시 (1일)
const cache = new Map<string, { data: FundamentalData; expiry: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간

/**
 * FMP API로 재무 데이터 조회
 */
export async function getFundamentals(symbol: string): Promise<FundamentalData> {
  const cached = cache.get(symbol);
  if (cached && Date.now() < cached.expiry) {
    console.log(`💾 ${symbol} 재무 데이터 캐시 사용`);
    return cached.data;
  }

  const apiKey = process.env.FMP_API_KEY;
  
  if (!apiKey || apiKey === "your_fmp_api_key") {
    console.warn("⚠️ FMP_API_KEY 미설정 - 기본값 사용");
    return getDefaultFundamentals(symbol);
  }

  try {
    console.log(`📊 ${symbol} 재무 데이터 조회 중...`);

    // 1. Key Metrics (PER, PBR, ROE, etc.)
    const metricsRes = await fetch(
      `https://financialmodelingprep.com/api/v3/key-metrics/${symbol}?apikey=${apiKey}&limit=1`
    );

    if (!metricsRes.ok) {
      throw new Error(`FMP API error: ${metricsRes.status}`);
    }

    const metrics = await metricsRes.json();

    // 2. Financial Ratios (Debt/Equity, Margins)
    const ratiosRes = await fetch(
      `https://financialmodelingprep.com/api/v3/ratios/${symbol}?apikey=${apiKey}&limit=1`
    );

    const ratios = ratiosRes.ok ? await ratiosRes.json() : [];

    // 3. Income Statement (Revenue Growth)
    const incomeRes = await fetch(
      `https://financialmodelingprep.com/api/v3/income-statement/${symbol}?apikey=${apiKey}&limit=2`
    );

    const income = incomeRes.ok ? await incomeRes.json() : [];

    // 데이터 파싱
    const m = metrics[0] || {};
    const r = ratios[0] || {};
    
    // Revenue Growth 계산
    let revenueGrowth = null;
    if (income.length >= 2) {
      const current = income[0]?.revenue || 0;
      const previous = income[1]?.revenue || 0;
      if (previous > 0) {
        revenueGrowth = ((current - previous) / previous) * 100;
      }
    }

    const data: FundamentalData = {
      symbol,
      per: m.peRatio || null,
      pbr: m.priceToBookRatio || null,
      roe: m.roe ? m.roe * 100 : null, // 백분율로 변환
      debtToEquity: r.debtEquityRatio || null,
      revenueGrowth,
      grossMargin: r.grossProfitMargin ? r.grossProfitMargin * 100 : null,
      operatingMargin: r.operatingProfitMargin ? r.operatingProfitMargin * 100 : null,
    };

    // 캐시 저장
    cache.set(symbol, {
      data,
      expiry: Date.now() + CACHE_DURATION,
    });

    console.log(`✅ ${symbol} 재무: PER=${data.per?.toFixed(1)}, ROE=${data.roe?.toFixed(1)}%`);

    return data;
  } catch (error) {
    console.error(`❌ ${symbol} 재무 데이터 조회 실패:`, error);
    return getDefaultFundamentals(symbol);
  }
}

/**
 * API 없을 때 기본값 (ETF는 펀더멘털 없음)
 */
function getDefaultFundamentals(symbol: string): FundamentalData {
  return {
    symbol,
    per: null,
    pbr: null,
    roe: null,
    debtToEquity: null,
    revenueGrowth: null,
    grossMargin: null,
    operatingMargin: null,
  };
}

/**
 * 펀더멘털 점수 계산 (0-40점)
 * Layer2에 추가될 점수
 */
export function calcFundamentalScore(data: FundamentalData): number {
  let score = 0;

  // PER: 낮을수록 좋음 (0-10점)
  if (data.per !== null && data.per > 0) {
    if (data.per < 10) score += 10;      // 매우 저평가
    else if (data.per < 15) score += 8;  // 저평가
    else if (data.per < 20) score += 6;  // 적정
    else if (data.per < 25) score += 3;  // 약간 고평가
    else score += 0;                      // 고평가
  }

  // PBR: 낮을수록 좋음 (0-8점)
  if (data.pbr !== null && data.pbr > 0) {
    if (data.pbr < 1) score += 8;        // 장부가치 이하
    else if (data.pbr < 2) score += 6;   // 저평가
    else if (data.pbr < 3) score += 4;   // 적정
    else if (data.pbr < 5) score += 2;   // 약간 고평가
    else score += 0;                      // 고평가
  }

  // ROE: 높을수록 좋음 (0-12점)
  if (data.roe !== null) {
    if (data.roe > 20) score += 12;      // 우수
    else if (data.roe > 15) score += 9;  // 양호
    else if (data.roe > 10) score += 6;  // 보통
    else if (data.roe > 5) score += 3;   // 낮음
    else score += 0;                      // 매우 낮음
  }

  // Debt to Equity: 낮을수록 좋음 (0-5점)
  if (data.debtToEquity !== null) {
    if (data.debtToEquity < 0.3) score += 5;      // 건전
    else if (data.debtToEquity < 0.5) score += 4; // 양호
    else if (data.debtToEquity < 1.0) score += 3; // 보통
    else if (data.debtToEquity < 2.0) score += 1; // 높음
    else score += 0;                               // 매우 높음
  }

  // Revenue Growth: 높을수록 좋음 (0-5점)
  if (data.revenueGrowth !== null) {
    if (data.revenueGrowth > 20) score += 5;      // 고성장
    else if (data.revenueGrowth > 10) score += 4; // 성장
    else if (data.revenueGrowth > 5) score += 3;  // 완만한 성장
    else if (data.revenueGrowth > 0) score += 1;  // 정체
    else score += 0;                               // 감소
  }

  return Math.min(40, score); // 최대 40점
}
