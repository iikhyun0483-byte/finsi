# DART 공시 피드 설정 가이드

## 1. Supabase 테이블 생성

### 방법 1: Supabase Dashboard (권장)

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭
4. **New Query** 버튼 클릭
5. `supabase/dart_disclosures.sql` 파일 내용을 복사하여 붙여넣기
6. **Run** 버튼 클릭 (또는 Ctrl+Enter)

### 방법 2: Supabase CLI

```bash
# Supabase CLI 설치 (한 번만)
npm install -g supabase

# 프로젝트에서 실행
cd /e/dev/finsi
supabase db push
```

### 방법 3: psql 직접 실행

```bash
psql -h [SUPABASE_HOST] -U postgres -d postgres -f supabase/dart_disclosures.sql
```

## 2. 환경변수 설정

`.env.local` 파일에 다음 환경변수가 필요합니다:

```env
# DART API (필수)
DART_API_KEY=your_dart_api_key_here

# Gemini AI (선택, AI 요약 기능 사용 시)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### DART API 키 발급

1. [DART 오픈 API](https://opendart.fss.or.kr) 접속
2. 회원가입 (무료)
3. **인증키 신청/관리** 메뉴에서 API 키 발급
4. 하루 10,000건 무료 호출 가능

### Gemini API 키 발급 (선택)

1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. **Get API Key** 버튼 클릭
3. 무료 티어: 분당 15회, 일일 1,500회 호출 가능

## 3. 테이블 생성 확인

Supabase Dashboard > **Table Editor**에서 `dart_disclosures` 테이블이 생성되었는지 확인:

- ✅ 테이블 이름: `dart_disclosures`
- ✅ 컬럼: `id`, `rcept_no`, `corp_name`, `symbol`, `disclosure_type`, `title`, `filed_at`, `importance`, `ai_summary`, `raw_data`, `created_at`, `updated_at`
- ✅ 인덱스: `idx_dart_filed_at`, `idx_dart_importance`, `idx_dart_symbol`, `idx_dart_corp_name`
- ✅ RLS 정책: 2개 (public read, service_role write)

## 4. 사용 방법

### 공시 동기화

1. `/disclosure` 페이지 접속
2. **🔄 공시 동기화** 버튼 클릭
3. 오늘 날짜 공시 수집:
   - 중요도 5+ 공시만 DB 저장
   - 중요도 7+ 공시는 AI 요약 자동 생성
4. 성공 시 토스트 알림 표시

### 중요도 필터

- **중요도 5+**: 기본 (배당, 임원 변경 등)
- **중요도 7+**: 중요 (전환사채, 소송 등)
- **중요도 9+**: 매우 중요 (유상증자, 합병, 최대주주 변경 등)

### 공시 상세 보기

- 공시 카드 클릭 → 모달 팝업
- AI 요약 확인 (중요도 7+ 공시만)
- 제출일, 중요도 점수 확인

## 5. 문제 해결

### "테이블이 존재하지 않습니다" 에러

**원인**: `dart_disclosures` 테이블이 생성되지 않음

**해결**:
1. Supabase Dashboard > SQL Editor에서 `dart_disclosures.sql` 실행
2. 또는 `supabase db push` 명령 실행

### "환경변수 누락" 에러

**원인**: `.env.local`에 필수 환경변수 없음

**해결**:
1. `.env.local` 파일 확인
2. `DART_API_KEY` 추가 (필수)
3. 서버 재시작: `npm run dev` 종료 후 재실행

### "DART API 호출 실패" 에러

**원인**:
- DART API 키가 잘못됨
- DART API 일일 한도 초과 (10,000건)
- DART API 서버 점검 중

**해결**:
1. DART API 키 재확인
2. [DART 오픈 API 공지사항](https://opendart.fss.or.kr) 확인
3. 브라우저 콘솔에서 에러 로그 확인

### "AI 요약 실패" 에러

**원인**:
- Gemini API 키가 잘못됨
- Gemini API rate limit 초과

**해결**:
- AI 요약은 선택 기능이므로 공시 수집은 정상 작동
- Gemini API 키 재확인
- Rate limit: 분당 15회 → 자동으로 500ms 지연 추가됨

## 6. 데이터 확인

### Supabase Dashboard에서 확인

```sql
-- 전체 공시 개수
SELECT COUNT(*) FROM dart_disclosures;

-- 중요도별 분포
SELECT importance, COUNT(*) as count
FROM dart_disclosures
GROUP BY importance
ORDER BY importance DESC;

-- 최근 공시 10개
SELECT corp_name, title, importance, filed_at
FROM dart_disclosures
ORDER BY filed_at DESC
LIMIT 10;

-- AI 요약이 있는 공시 개수
SELECT COUNT(*)
FROM dart_disclosures
WHERE ai_summary IS NOT NULL;
```

## 7. 추가 설정 (선택)

### 자동 동기화 (Cron Job)

**Supabase Edge Functions**를 사용하여 매일 자동 동기화:

```typescript
// supabase/functions/dart-sync/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const response = await fetch('https://your-domain.com/api/dart?action=sync')
  const result = await response.json()
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  })
})
```

**Vercel Cron Jobs**를 사용한 자동 동기화:

```json
// vercel.json
{
  "crons": [{
    "path": "/api/dart?action=sync",
    "schedule": "0 9 * * *"
  }]
}
```

## 8. 성능 최적화

### 인덱스 추가 (대량 데이터 시)

```sql
-- 회사명 검색 성능 향상
CREATE INDEX idx_dart_corp_name_gin ON dart_disclosures USING gin(to_tsvector('korean', corp_name));

-- 제목 전문 검색
CREATE INDEX idx_dart_title_gin ON dart_disclosures USING gin(to_tsvector('korean', title));
```

### 오래된 공시 자동 삭제

```sql
-- 1년 이상 된 중요도 5 미만 공시 삭제
DELETE FROM dart_disclosures
WHERE filed_at < NOW() - INTERVAL '1 year'
  AND importance < 5;
```

## 9. 참고 자료

- [DART 오픈 API 문서](https://opendart.fss.or.kr/guide/main.do)
- [Supabase 문서](https://supabase.com/docs)
- [Gemini API 문서](https://ai.google.dev/docs)
