// Binance Public API (무료, API 키 불필요, Rate limit 관대)
// https://binance-docs.github.io/apidocs/spot/en/

export interface CryptoQuote {
  symbol: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  volume: number;
}

export interface CryptoHistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  price: number; // alias for close (backward compatibility)
  volume: number;
}

// 심볼 매핑 (표준 심볼 → Binance 심볼)
export const BINANCE_SYMBOL_MAP: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  XRP: "XRPUSDT",
  ADA: "ADAUSDT",
  DOGE: "DOGEUSDT",
  DOT: "DOTUSDT",
  AVAX: "AVAXUSDT",
};

// 역방향 매핑 (Binance 심볼 → 표준 심볼)
export const REVERSE_SYMBOL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(BINANCE_SYMBOL_MAP).map(([k, v]) => [v, k])
);

// 실시간 암호화폐 시세 조회 (Binance)
export async function getCryptoQuote(symbol: string): Promise<CryptoQuote | null> {
  try {
    const binanceSymbol = BINANCE_SYMBOL_MAP[symbol.toUpperCase()] || `${symbol.toUpperCase()}USDT`;
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`;

    console.log(`🪙 Fetching ${symbol} from Binance API...`);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Binance API error ${response.status}:`, errorText);
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    const quote: CryptoQuote = {
      symbol: symbol.toUpperCase(),
      current_price: parseFloat(data.lastPrice),
      price_change_24h: parseFloat(data.priceChange),
      price_change_percentage_24h: parseFloat(data.priceChangePercent),
      high_24h: parseFloat(data.highPrice),
      low_24h: parseFloat(data.lowPrice),
      volume: parseFloat(data.volume),
    };

    console.log(`✅ ${symbol} price: $${quote.current_price.toLocaleString()}`);
    return quote;
  } catch (error) {
    console.error(`❌ 암호화폐 시세 조회 실패 (${symbol}):`, error);
    return null;
  }
}

// 여러 암호화폐 일괄 조회 (Binance)
export async function getCryptoQuotes(symbols: string[]): Promise<Map<string, CryptoQuote>> {
  const quotes = new Map<string, CryptoQuote>();

  // Binance는 rate limit이 관대하므로 병렬 조회 가능
  const results = await Promise.allSettled(
    symbols.map((symbol) => getCryptoQuote(symbol))
  );

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      quotes.set(symbols[index], result.value);
    }
  });

  return quotes;
}

// 메모리 캐시 (5분)
const historicalCache = new Map<
  string,
  { data: CryptoHistoricalData[]; expiry: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5분

// 과거 데이터 조회 (Binance Klines API)
export async function getCryptoHistorical(
  symbol: string,
  days: number = 365
): Promise<CryptoHistoricalData[]> {
  const cacheKey = `${symbol}_${days}`;

  // 캐시 확인
  const cached = historicalCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    console.log(`💾 ${symbol} 캐시에서 불러옴 (${cached.data.length}일)`);
    return cached.data;
  }

  try {
    const binanceSymbol = BINANCE_SYMBOL_MAP[symbol.toUpperCase()] || `${symbol.toUpperCase()}USDT`;

    // Binance Klines API: 일봉 데이터
    // interval: 1d (1일), limit: 최대 1000개
    const limit = Math.min(days, 1000);
    const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=1d&limit=${limit}`;

    console.log(`🪙 Fetching ${symbol} historical data from Binance... (${limit}일)`);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Binance API error ${response.status}:`, errorText);
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.error(`❌ No price data for ${symbol}`);
      throw new Error("No price data available");
    }

    // Binance Klines 데이터 구조:
    // [
    //   [openTime, open, high, low, close, volume, closeTime, ...]
    // ]
    const historical: CryptoHistoricalData[] = data.map((kline: any[]) => ({
      date: new Date(kline[0]).toISOString().split("T")[0],
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      price: parseFloat(kline[4]), // close price (backward compatibility)
      volume: parseFloat(kline[5]),
    }));

    // 캐시 저장
    historicalCache.set(cacheKey, {
      data: historical,
      expiry: Date.now() + CACHE_DURATION,
    });

    console.log(`✅ ${symbol}: ${historical.length} days of data fetched (캐시 저장)`);
    return historical;
  } catch (error) {
    console.error(`❌ 암호화폐 과거 데이터 조회 실패 (${symbol}):`, error);
    return [];
  }
}

// 주요 암호화폐 목록 (복원 완료)
export const MAJOR_CRYPTOS = {
  BTC: { symbol: "BTC", name: "비트코인", binance: "BTCUSDT" },
  ETH: { symbol: "ETH", name: "이더리움", binance: "ETHUSDT" },
  SOL: { symbol: "SOL", name: "솔라나", binance: "SOLUSDT" },
  XRP: { symbol: "XRP", name: "리플", binance: "XRPUSDT" },
  ADA: { symbol: "ADA", name: "카르다노", binance: "ADAUSDT" },
  DOGE: { symbol: "DOGE", name: "도지코인", binance: "DOGEUSDT" },
  DOT: { symbol: "DOT", name: "폴카닷", binance: "DOTUSDT" },
  AVAX: { symbol: "AVAX", name: "아발란체", binance: "AVAXUSDT" },
};

// 암호화폐 공포탐욕지수 (Alternative.me - 유지)
export async function getCryptoFearGreedIndex(): Promise<{
  value: number;
  classification: string;
} | null> {
  try {
    const url = "https://api.alternative.me/fng/?limit=1";
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Fear & Greed API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error("No fear & greed data available");
    }

    const latest = data.data[0];

    return {
      value: parseInt(latest.value),
      classification: latest.value_classification,
    };
  } catch (error) {
    console.error("공포탐욕지수 조회 실패:", error);
    return null;
  }
}
