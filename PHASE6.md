# PHASE 6 — 워크포워드 검증 + TIER2 플러그인 구조 + 최종 빌드

---

## STEP 1. lib/walk-forward.ts 생성

```typescript
// lib/walk-forward.ts
// 워크포워드 검증 — 백테스트 과적합 방지

export interface WalkForwardConfig {
  trainRatio: number      // 훈련 기간 비율 (예: 0.7 = 70%)
  windows: number         // 검증 창 수 (예: 10)
  strategy: (trainData: number[], testData: number[]) => WalkForwardSegment
}

export interface WalkForwardSegment {
  trainReturn: number
  testReturn: number
  winRate: number
  maxDrawdown: number
  sharpe: number
}

export interface WalkForwardResult {
  segments: WalkForwardSegment[]
  avgTestReturn: number
  avgWinRate: number
  avgSharpe: number
  consistency: number       // 양수 수익 구간 비율
  overfit: boolean          // 훈련 > 테스트 * 2 이면 과적합 의심
  verdict: '검증 통과' | '과적합 의심' | '전략 부적합'
}

export function runWalkForward(
  prices: number[],
  config: WalkForwardConfig
): WalkForwardResult {
  const { trainRatio, windows, strategy } = config
  const totalLen = prices.length
  const windowSize = Math.floor(totalLen / (windows + 1))

  const segments: WalkForwardSegment[] = []

  for (let w = 0; w < windows; w++) {
    const start = w * windowSize
    const trainEnd = start + Math.floor(windowSize * trainRatio * (windows / (windows - w + 1)))
    const testEnd = Math.min(start + windowSize + Math.floor(windowSize / windows), totalLen)

    if (trainEnd >= testEnd || testEnd > totalLen) break

    const trainPrices = prices.slice(start, trainEnd)
    const testPrices = prices.slice(trainEnd, testEnd)

    if (trainPrices.length < 5 || testPrices.length < 2) continue

    const trainReturns = trainPrices.slice(1).map((p, i) => (p - trainPrices[i]) / trainPrices[i])
    const testReturns = testPrices.slice(1).map((p, i) => (p - testPrices[i]) / testPrices[i])

    const seg = strategy(trainReturns, testReturns)
    segments.push(seg)
  }

  if (segments.length === 0) {
    return {
      segments: [],
      avgTestReturn: 0,
      avgWinRate: 0,
      avgSharpe: 0,
      consistency: 0,
      overfit: false,
      verdict: '전략 부적합',
    }
  }

  const avgTrainReturn = segments.reduce((s, g) => s + g.trainReturn, 0) / segments.length
  const avgTestReturn = segments.reduce((s, g) => s + g.testReturn, 0) / segments.length
  const avgWinRate = segments.reduce((s, g) => s + g.winRate, 0) / segments.length
  const avgSharpe = segments.reduce((s, g) => s + g.sharpe, 0) / segments.length
  const consistency = segments.filter(g => g.testReturn > 0).length / segments.length
  const overfit = avgTrainReturn > avgTestReturn * 2

  let verdict: WalkForwardResult['verdict']
  if (!overfit && consistency >= 0.6 && avgSharpe >= 0.5) verdict = '검증 통과'
  else if (overfit) verdict = '과적합 의심'
  else verdict = '전략 부적합'

  return { segments, avgTestReturn, avgWinRate, avgSharpe, consistency, overfit, verdict }
}
```

---

## STEP 2. lib/business-score.ts 생성

