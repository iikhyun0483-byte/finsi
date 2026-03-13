# 🚀 실전 사용법 가이드

## 시나리오 1: 새로운 주식 ETF 추가하기

### 예시: ARKK (ARK Innovation ETF) 추가

#### 1단계: Supabase에서 추가
```sql
INSERT INTO symbol_config (symbol, name, asset_type, enabled, priority)
VALUES ('ARKK', 'ARK Innovation', 'stock', true, 75);
```

#### 2단계: 확인
```sql
SELECT * FROM symbol_config WHERE symbol = 'ARKK';
```

#### 3단계: 1분 대기 또는 서버 재시작

#### 4단계: Signal 페이지에서 확인
- http://localhost:3000/signal
- ARKK가 목록에 표시됨 ✅

---

## 시나리오 2: 암호화폐 추가하기

### 예시: MATIC (Polygon) 추가

#### 주의사항
⚠️ **Binance에서 거래 가능한 심볼만 추가 가능**

확인 방법:
```
https://www.binance.com/en/trade/MATIC_USDT
→ 존재하면 추가 가능
```

#### 1단계: 추가
```sql
INSERT INTO symbol_config (symbol, name, asset_type, enabled, priority)
VALUES ('MATIC', 'Polygon', 'crypto', true, 35);
```

#### 2단계: crypto.ts 확인
파일: `E:\dev\finsi\lib\crypto.ts`

**MAJOR_CRYPTOS에 추가** (폴백용):
```typescript
export const MAJOR_CRYPTOS = {
  // 기존 항목...
  MATIC: { symbol: "MATIC", name: "Polygon", binance: "MATICUSDT" },
};
```

#### 3단계: 서버 재시작

---

## 시나리오 3: 성능 최적화 - 캐시 시간 조정

### 상황: API 호출이 너무 느림

#### 해결: 캐시 시간 늘리기
```sql
-- 암호화폐 캐시: 5분 → 15분
UPDATE system_config
SET value = '15'
WHERE key = 'CACHE_CRYPTO_MINUTES';

-- 환율 캐시: 60분 → 120분
UPDATE system_config
SET value = '120'
WHERE key = 'CACHE_EXCHANGE_MINUTES';

-- 뉴스 캐시: 60분 → 180분 (3시간)
UPDATE system_config
SET value = '180'
WHERE key = 'CACHE_NEWS_MINUTES';
```

**효과**:
- API 호출 횟수 감소 → 속도 향상
- Rate Limit 회피

---

## 시나리오 4: Rate Limit 대응

### 상황: Yahoo Finance API가 자주 차단됨

#### 해결 1: API 딜레이 늘리기
```sql
-- 100ms → 300ms (3배 느리지만 안정적)
UPDATE system_config
SET value = '300'
WHERE key = 'API_CALL_DELAY_MS';
```

#### 해결 2: 재시도 횟수 늘리기
```sql
-- 3회 → 5회
UPDATE system_config
SET value = '5'
WHERE key = 'API_RETRY_COUNT';

-- 재시도 딜레이도 늘리기
UPDATE system_config
SET value = '1000'  -- 500ms → 1000ms
WHERE key = 'API_RETRY_DELAY_MS';
```

---

## 시나리오 5: 특정 자산군만 모니터링

### 예시: 암호화폐만 집중 모니터링

#### 방법 A: 다른 자산 비활성화
```sql
-- 주식/채권/원자재 전부 비활성화
UPDATE symbol_config
SET enabled = false
WHERE asset_type IN ('stock', 'bond', 'commodity', 'reit');

-- 암호화폐만 활성화 유지
UPDATE symbol_config
SET enabled = true
WHERE asset_type = 'crypto';
```

#### 방법 B: 우선순위 조정
```sql
-- 암호화폐 우선순위 최상위로
UPDATE symbol_config
SET priority = priority + 100
WHERE asset_type = 'crypto';
```

**결과**:
- Signal 페이지에 암호화폐 8개만 표시
- API 호출 시간 단축 (8개만 조회)

---

## 시나리오 6: 기본값 변경

### 상황: VIX 기본값이 현실과 안 맞음

#### 현재 평균 VIX 확인
```sql
-- macro_indicators 테이블에서 최근 VIX 확인
SELECT AVG(value) as avg_vix
FROM macro_indicators
WHERE indicator_type = 'vix'
  AND created_at > NOW() - INTERVAL '7 days';
```

