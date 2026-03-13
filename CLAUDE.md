# FINSI 프로젝트 — Claude Code 마스터 규칙
# 이 파일을 E:\dev\finsi\CLAUDE.md 에 덮어쓸 것

---

## 프로젝트 기본 정보

- 프로젝트명: 핀시 (FINSI) — Finance + Signal
- 경로: E:\dev\finsi
- 스택: Next.js 15, TypeScript, Supabase, Tailwind CSS, Gemini AI
- 배포: Vercel
- 디자인: NEXUS 테마 (배경 #0a0e1a, 포인트 오렌지 #f97316)

---

## 절대 규칙 (위반 금지)

1. 신규 파일 우선 원칙
   - 기능 추가는 반드시 새 파일로 먼저 시도
   - 기존 파일 수정이 불가피한 경우에만 — 반드시 기존 코드 먼저 read 후 최소한으로 수정
   - 기존 파일 전체 재작성 절대 금지 — 필요한 블록만 str_replace

2. 빌드 에러 즉시 수정
   - 각 PHASE 완료 후 반드시 npm run build 실행
   - 에러 있으면 다음 PHASE 진행 금지

3. API 키 규칙
   - 클라이언트 컴포넌트: NEXT_PUBLIC_ 접두사 필수
   - 서버(API Route): NEXT_PUBLIC_ 없는 키 사용
   - 클라이언트에서 서버 전용 키 절대 사용 금지

4. 한글 표기 필수
   - 모든 지표, 버튼, 설명에 한글 표기
   - 영어 용어 옆에 반드시 한글 병기

5. 금액 표기
   - 모든 금액은 lib/format.ts의 formatKRW() 사용
   - ₩48377만 형식 절대 금지 → 4억 8,377만원

6. 무거운 계산은 서버에서만
   - 몬테카를로, MVO, GARCH 등 모든 퀀트 계산
   - 반드시 app/api/ 하위 Route에서 실행

7. 에러 처리 필수
   - 모든 API 호출에 try/catch
   - 사용자에게 한글 에러 메시지 표시

8. NEXUS 디자인 유지
   - 배경: #0a0e1a / 포인트: #f97316 / 보조: #3b82f6
   - 위험: #ef4444 / 안전: #22c55e / 경고: #eab308

---

## PHASE 실행 순서 (반드시 이 순서대로)

```
PHASE 1  백테스트 버그 수정 + lib/format.ts + lib/ensemble-engine.ts
PHASE 2  퀀트 엔진 (monte-carlo, risk-metrics, garch, regime, optimizer)
PHASE 3  자산관리 페이지 (holdings, assets_non_stock, liabilities)
PHASE 4  인생 라이프사이클 (lifecycle-model, lifecycle API, lifecycle 페이지)
PHASE 5  UI 통합 (TimeRangeInput, MonteCarloWidget, 한글화)
PHASE 6  워크포워드 + business-score + TIER2 플러그인 폴더
PHASE 7  재무계산기 (loan-calculator, buy-vs-rent, finance-calc API, finance 페이지)
PHASE 8  UX 완성 (input-validator, 툴팁, 온보딩, 저장, A vs B 비교)
```

각 PHASE 완료 후 npm run build 확인 필수.

---

## 파일 의존관계 (생성 순서)

```
lib/format.ts                    <- PHASE1, 가장 먼저
lib/time-utils.ts                <- PHASE2
lib/monte-carlo.ts               <- PHASE2, time-utils 의존
lib/risk-metrics.ts              <- PHASE2, 독립
lib/garch.ts                     <- PHASE2, 독립
lib/regime-detection.ts          <- PHASE2, 독립
lib/portfolio-optimizer.ts       <- PHASE2, risk-metrics 의존
lib/ensemble-engine.ts           <- PHASE1, score-engine 의존
lib/lifecycle-model.ts           <- PHASE4, monte-carlo 의존
lib/walk-forward.ts              <- PHASE6, 독립
lib/business-score.ts            <- PHASE6, 독립
lib/loan-calculator.ts           <- PHASE7, 독립
lib/buy-vs-rent.ts               <- PHASE7, loan-calculator 의존
lib/input-validator.ts           <- PHASE8, 독립
lib/premium/                     <- PHASE6, TIER2 빈 폴더

app/api/monte-carlo/route.ts     <- PHASE2
app/api/holdings/route.ts        <- PHASE3, Supabase 의존
app/api/assets/route.ts          <- PHASE3, Supabase 의존
app/api/lifecycle/route.ts       <- PHASE4, lifecycle-model + monte-carlo 의존
app/api/finance-calc/route.ts    <- PHASE7, loan-calculator + buy-vs-rent + business-score 의존
app/api/scenarios/route.ts       <- PHASE8, Supabase 의존

components/TimeRangeInput.tsx    <- PHASE5
components/MonteCarloWidget.tsx  <- PHASE5
components/TermGlossary.ts       <- PHASE8, 독립
components/Tooltip.tsx           <- PHASE8, TermGlossary 의존
components/OnboardingGuide.tsx   <- PHASE8, 독립
components/ScenarioSave.tsx      <- PHASE8, scenarios API 의존

app/assets/page.tsx              <- PHASE3
app/lifecycle/page.tsx           <- PHASE4
app/finance/page.tsx             <- PHASE7
app/compare/page.tsx             <- PHASE8
```

---

## DB 테이블 목록 (Supabase)

```
profiles               사용자 프로필
holdings               보유 주식/ETF/코인
assets_non_stock       비주식 자산 (부동산/차량/귀금속 등)
liabilities            부채
cashflow               현금흐름
trade_journal          매매일지
backtest_results       백테스트 결과 저장
montecarlo_results     몬테카를로 결과 저장
watchlist              워치리스트
notifications          알림 설정
lifecycle_scenarios    인생 시나리오 저장
saved_scenarios        PHASE8 A/B 시나리오 저장 (전 계산기 공용)
```

---

## .env.local 키 목록

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_GEMINI_API_KEY=
FMP_API_KEY=
FRED_API_KEY=
ALPHA_VANTAGE_API_KEY=
FINNHUB_API_KEY=
```

---

## TIER 구조

```
TIER 1 (현재 구현)
  퀀트: GBM 몬테카를로, GARCH, Kelly, VaR/CVaR, 샤프/소르티노/칼마
        MVO, 리스크패리티, 레짐감지, 앙상블, 워크포워드
  자산: 주식/ETF/코인, 비주식(부동산/차량/귀금속), 부채, 현금흐름
  재무: 대출계산, 대출적정성(DTI/DSR/LTV), 집매수vs전세, 사업생존계산
  예측: 노후자금, 인생 라이프사이클, 런웨이

TIER 2 (서버비용 확보 후 - 현재 빈 폴더만)
  lib/premium/lstm-predictor.ts
  lib/premium/reinforcement-rl.ts
  lib/premium/transformer-model.ts
  lib/premium/quantum-monte-carlo.ts

TIER 3 (모바일 앱 - 나중에)
  apps/mobile/ Expo React Native
```

---

## 완료 기준

각 PHASE 완료 조건:
- [ ] npm run build 에러 없음
- [ ] 해당 페이지 브라우저에서 정상 렌더링
- [ ] 한글 표기 적용됨
- [ ] 콘솔 에러 없음
