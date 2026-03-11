# FINSI Enhanced System 통합 가이드

## ✅ 통합 완료 (2026-03-12)

**Enhanced 시스템이 프로덕션에 연결되었습니다!**

```bash
✓ /api/signal → generateSignalsEnhanced() 사용
✓ /analyze → 펀더멘털 + 뉴스 + 리스크 관리 UI 추가
✓ /backtest → 세금/수수료/슬리피지 옵션 추가
✓ /market → 섹터 히트맵 추가
✓ npm run build → 성공
```

---

## 🎯 7가지 Enhanced 기능

### 1. 펀더멘털 데이터 통합
**파일**: `lib/fundamentals.ts`
**API**: Financial Modeling Prep (FMP)
**데이터**: PER, PBR, ROE, 부채비율, 매출성장률, 마진율
**점수**: Layer2에 최대 40점 반영

```typescript
// 환경변수 설정
FMP_API_KEY=your_api_key_here
```

**Fallback**: API 키 없으면 모든 값 `null` 반환, 나머지 시스템 정상 작동

---

### 2. 뉴스 감성 분석
**파일**: `lib/news-sentiment.ts`
**API**: NewsAPI + Gemini AI
**기능**: 최근 5개 뉴스의 감성 분석 (긍정/중립/부정)
**점수**: Layer3에 -10 ~ +10 점수 반영

```typescript
// 환경변수 설정
NEWS_API_KEY=your_newsapi_key
GEMINI_API_KEY=your_gemini_key
```

**Fallback**: API 키 없으면 중립(0점) 반환, 뉴스 목록 빈 배열

---

### 3. 암호화폐 신호 개선
**파일**: `lib/crypto-signals.ts`
**API**: Binance
**기능**: 거래량 급증 감지 (평균 대비 200%+ 스파이크)
**점수**: 거래량 스파이크 시 최대 20점 부스트

**조건**:
- 거래량 ≥ 2배 평균: +20점
- 거래량 ≥ 1.5배 평균: +15점
- 거래량 ≥ 1.3배 평균: +10점

**목표**: 승률 50% → 60%+

---

### 4. 리스크 관리 시스템
**파일**: `lib/risk-management.ts`
**기능**: Kelly Criterion 포지션 사이징 + ATR 기반 손절/익절
**출력**:
- 권장 포지션 비율 (3~15%)
- 손절가 (-X%)
- 익절가 (+Y%)
- 예상 승률

**Kelly 공식**:
```
Kelly% = W - [(1-W) / R]
보수적 조정: Kelly% × 50%
```

---

### 5. 현실적 백테스팅
**파일**: `app/api/backtest/route.ts`, `app/backtest/page.tsx`
**추가된 비용**:
- 수수료: 0.1% (조정 가능)
- 슬리피지: 0.05% (조정 가능)
- 양도소득세: 22% (옵션)

**UI 위치**: `/backtest` → "현실적 백테스팅 옵션" 섹션

**출력**:
- 총 수수료
- 총 세금
- 순수익 (비용 제외)

---

### 6. 선행 지표
**파일**: `lib/leading-indicators.ts`
**데이터 소스**: Yahoo Finance, CBOE (VIX 기반 추정)

#### 6.1 공매도 비율 (Short Ratio)
- Short % > 20%: 숏스퀴즈 가능성 (+10점)
- Short % < 5%: 하락 신호 (-10점)

#### 6.2 섹터 ETF 자금 흐름
**추적 섹터** (10개):
- XLK (Technology)
- XLF (Financials)
- XLE (Energy)
- XLV (Healthcare)
- XLI (Industrials)
- XLY (Consumer Discretionary)
- XLP (Consumer Staples)
- XLB (Materials)
- XLU (Utilities)
- XLRE (Real Estate)

**UI 위치**: `/market` → "섹터별 자금 흐름 히트맵"

#### 6.3 Put/Call Ratio
- VIX 기반 추정 (실제 CBOE API는 유료)
- 비율 > 1.5: 극단적 공포 (-10점)
- 비율 < 0.7: 극단적 탐욕 (+10점)

---

### 7. 상관관계 자동 조정
**파일**: `lib/signals-enhanced.ts`
**적용 규칙**:

| 조건 | 영향 | 점수 변화 |
|------|------|----------|
| DXY(달러) 강세 (UUP > 28) | 원자재 약세 | -10점 |
| VIX > 30 | 전체 보수적 조정 | -20% |
| 기준금리 > 5% | 채권/리츠 약세 | -15점 |
| 버핏지수 > 180 | 주식 전체 약세 | -10점 |

**조정 표시**: `/analyze` 페이지에서 `correlationAdjustment` 필드 확인

---

## 🔧 환경변수 설정

