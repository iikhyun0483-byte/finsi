// lib/autopilot.ts

export interface AutopilotConfig {
  is_active: boolean
  max_daily_loss: number  // 음수 (예: -500000)
  max_position_size: number  // 단일 종목 최대 비중 (%)
  universe: string[]  // 거래 대상 종목 리스트
  strategy: 'MOMENTUM'|'MEAN_REVERSION'|'SENTIMENT'
  updated_at?: string
}

export const DEFAULT_CONFIG: AutopilotConfig = {
  is_active: false,
  max_daily_loss: -500000,
  max_position_size: 30,
  universe: ['005930','000660','035420','051910'],  // 삼성전자, SK하이닉스, NAVER, LG화학
  strategy: 'MOMENTUM',
}

// 긴급 정지 (모든 포지션 청산 + 비활성화)
export interface EmergencyStopResult {
  success: boolean
  closedPositions: number
  message: string
}

// 전략별 신호 생성 로직 (간단한 예시)
export function generateSignal(
  strategy: AutopilotConfig['strategy'],
  symbol: string,
  data: {
    price: number
    ma20: number
    rsi: number
    sentiment: number
  }
): { action: 'BUY'|'SELL'|'HOLD'; reason: string } {
  if (strategy === 'MOMENTUM') {
    // 모멘텀: 가격 > MA20 & RSI < 70 → 매수
    if (data.price > data.ma20 && data.rsi < 70) {
      return { action: 'BUY', reason: `모멘텀 상승 (가격 ${data.price} > MA20 ${data.ma20}, RSI ${data.rsi})` }
    }
    if (data.price < data.ma20 && data.rsi > 50) {
      return { action: 'SELL', reason: `모멘텀 하락 (가격 ${data.price} < MA20 ${data.ma20})` }
    }
  }

  if (strategy === 'MEAN_REVERSION') {
    // 평균 회귀: RSI < 30 → 매수, RSI > 70 → 매도
    if (data.rsi < 30) {
      return { action: 'BUY', reason: `과매도 구간 (RSI ${data.rsi})` }
    }
    if (data.rsi > 70) {
      return { action: 'SELL', reason: `과매수 구간 (RSI ${data.rsi})` }
    }
  }

  if (strategy === 'SENTIMENT') {
    // 감정: 극단적 공포(≤20) → 매수, 극단적 탐욕(≥80) → 매도
    if (data.sentiment <= 20) {
      return { action: 'BUY', reason: `극단적 공포 감정 (${data.sentiment})` }
    }
    if (data.sentiment >= 80) {
      return { action: 'SELL', reason: `극단적 탐욕 감정 (${data.sentiment})` }
    }
  }

  return { action: 'HOLD', reason: '신호 없음' }
}

// Universe 검증 (종목 코드 형식 체크)
export function validateUniverse(universe: string[]): boolean {
  if (universe.length === 0) return false
  // 한국 주식: 6자리 숫자, 미국 주식: 대문자 영문
  const pattern = /^(\d{6}|[A-Z]{1,5})$/
  return universe.every(s => pattern.test(s))
}
