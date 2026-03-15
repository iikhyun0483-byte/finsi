// lib/supply-demand.ts

export interface SupplyDemandData {
  symbol:      string
  tradeDate:   string
  foreignNet:  number   // 외국인 순매수 (양수=매수, 음수=매도)
  instNet:     number   // 기관 순매수
  retailNet:   number   // 개인 순매수
  programNet:  number   // 프로그램 순매수
  supplyScore: number   // -100 ~ +100
}

// 수급 점수 임계값 상수
export const SUPPLY_THRESHOLDS = {
  STRONG_BUY: 60,
  BUY: 40,
  NEUTRAL_HIGH: 20,
  NEUTRAL_LOW: -20,
  SELL: -40,
  STRONG_SELL: -60,
} as const

// 가중치 상수
export const SUPPLY_WEIGHTS = {
  FOREIGN: 0.4,   // 외국인 40%
  INST: 0.4,      // 기관 40%
  PROGRAM: 0.2,   // 프로그램 20%
} as const

// 연속 매수 일수 기본값
export const CONSECUTIVE_DAYS = 3

// 정규화 기준 금액 (10억)
export const NORMALIZATION_BASE = 1_000_000_000

// 단위 변환
export const UNIT_億 = 100_000_000

// 수급 점수 계산
// 외국인 40% + 기관 40% + 프로그램 20%
export function calcSupplyScore(
  foreignNet: number,
  instNet:    number,
  programNet: number,
  maxAmount:  number = NORMALIZATION_BASE
): number {
  const normalize = (v: number) => Math.max(-1, Math.min(1, v / maxAmount))
  const score = (
    normalize(foreignNet)  * (SUPPLY_WEIGHTS.FOREIGN * 100) +
    normalize(instNet)     * (SUPPLY_WEIGHTS.INST * 100) +
    normalize(programNet)  * (SUPPLY_WEIGHTS.PROGRAM * 100)
  )
  return Math.round(score)
}

// N일 연속 외국인 순매수 감지
export function detectConsecutiveForeign(
  history: Array<{ tradeDate: string; foreignNet: number }>,
  days: number = CONSECUTIVE_DAYS
): boolean {
  if (history.length < days) return false
  const recent = history.slice(0, days)
  return recent.every(d => d.foreignNet > 0)
}

// 수급 신호 생성
export function generateSupplySignal(
  score: number,
  consecutiveForeign: boolean
): { signal: 'STRONG_BUY'|'BUY'|'NEUTRAL'|'SELL'|'STRONG_SELL'; reason: string } {
  if (score >= SUPPLY_THRESHOLDS.STRONG_BUY && consecutiveForeign) {
    return { signal: 'STRONG_BUY', reason: '외국인 연속 순매수 + 기관 동반 매수' }
  }
  if (score >= SUPPLY_THRESHOLDS.BUY) {
    return { signal: 'BUY', reason: `수급 점수 ${score} — 매수세 우위` }
  }
  if (score <= SUPPLY_THRESHOLDS.STRONG_SELL) {
    return { signal: 'STRONG_SELL', reason: '외국인/기관 동반 대량 매도' }
  }
  if (score <= SUPPLY_THRESHOLDS.SELL) {
    return { signal: 'SELL', reason: `수급 점수 ${score} — 매도세 우위` }
  }
  return { signal: 'NEUTRAL', reason: '수급 중립' }
}
