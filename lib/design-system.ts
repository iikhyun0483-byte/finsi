/**
 * J.A.R.V.I.S Design System
 * Iron Man inspired UI theme
 */

export const COLORS = {
  background: '#000a06',
  nexusTeal: '#00FFD1',
  matrixGreen: '#00FF41',
  warning: '#FFD700',
  profit: '#00FF88',
  loss: '#FF4466',
  card: 'rgba(0,15,12,0.75)',
  border: 'rgba(0,255,180,0.12)',
  borderActive: 'rgba(0,255,180,0.5)',
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255,255,255,0.7)',
    muted: 'rgba(255,255,255,0.4)',
  },
};

export const FONTS = {
  orbitron: '"Orbitron", sans-serif',
  notoSansKR: '"Noto Sans KR", sans-serif',
  ibmPlexMono: '"IBM Plex Mono", monospace',
};

// 카드 공통 클래스
export const CARD_CLASSES = `
  bg-[rgba(0,15,12,0.75)]
  border
  border-[rgba(0,255,180,0.12)]
  rounded
  backdrop-blur-[16px]
  relative
  overflow-hidden
`.replace(/\n/g, ' ').trim();

// 종목명 한글 병기
export const ASSET_NAMES: Record<string, string> = {
  // ETF
  SPY: 'SPY (S&P500 ETF)',
  QQQ: 'QQQ (나스닥100 ETF)',
  GLD: 'GLD (금 ETF)',
  SLV: 'SLV (은 ETF)',
  USO: 'USO (원유 ETF)',
  TLT: 'TLT (미국채20년 ETF)',
  VNQ: 'VNQ (부동산 ETF)',
  IWM: 'IWM (러셀2000 ETF)',
  DIA: 'DIA (다우존스 ETF)',
  XLE: 'XLE (에너지 ETF)',
  IEF: 'IEF (미국채7-10년 ETF)',
  SHY: 'SHY (미국채1-3년 ETF)',
  IYR: 'IYR (부동산 ETF)',
  VTI: 'VTI (미국전체주식 ETF)',
  VOO: 'VOO (S&P500 ETF)',
  IVV: 'IVV (S&P500 ETF)',

  // 암호화폐
  BTC: 'BTC (비트코인)',
  ETH: 'ETH (이더리움)',
  SOL: 'SOL (솔라나)',
  XRP: 'XRP (리플)',
  ADA: 'ADA (에이다)',
  DOGE: 'DOGE (도지코인)',
  AVAX: 'AVAX (아발란체)',
  DOT: 'DOT (폴카닷)',
  MATIC: 'MATIC (폴리곤)',
  LINK: 'LINK (체인링크)',
  UNI: 'UNI (유니스왑)',
  ATOM: 'ATOM (코스모스)',

  // 주식 (자주 사용되는 것들)
  AAPL: 'AAPL (애플)',
  MSFT: 'MSFT (마이크로소프트)',
  GOOGL: 'GOOGL (구글)',
  AMZN: 'AMZN (아마존)',
  TSLA: 'TSLA (테슬라)',
  NVDA: 'NVDA (엔비디아)',
  META: 'META (메타)',
  NFLX: 'NFLX (넷플릭스)',
};

// 지표 라벨 한글 병기
export const INDICATOR_LABELS: Record<string, string> = {
  RSI: 'RSI (상대강도지수)',
  MACD: 'MACD (추세지표)',
  PER: 'PER (주가수익비율)',
  PBR: 'PBR (주가순자산비율)',
  ROE: 'ROE (자기자본이익률)',
  VIX: 'VIX (변동성지수)',
  'Fear & Greed': '공포탐욕지수',
  'Buffett Indicator': '버핏지수',
  'Layer 1': 'Layer 1 (기술분석)',
  'Layer 2': 'Layer 2 (팩터분석)',
  'Layer 3': 'Layer 3 (매크로)',
  'Debt/Equity': '부채비율',
  'Revenue Growth': '매출성장률',
  'Operating Margin': '영업이익률',
  'Gross Margin': '매출총이익률',
};

// 신호 텍스트 한글
export const SIGNAL_TEXT: Record<string, string> = {
  BUY: '매수',
  SELL: '매도',
  HOLD: '관망',
  CAUTION: '주의',
  'STRONG BUY': '강력 매수',
  'STRONG SELL': '강력 매도',
};

// 자산명 가져오기 (병기)
export function getAssetDisplayName(symbol: string): string {
  return ASSET_NAMES[symbol.toUpperCase()] || symbol.toUpperCase();
}

// 지표명 가져오기 (병기)
export function getIndicatorLabel(key: string): string {
  return INDICATOR_LABELS[key] || key;
}

// 신호 텍스트 가져오기
export function getSignalText(signal: string): string {
  return SIGNAL_TEXT[signal.toUpperCase()] || signal;
}

// 가격 표시 (달러 + 원화 병기)
export function formatPriceWithKRW(usd: number, exchangeRate: number): string {
  const krw = Math.round(usd * exchangeRate);
  return `$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (₩${krw.toLocaleString()})`;
}

// 가격 표시 (달러만)
export function formatUSD(usd: number): string {
  return `$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 가격 표시 (원화만)
export function formatKRW(krw: number): string {
  return `₩${krw.toLocaleString()}`;
}

// 퍼센트 표시
export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}
