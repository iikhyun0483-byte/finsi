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

// 수급 점수 계산
// 외국인 40% + 기관 40% + 프로그램 20%
export function calcSupplyScore(
  foreignNet: number,
  instNet:    number,
  programNet: number,
  maxAmount:  number = 1_000_000_000  // 정규화 기준 (10억)
): number {
  const normalize = (v: number) => Math.max(-1, Math.min(1, v / maxAmount))
  const score = (
    normalize(foreignNet)  * 40 +
    normalize(instNet)     * 40 +
    normalize(programNet)  * 20
  )
  return Math.round(score)
}

// 3일 연속 외국인 순매수 감지
export function detectConsecutiveForeign(
  history: Array<{ tradeDate: string; foreignNet: number }>,
  days = 3
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
  if (score >= 60 && consecutiveForeign) {
    return { signal: 'STRONG_BUY', reason: '외국인 연속 순매수 + 기관 동반 매수' }
  }
  if (score >= 40) {
    return { signal: 'BUY', reason: `수급 점수 ${score} — 매수세 우위` }
  }
  if (score <= -60) {
    return { signal: 'STRONG_SELL', reason: '외국인/기관 동반 대량 매도' }
  }
  if (score <= -40) {
    return { signal: 'SELL', reason: `수급 점수 ${score} — 매도세 우위` }
  }
  return { signal: 'NEUTRAL', reason: '수급 중립' }
}
