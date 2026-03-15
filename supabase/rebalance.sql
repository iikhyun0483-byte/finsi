-- Rebalance 관련 테이블 스키마
-- 생성일: 2026-03-16

-- 1. open_positions 테이블 (현재 보유 포지션)
CREATE TABLE IF NOT EXISTS open_positions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol          text NOT NULL,
  quantity        integer NOT NULL CHECK (quantity > 0),
  entry_price     numeric NOT NULL CHECK (entry_price > 0),
  current_price   numeric NOT NULL CHECK (current_price > 0),
  status          text DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_open_positions_symbol ON open_positions(symbol);
CREATE INDEX IF NOT EXISTS idx_open_positions_status ON open_positions(status);

-- 코멘트 추가
COMMENT ON TABLE open_positions IS '현재 보유 포지션 (리밸런싱 계산용)';
COMMENT ON COLUMN open_positions.symbol IS '종목 심볼';
COMMENT ON COLUMN open_positions.quantity IS '보유 수량';
COMMENT ON COLUMN open_positions.entry_price IS '진입 가격';
COMMENT ON COLUMN open_positions.current_price IS '현재 가격 (실시간 업데이트)';
COMMENT ON COLUMN open_positions.status IS '상태 (OPEN: 보유중, CLOSED: 청산됨)';

-- 2. rebalance_log 테이블 (리밸런싱 이력)
CREATE TABLE IF NOT EXISTS rebalance_log (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rebalance_date   date NOT NULL,
  before_weights   jsonb,
  after_weights    jsonb,
  trades_executed  jsonb,
  drift_score      numeric,
  created_at       timestamptz DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_rebalance_log_date ON rebalance_log(rebalance_date DESC);

-- 코멘트 추가
COMMENT ON TABLE rebalance_log IS '리밸런싱 실행 이력';
COMMENT ON COLUMN rebalance_log.rebalance_date IS '리밸런싱 날짜';
COMMENT ON COLUMN rebalance_log.before_weights IS '리밸런싱 전 비중 (JSON)';
COMMENT ON COLUMN rebalance_log.after_weights IS '리밸런싱 후 비중 (JSON)';
COMMENT ON COLUMN rebalance_log.trades_executed IS '실행된 거래 내역 (JSON)';
COMMENT ON COLUMN rebalance_log.drift_score IS '드리프트 점수 (0~1)';

-- 샘플 데이터 삽입 (테스트용 포지션 3개)
INSERT INTO open_positions (symbol, quantity, entry_price, current_price, status) VALUES
  ('SPY', 100, 450.00, 465.50, 'OPEN'),
  ('QQQ', 50, 380.00, 395.20, 'OPEN'),
  ('AAPL', 80, 175.00, 182.30, 'OPEN')
ON CONFLICT DO NOTHING;

-- RLS 정책 (선택사항 - 필요시 주석 해제)
-- ALTER TABLE open_positions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON open_positions FOR ALL USING (true);
-- ALTER TABLE rebalance_log ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON rebalance_log FOR ALL USING (true);
