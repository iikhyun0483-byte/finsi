# FINSI (핀시) - 퀀트 투자 자동화 시스템

초보자를 위한 AI 기반 퀀트 투자 신호 시스템

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎯 주요 기능

### 📊 **0~100점 투자 신호**
- **3레이어 점수 시스템**
  - Layer 1 (30%): RSI, MACD, 볼린저밴드, 골든/데드크로스
  - Layer 2 (40%): 모멘텀, 가치, 퀄리티, 저변동성 팩터
  - Layer 3 (30%): 공포탐욕지수, 기준금리, VIX, 버핏지수

### ⚡ **백테스팅 (6대 전략)**
1. 장기보유 전략 (Buy & Hold)
2. 골든/데드크로스 (MA Crossover)
3. RSI 역추세 (RSI Reversal)
4. MACD 교차 (MACD Crossover)
5. 볼린저밴드 반등 (Bollinger Band Bounce)
6. 듀얼 모멘텀 (Dual Momentum)

### 💰 **커버 자산**
- 🇺🇸 미국 주식 ETF: SPY, QQQ, DIA, IWM
- 🥇 원자재: GLD (금), SLV (은), USO (원유), XLE (에너지)
- 📜 채권: TLT (장기), IEF (중기), SHY (단기)
- 🏠 리츠: VNQ, IYR
- ₿ 암호화폐: BTC, ETH, SOL, XRP (HIGH RISK)
- 🇰🇷 한국 주식: KODEX 200, 레버리지, 코스닥150

## 🚀 시작하기

### 1. 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Supabase 테이블 생성

1. Supabase 대시보드 → SQL Editor
2. `supabase-schema.sql` 파일 내용 복사
3. Run 실행

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 접속

## 📱 화면 구성

| 경로 | 설명 | 상태 |
|------|------|------|
| `/` | 대시보드 (실시간 매크로 지표) | ✅ 완료 |
| `/signal` | 오늘의 투자 신호 (0~100점) | ✅ 완료 |
| `/backtest` | 백테스팅 (6대 전략) | ✅ 완료 |
| `/market` | 시장 현황 (주식/암호화폐) | ✅ 완료 |
| `/analyze` | 종목 분석 | ✅ 완료 |
| `/portfolio` | 내 포트폴리오 | ✅ 완료 |
| `/watchlist` | 관심 종목 | ✅ 완료 |
| `/learn` | 투자 학습 | ✅ 완료 |
| `/auto-trade` | 자동매매 (UI만) | ✅ 완료 |

## 🛠️ 기술 스택

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **State**: Zustand
- **PWA**: next-pwa
- **Deployment**: Vercel (예정)

## 📊 외부 API (전부 무료)

- **Yahoo Finance**: 미국 주식/ETF/금/채권/원유 시세
- **CoinGecko**: 암호화폐 시세
- **Alternative.me**: 암호화폐 공포탐욕지수
- **FRED**: 미국 기준금리
- **ExchangeRate-API**: 실시간 환율 (USD/KRW)

## 🎨 디자인 원칙

### 절대원칙
1. **모든 영어 약자/외래어 옆에 한글 풀이 병기**
   - RSI → 상대강도지수
   - 볼린저밴드 → 가격 변동 범위 띠

2. **달러 금액 옆에 원화 자동 병기**
   - $100.00 (₩130,000)

3. **다크모드 기본**
   - 배경: #080810

4. **모바일 퍼스트**
   - 반응형 디자인

5. **암호화폐 신호 옆 HIGH RISK 배지 필수**

## 📈 점수 해석

| 점수 | 액션 | 의미 |
|------|------|------|
| 75~100 | 🟢 지금 사기 좋음 | 강력한 매수 신호 |
| 55~74 | 🟡 조금씩 사도 됨 | 분할 매수 권장 |
| 40~54 | 🟠 관망 | 지켜보기 |
| 0~39 | 🔴 사지 마세요 | 매수 피하기 |

## 🔧 초보자 도구

### components/beginner/
- **ScoreMeter**: 0~100점 시각화 미터
- **RSIGauge**: RSI 게이지 (과매도/과매수)
- **ActionCard**: 매수/매도 액션 카드
- **SplitBuyCalc**: 분할 매수 계산기
- **SellRules**: 매도 타이밍 체크리스트
- **PnLCalc**: 수익률 계산기
- **LearnCard**: 학습 카드

## 📦 프로젝트 구조

```
finsi/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 대시보드
│   ├── signal/            # 오늘의 신호
│   ├── backtest/          # 백테스팅
│   ├── market/            # 시장 현황
│   ├── analyze/           # 종목 분석
│   ├── portfolio/         # 포트폴리오
│   ├── watchlist/         # 관심 종목
│   ├── learn/             # 투자 학습
│   ├── auto-trade/        # 자동매매
│   └── api/               # API Routes
│       ├── signal/        # 신호 생성
│       ├── market/        # 시장 데이터
│       ├── backtest/      # 백테스트 실행
│       └── exchange/      # 환율
├── components/
│   ├── common/            # 공통 컴포넌트
│   ├── beginner/          # 초보자 컴포넌트
│   └── charts/            # 차트 컴포넌트
├── lib/
│   ├── supabase.ts        # DB 클라이언트
│   ├── yahoo.ts           # Yahoo Finance API
│   ├── crypto.ts          # CoinGecko API
│   ├── exchange.ts        # 환율 API
│   ├── indicators.ts      # 기술적 지표
│   ├── macro.ts           # 매크로 지표
│   ├── signals.ts         # 신호 엔진
│   └── utils.ts           # 유틸리티
└── public/
    ├── manifest.json      # PWA Manifest
    └── icons/             # PWA 아이콘
```

## 🚧 개발 중인 기능

- [ ] 실시간 자동매매 (API 연동)
- [ ] 포트폴리오 자동 동기화
- [ ] 알림 기능 (Push Notification)
- [ ] 커뮤니티 (투자 아이디어 공유)

## 📄 라이선스

MIT License

## 👨‍💻 개발자

Claude Code + Your Team

---

**⚠️ 투자 유의사항**

본 시스템은 투자 참고용 도구이며, 모든 투자 결정과 손실은 본인 책임입니다.
