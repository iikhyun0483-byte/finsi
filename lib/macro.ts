// 매크로 경제 지표 API

import { getCryptoFearGreedIndex } from "./crypto";
import { getYahooQuote } from "./yahoo";

export interface MacroIndicators {
  fearGreed: number; // 공포탐욕지수 (0~100)
  vix: number; // VIX 변동성 지수
  fedRate: number; // 미국 기준금리
  buffett: number; // 버핏지수 (시총/GDP 비율)

  // 신규 추가 지표
  cpi?: number; // 소비자물가지수 (CPI, 전년 대비 %)
  unemploymentRate?: number; // 실업률 (%)
  gdpGrowth?: number; // GDP 성장률 (전년 대비 %)
}

// 재시도 함수
async function retryAsync<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 500
): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) {
        console.error(`최종 실패 (${retries}회 시도):`, error);
        return null;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return null;
}

// 공포탐욕지수 (Alternative.me - 암호화폐 공포탐욕지수)
export async function getFearGreedIndex(): Promise<number> {
  console.log("😨 공포탐욕지수 조회 중...");

  const data = await retryAsync(() => getCryptoFearGreedIndex(), 3, 500);

  if (data && data.value >= 0 && data.value <= 100) {
    console.log(`✅ 공포탐욕지수: ${data.value} (${data.classification})`);
    return data.value;
  }

  throw new Error("공포탐욕지수 데이터를 가져올 수 없습니다");
}

// VIX 변동성 지수 (Yahoo Finance)
export async function getVIX(): Promise<number> {
  console.log("📊 VIX 지수 조회 중...");

  const quote = await retryAsync(() => getYahooQuote("^VIX"), 3, 500);

  if (quote && quote.regularMarketPrice > 0) {
    console.log(`✅ VIX: ${quote.regularMarketPrice.toFixed(2)}`);
    return quote.regularMarketPrice;
  }

  throw new Error("VIX 데이터를 가져올 수 없습니다");
}

// 미국 기준금리 (FRED API 또는 Yahoo Finance 대체)
export async function getFedRate(): Promise<number> {
  console.log("💵 기준금리 조회 중...");

  const apiKey = process.env.FRED_API_KEY;

  // FRED API 시도
  if (apiKey && apiKey !== "your_api_key") {
    try {
      const response = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`,
        { cache: "no-store" }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.observations && data.observations.length > 0) {
          const rate = parseFloat(data.observations[0].value);
          console.log(`✅ 기준금리 (FRED): ${rate}%`);
          return rate;
        }
      }
    } catch (error) {
      console.warn("⚠️ FRED API 실패, 대체 방법 시도...");
    }
  }

  // 대체: Yahoo Finance에서 2년물 국채 수익률 사용 (기준금리와 유사)
  const quote = await retryAsync(() => getYahooQuote("^IRX"), 3, 500);

  if (quote && quote.regularMarketPrice > 0) {
    const rate = quote.regularMarketPrice;
    console.log(`✅ 기준금리 (추정, 3개월물): ${rate.toFixed(2)}%`);
    return rate;
  }

  console.warn("⚠️ FRED_API_KEY 미설정 - .env.local에 추가 권장");
  throw new Error("기준금리 데이터를 가져올 수 없습니다");
}

// 실시간 GDP 조회 (FRED API)
async function getRealTimeGDP(): Promise<number> {
  const apiKey = process.env.FRED_API_KEY;

  if (apiKey && apiKey !== "your_api_key") {
    try {
      // GDP (분기별, 연간 환산)
      const response = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`,
        { cache: "no-store" }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.observations && data.observations.length > 0) {
          const gdp = parseFloat(data.observations[0].value);
          console.log(`✅ 실시간 GDP (FRED): $${gdp.toFixed(0)}B`);
          return gdp;
        }
      }
    } catch (error) {
      console.warn("⚠️ FRED GDP 조회 실패");
    }
  }

  // 폴백: 최신 추정치
  const fallbackGDP = 28500; // 2025년 Q1 예상 GDP (십억 달러)
  console.warn(`⚠️ GDP 기본값 사용: $${fallbackGDP}B (FRED_API_KEY 설정 권장)`);
  return fallbackGDP;
}

// 버핏지수 (시가총액 / GDP 비율)
// Wilshire 5000 Total Market Index 사용
export async function getBuffettIndicator(): Promise<number> {
  console.log("📈 버핏지수 조회 중...");

  // 1. 실시간 GDP 조회
  const gdp = await getRealTimeGDP();

  // 2. Wilshire 5000 시도
  let wilshire = await retryAsync(() => getYahooQuote("^W5000"), 3, 500);

  // W5000 실패 시 대체: S&P 500 * 1.2 (대략적 추정)
  if (!wilshire || !wilshire.regularMarketPrice) {
    console.warn("⚠️ Wilshire 5000 조회 실패, S&P 500으로 추정...");
    const spy = await retryAsync(() => getYahooQuote("SPY"), 3, 500);

    if (spy && spy.regularMarketPrice > 0) {
      // SPY 가격을 전체 시장으로 대략 변환
      const estimatedMarketCap = spy.regularMarketPrice * 120;
      const indicator = (estimatedMarketCap / gdp) * 100;
      console.log(`✅ 버핏지수 (추정): ${indicator.toFixed(1)}`);
      return indicator;
    }
  }

  if (wilshire && wilshire.regularMarketPrice > 0) {
    const marketCap = wilshire.regularMarketPrice;
    const indicator = (marketCap / gdp) * 100;
    console.log(`✅ 버핏지수: ${indicator.toFixed(1)}`);
    return indicator;
  }

  throw new Error("버핏지수 데이터를 가져올 수 없습니다");
}

