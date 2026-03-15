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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_dart_filed_at ON dart_disclosures(filed_at DESC);
CREATE INDEX IF NOT EXISTS idx_dart_importance ON dart_disclosures(importance DESC);
CREATE INDEX IF NOT EXISTS idx_dart_symbol ON dart_disclosures(symbol);
CREATE INDEX IF NOT EXISTS idx_dart_corp_name ON dart_disclosures(corp_name);

-- RLS (Row Level Security) 활성화
ALTER TABLE dart_disclosures ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 읽기 허용 정책
CREATE POLICY "Allow public read access" ON dart_disclosures
  FOR SELECT USING (true);

-- 서비스 역할만 쓰기 허용 정책
CREATE POLICY "Allow service role write access" ON dart_disclosures
  FOR ALL USING (auth.role() = 'service_role');
