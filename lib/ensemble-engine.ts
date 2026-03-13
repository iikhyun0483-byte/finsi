// lib/ensemble-engine.ts
// 앙상블 판단 엔진 — 복수 지표를 종합해 최종 판단 생성

export interface EnsembleInput {
  score: number          // 0~100, ScoreEngine 출력
  kellyFraction: number  // 0~1, Kelly 비율
  vixLevel: number       // VIX 지수
  regime: 'bull' | 'bear' | 'neutral' | 'crisis'
  rsi: number            // 0~100
  maSignal: 'buy' | 'sell' | 'neutral'
  volumeSignal: 'surge' | 'dry' | 'normal'
}

export interface EnsembleOutput {
  verdict: '강력매수' | '매수' | '관망' | '매도' | '강력매도'
  confidence: number      // 0~100
  finalKelly: number      // 조정된 Kelly 비율
  reasoning: string[]     // 판단 근거 목록
  riskLevel: 'low' | 'medium' | 'high' | 'extreme'
}

export function runEnsemble(input: EnsembleInput): EnsembleOutput {
  const reasons: string[] = []
  let bullPoints = 0
  let bearPoints = 0

  // 1. Score 판단 (가중치 30%)
  if (input.score >= 70) { bullPoints += 30; reasons.push(`종합점수 ${input.score}점 — 강세`) }
  else if (input.score >= 50) { bullPoints += 15; reasons.push(`종합점수 ${input.score}점 — 중립`) }
  else { bearPoints += 30; reasons.push(`종합점수 ${input.score}점 — 약세`) }

  // 2. VIX 판단 (가중치 25%)
  if (input.vixLevel >= 35) { bearPoints += 25; reasons.push(`VIX ${input.vixLevel} — 공포 극단`) }
  else if (input.vixLevel >= 25) { bearPoints += 15; reasons.push(`VIX ${input.vixLevel} — 시장 불안`) }
  else if (input.vixLevel <= 15) { bullPoints += 25; reasons.push(`VIX ${input.vixLevel} — 시장 안정`) }
  else { reasons.push(`VIX ${input.vixLevel} — 보통`) }

  // 3. 레짐 판단 (가중치 25%)
  const regimeMap = { bull: 25, neutral: 0, bear: -25, crisis: -25 }
  const regimeLabel = { bull: '강세장', neutral: '횡보장', bear: '약세장', crisis: '위기장' }
  const regimeScore = regimeMap[input.regime]
  if (regimeScore > 0) bullPoints += regimeScore
  else bearPoints += Math.abs(regimeScore)
  reasons.push(`시장 레짐: ${regimeLabel[input.regime]}`)

  // 4. RSI 판단 (가중치 10%)
  if (input.rsi <= 30) { bullPoints += 10; reasons.push(`RSI ${input.rsi} — 과매도 (반등 가능성)`) }
  else if (input.rsi >= 70) { bearPoints += 10; reasons.push(`RSI ${input.rsi} — 과매수 (조정 가능성)`) }

  // 5. MA 시그널 (가중치 10%)
  if (input.maSignal === 'buy') { bullPoints += 10; reasons.push('이동평균 — 골든크로스') }
  else if (input.maSignal === 'sell') { bearPoints += 10; reasons.push('이동평균 — 데드크로스') }

  // 최종 판단
  const total = bullPoints + bearPoints
  const bullRatio = total > 0 ? bullPoints / total : 0.5
  const confidence = Math.round(Math.abs(bullRatio - 0.5) * 200)

  let verdict: EnsembleOutput['verdict']
  if (bullRatio >= 0.75) verdict = '강력매수'
  else if (bullRatio >= 0.55) verdict = '매수'
  else if (bullRatio >= 0.45) verdict = '관망'
  else if (bullRatio >= 0.25) verdict = '매도'
  else verdict = '강력매도'

  // 위기 레짐이면 Kelly 50% 강제 감소
  let finalKelly = input.kellyFraction
  if (input.regime === 'crisis') finalKelly *= 0.25
  else if (input.regime === 'bear') finalKelly *= 0.5
  else if (input.vixLevel >= 30) finalKelly *= 0.6

  const riskLevel: EnsembleOutput['riskLevel'] =
    input.vixLevel >= 35 || input.regime === 'crisis' ? 'extreme'
    : input.vixLevel >= 25 || input.regime === 'bear' ? 'high'
    : input.vixLevel >= 18 ? 'medium'
    : 'low'

  return {
    verdict,
    confidence,
    finalKelly: Math.min(finalKelly, 0.25), // Kelly 최대 25% 캡
    reasoning: reasons,
    riskLevel,
  }
}
