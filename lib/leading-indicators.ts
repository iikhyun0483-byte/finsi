// 선행 지표 (Leading Indicators)
// 1. Short Ratio (공매도 비율)
// 2. Sector ETF Flows (섹터별 자금 흐름)
// 3. Put/Call Ratio (풋콜 비율)

import { getYahooHistorical, getYahooQuote } from "./yahoo";

// 1일 캐시 (86400초)
const CACHE_DURATION = 24 * 60 * 60 * 1000;
const cache = new Map<string, { data: any; timestamp: number }>();

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Short Ratio (Yahoo Finance Statistics)
export interface ShortRatio {
  symbol: string;
  shortRatio: number | null; // 공매도 비율 (days to cover)
  shortPercentFloat: number | null; // 유통 주식 대비 공매도 비율 (%)
  interpretation: "bullish" | "neutral" | "bearish";
}

export async function getShortRatio(symbol: string): Promise<ShortRatio> {
  const cacheKey = `short_ratio_${symbol}`;
  const cached = getCached<ShortRatio>(cacheKey);
  if (cached) return cached;

  try {
    // Yahoo Finance Statistics API를 통해 공매도 데이터 조회
    const quote = await getYahooQuote(symbol);

    // Yahoo Finance의 sharesShort, sharesOutstanding 데이터 사용
    const shortRatio = (quote as any).shortRatio || null;
    const shortPercentFloat = (quote as any).shortPercentOfFloat || null;

    let interpretation: "bullish" | "neutral" | "bearish" = "neutral";

    if (shortPercentFloat !== null) {
      if (shortPercentFloat > 20) interpretation = "bullish"; // 공매도 과다 → 숏스퀴즈 가능성
      else if (shortPercentFloat > 10) interpretation = "neutral";
      else interpretation = "bearish"; // 공매도 적음 → 하락 신호 가능
    }

    const result: ShortRatio = {
      symbol,
      shortRatio,
      shortPercentFloat,
      interpretation,
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.warn(`공매도 비율 조회 실패 (${symbol}):`, error);
    return {
      symbol,
      shortRatio: null,
      shortPercentFloat: null,
      interpretation: "neutral",
    };
  }
}

// Sector ETF Flows (섹터별 자금 흐름)
// XLK (Tech), XLF (Finance), XLE (Energy), XLV (Healthcare), XLI (Industrial)
export interface SectorFlow {
  sector: string;
  symbol: string;
  momentum1m: number; // 1개월 모멘텀 (%)
  momentum1w: number; // 1주일 모멘텀 (%)
  volumeRatio: number; // 평균 거래량 대비 비율
  signal: "강력 매수" | "매수" | "중립" | "매도";
}

const SECTOR_ETFS = {
  XLK: "Technology",
  XLF: "Financials",
  XLE: "Energy",
  XLV: "Healthcare",
  XLI: "Industrials",
  XLY: "Consumer Discretionary",
  XLP: "Consumer Staples",
  XLB: "Materials",
  XLU: "Utilities",
  XLRE: "Real Estate",
};

export async function getSectorFlows(): Promise<SectorFlow[]> {
  const cacheKey = "sector_flows";
  const cached = getCached<SectorFlow[]>(cacheKey);
  if (cached) return cached;

  const flows: SectorFlow[] = [];

  try {
    for (const [symbol, sector] of Object.entries(SECTOR_ETFS)) {
      // 6개월 데이터 조회
      const historical = await getYahooHistorical(symbol, "6mo");

      if (historical.length < 30) continue;

      const currentPrice = historical[historical.length - 1].close;
      const price1w = historical[Math.max(0, historical.length - 5)].close;
      const price1m = historical[Math.max(0, historical.length - 21)].close;

      const momentum1w = ((currentPrice - price1w) / price1w) * 100;
      const momentum1m = ((currentPrice - price1m) / price1m) * 100;

      // 거래량 비율 (최근 5일 vs 이전 20일 평균)
      const recentVolumes = historical.slice(-5).map((h) => h.volume);
      const pastVolumes = historical.slice(-25, -5).map((h) => h.volume);

      const avgRecentVolume =
        recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
      const avgPastVolume =
        pastVolumes.reduce((a, b) => a + b, 0) / pastVolumes.length;

      const volumeRatio = avgRecentVolume / avgPastVolume;

      // 신호 결정
      let signal: "강력 매수" | "매수" | "중립" | "매도" = "중립";
      if (momentum1m > 5 && volumeRatio > 1.2) signal = "강력 매수";
      else if (momentum1m > 3) signal = "매수";
      else if (momentum1m < -5) signal = "매도";

      flows.push({
        sector,
        symbol,
        momentum1m,
        momentum1w,
        volumeRatio,
        signal,
      });

      // Rate limit 방지
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 모멘텀 순으로 정렬
    flows.sort((a, b) => b.momentum1m - a.momentum1m);

    setCache(cacheKey, flows);
    return flows;
  } catch (error) {
    console.error("섹터 플로우 조회 실패:", error);
    return [];
  }
}

// Put/Call Ratio (CBOE)
// 실제 CBOE API는 유료이므로, 대신 VIX와 VXX를 사용한 간접 계산
export interface PutCallRatio {
  ratio: number; // 1.0 기준 (높을수록 bearish)
  interpretation: "extreme_fear" | "fear" | "neutral" | "greed" | "extreme_greed";
  vix: number;
}

export async function getPutCallRatio(): Promise<PutCallRatio> {
  const cacheKey = "put_call_ratio";
  const cached = getCached<PutCallRatio>(cacheKey);
  if (cached) return cached;

  try {
    // VIX 조회 (공포지수 대용)
    const vixQuote = await getYahooQuote("^VIX");
    if (!vixQuote) {
      throw new Error("VIX data not available");
    }
    const vix = vixQuote.regularMarketPrice;

    // VIX 기반 Put/Call Ratio 추정
    // VIX 10 → 0.6 (극단적 탐욕)
    // VIX 20 → 1.0 (중립)
    // VIX 40 → 1.8 (극단적 공포)
    const ratio = 0.6 + (vix / 20) * 0.4;

    let interpretation: "extreme_fear" | "fear" | "neutral" | "greed" | "extreme_greed" = "neutral";
    if (ratio > 1.5) interpretation = "extreme_fear";
    else if (ratio > 1.2) interpretation = "fear";
    else if (ratio < 0.7) interpretation = "extreme_greed";
    else if (ratio < 0.9) interpretation = "greed";

    const result: PutCallRatio = {
      ratio,
      interpretation,
      vix,
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.warn("Put/Call 비율 조회 실패:", error);
    return {
      ratio: 1.0,
      interpretation: "neutral",
      vix: 15,
    };
  }
}

// 통합 선행 지표 점수 (-20 ~ +20)
export interface LeadingIndicatorScore {
  shortRatio: ShortRatio | null;
  sectorFlows: SectorFlow[];
  putCallRatio: PutCallRatio;
  totalScore: number; // -20 ~ +20
}

export async function getLeadingIndicatorScore(
  symbol: string
): Promise<LeadingIndicatorScore> {
  let totalScore = 0;

  // 1. Short Ratio
  let shortRatio: ShortRatio | null = null;
  try {
    shortRatio = await getShortRatio(symbol);
    if (shortRatio.interpretation === "bullish") totalScore += 10;
    else if (shortRatio.interpretation === "bearish") totalScore -= 10;
  } catch (error) {
    console.warn("Short ratio 계산 실패:", error);
  }

  // 2. Sector Flows
  const sectorFlows = await getSectorFlows();

  // 3. Put/Call Ratio
  const putCallRatio = await getPutCallRatio();
  if (putCallRatio.interpretation === "extreme_greed") totalScore += 10;
  else if (putCallRatio.interpretation === "greed") totalScore += 5;
  else if (putCallRatio.interpretation === "fear") totalScore -= 5;
  else if (putCallRatio.interpretation === "extreme_fear") totalScore -= 10;

  return {
    shortRatio,
    sectorFlows,
    putCallRatio,
    totalScore: Math.max(-20, Math.min(20, totalScore)),
  };
}