// CPI (소비자물가지수) 조회
export async function getCPI(): Promise<number> {
  console.log("📊 CPI 조회 중...");

  const apiKey = process.env.FRED_API_KEY;

  if (apiKey && apiKey !== "your_api_key") {
    try {
      const response = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=${apiKey}&file_type=json&sort_order=desc&limit=13`,
        { cache: "no-store" }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.observations && data.observations.length >= 13) {
          // 최근 값과 1년 전 값으로 전년 대비 % 계산
          const current = parseFloat(data.observations[0].value);
          const yearAgo = parseFloat(data.observations[12].value);
          const cpiChange = ((current - yearAgo) / yearAgo) * 100;
          console.log(`✅ CPI 전년 대비: ${cpiChange.toFixed(1)}%`);
          return cpiChange;
        }
      }
    } catch (error) {
      console.warn("⚠️ FRED CPI 조회 실패");
    }
  }

  // 폴백: 2026년 예상치
  const fallbackCPI = 2.5;
  console.warn(`⚠️ CPI 기본값 사용: ${fallbackCPI}%`);
  return fallbackCPI;
}

// 실업률 조회
export async function getUnemploymentRate(): Promise<number> {
  console.log("📊 실업률 조회 중...");

  const apiKey = process.env.FRED_API_KEY;

  if (apiKey && apiKey !== "your_api_key") {
    try {
      const response = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=UNRATE&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`,
        { cache: "no-store" }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.observations && data.observations.length > 0) {
          const rate = parseFloat(data.observations[0].value);
          console.log(`✅ 실업률: ${rate}%`);
          return rate;
        }
      }
    } catch (error) {
      console.warn("⚠️ FRED 실업률 조회 실패");
    }
  }

  // 폴백: 2026년 예상치
  const fallbackRate = 3.8;
  console.warn(`⚠️ 실업률 기본값 사용: ${fallbackRate}%`);
  return fallbackRate;
}

// GDP 성장률 조회 (전년 대비 %)
export async function getGDPGrowth(): Promise<number> {
  console.log("📊 GDP 성장률 조회 중...");

  const apiKey = process.env.FRED_API_KEY;

  if (apiKey && apiKey !== "your_api_key") {
    try {
      const response = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=A191RL1Q225SBEA&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`,
        { cache: "no-store" }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.observations && data.observations.length > 0) {
          const growth = parseFloat(data.observations[0].value);
          console.log(`✅ GDP 성장률: ${growth}%`);
          return growth;
        }
      }
    } catch (error) {
      console.warn("⚠️ FRED GDP 성장률 조회 실패");
    }
  }

  // 폴백: 2026년 예상치
  const fallbackGrowth = 2.2;
  console.warn(`⚠️ GDP 성장률 기본값 사용: ${fallbackGrowth}%`);
  return fallbackGrowth;
}

// 모든 매크로 지표 일괄 조회
export async function getAllMacroIndicators(): Promise<MacroIndicators> {
  const [fearGreed, vix, fedRate, buffett, cpi, unemploymentRate, gdpGrowth] = await Promise.all([
    getFearGreedIndex(),
    getVIX(),
    getFedRate(),
    getBuffettIndicator(),
    getCPI().catch(() => 2.5),
    getUnemploymentRate().catch(() => 3.8),
    getGDPGrowth().catch(() => 2.2),
  ]);

  return {
    fearGreed,
    vix,
    fedRate,
    buffett,
    cpi,
    unemploymentRate,
    gdpGrowth,
  };
}

// 매크로 점수 계산 (0~100)
export function calcMacroScore(indicators: MacroIndicators): number {
  let score = 0;

  // 공포탐욕지수 (역방향: 공포일 때 매수 기회)
  // 0~25: 극도의 공포 → 100점
  // 25~45: 공포 → 75점
  // 45~55: 중립 → 50점
  // 55~75: 탐욕 → 25점
  // 75~100: 극도의 탐욕 → 0점
  if (indicators.fearGreed < 25) score += 30;
  else if (indicators.fearGreed < 45) score += 22;
  else if (indicators.fearGreed < 55) score += 15;
  else if (indicators.fearGreed < 75) score += 7;
  else score += 0;

  // VIX (역방향: 낮을수록 안정적)
  // <15: 안정 → 30점
  // 15~20: 보통 → 20점
  // 20~30: 높음 → 10점
  // >30: 매우 높음 → 0점
  if (indicators.vix < 15) score += 25;
  else if (indicators.vix < 20) score += 17;
  else if (indicators.vix < 30) score += 8;
  else score += 0;

  // 기준금리 (역방향: 낮을수록 유동성 풍부)
  // <2%: 매우 낮음 → 25점
  // 2~4%: 적정 → 18점
  // 4~6%: 높음 → 10점
  // >6%: 매우 높음 → 0점
  if (indicators.fedRate < 2) score += 25;
  else if (indicators.fedRate < 4) score += 18;
  else if (indicators.fedRate < 6) score += 10;
  else score += 0;

  // 버핏지수 (역방향: 낮을수록 저평가)
  // <100: 매우 저평가 → 20점
  // 100~120: 적정 → 15점
  // 120~150: 고평가 → 8점
  // >150: 매우 고평가 → 0점
  if (indicators.buffett < 100) score += 20;
  else if (indicators.buffett < 120) score += 15;
  else if (indicators.buffett < 150) score += 8;
  else score += 0;

  return Math.min(100, Math.max(0, score));
}
