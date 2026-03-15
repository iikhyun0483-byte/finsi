-- DART 공시 테이블 생성 및 설정
-- 실행: psql -h [SUPABASE_HOST] -U postgres -d postgres -f dart_disclosures.sql
-- 또는 Supabase Dashboard > SQL Editor에서 실행

-- 기존 테이블 삭제 (주의: 데이터 손실)
-- DROP TABLE IF EXISTS dart_disclosures CASCADE;

-- DART 공시 테이블 생성
CREATE TABLE IF NOT EXISTS dart_disclosures (
  id BIGSERIAL PRIMARY KEY,
  rcept_no TEXT UNIQUE NOT NULL,
  corp_name TEXT NOT NULL,
  symbol TEXT,
  disclosure_type TEXT NOT NULL,
  title TEXT NOT NULL,
  filed_at TIMESTAMPTZ NOT NULL,
  importance INTEGER NOT NULL DEFAULT 0,
  ai_summary TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 코멘트 추가
COMMENT ON TABLE dart_disclosures IS 'DART 공시 데이터 (opendart.fss.or.kr)';
COMMENT ON COLUMN dart_disclosures.rcept_no IS '접수번호 (DART API rcept_no, 고유키)';
COMMENT ON COLUMN dart_disclosures.corp_name IS '회사명';
COMMENT ON COLUMN dart_disclosures.symbol IS '종목코드 (상장사만 존재)';
COMMENT ON COLUMN dart_disclosures.disclosure_type IS '공시 유형 (예: 유상증자결정, 합병 등)';
COMMENT ON COLUMN dart_disclosures.title IS '공시 제목';
COMMENT ON COLUMN dart_disclosures.filed_at IS '공시 제출일 (DART rceptDt 기준)';
COMMENT ON COLUMN dart_disclosures.importance IS '중요도 점수 (0-10, 5+ 저장, 7+ AI 요약)';
COMMENT ON COLUMN dart_disclosures.ai_summary IS 'Gemini AI 요약 (3줄)';
COMMENT ON COLUMN dart_disclosures.raw_data IS 'DART API 원본 데이터 (JSON)';

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_dart_filed_at ON dart_disclosures(filed_at DESC);
CREATE INDEX IF NOT EXISTS idx_dart_importance ON dart_disclosures(importance DESC);
CREATE INDEX IF NOT EXISTS idx_dart_symbol ON dart_disclosures(symbol) WHERE symbol IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dart_corp_name ON dart_disclosures(corp_name);
CREATE INDEX IF NOT EXISTS idx_dart_created_at ON dart_disclosures(created_at DESC);

-- 복합 인덱스 (자주 사용하는 조합)
CREATE INDEX IF NOT EXISTS idx_dart_importance_filed_at ON dart_disclosures(importance DESC, filed_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE dart_disclosures ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (재실행 시)
DROP POLICY IF EXISTS "Allow public read access" ON dart_disclosures;
DROP POLICY IF EXISTS "Allow service role write access" ON dart_disclosures;

-- 모든 사용자 읽기 허용 정책
CREATE POLICY "Allow public read access" ON dart_disclosures
  FOR SELECT
  USING (true);

-- 서비스 역할만 쓰기 허용 정책 (API 라우트에서 사용)
CREATE POLICY "Allow service role write access" ON dart_disclosures
  FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS update_dart_disclosures_updated_at ON dart_disclosures;
CREATE TRIGGER update_dart_disclosures_updated_at
  BEFORE UPDATE ON dart_disclosures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 테이블 통계 확인 쿼리
-- SELECT COUNT(*) as total_count,
--        COUNT(DISTINCT corp_name) as unique_companies,
--        COUNT(DISTINCT symbol) as unique_symbols,
--        AVG(importance) as avg_importance,
--        COUNT(*) FILTER (WHERE ai_summary IS NOT NULL) as with_ai_summary
-- FROM dart_disclosures;

-- 중요도별 분포 확인 쿼리
-- SELECT importance, COUNT(*) as count
-- FROM dart_disclosures
-- GROUP BY importance
-- ORDER BY importance DESC;
