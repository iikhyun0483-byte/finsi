# 📂 FINSI 코드 네비게이션 가이드

## 🌐 GitHub 저장소
**https://github.com/iikhyun0483-byte/finsi**

## 📁 프로젝트 구조

```
finsi/
├── app/                      # Next.js App Router 페이지
│   ├── page.tsx             # 메인 대시보드
│   ├── api/                 # API 라우트 (38개)
│   │   ├── signal/          # 매매 신호 생성
│   │   ├── backtest/        # 백테스팅
│   │   ├── factors/         # 팩터 스크리닝
│   │   ├── macro/           # 매크로 지표
│   │   ├── earnings/        # 실적 발표
│   │   ├── positions/       # 포지션 관리
│   │   ├── rebalance/       # 리밸런싱
│   │   └── ...
│   ├── signal/              # 신호 생성 페이지
│   ├── backtest/            # 백테스팅 페이지
│   ├── factors/             # 팩터 스크리너
│   ├── macro/               # 매크로 대시보드
│   ├── earnings/            # 실적 캘린더
│   ├── attribution/         # 수익 귀속
│   ├── rebalance/           # 리밸런싱
│   ├── cashflow/            # 재무 생존 분석
│   ├── lifecycle/           # 인생 재무 설계
│   └── ...                  # 총 37개 페이지
│
├── lib/                      # 비즈니스 로직 (66개 모듈)
│   ├── factor-model.ts      # 5-팩터 모델
│   ├── position-manager.ts  # 포지션 관리
│   ├── macro-tracker.ts     # 매크로 추적
│   ├── earnings-tracker.ts  # 실적 추적
│   ├── attribution.ts       # 수익 귀속
│   ├── rebalancer.ts        # 리밸런싱
│   ├── kis-api.ts           # 한국투자증권 API
│   ├── cashflow-engine.ts   # 재무 시뮬레이션
│   └── ...
│
├── components/              # React 컴포넌트
│   ├── UnlockGate.tsx      # 기능 잠금 컴포넌트
│   └── effects/            # 시각 효과
│
└── public/                  # 정적 파일
```

## 🗺️ 핵심 기능별 파일 매핑

### 1️⃣ 팩터 스크리닝
- 📄 `app/factors/page.tsx` - UI
- 📄 `app/api/factor-score/route.ts` - API
- 📄 `lib/factor-model.ts` - 로직 (5-팩터 계산)

### 2️⃣ 매크로 리스크 분석
- 📄 `app/macro/page.tsx` - UI
- 📄 `app/api/macro/route.ts` - API
- 📄 `lib/macro-tracker.ts` - FRED/Yahoo Finance 연동

### 3️⃣ 실적 발표 (PEAD)
- 📄 `app/earnings/page.tsx` - UI
- 📄 `app/api/earnings/route.ts` - API
- 📄 `lib/earnings-tracker.ts` - Finnhub 연동

### 4️⃣ 포지션 관리
- 📄 `app/positions/page.tsx` - UI
- 📄 `app/api/positions/route.ts` - API
- 📄 `lib/position-manager.ts` - KIS API 연동, 손절/익절

### 5️⃣ 수익 귀속 분석
- 📄 `app/attribution/page.tsx` - UI
- 📄 `app/api/attribution/route.ts` - API
- 📄 `lib/attribution.ts` - 전략별 성과 계산

### 6️⃣ 리밸런싱
- 📄 `app/rebalance/page.tsx` - UI
- 📄 `app/api/rebalance/route.ts` - API
- 📄 `lib/rebalancer.ts` - 드리프트 계산

### 7️⃣ 재무 생존 분석
- 📄 `app/cashflow/page.tsx` - UI
- 📄 `app/api/cashflow/route.ts` - API
- 📄 `lib/cashflow-engine.ts` - 시뮬레이션 엔진
- 📄 `lib/cashflow-storage.ts` - Supabase 저장

### 8️⃣ 인생 재무 설계
- 📄 `app/lifecycle/page.tsx` - UI
- 📄 `app/api/lifecycle/route.ts` - API
- 📄 `lib/lifecycle-model.ts` - 은퇴 시뮬레이션

## 📊 데이터베이스 스키마
- 📄 `FINSI_SUPABASE_PHASE18-32.sql` - 초기 스키마
- 📄 `FINSI_SUPABASE_PHASE33-38.sql` - PHASE 33-38 스키마

## 📚 문서
- 📄 `FINSI_MASTER_GUIDE.md` - 마스터 가이드
- 📄 `PHASE33-38.md` - PHASE 33-38 스펙
- 📄 `PHASE34-38_PAGES.md` - UI 페이지 스펙

## 🔧 설정 파일
- 📄 `package.json` - 의존성
- 📄 `tsconfig.json` - TypeScript 설정
- 📄 `tailwind.config.ts` - Tailwind 설정
- 📄 `.env.local` - 환경 변수 (git 무시)

## 🎨 디자인 시스템
- 색상: 네이비(#0a0e1a) + 오렌지(#FF6B2B)
- 타이포그래피: Orbitron (헤더), 기본 sans-serif

## 🚀 로컬에서 실행
\`\`\`bash
cd E:/dev/finsi
npm install
npm run dev
# http://localhost:3000
\`\`\`

## 📖 주요 라이브러리 모듈

| 파일 | 설명 | 핵심 함수 |
|------|------|----------|
| factor-model.ts | 5-팩터 모델 | screenUniverse, calcMomentumFactor |
| position-manager.ts | 포지션 관리 | syncPositionsFromKIS, checkStopLossAndTarget |
| macro-tracker.ts | 매크로 추적 | syncMacroIndicators, getMacroRiskScore |
| earnings-tracker.ts | 실적 추적 | syncEarnings, calcEarningsSignal |
| attribution.ts | 수익 귀속 | recordAttribution, getAttributionSummary |
| rebalancer.ts | 리밸런싱 | calcDrift, calcRebalanceTrades |
| kis-api.ts | KIS API | getAccessToken, getBalance, placeOrder |
| cashflow-engine.ts | 재무 엔진 | runCashflowAnalysis |
| lifecycle-model.ts | 인생 설계 | runLifecycle |
| monte-carlo.ts | 몬테카를로 | runMonteCarlo |

