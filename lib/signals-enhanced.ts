// 투자 신호 엔진 (3레이어 점수 시스템) - ENHANCED VERSION

import { calcRSI, calcMACD, calcBollinger, calcSMA } from "./indicators";
import { MacroIndicators, calcMacroScore } from "./macro";
import { getFundamentals, calcFundamentalScore, type FundamentalData } from "./fundamentals";
import { getNewsSentiment, type NewsSentiment } from "./news-sentiment";
import { improveCryptoSignal, type CryptoSignalBoost } from "./crypto-signals";
import { createRiskProfile, type RiskProfile } from "./risk-management";
import { getLeadingIndicatorScore, type LeadingIndicatorScore } from "./leading-indicators";
import { detectRegime, type RegimeResult } from "./regime-detection";
import { runEnsemble, type EnsembleOutput } from "./ensemble-engine";

export interface SignalInput {
  symbol: string;
  name: string;
  assetType: "stock" | "crypto" | "commodity" | "bond" | "reit";
  prices: number[];
  volumes?: number[]; // 거래량 (선택)
  macroIndicators: MacroIndicators;
}

export interface SignalOutputEnhanced {
  symbol: string;
  name: string;
  assetType: string;
  score: number;
  originalScore: number; // 상관관계 조정 전
  action: string;
  layer1Score: number; // 기술 30%
  layer2Score: number; // 팩터 + 펀더멘털 40%
  layer3Score: number; // 매크로 + 뉴스 30%
  rsi: number;
  macd: number;
  price: number;
  highRisk?: boolean;
  
  // NEW: 추가 정보
  fundamentals?: FundamentalData;
  fundamentalScore?: number;
  news?: NewsSentiment;
  newsScore?: number;
  cryptoBoost?: CryptoSignalBoost;
  riskProfile?: RiskProfile;
  correlationAdjustment?: number; // 상관관계 조정값
  leadingIndicators?: LeadingIndicatorScore; // 선행 지표
  leadingScore?: number; // 선행 지표 점수

  // 신규 신호 (7가지 기능 추가)
  goldenCross?: boolean;
  deadCross?: boolean;
  volumeSpike?: boolean;
  week52High?: boolean;
  week52Low?: boolean;
  bollingerRSI?: 'oversold' | 'overbought' | 'neutral';

  // 레짐 감지 및 앙상블 결과
  regimeDetection?: RegimeResult;
  ensembleOutput?: EnsembleOutput;
}

// Layer 1: 기술적 지표 (30%)
function calcLayer1Score(prices: number[]): { score: number; rsi: number; macd: number } {
  let score = 0;
  const currentPrice = prices[prices.length - 1];

  // RSI
  const rsiValues = calcRSI(prices, 14);
  const rsi = rsiValues[rsiValues.length - 1] || 50;

  if (rsi < 30) score += 30;
  else if (rsi < 40) score += 22;
  else if (rsi < 50) score += 15;
  else if (rsi < 60) score += 10;
  else if (rsi < 70) score += 5;
  else score += 0;

  // MACD
  const macdData = calcMACD(prices);
  const histogram = macdData.histogram[macdData.histogram.length - 1] || 0;

  if (histogram > 0) score += 25;
  else score += 0;

  // 볼린저밴드
  const bollinger = calcBollinger(prices, 20, 2);
  const lastBollinger = bollinger[bollinger.length - 1];
  const lower = lastBollinger.lower;
  const middle = lastBollinger.middle;
  const upper = lastBollinger.upper;

  if (lower !== null && middle !== null && upper !== null) {
    if (currentPrice <= lower) score += 20;
    else if (currentPrice <= middle) score += 12;
    else if (currentPrice <= upper) score += 5;
    else score += 0;
  }

  // 골든/데드크로스
  const sma50 = calcSMA(prices, 50);
  const sma200 = calcSMA(prices, 200);

  if (sma50.length > 0 && sma200.length > 0) {
    const currentSMA50 = sma50[sma50.length - 1];
    const currentSMA200 = sma200[sma200.length - 1];

    if (currentSMA50 !== null && currentSMA200 !== null && currentSMA50 > currentSMA200) {
      score += 25;
    }
  }

  return { score: Math.min(100, score), rsi, macd: histogram };
}