### 필수 (기존)
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
FRED_API_KEY=your_fred_api_key  # 무료
```

### 선택 (Enhanced 기능)
```bash
# 펀더멘털 분석 활성화 (Optional)
FMP_API_KEY=your_fmp_api_key
# 가입: https://financialmodelingprep.com/developer/docs/
# 무료 플랜: 250 요청/일

# 뉴스 감성 분석 활성화 (Optional)
NEWS_API_KEY=your_newsapi_key
# 가입: https://newsapi.org/
# 무료 플랜: 100 요청/일

GEMINI_API_KEY=your_gemini_key
# 가입: https://ai.google.dev/
# 무료: 60 요청/분
```

### Graceful Fallback
**API 키가 없어도 시스템은 정상 작동합니다!**

| 기능 | API 키 없을 때 동작 |
|------|---------------------|
| 펀더멘털 | 모든 값 `null`, 점수 0점 |
| 뉴스 감성 | 빈 배열, 중립(0점) |
| 암호화폐 볼륨 | Binance API (무료, 키 불필요) |
| 리스크 관리 | 신호 점수 기반 추정 |
| 선행 지표 | Yahoo Finance (무료, 키 불필요) |
| 상관관계 | 매크로 데이터만 사용 |

---

## 📊 UI에서 확인하는 방법

### 1. `/signal` - 신호 목록
- Enhanced 시스템으로 생성된 신호 확인
- 원래 점수 vs 조정 후 점수 비교
- 펀더멘털/뉴스 데이터 포함 여부 표시

### 2. `/analyze` - 종목 상세 분석
```
📊 종목 분석
├── 기본 정보 (점수, RSI, 레이어)
├── 💰 현재 가격 정보
├── 📊 펀더멘털 분석 (NEW) ⭐
│   ├── PER, PBR, ROE, 부채비율
│   └── 펀더멘털 점수 / 40점
├── 📰 뉴스 감성 분석 (NEW) ⭐
│   ├── 긍정/중립/부정 카운트
│   ├── 전체 감성 점수 (-10 ~ +10)
│   └── 최근 5개 뉴스 목록
├── ⚖️ 리스크 관리 가이드 (NEW) ⭐
│   ├── 권장 포지션 (%)
│   ├── 손절가 (-X%)
│   ├── 익절가 (+Y%)
│   └── 예상 승률 (%)
└── 💡 AI 투자 조언
    └── 분석 완료 항목 (Enhanced 표시)
```

### 3. `/backtest` - 전략 백테스트
```
⚙️ 현실적 백테스팅 옵션 (NEW)
├── ☑️ 양도소득세 22% 적용
├── 수수료율: 0.1% (조정 가능)
└── 슬리피지: 0.05% (조정 가능)

💰 거래 비용 분석 (결과)
├── 총 수수료: -₩X만
├── 총 세금: -₩Y만
└── 순수익 (비용 제외): ±₩Z만
```

### 4. `/market` - 시장 현황
```
🔥 섹터별 자금 흐름 (Sector Heatmap) (NEW)
└── 10개 섹터의 1개월 모멘텀 히트맵
    ├── 초록색: 자금 유입 (+5% 이상)
    └── 빨간색: 자금 유출 (-5% 이하)
```

---

## 🧪 테스트 방법

### 1. 로컬 서버 실행
```bash
npm run dev
```

### 2. 기능별 테스트

#### 펀더멘털 (주식만)
```
1. /analyze 접속
2. 검색: SPY, QQQ, AAPL 등
3. "📊 펀더멘털 분석" 카드 확인
   - API 키 있음: PER/PBR/ROE 값 표시
   - API 키 없음: 카드 숨김 (정상)
```

#### 뉴스 감성
```
1. /analyze 접속
2. 검색: SPY, BTC 등
3. "📰 뉴스 감성 분석" 카드 확인
   - API 키 있음: 뉴스 5개 + 감성 점수
   - API 키 없음: 카드 숨김 (정상)
```

#### 암호화폐 볼륨 (API 키 불필요)
```
1. /analyze 접속
2. 검색: BTC, ETH
3. "분석 완료 항목" 섹션에서
   "🆕 암호화폐 거래량 급증 감지 (X배)" 확인
```

#### 리스크 관리 (항상 표시)
```
1. /analyze 접속
2. 아무 종목 검색
3. "⚖️ 리스크 관리 가이드" 카드 확인
   - 권장 포지션, 손절가, 익절가, 승률
```

#### 백테스팅 비용
```
1. /backtest 접속
2. "현실적 백테스팅 옵션" 활성화
   - ☑️ 양도소득세 22% 체크
   - 수수료/슬리피지 조정
