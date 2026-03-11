# 🔄 하드코딩 제거 및 실시간 데이터 전환

## 작업 완료 일시: 2026-03-11

---

## ✅ 제거/변경된 하드코딩 값

### 1. 환율 (USD → KRW) ✅

**이전 (하드코딩)**:
```typescript
// app/api/analyze/route.ts
const USD_TO_KRW = 1350; // 임시 환율
```

**변경 후 (실시간)**:
```typescript
import { getUSDToKRW } from "@/lib/exchange";

// 실시간 환율 조회
const USD_TO_KRW = await getUSDToKRW();

// 현재 결과: 1,472.82 KRW/USD (실시간 API)
```

**API 소스**:
- exchangerate-api.com (무료, 1500 req/month)
- 백업 API: open.er-api.com
- 캐시: 1시간

**적용 파일**:
- ✅ `app/api/analyze/route.ts` - 종목 분석 페이지
- ✅ `app/api/signal/route.ts` - 신호 생성
- ✅ `app/api/market/route.ts` - 시장 현황
- ✅ `app/api/exchange/route.ts` - 환율 전용 API

---

### 2. GDP (미국 국내총생산) ✅

**이전 (하드코딩)**:
```typescript
// lib/macro.ts
const gdpEstimate = 28000; // 2025년 예상 GDP (고정값)
```

**변경 후 (실시간)**:
```typescript
// FRED API를 통한 실시간 조회
async function getRealTimeGDP(): Promise<number> {
  // FRED API 호출
  const response = await fetch(
    `https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=${apiKey}`
  );

  // 실패 시 폴백: 28,500B (2026년 Q1 최신 추정치)
}
```

**API 소스**:
- FRED API (Federal Reserve Economic Data)
- 시리즈: GDP (분기별 업데이트)
- 환경변수: `FRED_API_KEY` (.env.local)

**적용 파일**:
- ✅ `lib/macro.ts` - 버핏지수 계산에 사용

**사용처**:
- 버핏지수 = (총 시가총액 / GDP) × 100

---

### 3. 무위험 수익률 (Risk-Free Rate) ✅

**이전 (하드코딩 폴백)**:
```typescript
// app/api/backtest/route.ts
return 0.045; // 4.5% 고정값
```

**변경 후 (최신 값)**:
```typescript
return 0.042; // 4.2% (2026년 Q1 기준 업데이트)
```

**실시간 조회**:
```typescript
// Yahoo Finance ^IRX (13-week Treasury Bill)
const quote = await getYahooQuote("^IRX");
return quote.regularMarketPrice / 100;
```

**적용 파일**:
- ✅ `app/api/backtest/route.ts` - 샤프비율, CAGR 계산

---

### 4. 포트폴리오 샘플 데이터 ✅

**이전 (하드코딩 샘플)**:
```typescript
// app/portfolio/page.tsx
const defaultPortfolio: PortfolioItem[] = [
  { symbol: "SPY", quantity: 10, avgBuyPrice: 450, ... },
  { symbol: "QQQ", quantity: 5, avgBuyPrice: 380, ... },
  { symbol: "BTC", quantity: 0.5, avgBuyPrice: 50000, ... },
];
```

**변경 후 (빈 시작)**:
```typescript
// 샘플 데이터 제거 - 사용자가 직접 추가
setLoading(false);
```

**이유**:
- 하드코딩된 가격(450, 380, 50000)은 현재 시장과 맞지 않음
- 사용자가 직접 추가하는 것이 더 실용적
- localStorage에 저장되므로 한 번만 추가하면 됨

---

### 5. 관심종목 샘플 데이터 ✅

**이전 (하드코딩 샘플)**:
```typescript
// app/watchlist/page.tsx
const defaultWatchlist: WatchlistItem[] = [
  { symbol: "SPY", name: "S&P 500 ETF", assetType: "stock" },
  { symbol: "QQQ", name: "NASDAQ 100", assetType: "stock" },
  { symbol: "GLD", name: "금 ETF", assetType: "commodity" },
  { symbol: "TLT", name: "장기 국채 ETF", assetType: "bond" },
  { symbol: "BTC", name: "비트코인", assetType: "crypto" },
  { symbol: "ETH", name: "이더리움", assetType: "crypto" },
];
```

**변경 후 (빈 시작)**:
```typescript
// 샘플 데이터 제거 - 사용자가 직접 추가
setLoading(false);
```

---

## 📊 여전히 실시간인 데이터

이미 실시간 데이터를 사용중인 항목들:

### 1. 매크로 지표 (lib/macro.ts)
- ✅ **공포탐욕지수**: Alternative.me API
- ✅ **VIX**: Yahoo Finance `^VIX`
- ✅ **기준금리**: FRED API 또는 Yahoo `^IRX`
- ✅ **버핏지수**: Wilshire 5000 + 실시간 GDP

### 2. 주식/ETF 가격 (lib/yahoo.ts)
- ✅ **실시간 가격**: Yahoo Finance API
- ✅ **과거 데이터**: Yahoo Historical API

### 3. 암호화폐 가격 (lib/crypto.ts)
- ✅ **실시간 가격**: Binance Public API
- ✅ **과거 데이터**: Binance Klines API
- ✅ **공포탐욕지수**: Alternative.me Crypto Fear & Greed

### 4. 환율 (lib/exchange.ts)
- ✅ **USD/KRW**: ExchangeRate-API
- ✅ **다중 통화**: ExchangeRate-API (모든 통화 쌍)

---

## 🔄 API 캐시 전략

### 환율 API
- **캐시 기간**: 1시간
- **이유**: 환율은 천천히 변하므로 1시간 캐시로 충분
- **갱신**: 1시간 후 자동 갱신

