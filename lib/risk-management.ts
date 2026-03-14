/**
 * 리스크 관리 (켈리 공식, ATR 손절)
 */
import { calcKellyPosition, type KellyInput, type KellyOutput } from './kelly'

export interface RiskProfile {
  signal: number;              // 신호 점수 (0-100)
  winRate: number;             // 승률 (0-1), 백테스트 기반
  avgWin: number;              // 평균 수익률
  avgLoss: number;             // 평균 손실률
  kellyPercentage: number;     // 켈리 공식 결과 (0-100%)
  recommendedPosition: number; // 권장 포지션 (포트폴리오 %)
  stopLoss: number;            // 손절 가격 (%)
  takeProfit: number;          // 익절 가격 (%)
  atr: number | null;          // ATR (Average True Range)
}

/**
 * ATR 기반 손절/익절 계산
 */
function calculateStopLossTakeProfit(
  signalScore: number,
  atr: number | null
): { stopLoss: number; takeProfit: number } {
  // ATR 없으면 고정값
  if (!atr) {
    return {
      stopLoss: -7,  // 7% 손절
      takeProfit: 15, // 15% 익절
    };
  }

  // ATR 기반 (2 ATR = 손절, 3 ATR = 익절)
  const stopLoss = -Math.min(10, atr * 2);
  const takeProfit = Math.min(30, atr * 3);

  return { stopLoss, takeProfit };
}

/**
 * 신호 점수 기반 리스크 프로파일 생성
 */
export function createRiskProfile(
  signalScore: number,
  winRateData?: { winRate: number; avgWin: number; avgLoss: number },
  atr?: number | null
): RiskProfile {
  // 백테스트 데이터가 없으면 신호 점수 기반 추정
  const winRate = winRateData?.winRate ?? estimateWinRate(signalScore);
  const avgWin = winRateData?.avgWin ?? 0.05; // 기본 5%
  const avgLoss = winRateData?.avgLoss ?? 0.03; // 기본 3%

  // 중앙화된 켈리 계산 사용
  const kellyResult = calcKellyPosition({
    signalScore,
    winRate,
    avgWin,
    avgLoss,
    currentPrice: 100, // 비율 계산이므로 기준가 100 사용
    maxAllocation: 0.25,
  });

  // 신호 점수에 따른 권장 포지션 (켈리 결과를 상한으로 사용)
  let maxPosition = 0;
  if (signalScore >= 85) {
    maxPosition = 15;
  } else if (signalScore >= 75) {
    maxPosition = 10;
  } else if (signalScore >= 65) {
    maxPosition = 7;
  } else if (signalScore >= 55) {
    maxPosition = 5;
  } else {
    maxPosition = 3;
  }

  const recommendedPosition = Math.min(maxPosition, kellyResult.safeAllocation * 100);

  // ATR 기반 손절/익절
  const { stopLoss, takeProfit } = calculateStopLossTakeProfit(signalScore, atr ?? null);

  return {
    signal: signalScore,
    winRate,
    avgWin,
    avgLoss,
    kellyPercentage: kellyResult.safeAllocation * 100,
    recommendedPosition: Math.round(recommendedPosition * 10) / 10,
    stopLoss: Math.round(stopLoss * 10) / 10,
    takeProfit: Math.round(takeProfit * 10) / 10,
    atr: atr ?? null,
  };
}

/**
 * 신호 점수로 승률 추정
 * (백테스트 데이터 없을 때)
 */
function estimateWinRate(signalScore: number): number {
  if (signalScore >= 85) return 0.80;
  if (signalScore >= 75) return 0.70;
  if (signalScore >= 65) return 0.60;
  if (signalScore >= 55) return 0.55;
  return 0.50;
}

/**
 * ATR 계산 (14일 기준)
 */
export function calculateATR(prices: { high: number; low: number; close: number }[], period = 14): number {
  if (prices.length < period + 1) return 0;

  const trueRanges: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const high = prices[i].high;
    const low = prices[i].low;
    const prevClose = prices[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );

    trueRanges.push(tr);
  }

  // 최근 14일 평균
  const recentTR = trueRanges.slice(-period);
  const atr = recentTR.reduce((a, b) => a + b, 0) / recentTR.length;

  // 가격 대비 퍼센트로 변환
  const currentPrice = prices[prices.length - 1].close;
  return (atr / currentPrice) * 100;
}