// Layer 2: 팩터 점수 (40%) - 모멘텀 + 펀더멘털
function calcLayer2Score(prices: number[], fundamentalScore: number = 0): number {
  let score = 0;
  const currentPrice = prices[prices.length - 1];

  // 12개월 모멘텀
  if (prices.length >= 252) {
    const momentum12m = ((currentPrice - prices[prices.length - 252]) / prices[prices.length - 252]) * 100;

    if (momentum12m > 20) score += 25;
    else if (momentum12m > 10) score += 18;
    else if (momentum12m > 0) score += 12;
    else if (momentum12m > -10) score += 6;
    else score += 0;
  }

  // 3개월 모멘텀
  if (prices.length >= 63) {
    const momentum3m = ((currentPrice - prices[prices.length - 63]) / prices[prices.length - 63]) * 100;

    if (momentum3m > 10) score += 20;
    else if (momentum3m > 5) score += 14;
    else if (momentum3m > 0) score += 8;
    else score += 0;
  }

  // 저변동성 (안정성)
  if (prices.length >= 63) {
    const returns = prices.slice(-63).map((p, i, arr) => i === 0 ? 0 : (p - arr[i - 1]) / arr[i - 1]);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const volatility = (Math.sqrt(variance) / mean) * 100;

    if (volatility < 15) score += 15;
    else if (volatility < 25) score += 10;
    else if (volatility < 40) score += 5;
    else score += 0;
  }

  // 펀더멘털 점수 추가 (최대 40점)
  score += fundamentalScore;

  return Math.min(100, score);
}

// Layer 3: 매크로 환경 (30%) + 뉴스 감성
function calcLayer3Score(macroIndicators: MacroIndicators, newsScore: number = 0): number {
  let score = calcMacroScore(macroIndicators); // 기존 매크로 점수

  // 뉴스 감성 점수 추가 (-10 ~ +10)
  score += newsScore;

  return Math.min(100, Math.max(0, score));
}

// 상관관계 조정 (Correlation Adjustments)
function applyCorrelationAdjustment(
  signal: SignalOutputEnhanced,
  macroIndicators: MacroIndicators,
  dxyPrice?: number // UUP ETF 가격 (달러지수 프록시)
): number {
  let adjustment = 0;

  // 1. DXY(달러지수) 강세 → 원자재 약세
  if (dxyPrice && signal.assetType === "commodity") {
    // UUP ETF 기준: 28 이상이면 강세로 간주
    if (dxyPrice > 28) {
      adjustment -= 10;
    }
  }

  // 2. VIX > 30 → 전체 신호 보수적 조정 (0.8배)
  if (macroIndicators.vix > 30) {
    adjustment -= signal.score * 0.2; // 20% 감소
  }

  // 3. 기준금리 > 5% → 채권/리츠 약세
  if (macroIndicators.fedRate > 5.0) {
    if (signal.assetType === "bond") {
      adjustment -= 15;
    } else if (signal.assetType === "reit") {
      adjustment -= 15;
    }
  }

  // 4. 버핏지수 > 180 → 주식 전체 약세
  if (macroIndicators.buffett > 180 && signal.assetType === "stock") {
    adjustment -= 10;
  }

  return Math.round(adjustment);
}

// ============ 신호 감지 함수들 (signals.ts에서 복사) ============

// 골든크로스/데드크로스 감지
function detectCrossover(prices: number[]): { goldenCross: boolean; deadCross: boolean } {
  if (prices.length < 200) return { goldenCross: false, deadCross: false };

  const sma50 = calcSMA(prices, 50);
  const sma200 = calcSMA(prices, 200);

  const currentSMA50 = sma50[sma50.length - 1];
  const previousSMA50 = sma50[sma50.length - 2];
  const currentSMA200 = sma200[sma200.length - 1];
  const previousSMA200 = sma200[sma200.length - 2];

  if (!currentSMA50 || !previousSMA50 || !currentSMA200 || !previousSMA200) {
    return { goldenCross: false, deadCross: false };
  }

  const goldenCross = previousSMA50 < previousSMA200 && currentSMA50 > currentSMA200;
  const deadCross = previousSMA50 > previousSMA200 && currentSMA50 < currentSMA200;

  return { goldenCross, deadCross };
}

