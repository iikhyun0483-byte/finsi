# PHASE 1 — 백테스트 버그 수정 + 앙상블 엔진
# Claude Code에 이 파일 내용 전체 전달할 것

---

## 목표
백테스트 4개 버그 수정 + 앙상블 판단 엔진 신규 추가

---

## STEP 1. lib/format.ts 신규 생성

아래 파일을 E:\dev\finsi\lib\format.ts 로 생성

```typescript
// lib/format.ts
// 핀시 전역 포맷 유틸리티 — 절대 수정 금지

export function formatKRW(amount: number): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (abs >= 1_000_000_000_000) {
    const jo = Math.floor(abs / 1_000_000_000_000)
    const eok = Math.floor((abs % 1_000_000_000_000) / 100_000_000)
    return `${sign}${jo}조 ${eok > 0 ? eok.toLocaleString() + '억원' : '원'}`
  }
  if (abs >= 100_000_000) {
    const eok = Math.floor(abs / 100_000_000)
    const man = Math.floor((abs % 100_000_000) / 10_000)
    return `${sign}${eok}억 ${man > 0 ? man.toLocaleString() + '만원' : '원'}`
  }
  if (abs >= 10_000) {
    const man = Math.floor(abs / 10_000)
    return `${sign}${man.toLocaleString()}만원`
  }
  return `${sign}${abs.toLocaleString()}원`
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPct(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`
}

export function formatPctRaw(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`
}

export function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString('ko-KR', { maximumFractionDigits: digits })
}
```

---

## STEP 2. 백테스트 버그 수정

파일: app/backtest/page.tsx

### 버그 1. 승률 0% 고정 버그

찾을 코드 (winRate 계산 부분):
```
const winRate = 0
```
또는
```
winRate: 0
```

올바른 코드로 교체:
```typescript
const winningTrades = trades.filter((t: any) => t.pnl > 0).length
const totalTrades = trades.length
const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
```

---

### 버그 2. 총수익률 ↔ 최종자산 불일치

찾을 코드:
```
totalReturn: finalCapital / initialCapital
```

올바른 코드로 교체:
```typescript
totalReturn: ((finalCapital - initialCapital) / initialCapital) * 100
```

---

### 버그 3. 수익률 과장 수정 (GLD 2년 93% → 실제 40~50%)

app/api/backtest/route.ts 파일에서

찾을 코드 (log return 계산):
```
return Math.exp(logReturn) - 1
```

올바른 코드 (간단 수익률 사용):
```typescript
// 단순 수익률 = (종가 - 시가) / 시가
const simpleReturn = (closePrice - openPrice) / openPrice
return simpleReturn
```

또한 복리 적용 부분에서:
```
capital = capital * (1 + dailyReturn) ** tradingDays
```
이런 형태의 지수 복리 코드를 찾아서 아래로 교체:
```typescript
// 일별 순차 적용 (지수 복리 금지)
for (const r of dailyReturns) {
  capital = capital * (1 + r)
}
```

---

### 버그 4. 금액 표기 수정

app/backtest/page.tsx 전체에서

찾을 패턴:
```
₩{value}만
${value.toFixed(0)}만
{value}만원
```

모두 아래로 교체:
```typescript
import { formatKRW } from '@/lib/format'
// 사용: {formatKRW(value)}
```

---

## STEP 3. lib/ensemble-engine.ts 신규 생성

아래 파일을 E:\dev\finsi\lib\ensemble-engine.ts 로 생성

```typescript
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
```

---

## STEP 4. 완료 확인

```bash
cd E:\dev\finsi
npm run build
```

에러 없으면 PHASE 1 완료.
