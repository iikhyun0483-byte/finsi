/**
 * FINSI Kelly Criterion Position Sizing
 *
 * 신호 점수(0~100) → Kelly Criterion 포지션 비율 자동 산출
 * Half-Kelly 적용 (실전용)
 */

export interface KellyInput {
  signalScore: number;     // 0~100 통합 신호 점수
  winRate?: number;        // 백테스트 승률 (없으면 신호점수로 추정)
  avgWin?: number;         // 평균 수익률 (없으면 기본값 사용)
  avgLoss?: number;        // 평균 손실률 (없으면 기본값 사용)
  currentPrice: number;    // 현재가
  maxAllocation?: number;  // 최대 투자 비율 상한 (기본 25%)
}

export interface KellyOutput {
  kellyFraction: number;   // 순수 Kelly 비율 (0~1)
  safeAllocation: number;  // 실전 적용 비율 = Kelly * 0.5 (Half-Kelly)
  stopLoss: number;        // 권장 손절가
  takeProfit: number;      // 권장 익절가
  riskReward: number;      // 손익비
}

// 기본값
const DEFAULT_AVG_WIN = 0.08;    // 8% 평균 수익
const DEFAULT_AVG_LOSS = 0.05;   // 5% 평균 손실
const DEFAULT_MAX_ALLOCATION = 0.25; // 최대 25% 투자
const HALF_KELLY_MULTIPLIER = 0.5;

/**
 * Kelly Criterion 포지션 비율 계산
 *
 * Kelly Formula: f = p - (1-p)/b
 * - p: 승률
 * - b: 손익비 (평균수익 / 평균손실)
 * - f: 투자 비율 (0~1)
 */
export function calcKellyPosition(input: KellyInput): KellyOutput {
  // Fallback: 입력값 검증
  const signalScore = clamp(input.signalScore ?? 50, 0, 100);
  const currentPrice = Math.max(input.currentPrice ?? 100, 0.01);
  const maxAllocation = clamp(input.maxAllocation ?? DEFAULT_MAX_ALLOCATION, 0, 1);

  // 승률 추정: 신호점수 0~100 → 승률 30~70%
  // Score 50 → 50% 승률
  // Score 100 → 70% 승률
  // Score 0 → 30% 승률
  const estimatedWinRate = 0.30 + (signalScore / 100) * 0.40;
  const winRate = clamp(input.winRate ?? estimatedWinRate, 0.01, 0.99);

  // 평균 수익률 / 손실률
  const avgWin = Math.max(input.avgWin ?? DEFAULT_AVG_WIN, 0.01);
  const avgLoss = Math.max(input.avgLoss ?? DEFAULT_AVG_LOSS, 0.01);

  // 손익비 (b)
  const riskReward = avgWin / avgLoss;

  // Kelly Formula: f = p - (1-p)/b
  const kellyFraction = winRate - (1 - winRate) / riskReward;

  // Kelly가 음수면 투자 부적합 (0으로 처리)
  const validKelly = Math.max(kellyFraction, 0);

  // Half-Kelly 적용 (풀 Kelly는 실전에서 파산 위험)
  let safeAllocation = validKelly * HALF_KELLY_MULTIPLIER;

  // 최대 투자 비율 상한 적용
  safeAllocation = Math.min(safeAllocation, maxAllocation);

  // 권장 손절가: 현재가 × (1 - avgLoss)
  const stopLoss = currentPrice * (1 - avgLoss);

  // 권장 익절가: 현재가 × (1 + avgWin × riskReward)
  // 손익비가 높을수록 익절가를 더 높게 설정
  const takeProfit = currentPrice * (1 + avgWin * Math.min(riskReward, 2));

  return {
    kellyFraction: roundTo(validKelly, 4),
    safeAllocation: roundTo(safeAllocation, 4),
    stopLoss: roundTo(stopLoss, 2),
    takeProfit: roundTo(takeProfit, 2),
    riskReward: roundTo(riskReward, 2),
  };
}

/**
 * 범위 제한
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 소수점 반올림
 */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