// 거래량 급증 감지
function detectVolumeSpike(volumes: number[] | undefined): boolean {
  if (!volumes || volumes.length < 21) return false;

  const currentVolume = volumes[volumes.length - 1];
  const avgVolume = volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;

  return currentVolume >= avgVolume * 2;
}

// 52주 신고가/신저가 감지
function detect52WeekHighLow(prices: number[]): { week52High: boolean; week52Low: boolean } {
  if (prices.length < 252) return { week52High: false, week52Low: false };

  const recent52Weeks = prices.slice(-252);
  const currentPrice = prices[prices.length - 1];
  const max = Math.max(...recent52Weeks);
  const min = Math.min(...recent52Weeks);

  return {
    week52High: currentPrice >= max * 0.999,
    week52Low: currentPrice <= min * 1.001,
  };
}

// 볼린저밴드 + RSI 복합 신호
function detectBollingerRSI(prices: number[]): 'oversold' | 'overbought' | 'neutral' {
  const bollinger = calcBollinger(prices, 20, 2);
  const rsiValues = calcRSI(prices, 14);

  const currentPrice = prices[prices.length - 1];
  const currentBand = bollinger[bollinger.length - 1];
  const rsi = rsiValues[rsiValues.length - 1];

  if (currentBand.lower && currentPrice < currentBand.lower && rsi !== null && rsi < 30) {
    return 'oversold';
  }

  if (currentBand.upper && currentPrice > currentBand.upper && rsi !== null && rsi > 70) {
    return 'overbought';
  }

  return 'neutral';
}

// ============================================

