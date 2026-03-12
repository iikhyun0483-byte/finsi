/**
 * FINSI Score Integration Helpers
 *
 * 기존 신호 데이터 → ScoreEngine 입력으로 변환하는 유틸 함수들
 */

// 안전한 숫자 변환
export const safeNum = (v: unknown, def = 50): number =>
  typeof v === 'number' && !isNaN(v) ? v : def;

// RSI → rsiScore (RSI 값 그대로 0~100)
export const rsiToScore = (rsi: number | null | undefined): number =>
  safeNum(rsi, 50);

// MACD → macdScore
export const macdToScore = (macd: number | null | undefined): number => {
  if (macd == null || isNaN(macd)) return 50;
  if (macd > 0.5) return 75;
  if (macd > 0) return 60;
  if (macd < -0.5) return 25;
  if (macd < 0) return 40;
  return 50;
};

// 볼린저밴드 위치 → bbScore
// bbPosition: 0=하단(매수), 1=상단(매도), 0.5=중간
export const bbToScore = (bbPosition: number | null | undefined): number => {
  if (bbPosition == null || isNaN(bbPosition)) return 50;
  return Math.round((1 - bbPosition) * 100);
};

// 버핏지수 → buffettScore (버핏지수 높을수록 고평가 → 점수 낮음)
// 버핏지수 100% 기준 정상, 150%+ 고평가
export const buffettToScore = (buffett: number | null | undefined): number => {
  const b = safeNum(buffett, 100);
  if (b < 80) return 80;
  if (b < 100) return 65;
  if (b < 120) return 50;
  if (b < 150) return 35;
  return 20;
};

// 금리 → rateScore (금리 높을수록 주식 불리)
export const rateToScore = (rate: number | null | undefined): number => {
  const r = safeNum(rate, 3);
  if (r < 2) return 75;
  if (r < 3) return 60;
  if (r < 4) return 50;
  if (r < 5) return 35;
  return 20;
};
