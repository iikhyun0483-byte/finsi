// 투자 신호 엔진 (3레이어 점수 시스템)

import { calcRSI, calcMACD, calcBollinger, calcSMA } from "./indicators";
import { MacroIndicators, calcMacroScore } from "./macro";

export interface SignalInput {
  symbol: string;
  name: string;
  assetType: "stock" | "crypto" | "commodity" | "bond" | "reit";
  prices: number[]; // 최근 300일 종가
  macroIndicators: MacroIndicators;
}

export interface SignalOutput {
  symbol: string;
  name: string;
  assetType: string;
  score: number; // 최종 점수 (0~100)
  action: string; // 액션 메시지
  layer1Score: number; // 기술적 지표 (30%)
  layer2Score: number; // 팩터 점수 (40%)
  layer3Score: number; // 매크로 지표 (30%)
  rsi: number;
  macd: number;
  price: number;
  highRisk?: boolean; // 암호화폐 HIGH RISK 배지
}

// Layer 1: 기술적 지표 (30%) - RSI + MACD + 볼린저밴드 + 골든/데드크로스
function calcLayer1Score(prices: number[]): { score: number; rsi: number; macd: number } {
  let score = 0;
  const currentPrice = prices[prices.length - 1];

  // RSI (0~30점)
  const rsiValues = calcRSI(prices, 14);
  const rsi = rsiValues[rsiValues.length - 1] || 50;

  if (rsi < 30) score += 30; // 과매도 → 매수 기회
  else if (rsi < 40) score += 22;
  else if (rsi < 50) score += 15;
  else if (rsi < 60) score += 10;
  else if (rsi < 70) score += 5;
  else score += 0; // 과매수 → 매도 신호

  // MACD (0~25점)
  const macdData = calcMACD(prices);
  const macdLine = macdData.macdLine[macdData.macdLine.length - 1] || 0;
  const signalLine = macdData.signalLine[macdData.signalLine.length - 1] || 0;
  const histogram = macdData.histogram[macdData.histogram.length - 1] || 0;

  if (histogram > 0 && macdLine > signalLine) score += 25; // 상승 추세
  else if (histogram > 0) score += 18;
  else if (histogram > -0.5) score += 10;
  else score += 0; // 하락 추세

  // 볼린저밴드 (0~25점)
  const bollinger = calcBollinger(prices, 20, 2);
  const currentBand = bollinger[bollinger.length - 1];

  if (currentBand.lower && currentPrice < currentBand.lower) score += 25; // 하단 밴드 터치 → 매수
  else if (currentBand.middle && currentPrice < currentBand.middle) score += 18;
  else if (currentBand.upper && currentPrice < currentBand.upper) score += 10;
  else score += 0; // 상단 밴드 → 매도

  // 골든/데드크로스 (0~20점)
  const sma50 = calcSMA(prices, 50);
  const sma200 = calcSMA(prices, 200);
  const currentSMA50 = sma50[sma50.length - 1];
  const currentSMA200 = sma200[sma200.length - 1];

  if (currentSMA50 && currentSMA200) {
    if (currentSMA50 > currentSMA200) score += 20; // 골든크로스
    else if (currentSMA50 > currentSMA200 * 0.98) score += 10;
    else score += 0; // 데드크로스
  }

  return { score: Math.min(100, score), rsi, macd: histogram };
}

// Layer 2: 팩터 점수 (40%) - 모멘텀 + 가치 + 퀄리티 + 저변동성
function calcLayer2Score(prices: number[]): number {
  let score = 0;
  const currentPrice = prices[prices.length - 1];

  // 모멘텀 (12개월 수익률) - 0~40점
  if (prices.length >= 252) {
    const momentum12m = ((currentPrice - prices[prices.length - 252]) / prices[prices.length - 252]) * 100;

    if (momentum12m > 20) score += 40; // 강한 상승
    else if (momentum12m > 10) score += 30;
    else if (momentum12m > 0) score += 20;
    else if (momentum12m > -10) score += 10;
    else score += 0; // 하락
  }

  // 단기 모멘텀 (3개월 수익률) - 0~30점
  if (prices.length >= 63) {
    const momentum3m = ((currentPrice - prices[prices.length - 63]) / prices[prices.length - 63]) * 100;

    if (momentum3m > 10) score += 30;
    else if (momentum3m > 5) score += 22;
    else if (momentum3m > 0) score += 15;
    else if (momentum3m > -5) score += 7;
    else score += 0;
  }

  // 저변동성 (변동성이 낮을수록 안정적) - 0~30점
  const recentPrices = prices.slice(-20);
  const mean = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
  const variance = recentPrices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentPrices.length;
  const volatility = (Math.sqrt(variance) / mean) * 100;

  if (volatility < 1) score += 30; // 매우 낮은 변동성
  else if (volatility < 2) score += 22;
  else if (volatility < 3) score += 15;
  else if (volatility < 5) score += 7;
  else score += 0; // 높은 변동성

  return Math.min(100, score);
}

// Layer 3: 매크로 지표 (30%)
function calcLayer3Score(macroIndicators: MacroIndicators): number {
  return calcMacroScore(macroIndicators);
}

// 최종 신호 생성
export function generateSignal(input: SignalInput): SignalOutput {
  const layer1 = calcLayer1Score(input.prices);
  const layer2 = calcLayer2Score(input.prices);
  const layer3 = calcLayer3Score(input.macroIndicators);

  // 가중 평균 (Layer1: 30%, Layer2: 40%, Layer3: 30%)
  const finalScore = Math.round(layer1.score * 0.3 + layer2 * 0.4 + layer3 * 0.3);

  // 액션 메시지
  let action = "";
  if (finalScore >= 75) action = "지금 사기 좋음";
  else if (finalScore >= 55) action = "조금씩 사도 됨";
  else if (finalScore >= 40) action = "관망";
  else action = "사지 마세요";

  return {
    symbol: input.symbol,
    name: input.name,
    assetType: input.assetType,
    score: finalScore,
    action,
    layer1Score: Math.round(layer1.score),
    layer2Score: Math.round(layer2),
    layer3Score: Math.round(layer3),
    rsi: Math.round(layer1.rsi * 10) / 10,
    macd: Math.round(layer1.macd * 100) / 100,
    price: input.prices[input.prices.length - 1],
    highRisk: input.assetType === "crypto",
  };
}

// 여러 자산 일괄 신호 생성
export function generateSignals(inputs: SignalInput[]): SignalOutput[] {
  return inputs.map((input) => generateSignal(input));
}

// 신호 정렬 (점수 높은 순)
export function sortSignals(signals: SignalOutput[]): SignalOutput[] {
  return signals.sort((a, b) => b.score - a.score);
}
