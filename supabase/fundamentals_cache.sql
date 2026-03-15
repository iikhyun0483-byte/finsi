-- Fundamentals 캐시 테이블 생성
-- Alpha Vantage API Rate Limit(25 requests/day) 문제 해결

CREATE TABLE IF NOT EXISTS fundamentals_cache (
  symbol VARCHAR(10) PRIMARY KEY,
  per DECIMAL(10,2),
  pbr DECIMAL(10,2),
  roe DECIMAL(10,2),
  debt_to_equity DECIMAL(10,2),
  revenue_growth DECIMAL(10,2),
  gross_margin DECIMAL(10,2),
  operating_margin DECIMAL(10,2),
  is_etf BOOLEAN DEFAULT false,
  etf_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_fundamentals_cache_updated
  ON fundamentals_cache(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_fundamentals_cache_symbol
  ON fundamentals_cache(symbol);

-- Row Level Security (RLS) 정책
ALTER TABLE fundamentals_cache ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Anyone can read fundamentals_cache" ON fundamentals_cache
  FOR SELECT USING (true);

-- 인증된 사용자만 수정 가능 (API 서버용)
CREATE POLICY "Service role can modify fundamentals_cache" ON fundamentals_cache
  FOR ALL USING (auth.role() = 'service_role');

-- 주석
COMMENT ON TABLE fundamentals_cache IS 'Alpha Vantage API 재무 데이터 캐시 (7일 유효)';
COMMENT ON COLUMN fundamentals_cache.symbol IS '종목 심볼 (Primary Key)';
COMMENT ON COLUMN fundamentals_cache.per IS 'Price to Earnings Ratio';
COMMENT ON COLUMN fundamentals_cache.pbr IS 'Price to Book Ratio';
COMMENT ON COLUMN fundamentals_cache.roe IS 'Return on Equity (%)';
COMMENT ON COLUMN fundamentals_cache.debt_to_equity IS 'Debt to Equity Ratio (%)';
COMMENT ON COLUMN fundamentals_cache.revenue_growth IS 'Revenue Growth YoY (%)';
COMMENT ON COLUMN fundamentals_cache.gross_margin IS 'Gross Margin (%)';
COMMENT ON COLUMN fundamentals_cache.operating_margin IS 'Operating Margin (%)';
COMMENT ON COLUMN fundamentals_cache.is_etf IS 'ETF 여부 (펀더멘털 분석 불가)';
COMMENT ON COLUMN fundamentals_cache.etf_message IS 'ETF 안내 메시지';
COMMENT ON COLUMN fundamentals_cache.updated_at IS '마지막 업데이트 시각 (7일 후 만료)';