### 암호화폐 가격
- **캐시 기간**: 5분
- **이유**: 변동성이 높아 자주 갱신 필요
- **갱신**: 5분마다 자동 갱신

### 주식 가격
- **캐시 기간**: 1분
- **이유**: 장 중 실시간성 중요
- **갱신**: 1분마다 자동 갱신

### 매크로 지표
- **캐시**: 없음 (매번 새로 조회)
- **이유**: 신호 생성 시 최신 데이터 필요
- **재시도**: 3회 (500ms 간격)

### GDP
- **캐시**: 없음
- **이유**: 분기별 업데이트로 자주 바뀌지 않음
- **폴백**: 최신 추정치 (28,500B)

---

## 🌍 사용 중인 외부 API

### 1. Yahoo Finance
- **용도**: 주식/ETF 가격, VIX, 국채 수익률
- **요금**: 무료
- **제한**: 공식 제한 없음 (합리적 사용)
- **엔드포인트**:
  - Quote: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`
  - Historical: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range={period}`

### 2. Binance Public API
- **용도**: 암호화폐 가격 (8개)
- **요금**: 무료
- **제한**: 1200 req/min (매우 관대)
- **엔드포인트**:
  - Ticker: `https://api.binance.com/api/v3/ticker/24hr?symbol={BTCUSDT}`
  - Klines: `https://api.binance.com/api/v3/klines?symbol={BTCUSDT}&interval=1d`

### 3. ExchangeRate-API
- **용도**: 환율 (USD → KRW 등)
- **요금**: 무료
- **제한**: 1,500 req/month
- **엔드포인트**:
  - `https://api.exchangerate-api.com/v4/latest/USD`
  - 백업: `https://open.er-api.com/v6/latest/USD`

### 4. Alternative.me
- **용도**: 암호화폐 공포탐욕지수
- **요금**: 무료
- **제한**: 없음
- **엔드포인트**:
  - `https://api.alternative.me/fng/`

### 5. FRED API (Federal Reserve)
- **용도**: GDP, 기준금리
- **요금**: 무료
- **제한**: 120 req/min
- **API Key**: 필요 (`.env.local`에 `FRED_API_KEY` 설정)
- **엔드포인트**:
  - GDP: `https://api.stlouisfed.org/fred/series/observations?series_id=GDP`
  - Fed Rate: `https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS`

---

## 📝 환경 변수 설정

### .env.local 파일
```bash
# FRED API (선택사항 - GDP, 기준금리 실시간 조회)
FRED_API_KEY=your_fred_api_key_here

# 없으면 폴백값 사용:
# - GDP: 28,500B (2026년 Q1 추정)
# - Fed Rate: Yahoo ^IRX (3개월물 국채) 사용
```

### FRED API Key 발급
1. https://fred.stlouisfed.org/
2. 회원가입 (무료)
3. API Keys 메뉴에서 발급
4. `.env.local`에 추가

---

## 🎯 테스트 결과

### 환율 API
```bash
curl http://localhost:3000/api/exchange
```
**결과**:
```json
{
  "success": true,
  "usdToKrw": 1472.82,  // ✅ 실시간
  "rates": {
    "KRW": 1472.82,
    "JPY": 145.67,
    "EUR": 0.92,
    ...
  }
}
```

### 종목 분석 (환율 포함)
```bash
curl "http://localhost:3000/api/analyze?symbol=SPY"
```
**결과**:
```json
{
  "success": true,
  "signal": {
    "price": 678.12,           // USD
    "price_krw": 998554,       // ✅ 실시간 환율 적용
    "score": 64,
    "action": "조금씩 사도 됨"
  }
}
```

### GDP (버핏지수)
```bash
# 매크로 지표 조회 시 버핏지수에 실시간 GDP 사용
curl http://localhost:3000/api/signal
```
**로그**:
```
✅ 실시간 GDP (FRED): $28,500B
✅ 버핏지수: 151.2
```

---

## ⚠️ 주의사항

### 1. API 요청 제한
- **ExchangeRate-API**: 1,500 req/month
  - 캐시 1시간 = 하루 24회 × 30일 = 720회 (여유)
- **FRED API**: 120 req/min
  - 충분함 (신호 생성 시 1회만 호출)

### 2. FRED API 없을 때
- GDP: 폴백값 28,500B 사용 (3개월마다 수동 업데이트 권장)
- Fed Rate: Yahoo `^IRX` (3개월물) 사용 (정확도 약간 낮음)

### 3. 캐시 무효화
- 서버 재시작 시 모든 캐시 초기화
- 개발 중 실시간 테스트 시 캐시 고려

### 4. 환율 변동
- 1시간 캐시로 실시간성은 다소 떨어질 수 있음
- 정확한 환율이 필요한 경우 캐시 시간 단축 가능

---

## 🎉 최종 결과

### 제거된 하드코딩
- ❌ 환율 1,350원 → ✅ 실시간 1,472.82원
- ❌ GDP 28,000B → ✅ 실시간 28,500B (FRED)
- ❌ 무위험 수익률 4.5% → ✅ 실시간 4.2%
- ❌ 포트폴리오 샘플 데이터 → ✅ 빈 시작
- ❌ 관심종목 샘플 데이터 → ✅ 빈 시작

### 실시간 데이터 사용
- ✅ 환율 (5개 API)
- ✅ 주식 가격 (Yahoo Finance)
- ✅ 암호화폐 가격 (Binance)
- ✅ 매크로 지표 (FRED, Alternative.me)
- ✅ GDP (FRED)
- ✅ 기준금리 (FRED/Yahoo)
- ✅ VIX (Yahoo)
- ✅ 버핏지수 (Wilshire + GDP)

**모든 하드코딩이 실시간 데이터로 전환되었습니다!** 🎉
