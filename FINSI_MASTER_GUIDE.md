# FINSI 100% 완성 — 클로드 코드 원스텝 실행 가이드
# 이 파일을 클로드 코드에 붙여넣으면 전체 실행

---

## 전제 조건 확인

```
✅ FINSI_SUPABASE_PHASE18-32.sql → Supabase 실행 완료
✅ FINSI_SUPABASE_PHASE33-38.sql → Supabase 실행 완료
✅ 기존 PHASE 1~17 코드 완성 (40개 페이지)
```

---

## 클로드 코드 실행 명령어 (순서대로)

### Step 1
```
PHASE18-20.md 파일을 읽고 모든 파일을 생성해줘.
lib/dart-client.ts
app/api/dart/route.ts
app/disclosure/page.tsx
lib/supply-demand.ts
app/api/supply/route.ts
app/supply/page.tsx
lib/sentiment.ts
app/api/sentiment/route.ts
app/sentiment/page.tsx
생성 완료 후 npm run build 실행하고 에러 있으면 수정해줘.
```

### Step 2
```
PHASE21-23.md 파일을 읽고 모든 파일을 생성해줘.
lib/kis-api.ts
app/api/trading/route.ts
app/trading/page.tsx
lib/approval-engine.ts
app/api/approvals/route.ts
app/approvals/page.tsx
lib/autopilot.ts
app/autopilot/page.tsx
app/api/autopilot/route.ts
생성 완료 후 npm run build 실행하고 에러 있으면 수정해줘.
```

### Step 3
```
PHASE24-32.md 파일을 읽고 모든 파일을 생성해줘.
lib/optimizer.ts
app/api/optimization/route.ts
app/optimization/page.tsx
lib/ml-signal.ts
app/api/ml-signal/route.ts
app/ml-signal/page.tsx
app/performance/page.tsx
app/api/performance/route.ts
lib/leverage-optimizer.ts
app/leverage/page.tsx
app/api/leverage/route.ts
lib/short-strategy.ts
app/short/page.tsx
lib/tax-optimizer.ts
app/tax/page.tsx
app/api/tax/route.ts
lib/compounding.ts
app/compounding/page.tsx
lib/multi-timeframe.ts
app/multi-tf/page.tsx
lib/correlation-portfolio.ts
app/correlation/page.tsx
생성 완료 후 npm run build 실행하고 에러 있으면 수정해줘.
```

### Step 4 (최종)
```
PHASE33-38.md 파일을 읽고 모든 파일을 생성해줘.
lib/position-manager.ts
app/api/positions/route.ts
app/positions/page.tsx
lib/kis-api.ts 수정 (토큰 Supabase 저장 버전으로 교체)
app/api/settings/route.ts
lib/macro-tracker.ts
app/api/macro/route.ts
app/macro/page.tsx
lib/earnings-tracker.ts
app/api/earnings/route.ts
app/earnings/page.tsx
components/UnlockGate.tsx
lib/attribution.ts
app/api/attribution/route.ts
app/attribution/page.tsx
lib/rebalancer.ts
app/api/rebalance/route.ts
app/rebalance/page.tsx
app/optimization/page.tsx 수정 (UnlockGate 적용)
app/ml-signal/page.tsx 수정 (UnlockGate 적용)
app/api/signal-tracking/route.ts 수정 (count 액션 추가)
app/settings/page.tsx 수정 (모의/실전 전환 추가)
생성 완료 후 npm run build 실행하고 에러 있으면 전부 수정해줘.
```

---

## .env.local 최종 완성본

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# AI
GEMINI_API_KEY=AIzaSyCtxg0IR4-h_Zlc9wwvK2zdDBVTVv2zsdE
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyCtxg0IR4-h_Zlc9wwvK2zdDBVTVv2zsdE

# 시장 데이터
FRED_API_KEY=5d9b4e5847177fb844d021fb59ed22b3
FMP_API_KEY=rmw2FTphWtGnkZHlanY9XfWihsJYLCEO
ALPHA_VANTAGE_API_KEY=PERKKL50YDGWS87F
FINNHUB_API_KEY=d6p5k3pr01qk3chj0itgd6p5k3pr01qk3chj0iu0

# DART (공시) — 발급 필요
DART_API_KEY=여기입력

# KIS API — 계좌 개설 후 발급
KIS_APP_KEY=여기입력
KIS_APP_SECRET=여기입력
KIS_ACCOUNT_NO=계좌번호
KIS_PAPER_MODE=true
NEXT_PUBLIC_KIS_READY=false
```

---

## 완성 후 전체 페이지 (62개)

```
기존 (40개)
/ /signal /analyze /backtest /market /portfolio /assets
/watchlist /journal /learn /plan /knowledge /auto-trade
/settings /status /lifecycle /finance /compare /cashflow
/factors /stat-arb /risk-control /trade-calc /my-patterns
/onboarding (+ 기타)

PHASE 18~32 (14개)
/disclosure   DART 공시 피드
/supply       수급 추적
/sentiment    감정 지표
/trading      실시간 트레이딩
/approvals    승인 대기
/autopilot    오토파일럿
/optimization 파라미터 최적화
/ml-signal    머신러닝 신호
/performance  성과 리포트
/leverage     레버리지 최적화
/short        숏 전략
/tax          세금 최적화
/compounding  복리 엔진
/correlation  상관관계 포트폴리오

PHASE 33~38 (8개)
/positions    포지션 실시간 관리
/macro        매크로 지표
/earnings     실적 발표 캘린더
/attribution  수익 귀속 분석
/rebalance    포트폴리오 리밸런싱
/multi-tf     멀티타임프레임
/short        숏 전략 (PHASE 28)
/compounding  복리 엔진 (PHASE 30)
```

---

## 100% 완성 기준

```
기술적 완성도
  ✅ TypeScript 에러 0개
  ✅ npm run build 성공
  ✅ 62개 페이지 전부 접속 가능

기능 완성도
  ✅ 정보 수집 (공시/수급/감정/매크로/실적)
  ✅ 신호 생성 (팩터/통계/ML/앙상블)
  ✅ 자동 실행 (수동/반자동/완전자동)
  ✅ 리스크 관리 (켈리/드로우다운/손절/매크로)
  ✅ 포트폴리오 (상관관계/리밸런싱/레버리지)
  ✅ 학습/진화 (파라미터 최적화/ML/귀속 분석)
  ✅ 세금/복리 최적화

안전 장치
  ✅ 모의투자 ↔ 실전 전환 스위치
  ✅ 비상 정지 버튼
  ✅ 리스크 게이트 3중 (드로우다운/포지션한도/일손실)
  ✅ 중복 주문 방지 (signal_id UNIQUE)
  ✅ KIS 토큰 영속화

데이터 잠금
  ✅ UnlockGate: 신호 100개+ → ML/최적화 활성화
  ✅ UnlockGate: 신호 30개+ → 반자동 실행 활성화
  ✅ UnlockGate: 신호 1000개+ → HIGH 신뢰도 ML
```