// 메인 신호 생성 함수 (Enhanced)
export async function generateSignalEnhanced(
  input: SignalInput,
  dxyPrice?: number
): Promise<SignalOutputEnhanced> {
  const { symbol, name, assetType, prices, macroIndicators } = input;

  // Layer 1: 기술적 분석
  const layer1 = calcLayer1Score(prices);
  const layer1Score = (layer1.score * 0.3);

  // Layer 2: 팩터 + 펀더멘털
  let fundamentalData: FundamentalData | undefined;
  let fundamentalScore = 0;

  if (assetType === "stock") {
    try {
      fundamentalData = await getFundamentals(symbol);
      fundamentalScore = calcFundamentalScore(fundamentalData);
    } catch (error) {
      console.warn(`펀더멘털 조회 실패 (${symbol}):`, error);
    }
  }

  const layer2Score = calcLayer2Score(prices, fundamentalScore) * 0.4;

  // Layer 3: 매크로 + 뉴스 감성
  let newsData: NewsSentiment | undefined;
  let newsScore = 0;

  try {
    newsData = await getNewsSentiment(symbol);
    newsScore = newsData.overallSentiment;
  } catch (error) {
    console.warn(`뉴스 감성 조회 실패 (${symbol}):`, error);
  }

  const layer3Score = calcLayer3Score(macroIndicators, newsScore) * 0.3;

  // 기본 점수 계산
  let totalScore = layer1Score + layer2Score + layer3Score;

  // 암호화폐 볼륨 부스트
  let cryptoBoost: CryptoSignalBoost | undefined;
  if (assetType === "crypto") {
    try {
      const cryptoResult = await improveCryptoSignal(symbol, totalScore);
      cryptoBoost = cryptoResult.boost;
      totalScore = cryptoResult.improvedScore;
    } catch (error) {
      console.warn(`암호화폐 시그널 개선 실패 (${symbol}):`, error);
    }
  }

  // 선행 지표 (주식만 적용)
  let leadingIndicators: LeadingIndicatorScore | undefined;
  let leadingScore = 0;
  if (assetType === "stock") {
    try {
      leadingIndicators = await getLeadingIndicatorScore(symbol);
      leadingScore = leadingIndicators.totalScore;
      totalScore += leadingScore;
    } catch (error) {
      console.warn(`선행 지표 조회 실패 (${symbol}):`, error);
    }
  }

  // 상관관계 조정 전 점수 저장
  const originalScore = Math.round(totalScore);

  // 임시 신호 객체 생성 (조정 계산용)
  const tempSignal: SignalOutputEnhanced = {
    symbol,
    name,
    assetType,
    score: originalScore,
    originalScore,
    action: originalScore >= 70 ? "강력 매수" : originalScore >= 55 ? "매수" : "관망",
    layer1Score: Math.round(layer1Score),
    layer2Score: Math.round(layer2Score),
    layer3Score: Math.round(layer3Score),
    rsi: layer1.rsi,
    macd: layer1.macd,
    price: prices[prices.length - 1],
  };

  // 상관관계 조정 적용
  const correlationAdj = applyCorrelationAdjustment(tempSignal, macroIndicators, dxyPrice);
  const finalScore = Math.max(0, Math.min(100, originalScore + correlationAdj));

  // ATR 계산 (마지막 20일)
  let atr: number | null = null;
  if (prices.length >= 20) {
    const recentPrices = prices.slice(-20);
    const ranges = recentPrices.slice(1).map((p, i) => Math.abs(p - recentPrices[i]));
    atr = ranges.reduce((a, b) => a + b, 0) / ranges.length;
  }

  // 리스크 프로필 생성
  const riskProfile = createRiskProfile(
    finalScore,
    undefined, // 백테스트 데이터 없으면 자동 추정
    atr
  );

  // 고위험 플래그
  const highRisk = macroIndicators.vix > 30 || macroIndicators.fearGreed < 30;

  // 최종 액션 결정
  let action = "관망";
  if (finalScore >= 70) action = "강력 매수";
  else if (finalScore >= 55) action = "매수";

  // 신규 신호 감지
  const crossover = detectCrossover(prices);
  const volumeSpike = detectVolumeSpike(input.volumes);
  const week52 = detect52WeekHighLow(prices);
  const bollingerRSI = detectBollingerRSI(prices);

  // 레짐 감지 (가격 수익률 기반)
  let regimeDetection: RegimeResult | undefined;
  if (prices.length >= 63) {
    const returns = prices.slice(-63).map((p, i, arr) =>
      i === 0 ? 0 : (p - arr[i - 1]) / arr[i - 1]
    );
    regimeDetection = detectRegime({
      returns,
      vix: macroIndicators.vix,
      lookbackDays: 63,
      tradingDaysPerYear: 252,
    });
  }

  // 앙상블 판단
  let ensembleOutput: EnsembleOutput | undefined;
  if (regimeDetection && riskProfile) {
    ensembleOutput = runEnsemble({
      score: finalScore,
      kellyFraction: riskProfile.kellyPercentage / 100,
      vixLevel: macroIndicators.vix,
      regime: regimeDetection.current,
      rsi: layer1.rsi,
      maSignal: crossover.goldenCross ? 'buy' : crossover.deadCross ? 'sell' : 'neutral',
      volumeSignal: volumeSpike ? 'surge' : 'normal',
    });

    // 앙상블 결과로 최종 액션 재조정
    action = ensembleOutput.verdict;
  }

  return {
    symbol,
    name,
    assetType,
    score: Math.round(finalScore),
    originalScore,
    action,
    layer1Score: Math.round(layer1Score),
    layer2Score: Math.round(layer2Score),
    layer3Score: Math.round(layer3Score),
    rsi: layer1.rsi,
    macd: layer1.macd,
    price: prices[prices.length - 1],
    highRisk,
    fundamentals: fundamentalData,
    fundamentalScore,
    news: newsData,
    newsScore,
    cryptoBoost,
    riskProfile,
    correlationAdjustment: correlationAdj,
    leadingIndicators,
    leadingScore,

    // 신규 신호들
    goldenCross: crossover.goldenCross,
    deadCross: crossover.deadCross,
    volumeSpike,
    week52High: week52.week52High,
    week52Low: week52.week52Low,
    bollingerRSI,

    // 레짐 및 앙상블
    regimeDetection,
    ensembleOutput,
  };
}

// 여러 자산 일괄 신호 생성
export async function generateSignalsEnhanced(
  inputs: SignalInput[]
): Promise<SignalOutputEnhanced[]> {
  // UUP ETF 가격 조회 (달러지수 프록시)
  let dxyPrice: number | undefined;
  try {
    const uupData = inputs.find((i) => i.symbol === "UUP");
    if (uupData) {
      dxyPrice = uupData.prices[uupData.prices.length - 1];
    }
  } catch (error) {
    console.warn("DXY 가격 조회 실패:", error);
  }

  // 병렬 처리로 성능 최적화
  const signals = await Promise.all(
    inputs.map((input) => generateSignalEnhanced(input, dxyPrice))
  );

  return signals.sort((a, b) => b.score - a.score);
}
