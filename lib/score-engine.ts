/**
 * FINSI 3-Layer Score Engine
 *
 * 기술분석(Layer1) + 매크로(Layer2) + AI뉴스(Layer3) → 0~100 통합 신호 점수
 * VIX ≥ 30 시 Layer1 가중치 자동 감쇠
 */

export interface ScoreInput {
  // Layer 1 - 기술분석 (0~100)
  rsiScore: number;        // RSI 기반 점수
  macdScore: number;       // MACD 기반 점수
  bbScore: number;         // 볼린저밴드 기반 점수

  // Layer 2 - 매크로 (0~100)
  vix: number;             // 실제 VIX 값
  buffettScore: number;    // 버핏지수 역산 점수
  rateScore: number;       // 금리 환경 점수

  // Layer 3 - AI 뉴스분석 (0~100)
  newsFactorScore: number; // 뉴스 팩터 정량화 점수
}

export interface ScoreOutput {
  totalScore: number;      // 0~100 통합 신호
  layer1Score: number;
  layer2Score: number;
  layer3Score: number;
  vixPenalty: boolean;     // VIX 감쇠 적용 여부
  signal: 'BUY' | 'SELL' | 'HOLD' | 'CAUTION';
  confidence: number;      // 0~100 신뢰도
}

// 기본 가중치
const DEFAULT_WEIGHTS = {
  layer1: 0.40, // 기술분석 40%
  layer2: 0.35, // 매크로 35%
  layer3: 0.25, // 뉴스팩터 25%
};

/**
 * 3개 레이어를 통합해 0~100 단일 신호 점수 산출
 */
export function calcIntegratedScore(input: ScoreInput): ScoreOutput {
  // Fallback: 입력값 검증
  const safeInput = {
    rsiScore: clamp(input.rsiScore ?? 50, 0, 100),
    macdScore: clamp(input.macdScore ?? 50, 0, 100),
    bbScore: clamp(input.bbScore ?? 50, 0, 100),
    vix: Math.max(input.vix ?? 15, 0),
    buffettScore: clamp(input.buffettScore ?? 50, 0, 100),
    rateScore: clamp(input.rateScore ?? 50, 0, 100),
    newsFactorScore: clamp(input.newsFactorScore ?? 50, 0, 100),
  };

  // Layer 1: 기술분석 평균
  const layer1Raw = (safeInput.rsiScore + safeInput.macdScore + safeInput.bbScore) / 3;

  // Layer 2: 매크로 평균
  const layer2Raw = (safeInput.buffettScore + safeInput.rateScore) / 2;

  // Layer 3: 뉴스 팩터
  const layer3Raw = safeInput.newsFactorScore;

  // VIX 감쇠 계수 (VIX ≥ 30 이면 Layer1 신뢰도 하락)
  const vixPenalty = safeInput.vix >= 30;
  let layer1Weight = DEFAULT_WEIGHTS.layer1;
  let layer2Weight = DEFAULT_WEIGHTS.layer2;
  let layer3Weight = DEFAULT_WEIGHTS.layer3;

  if (vixPenalty) {
    // VIX 30 이상: Layer1 가중치 40% → 28% (30% 감소)
    const damping = 0.70;
    layer1Weight = DEFAULT_WEIGHTS.layer1 * damping;

    // 나머지 가중치를 Layer2와 Layer3에 재분배
    const surplus = DEFAULT_WEIGHTS.layer1 * (1 - damping);
    layer2Weight = DEFAULT_WEIGHTS.layer2 + surplus * 0.6;
    layer3Weight = DEFAULT_WEIGHTS.layer3 + surplus * 0.4;
  }

  // 통합 점수 계산
  const totalScore = clamp(
    layer1Raw * layer1Weight +
    layer2Raw * layer2Weight +
    layer3Raw * layer3Weight,
    0,
    100
  );

  // 신호 분류
  let signal: ScoreOutput['signal'] = 'HOLD';
  if (safeInput.vix >= 30) {
    signal = 'CAUTION'; // VIX 과열 시 무조건 CAUTION
  } else if (totalScore >= 70) {
    signal = 'BUY';
  } else if (totalScore <= 30) {
    signal = 'SELL';
  }

  // 신뢰도: VIX 기반 감쇠
  let confidence = 100;
  if (safeInput.vix >= 40) {
    confidence = 40;
  } else if (safeInput.vix >= 30) {
    confidence = 65;
  } else if (safeInput.vix >= 20) {
    confidence = 85;
  }

  return {
    totalScore: Math.round(totalScore),
    layer1Score: Math.round(layer1Raw),
    layer2Score: Math.round(layer2Raw),
    layer3Score: Math.round(layer3Raw),
    vixPenalty,
    signal,
    confidence,
  };
}

/**
 * 0~100 범위로 클램핑
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