#### 기본값 업데이트
```sql
-- 15 → 실제 평균값으로 변경 (예: 20)
UPDATE system_config
SET value = '20'
WHERE key = 'DEFAULT_VIX';
```

---

## 시나리오 7: 최대 신호 개수 조정

### 상황: 22개가 너무 많음, 10개만 보고 싶음

```sql
UPDATE system_config
SET value = '10'
WHERE key = 'MAX_SIGNALS_COUNT';
```

**주의**:
- 암호화폐 8개는 고정
- 나머지 자산에서 2개만 선택됨 (우선순위 높은 것부터)

---

## 시나리오 8: 백업 및 복구

### 설정 백업
```sql
-- symbol_config 백업
COPY symbol_config TO '/tmp/symbol_config_backup.csv' WITH CSV HEADER;

-- system_config 백업
COPY system_config TO '/tmp/system_config_backup.csv' WITH CSV HEADER;
```

### 복구
```sql
-- 기존 데이터 삭제
DELETE FROM symbol_config;
DELETE FROM system_config;

-- 백업에서 복구
COPY symbol_config FROM '/tmp/symbol_config_backup.csv' WITH CSV HEADER;
COPY system_config FROM '/tmp/system_config_backup.csv' WITH CSV HEADER;
```

---

## 시나리오 9: 사용자별 맞춤 종목 (향후 기능)

### 설계
```sql
-- 사용자별 심볼 설정 테이블 (추가 구현 필요)
CREATE TABLE user_symbol_preferences (
  user_id UUID REFERENCES auth.users(id),
  symbol_id UUID REFERENCES symbol_config(id),
  enabled BOOLEAN DEFAULT true,
  priority_override INTEGER,
  PRIMARY KEY (user_id, symbol_id)
);
```

**활용**:
- 사용자 A: 암호화폐만
- 사용자 B: 주식만
- 사용자 C: 전체

---

## 시나리오 10: 모니터링 및 분석

### 가장 많이 조회되는 종목
```sql
-- signals 테이블 활용
SELECT
  symbol,
  COUNT(*) as signal_count,
  AVG(score) as avg_score
FROM signals
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY symbol
ORDER BY signal_count DESC
LIMIT 10;
```

### 성능 분석
```sql
-- 느린 심볼 찾기 (데이터 수집 실패가 많은 것)
SELECT
  symbol,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN score IS NULL THEN 1 ELSE 0 END) as failed_attempts
FROM signals
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY symbol
HAVING SUM(CASE WHEN score IS NULL THEN 1 ELSE 0 END) > 0
ORDER BY failed_attempts DESC;
```

---

## 💡 팁 & 트릭

### 1. 빠른 종목 전환
```sql
-- 시장 시간대별 종목 자동 전환
-- 아침: 미국 주식
-- 저녁: 암호화폐
UPDATE symbol_config
SET enabled = CASE
  WHEN asset_type = 'crypto' THEN true
  ELSE false
END;
```

### 2. 시즌별 조정
```sql
-- 금 시즌 (경제 불안정기)
UPDATE symbol_config
SET priority = 150
WHERE symbol = 'GLD';
```

### 3. 설정 템플릿
```sql
-- 보수적 포트폴리오
UPDATE symbol_config
SET enabled = CASE
  WHEN asset_type IN ('bond', 'commodity') THEN true
  ELSE false
END;

-- 공격적 포트폴리오
UPDATE symbol_config
SET enabled = CASE
  WHEN asset_type IN ('crypto', 'stock') THEN true
  ELSE false
END;
```

---

## 🔔 주의사항

1. **항상 테스트 먼저**
   - 프로덕션 전에 로컬에서 테스트

2. **백업 습관화**
   - 중요한 변경 전 백업

3. **1분 캐시 고려**
   - 변경 후 1분 대기 또는 재시작

4. **심볼 검증**
   - 존재하지 않는 심볼 추가 시 에러 발생

5. **API 제한 인지**
   - Yahoo Finance, Alpha Vantage 등 Rate Limit 존재

---

## 📞 문제 발생 시

1. **로그 확인**
   ```bash
   # 서버 로그에서 에러 찾기
   tail -f <server-log>
   ```

2. **Supabase 로그 확인**
   - Supabase Dashboard → Logs → API Logs

3. **설정 초기화**
   ```sql
   -- 기본 설정으로 복구
   \i supabase-symbols-config.sql
   ```

4. **캐시 무효화**
   ```bash
   # 서버 재시작
   npm run dev
   ```
