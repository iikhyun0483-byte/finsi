// 심볼 리스트 중앙화 (symbols.ts)
// 모든 금융 상품 심볼을 한 곳에서 관리

// 섹터 ETF (10개)
export const SECTOR_ETFS = {
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

// 한국 주식 ETF
export const KOREA_ETFS = {
  "069500.KS": { name: "KODEX 200", category: "stock" },
  "122630.KS": { name: "KODEX 레버리지", category: "stock" },
  "229200.KS": { name: "KODEX 코스닥 150", category: "stock" },
};

// 주요 암호화폐 목록
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
