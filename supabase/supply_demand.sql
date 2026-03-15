-- 수급 추적 테이블 생성
-- 실행: Supabase Dashboard > SQL Editor에서 실행

-- 기존 테이블 삭제 (주의: 데이터 손실)
-- DROP TABLE IF EXISTS supply_demand CASCADE;

-- 수급 추적 테이블 생성
CREATE TABLE IF NOT EXISTS supply_demand (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  trade_date DATE NOT NULL,
  foreign_net BIGINT NOT NULL DEFAULT 0,
  inst_net BIGINT NOT NULL DEFAULT 0,
  retail_net BIGINT NOT NULL DEFAULT 0,
  program_net BIGINT NOT NULL DEFAULT 0,
  supply_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbol, trade_date)
);

-- 코멘트 추가
COMMENT ON TABLE supply_demand IS '수급 추적 데이터 (외국인/기관/개인 순매수)';
COMMENT ON COLUMN supply_demand.symbol IS '종목코드';
COMMENT ON COLUMN supply_demand.trade_date IS '거래일';
COMMENT ON COLUMN supply_demand.foreign_net IS '외국인 순매수 금액 (원)';
COMMENT ON COLUMN supply_demand.inst_net IS '기관 순매수 금액 (원)';
COMMENT ON COLUMN supply_demand.retail_net IS '개인 순매수 금액 (원)';
COMMENT ON COLUMN supply_demand.program_net IS '프로그램 순매수 금액 (원)';
COMMENT ON COLUMN supply_demand.supply_score IS '수급 점수 (-100 ~ +100)';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_supply_symbol ON supply_demand(symbol);
CREATE INDEX IF NOT EXISTS idx_supply_trade_date ON supply_demand(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_supply_score ON supply_demand(supply_score DESC);
CREATE INDEX IF NOT EXISTS idx_supply_symbol_date ON supply_demand(symbol, trade_date DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE supply_demand ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Allow public read access" ON supply_demand;
DROP POLICY IF EXISTS "Allow service role write access" ON supply_demand;

-- 읽기 허용 (모든 사용자)
CREATE POLICY "Allow public read access" ON supply_demand
  FOR SELECT
  USING (true);

-- 쓰기 허용 (서비스 역할만)
CREATE POLICY "Allow service role write access" ON supply_demand
  FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_supply_demand_updated_at ON supply_demand;
CREATE TRIGGER update_supply_demand_updated_at
  BEFORE UPDATE ON supply_demand
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 샘플 데이터 삽입 (테스트용)
INSERT INTO supply_demand (symbol, trade_date, foreign_net, inst_net, retail_net, program_net, supply_score)
VALUES
  ('005930', '2026-03-14', 50000000000, 30000000000, -80000000000, 10000000000, 48),
  ('005930', '2026-03-13', 40000000000, 20000000000, -60000000000, 5000000000, 38),
  ('005930', '2026-03-12', 30000000000, 15000000000, -45000000000, 3000000000, 28),
  ('000660', '2026-03-14', -20000000000, -10000000000, 30000000000, -5000000000, -22),
  ('AAPL', '2026-03-14', 100000000000, 50000000000, -150000000000, 20000000000, 56)
ON CONFLICT (symbol, trade_date) DO NOTHING;

-- 테이블 통계 확인 쿼리
-- SELECT
--   COUNT(*) as total_records,
--   COUNT(DISTINCT symbol) as unique_symbols,
--   MIN(trade_date) as earliest_date,
--   MAX(trade_date) as latest_date
-- FROM supply_demand;

-- 종목별 최신 수급 점수
-- SELECT symbol, trade_date, supply_score, foreign_net, inst_net
-- FROM supply_demand
-- WHERE (symbol, trade_date) IN (
--   SELECT symbol, MAX(trade_date)
--   FROM supply_demand
--   GROUP BY symbol
-- )
-- ORDER BY supply_score DESC;
