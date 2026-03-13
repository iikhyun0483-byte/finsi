# 🧪 동적 설정 테스트 가이드

## 테스트 1: 자동 테스트 스크립트 실행

```bash
# 터미널에서 실행
cd E:\dev\finsi
node scripts/test-dynamic-config.js
```

**예상 결과**:
```
🧪 FINSI 동적 설정 테스트 시작...

1️⃣  Signal API 테스트...
   ✅ 신호 생성 성공: 22개
   📊 종목 목록:
      stock: SPY, QQQ, DIA, IWM
      commodity: GLD, SLV, USO, XLE
      bond: TLT, IEF, SHY, AGG
      reit: VNQ, IYR
      crypto: BTC, ETH, SOL, XRP, ADA, DOGE, DOT, AVAX

2️⃣  Analyze API 테스트 (AAPL)...
   ✅ 분석 성공
      종목: AAPL
      점수: 75
      Layer1: 80
      Layer2: 65
      Layer3: 72
      뉴스: 5개

3️⃣  Market API 테스트...
   ✅ 마켓 데이터 로드 성공
      주식/ETF: 14개
      암호화폐: 8개
      VIX: 24.23
      Fear & Greed: 18

✅ 모든 테스트 완료!
```

---

## 테스트 2: 브라우저에서 확인

### A. Signal 페이지 (http://localhost:3000/signal)

**확인 항목**:
- [ ] 22개 종목이 표시되는가?
- [ ] 주식 4개 (SPY, QQQ, DIA, IWM)
- [ ] 원자재 4개 (GLD, SLV, USO, XLE)
- [ ] 채권 4개 (TLT, IEF, SHY, AGG)
- [ ] 리츠 2개 (VNQ, IYR)
- [ ] 암호화폐 8개 (BTC, ETH, SOL, XRP, ADA, DOGE, DOT, AVAX)
- [ ] ScoreGauge가 각 종목에 표시되는가?
- [ ] 에러 없이 로드되는가?

### B. Analyze 페이지 (http://localhost:3000/analyze)

**테스트 방법**:
1. AAPL 입력
2. 분석 버튼 클릭

**확인 항목**:
- [ ] AI 코멘트 생성되는가?
- [ ] 뉴스 5개 표시되는가?
- [ ] ScoreGauge 표시되는가?
- [ ] KellyCard 표시되는가?

### C. Market 페이지 (http://localhost:3000/market)

**확인 항목**:
- [ ] 주식 14개 표시
- [ ] 암호화폐 8개 표시
- [ ] 매크로 지표 (VIX, Fear & Greed) 표시
- [ ] 시장 위험도 표시

---

## 테스트 3: 설정 변경 테스트

### A. 종목 비활성화 테스트

**Supabase SQL Editor에서 실행**:
```sql
-- DOGE 코인 비활성화
UPDATE symbol_config
SET enabled = false
WHERE symbol = 'DOGE';
```

**확인**:
1. 1분 대기 (캐시 만료)
2. Signal 페이지 새로고침
3. DOGE가 사라졌는가? ✅

**복구**:
```sql
UPDATE symbol_config
SET enabled = true
WHERE symbol = 'DOGE';
```

### B. 새 종목 추가 테스트

**Supabase SQL Editor에서 실행**:
```sql
-- 테슬라 추가
INSERT INTO symbol_config (symbol, name, asset_type, enabled, priority)
VALUES ('TSLA', '테슬라', 'stock', true, 85);
```

**확인**:
1. 1분 대기
2. Signal 페이지 새로고침
3. TSLA가 추가되었는가? ✅

**제거** (테스트 후):
```sql
DELETE FROM symbol_config WHERE symbol = 'TSLA';
```

### C. 캐시 시간 변경 테스트

**Supabase SQL Editor에서 실행**:
```sql
-- 암호화폐 캐시를 5분 → 10분으로 변경
UPDATE system_config
SET value = '10'
WHERE key = 'CACHE_CRYPTO_MINUTES';
```

**확인**:
1. 서버 재시작
2. 로그에서 확인:
   ```
   ⚙️ 시스템 설정 로드 중...
   CACHE_CRYPTO_MINUTES: 10  ← 변경됨
   ```

**복구**:
```sql
UPDATE system_config
SET value = '5'
WHERE key = 'CACHE_CRYPTO_MINUTES';
```

### D. API 딜레이 변경 테스트

```sql
-- API 호출 딜레이 100ms → 200ms
UPDATE system_config
SET value = '200'
WHERE key = 'API_CALL_DELAY_MS';
```

**확인**:
1. 서버 재시작
2. Signal API 호출 시간 측정
3. 더 느려졌는가? (14개 × 200ms = 2.8초 추가)

---

## 테스트 4: 서버 로그 확인

**정상 작동 시 로그**:
```
⚙️ 시스템 설정 로드 중...
✅ 활성 심볼: 22개
⚙️ API 재시도: 3회, 딜레이: 500ms

📊 Yahoo Finance API 호출 시작...
✅ SPY 데이터 수집 완료 (252일)
✅ QQQ 데이터 수집 완료 (252일)
...

🪙 Binance API 호출 시작 (동적 심볼)...
🪙 BTC 데이터 요청 중...
✅ BTC 데이터 수집 완료 (365일)
...

📊 최종 수집: 22개 자산 (주식/ETF: 14, 암호화폐: 8)
```

**오류 발생 시**:
```
❌ 심볼 설정 로드 실패: <오류 메시지>
→ Supabase 연결 확인 필요
```

---

## 트러블슈팅

### 문제 1: "symbol_config 테이블이 없습니다"

**원인**: Supabase에 스키마가 적용되지 않음

**해결**:
```sql
-- Supabase SQL Editor에서 실행
\i supabase-symbols-config.sql
```

### 문제 2: "활성 심볼: 0개"

**원인**: 데이터가 삽입되지 않았거나 모두 disabled

**확인**:
```sql
SELECT COUNT(*) FROM symbol_config WHERE enabled = true;
-- 결과: 22가 나와야 함
```

**해결**:
```sql
-- INSERT 문 다시 실행
INSERT INTO symbol_config (symbol, name, asset_type, enabled, priority)
VALUES
  ('SPY', 'S&P 500', 'stock', true, 100),
  ...
ON CONFLICT (symbol) DO UPDATE
SET enabled = true;
```

### 문제 3: "Supabase 연결 오류"

**확인**:
```bash
# .env.local 파일 확인
cat .env.local | grep SUPABASE
```

**필수 환경변수**:
```
NEXT_PUBLIC_SUPABASE_URL=https://zbdeaglcocnfnecnpswl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

### 문제 4: "변경사항이 반영 안 됨"

**원인**: 1분 캐시

**해결**:
1. 1분 대기 후 재시도
2. 또는 서버 재시작

---

## 성공 기준

✅ **모든 항목이 체크되어야 합니다**:

- [ ] Supabase 테이블 생성 완료 (symbol_config, system_config)
- [ ] 22개 심볼 데이터 삽입 완료
- [ ] 11개 시스템 설정 삽입 완료
- [ ] 서버 로그에 "활성 심볼: 22개" 표시
- [ ] Signal 페이지에 22개 종목 표시
- [ ] 종목 추가/삭제 테스트 성공
- [ ] 설정 변경 테스트 성공
- [ ] 에러 없이 정상 작동

---

## 다음 단계

테스트가 모두 성공하면 → **4단계: 실전 사용법** 으로 이동
