# ⚡ 실시간 전환 빠른 시작 가이드

## 🎯 5분 안에 완료하기

### ✅ 체크리스트

```
[ ] 1단계: Supabase 스키마 적용 (2분)
[ ] 2단계: 서버 재시작 (1분)
[ ] 3단계: 테스트 실행 (2분)
[ ] 완료!
```

---

## 1️⃣ Supabase 스키마 적용

### 방법 1: 브라우저에서 (권장)

1. **Supabase Dashboard 접속**
   ```
   https://app.supabase.com/project/zbdeaglcocnfnecnpswl/sql
   ```

2. **New Query 클릭**

3. **파일 내용 복사 & 붙여넣기**
   - 파일: `E:\dev\finsi\supabase-symbols-config.sql`
   - 전체 선택 (Ctrl+A) → 복사 (Ctrl+C)
   - SQL Editor에 붙여넣기 (Ctrl+V)

4. **Run 클릭** (또는 Ctrl+Enter)

5. **성공 확인**
   ```
   ✅ CREATE TABLE ... Success
   ✅ 22 rows inserted (symbol_config)
   ✅ 11 rows inserted (system_config)
   ```

---

## 2️⃣ 서버 재시작

### 옵션 A: 간단 재시작

```bash
# 터미널에서 실행
cd E:\dev\finsi

# 기존 서버 찾아서 종료
netstat -ano | grep :3000
taskkill //F //PID [여기에_PID_번호]

# 새로 시작
npm run dev
```

### 옵션 B: 빌드 후 재시작 (권장)

```bash
cd E:\dev\finsi

# 빌드
npm run build

# 서버 시작
npm run dev
```

### ✅ 성공 확인 (로그에서)

```
✅ 시스템 설정 로드 중...
✅ 활성 심볼: 22개
✅ API 재시도: 3회, 딜레이: 500ms
```

---

## 3️⃣ 테스트

### 자동 테스트 실행

```bash
node scripts/test-dynamic-config.js
```

**예상 결과**:
```
✅ 신호 생성 성공: 22개
✅ 분석 성공
✅ 마켓 데이터 로드 성공
```

### 브라우저 테스트

1. **Signal 페이지**
   ```
   http://localhost:3000/signal
   ```
   - [ ] 22개 종목 표시됨
   - [ ] 주식 4 + 원자재 4 + 채권 4 + 리츠 2 + 암호화폐 8
   - [ ] 에러 없음

2. **Analyze 페이지**
   ```
   http://localhost:3000/analyze
   ```
   - AAPL 입력
   - [ ] AI 코멘트 생성
   - [ ] 뉴스 표시

---

## 🎉 완료!

모든 체크박스가 ✅ 이면 성공!

---

## 🔧 다음은?

### 설정 변경 실습

#### 실습 1: 종목 추가

```sql
-- Supabase SQL Editor
INSERT INTO symbol_config (symbol, name, asset_type, enabled, priority)
VALUES ('TSLA', '테슬라', 'stock', true, 85);
```

**확인**: 1분 후 Signal 페이지에서 TSLA 표시 ✅

#### 실습 2: 종목 제거

```sql
UPDATE symbol_config
SET enabled = false
WHERE symbol = 'DOGE';
```

**확인**: 1분 후 Signal 페이지에서 DOGE 사라짐 ✅

#### 실습 3: 캐시 시간 변경

```sql
UPDATE system_config
SET value = '10'
WHERE key = 'CACHE_CRYPTO_MINUTES';
```

**확인**: 서버 재시작 후 로그 확인 ✅

---

## 📚 상세 가이드

- **전체 가이드**: `scripts/config-test-guide.md`
- **실전 사용법**: `scripts/practical-usage-guide.md`
- **테스트 스크립트**: `scripts/test-dynamic-config.js`
- **검증 쿼리**: `scripts/verify-db-setup.sql`

---

## 🚨 문제 해결

### "테이블이 없습니다"

→ 1단계 다시 실행 (Supabase 스키마 적용)

### "활성 심볼: 0개"

→ INSERT 문 확인:
```sql
SELECT COUNT(*) FROM symbol_config WHERE enabled = true;
-- 결과: 22 여야 함
```

### "Supabase 연결 오류"

→ .env.local 확인:
```bash
cat .env.local | grep SUPABASE
```

### "변경사항 반영 안 됨"

→ 1분 대기 또는 서버 재시작

---

## 💡 핵심 포인트

1. **모든 종목이 DB에서 관리됨** (하드코딩 제거)
2. **설정 변경 = SQL 쿼리** (코드 수정 불필요)
3. **1분 캐시** (성능과 유연성 균형)
4. **안전한 폴백** (DB 오류 시 기본값 사용)

---

## 📞 도움이 필요하면?

1. 로그 확인
2. 가이드 문서 참조
3. Supabase Dashboard 확인
4. 서버 재시작

**성공을 기원합니다!** 🚀