```typescript
// lib/business-score.ts
// 창업/사업 생존 확률 분석 (핀시 확장 — 인간 재무 의사결정)

export interface BusinessInput {
  monthlyRevenue: number        // 월 매출
  monthlyFixedCost: number      // 월 고정비
  monthlyVariableCostRate: number // 변동비율 (0~1)
  cashReserve: number           // 보유 현금
  monthlyGrowthRate: number     // 월 성장률 (소수)
  runway?: number               // 런웨이 (개월, 미입력 시 자동 계산)
}

export interface BusinessResult {
  breakEvenRevenue: number      // 손익분기 매출
  currentMargin: number         // 현재 영업이익률
  runway: number                // 현금 소진까지 개월
  survivalProb: number          // 12개월 생존 확률
  verdict: '안정' | '주의' | '위험' | '즉시조치'
  recommendations: string[]
}

export function scoreBusiness(input: BusinessInput): BusinessResult {
  const {
    monthlyRevenue,
    monthlyFixedCost,
    monthlyVariableCostRate,
    cashReserve,
    monthlyGrowthRate,
  } = input

  const variableCost = monthlyRevenue * monthlyVariableCostRate
  const totalCost = monthlyFixedCost + variableCost
  const monthlyProfit = monthlyRevenue - totalCost
  const currentMargin = monthlyRevenue > 0 ? monthlyProfit / monthlyRevenue : -1

  const breakEvenRevenue = monthlyFixedCost / (1 - monthlyVariableCostRate)

  // 런웨이 계산
  let runway: number
  if (monthlyProfit >= 0) {
    runway = 999 // 흑자 — 무한 런웨이
  } else {
    const burnRate = Math.abs(monthlyProfit)
    runway = cashReserve / burnRate
  }

  // 12개월 생존 시뮬레이션
  let cash = cashReserve
  let revenue = monthlyRevenue
  let survived = 0
  for (let m = 0; m < 12; m++) {
    const cost = monthlyFixedCost + revenue * monthlyVariableCostRate
    cash += revenue - cost
    revenue *= (1 + monthlyGrowthRate)
    if (cash >= 0) survived++
  }
  const survivalProb = survived / 12

  // 판단
  let verdict: BusinessResult['verdict']
  if (runway >= 18 && currentMargin >= 0.1) verdict = '안정'
  else if (runway >= 6 && currentMargin >= 0) verdict = '주의'
  else if (runway >= 3) verdict = '위험'
  else verdict = '즉시조치'

  // 권고사항
  const recommendations: string[] = []
  if (currentMargin < 0) recommendations.push(`손익분기점까지 월 ${(breakEvenRevenue - monthlyRevenue).toLocaleString()}원 매출 필요`)
  if (runway < 6) recommendations.push(`현금 ${runway.toFixed(1)}개월치 남음 — 즉시 비용 절감 또는 자금 조달`)
  if (monthlyVariableCostRate > 0.6) recommendations.push('변동비율이 높음 — 원가 구조 재검토 필요')
  if (monthlyGrowthRate <= 0) recommendations.push('성장이 정체됨 — 매출 확대 전략 수립 필요')
  if (recommendations.length === 0) recommendations.push('현재 재무 구조 안정적 — 성장 투자 검토 가능')

  return { breakEvenRevenue, currentMargin, runway, survivalProb, verdict, recommendations }
}
```

---

## STEP 3. TIER2 플러그인 폴더 구조 생성

아래 명령 실행:

```bash
cd E:\dev\finsi
mkdir -p lib/premium
```

아래 파일들을 빈 파일로 생성 (내용은 나중에 채움):

```
lib/premium/lstm-predictor.ts
lib/premium/reinforcement-rl.ts
lib/premium/transformer-model.ts
lib/premium/quantum-monte-carlo.ts
lib/premium/index.ts
```

lib/premium/index.ts 내용:
```typescript
// lib/premium/index.ts
// TIER2 유료 기능 플러그인
// 현재 미구현 — 서버 비용 확보 후 순차 구현 예정

export const PREMIUM_FEATURES = {
  lstm: false,
  rl: false,
  transformer: false,
  quantumMC: false,
} as const

export type PremiumFeature = keyof typeof PREMIUM_FEATURES
```

---

## STEP 4. 최종 빌드 및 검증

```bash
cd E:\dev\finsi

# 타입 체크
npx tsc --noEmit

# 린트
npx next lint

# 빌드
npm run build
```

---

## STEP 5. 전체 완료 체크리스트

### 파일 존재 확인
- [ ] lib/format.ts
- [ ] lib/monte-carlo.ts
- [ ] lib/risk-metrics.ts
- [ ] lib/garch.ts
- [ ] lib/regime-detection.ts
- [ ] lib/portfolio-optimizer.ts
- [ ] lib/lifecycle-model.ts
- [ ] lib/ensemble-engine.ts
- [ ] lib/walk-forward.ts
- [ ] lib/business-score.ts
- [ ] lib/premium/index.ts
- [ ] app/api/monte-carlo/route.ts
- [ ] app/api/holdings/route.ts
- [ ] app/api/assets/route.ts
- [ ] app/api/lifecycle/route.ts
- [ ] app/assets/page.tsx
- [ ] app/lifecycle/page.tsx

### 기능 확인
- [ ] 백테스트 승률 정상 표시
- [ ] 백테스트 수익률 과장 없음
- [ ] 금액 formatKRW() 형식
- [ ] 자산관리 페이지 접속 가능
- [ ] 인생설계 페이지 접속 + 시뮬레이션 실행
- [ ] 앙상블 판단 카드 표시
- [ ] 전체 페이지 한글 표기 완성
- [ ] npm run build 에러 없음

---

## 모든 PHASE 완료 후 마지막

```bash
# GitHub 커밋
git add .
git commit -m "feat: 퀀트엔진 완전체 + 자산관리 + 인생설계 + 앙상블 통합"
git push origin main
```

이후 Vercel 자동 배포 확인.
