/**
 * FINSI VIX-based Multi-Asset Signal Filter
 *
 * VIX 및 암호화폐 공포탐욕지수 기반 신호 신뢰도 자동 보정
 * 이종 자산군 간 크로스마켓 보정
 */

export interface VixFilterInput {
  vix: number;
  cryptoFearGreed: number;   // 공포탐욕지수 0~100
  originalScore: number;     // 원본 신호 점수
  assetType: 'stock' | 'crypto' | 'etf';
}

export interface VixFilterOutput {
  adjustedScore: number;
  dampingFactor: number;     // 감쇠 계수 (0~1)
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  warningMessage: string | null;
}

/**
 * VIX 및 공포탐욕지수 기반 신호 보정
 */
export function applyVixFilter(input: VixFilterInput): VixFilterOutput {
  // Fallback: 입력값 검증
  const vix = Math.max(input.vix ?? 15, 0);
  const cryptoFearGreed = clamp(input.cryptoFearGreed ?? 50, 0, 100);
  const originalScore = clamp(input.originalScore ?? 50, 0, 100);
  const assetType = input.assetType ?? 'stock';

  // VIX 기반 감쇠 계수 계산
  let dampingFactor = 1.0;
  let riskLevel: VixFilterOutput['riskLevel'] = 'LOW';
  let warningMessage: string | null = null;

  if (vix < 20) {
    // VIX < 20: 정상 시장, 감쇠 없음
    dampingFactor = 1.0;
    riskLevel = 'LOW';
  } else if (vix >= 20 && vix < 30) {
    // VIX 20~30: 중간 변동성
    dampingFactor = 0.85;
    riskLevel = 'MEDIUM';
    warningMessage = '시장 변동성 상승. 신호 신뢰도 15% 감소.';
  } else if (vix >= 30 && vix < 40) {
    // VIX 30~40: 고위험
    dampingFactor = 0.65;
    riskLevel = 'HIGH';
    warningMessage = '⚠️ 고위험 시장. 신호 신뢰도 35% 감소. 신중한 포지션 관리 필요.';
  } else {
    // VIX ≥ 40: 극단적 변동성
    dampingFactor = 0.40;
    riskLevel = 'EXTREME';
    warningMessage = '🚨 극단적 변동성 경고! 신호 신뢰도 60% 감소. 현금 비중 확대 권장.';
  }

  // 암호화폐 추가 보정
  if (assetType === 'crypto') {
    if (cryptoFearGreed <= 20) {
      // 극단적 공포: 추가 감쇠
      dampingFactor *= 0.8;
      warningMessage = (warningMessage ?? '') + '\n🔴 암호화폐 극단적 공포 구간 (FG≤20). 추가 20% 감쇠.';
    } else if (cryptoFearGreed >= 80) {
      // 극단적 탐욕: 매수 신호 강화 (단, VIX 낮을 때만)
      if (vix < 25 && originalScore >= 60) {
        dampingFactor *= 1.15; // 15% 부스트
        warningMessage = '⚡ 암호화폐 탐욕 과열 (FG≥80). 매수 신호 15% 강화 (단, 과열 경고).';
      } else {
        warningMessage = '⚠️ 암호화폐 탐욕 과열 (FG≥80). 조정 가능성 주의.';
      }
    }
  }

  // ETF는 VIX 감쇠를 덜 받음 (분산투자 특성)
  if (assetType === 'etf') {
    dampingFactor = 1.0 - (1.0 - dampingFactor) * 0.7; // 감쇠 효과 30% 완화
  }

  // 최종 점수 = 원본 점수 × 감쇠 계수
  const adjustedScore = clamp(originalScore * dampingFactor, 0, 100);

  return {
    adjustedScore: Math.round(adjustedScore),
    dampingFactor: roundTo(dampingFactor, 2),
    riskLevel,
    warningMessage,
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
