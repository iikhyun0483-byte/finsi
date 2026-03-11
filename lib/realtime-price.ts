// 실시간 가격 조회 유틸리티
import { getYahooQuote } from "./yahoo";
import { getCryptoQuote } from "./crypto";

export interface RealtimePrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

// 자산 타입 감지
export function detectAssetType(symbol: string): "stock" | "crypto" {
  const cryptoSymbols = ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "DOT", "AVAX"];
  return cryptoSymbols.includes(symbol.toUpperCase()) ? "crypto" : "stock";
}

// 단일 종목 실시간 가격 조회
export async function getRealtimePrice(symbol: string): Promise<RealtimePrice | null> {
  const assetType = detectAssetType(symbol);

  try {
    if (assetType === "crypto") {
      // Binance API 사용 (심볼 직접 전달)
      const quote = await getCryptoQuote(symbol);
      if (!quote) return null;

      return {
        symbol: symbol.toUpperCase(),
        price: quote.current_price,
        change: quote.price_change_24h,
        changePercent: quote.price_change_percentage_24h,
        timestamp: Date.now(),
      };
    } else {
      // 주식/ETF
      const quote = await getYahooQuote(symbol);
      if (!quote) return null;

      return {
        symbol: symbol.toUpperCase(),
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        timestamp: Date.now(),
      };
    }
  } catch (error) {
    console.error(`Failed to get realtime price for ${symbol}:`, error);
    return null;
  }
}

// 여러 종목 실시간 가격 일괄 조회
export async function getRealtimePrices(
  symbols: string[]
): Promise<Map<string, RealtimePrice>> {
  const priceMap = new Map<string, RealtimePrice>();

  // Binance는 rate limit이 관대하므로 모두 병렬 조회 가능
  const results = await Promise.allSettled(
    symbols.map((symbol) => getRealtimePrice(symbol))
  );

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      priceMap.set(symbols[index], result.value);
    }
  });

  return priceMap;
}

// 캐시 (1분)
const priceCache = new Map<string, { price: RealtimePrice; expiry: number }>();
const CACHE_DURATION = 60 * 1000; // 1분

export async function getRealtimePriceCached(
  symbol: string
): Promise<RealtimePrice | null> {
  const cached = priceCache.get(symbol);

  if (cached && Date.now() < cached.expiry) {
    return cached.price;
  }

  const price = await getRealtimePrice(symbol);

  if (price) {
    priceCache.set(symbol, {
      price,
      expiry: Date.now() + CACHE_DURATION,
    });
  }

  return price;
}
