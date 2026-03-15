/**
 * 재무제표 데이터 (Alpha Vantage API)
 * Supabase 캐시 우선 조회 (7일 유효)
 */

import { supabase } from "./supabase";

export interface FundamentalData {
  symbol: string;
  per: number | null;        // Price to Earnings Ratio
  pbr: number | null;        // Price to Book Ratio
  roe: number | null;        // Return on Equity
  debtToEquity: number | null;  // Debt to Equity
  revenueGrowth: number | null; // Revenue Growth YoY
  grossMargin: number | null;   // Gross Margin
  operatingMargin: number | null; // Operating Margin
  isETF?: boolean;              // ETF 여부
  etfMessage?: string;          // ETF 안내 메시지
}

// ETF 목록 (펀더멘털 분석 불가)
const ETF_SYMBOLS = [
  'SPY', 'QQQ', 'DIA', 'IWM',  // 주식 ETF
  'GLD', 'SLV', 'USO', 'XLE',  // 원자재 ETF
  'TLT', 'IEF', 'SHY',         // 채권 ETF
  'VNQ', 'IYR',                // 리츠 ETF
  'VTI', 'VOO', 'IVV',         // 기타 주요 ETF
];

// 캐시 (1일)
const cache = new Map<string, { data: FundamentalData; expiry: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간

/**
 * 재무 데이터 조회 (Supabase 캐시 → Alpha Vantage API)
 */
export async function getFundamentals(symbol: string): Promise<FundamentalData> {
  // ETF 체크 (펀더멘털 분석 불가)
  if (ETF_SYMBOLS.includes(symbol.toUpperCase())) {
    console.log(`📊 ${symbol}은 ETF입니다 - 펀더멘털 분석 불가`);
    return {
      symbol,
      per: null,
      pbr: null,
      roe: null,
      debtToEquity: null,
      revenueGrowth: null,
      grossMargin: null,
      operatingMargin: null,
      isETF: true,
      etfMessage: `${symbol}은 ETF(상장지수펀드)로 여러 종목의 포트폴리오이므로 개별 재무제표가 없습니다.`,
    };
  }

  // 1. Supabase 캐시 확인 (7일 유효)
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: cachedData, error } = await supabase
      .from('fundamentals_cache')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .gte('updated_at', sevenDaysAgo)
      .single();

    if (!error && cachedData) {
      console.log(`💾 ${symbol} Supabase 캐시 사용 (${new Date(cachedData.updated_at).toLocaleDateString()})`);
      return {
        symbol,
        per: cachedData.per,
        pbr: cachedData.pbr,
        roe: cachedData.roe,
        debtToEquity: cachedData.debt_to_equity,
        revenueGrowth: cachedData.revenue_growth,
        grossMargin: cachedData.gross_margin,
        operatingMargin: cachedData.operating_margin,
        isETF: cachedData.is_etf,
        etfMessage: cachedData.etf_message,
      };
    }
  } catch (cacheError) {
    console.warn(`⚠️ Supabase 캐시 조회 실패:`, cacheError);
  }

  // 2. 인메모리 캐시 확인 (24시간)
  const memCached = cache.get(symbol);
  if (memCached && Date.now() < memCached.expiry) {
    console.log(`💾 ${symbol} 메모리 캐시 사용`);
    return memCached.data;
  }

  // 3. Alpha Vantage API 호출
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    console.warn(`⚠️ ALPHA_VANTAGE_API_KEY 미설정 - 기본값 사용`);
    return getDefaultFundamentals(symbol);
  }

  try {
    console.log(`📊 ${symbol} 재무 데이터 조회 중... (Alpha Vantage)`);

    // 1. OVERVIEW API - PER, PBR, ROE 등
    const overviewResponse = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`
    );

    if (!overviewResponse.ok) {
      throw new Error(`Alpha Vantage OVERVIEW error: ${overviewResponse.status}`);
    }

    const overview = await overviewResponse.json();

    // Rate limit 체크
    if (overview.Note) {
      console.warn(`⚠️ Alpha Vantage Rate Limit: ${overview.Note}`);
      return getDefaultFundamentals(symbol);
    }

    // 데이터 없음 (잘못된 심볼 등)
    if (!overview.Symbol) {
      console.warn(`⚠️ ${symbol}: Alpha Vantage에서 데이터 없음`);
      return getDefaultFundamentals(symbol);
    }

    // 2. BALANCE_SHEET API - 부채비율 계산
    let debtToEquity: number | null = null;

    try {
      // Rate limit 방지를 위한 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000));

      const balanceSheetResponse = await fetch(
        `https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol=${symbol}&apikey=${apiKey}`
      );

      if (balanceSheetResponse.ok) {
        const balanceSheet = await balanceSheetResponse.json();

        if (balanceSheet.annualReports && balanceSheet.annualReports.length > 0) {
          const latestReport = balanceSheet.annualReports[0];
          const totalLiabilities = parseFloat(latestReport.totalLiabilities);
          const totalEquity = parseFloat(latestReport.totalShareholderEquity);

          if (!isNaN(totalLiabilities) && !isNaN(totalEquity) && totalEquity > 0) {
            debtToEquity = (totalLiabilities / totalEquity) * 100;
            console.log(`✅ ${symbol} 부채비율 계산: ${debtToEquity.toFixed(1)}%`);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ ${symbol} BALANCE_SHEET 조회 실패:`, error);
    }

    // 데이터 추출 및 변환
    const data: FundamentalData = {
      symbol,
      per: overview.PERatio ? parseFloat(overview.PERatio) : null,
      pbr: overview.PriceToBookRatio ? parseFloat(overview.PriceToBookRatio) : null,
      roe: overview.ReturnOnEquityTTM ? parseFloat(overview.ReturnOnEquityTTM) * 100 : null, // 1.52 → 152%
      debtToEquity, // 계산된 부채비율
      revenueGrowth: overview.QuarterlyRevenueGrowthYOY ? parseFloat(overview.QuarterlyRevenueGrowthYOY) * 100 : null, // 0.157 → 15.7%
      grossMargin: overview.ProfitMargin ? parseFloat(overview.ProfitMargin) * 100 : null, // 0.27 → 27%
      operatingMargin: overview.OperatingMarginTTM ? parseFloat(overview.OperatingMarginTTM) * 100 : null, // 0.354 → 35.4%
    };

    // 인메모리 캐시 저장 (24시간)
    cache.set(symbol, {
      data,
      expiry: Date.now() + CACHE_DURATION,
    });

    // Supabase 캐시 저장 (7일 유효)
    try {
      await supabase
        .from('fundamentals_cache')
        .upsert({
          symbol: symbol.toUpperCase(),
          per: data.per,
          pbr: data.pbr,
          roe: data.roe,
          debt_to_equity: data.debtToEquity,
          revenue_growth: data.revenueGrowth,
          gross_margin: data.grossMargin,
          operating_margin: data.operatingMargin,
          is_etf: false,
          etf_message: null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'symbol',
        });
      console.log(`💾 ${symbol} Supabase 캐시 저장 완료`);
    } catch (saveError) {
      console.warn(`⚠️ ${symbol} Supabase 캐시 저장 실패:`, saveError);
    }

    console.log(`✅ ${symbol} 재무: PER=${data.per?.toFixed(1)}, PBR=${data.pbr?.toFixed(1)}, ROE=${data.roe?.toFixed(1)}%`);

    return data;
  } catch (error) {
    console.error(`❌ ${symbol} Alpha Vantage 조회 실패:`, error);
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