3. 백테스트 실행
4. "💰 거래 비용 분석" 카드 확인
```

#### 섹터 히트맵
```
1. /market 접속
2. "🔥 섹터별 자금 흐름" 확인
   - 10개 섹터의 색상별 모멘텀
```

---

## 📈 성능 목표 vs 실제

| 기능 | 목표 | 현재 상태 |
|------|------|----------|
| **신호 정확도** | 60점 → 80점 | 구현 완료, 실전 검증 필요 |
| **암호화폐 승률** | 50% → 60%+ | 볼륨 스파이크 감지 완료 |
| **백테스트 현실성** | 수수료+세금 반영 | ✅ 완료 (0.1% + 22%) |
| **펀더멘털 분석** | PER/PBR/ROE | ✅ FMP API 연동 |
| **뉴스 감성** | Gemini AI 분석 | ✅ NewsAPI + Gemini |
| **리스크 관리** | Kelly Criterion | ✅ ATR 기반 |
| **선행 지표** | 섹터/Short/PC Ratio | ✅ 10개 섹터 추적 |

---

## 🚨 주의사항

### 1. API Rate Limits
- **FMP**: 250 요청/일 (무료)
- **NewsAPI**: 100 요청/일 (무료)
- **Gemini**: 60 요청/분 (무료)
- **Yahoo Finance**: Rate limit 관대하나 100ms 딜레이 권장
- **Binance**: Rate limit 관대 (병렬 요청 가능)

### 2. 캐싱 전략
- **펀더멘털**: 24시간 캐시
- **뉴스 감성**: 1시간 캐시
- **섹터 플로우**: 24시간 캐시
- **암호화폐 볼륨**: 1시간 캐시

### 3. 비용 고려사항
- 무료 플랜으로도 충분히 사용 가능
- 프로덕션 배포 시 유료 플랜 고려
  - FMP Pro: $29/월 (1,000 요청/일)
  - NewsAPI Business: $449/월 (무제한)

---

## 🔄 기존 시스템과의 호환성

### 자동 전환
- `/api/signal` → 자동으로 `generateSignalsEnhanced()` 사용
- 기존 `/signal`, `/portfolio`, `/watchlist` 페이지 정상 작동
- Supabase 스키마 변경 없음 (기존 필드만 저장)

### 추가 데이터 확인
- API 응답에 `fundamentals`, `news`, `riskProfile` 등 추가 필드 포함
- `/analyze` 페이지에서만 확장 데이터 표시
- 다른 페이지는 기존 필드만 사용

---

## 📝 다음 단계 (선택)

### 단기 (1주일)
- [ ] API 키 발급 및 설정 (.env.local)
- [ ] 실제 데이터로 신호 정확도 테스트
- [ ] 백테스트 결과 비교 (기존 vs Enhanced)

### 중기 (1개월)
- [ ] Supabase 스키마 확장 (fundamentals, news JSON 컬럼)
- [ ] 신호 히스토리 추적 (승률 자동 계산)
- [ ] 리스크 프로필 기반 포지션 자동 제안

### 장기 (3개월)
- [ ] 머신러닝 모델로 승률 예측 개선
- [ ] 실시간 알림 (텔레그램/이메일)
- [ ] 자동매매 연동 (KIS/Kiwoom API)

---

## 🆘 트러블슈팅

### Q: 펀더멘털 데이터가 안 보여요
**A**:
1. FMP_API_KEY 설정 확인
2. 주식 종목만 지원 (암호화폐 제외)
3. 콘솔 확인: `⚠️ FMP_API_KEY 미설정` 경고

### Q: 뉴스가 안 나와요
**A**:
1. NEWS_API_KEY + GEMINI_API_KEY 둘 다 필요
2. Rate limit 초과 확인 (100 요청/일)
3. 심볼 형식 확인 (SPY, BTC 등 영문 대문자)

### Q: 섹터 히트맵이 안 떠요
**A**:
1. `/market` 페이지 새로고침
2. Yahoo Finance API 연결 확인
3. 콘솔 오류 확인

### Q: 백테스트 비용 섹션이 안 보여요
**A**:
1. "현실적 백테스팅 옵션" 체크박스 활성화 필요
2. 백테스트 실행 후 결과에만 표시

---

## 📚 참고 문서

- [FMP API Docs](https://financialmodelingprep.com/developer/docs/)
- [NewsAPI Docs](https://newsapi.org/docs)
- [Gemini AI Docs](https://ai.google.dev/docs)
- [Kelly Criterion](https://en.wikipedia.org/wiki/Kelly_criterion)
- [ATR Indicator](https://www.investopedia.com/terms/a/atr.asp)

---

**✅ 통합 완료 일시**: 2026-03-12
**🔧 빌드 상태**: Success
**📦 배포 준비**: Ready
