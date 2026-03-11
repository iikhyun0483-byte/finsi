// Yahoo Finance API (무료)
// https://query1.finance.yahoo.com/v8/finance/chart/

export interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  regularMarketTime: number;
}

export interface YahooHistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 실시간 시세 조회
export async function getYahooQuote(symbol: string): Promise<YahooQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart.result[0];
    const meta = result.meta;

    return {
      symbol: meta.symbol,
      regularMarketPrice: meta.regularMarketPrice || 0,
      regularMarketChange: meta.regularMarketPrice - meta.previousClose || 0,
      regularMarketChangePercent:
        ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100 || 0,
      regularMarketOpen: meta.regularMarketOpen || 0,
      regularMarketDayHigh: meta.regularMarketDayHigh || 0,
      regularMarketDayLow: meta.regularMarketDayLow || 0,
      regularMarketVolume: meta.regularMarketVolume || 0,
      regularMarketTime: meta.regularMarketTime || 0,
    };
  } catch (error) {
    console.error(`Yahoo 시세 조회 실패 (${symbol}):`, error);
    return null;
  }
}

// 과거 데이터 조회 (백테스팅용)
export async function getYahooHistorical(
  symbol: string,
  period: string = "1y" // 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
): Promise<YahooHistoricalData[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${period}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    const historical: YahooHistoricalData[] = timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString().split("T")[0],
      open: quotes.open[i] || 0,
      high: quotes.high[i] || 0,
      low: quotes.low[i] || 0,
      close: quotes.close[i] || 0,
      volume: quotes.volume[i] || 0,
    }));

    return historical.filter((h) => h.close > 0); // 유효한 데이터만 반환
  } catch (error) {
    console.error(`Yahoo 과거 데이터 조회 실패 (${symbol}):`, error);
    return [];
  }
}

// 여러 종목 일괄 조회
export async function getYahooQuotes(symbols: string[]): Promise<Map<string, YahooQuote>> {
  const quotes = new Map<string, YahooQuote>();

  const promises = symbols.map(async (symbol) => {
    const quote = await getYahooQuote(symbol);
    if (quote) {
      quotes.set(symbol, quote);
    }
  });

  await Promise.all(promises);
  return quotes;
}

// 주요 ETF 목록
export const MAJOR_ETFS = {
  // 미국 주식
  SPY: { name: "S&P 500", category: "stock" },
  QQQ: { name: "NASDAQ 100", category: "stock" },
  DIA: { name: "다우존스", category: "stock" },
  IWM: { name: "러셀 2000", category: "stock" },

  // 금/은
  GLD: { name: "금 ETF", category: "commodity" },
  SLV: { name: "은 ETF", category: "commodity" },

  // 원유
  USO: { name: "원유 ETF", category: "commodity" },
  XLE: { name: "에너지 섹터 ETF", category: "commodity" },

  // 채권
  TLT: { name: "장기 국채 ETF", category: "bond" },
  IEF: { name: "중기 국채 ETF", category: "bond" },
  SHY: { name: "단기 국채 ETF", category: "bond" },
  AGG: { name: "종합 채권 ETF", category: "bond" },

  // 리츠
  VNQ: { name: "부동산 리츠 ETF", category: "reit" },
  IYR: { name: "미국 부동산 ETF", category: "reit" },
};

// 한국 주식 (ETF)
export const KOREA_ETFS = {
  "069500.KS": { name: "KODEX 200", category: "stock" },
  "122630.KS": { name: "KODEX 레버리지", category: "stock" },
  "229200.KS": { name: "KODEX 코스닥 150", category: "stock" },
};
