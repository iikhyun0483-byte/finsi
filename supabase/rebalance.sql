-- Rebalance 관련 테이블 스키마
-- 생성일: 2026-03-16

-- 1. open_positions 테이블 (이미 존재 - 스키마 참고용)
-- 실제 컬럼: symbol, quantity, avg_price, current_price, stop_loss,
--            target_price, entry_signal_id, unrealized_pnl, unrealized_pct,
--            status, opened_at, updated_at
--
-- CREATE TABLE IF NOT EXISTS open_positions (...)
-- ↑ 테이블이 이미 존재하므로 생성 스킵

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
-- 실제 open_positions 테이블 컬럼: symbol, quantity, avg_price, current_price, stop_loss,
-- target_price, entry_signal_id, unrealized_pnl, unrealized_pct, status, opened_at, updated_at
INSERT INTO open_positions (symbol, quantity, avg_price, current_price, status) VALUES
  ('SPY', 100, 450.00, 465.50, 'OPEN'),
  ('QQQ', 50, 380.00, 395.20, 'OPEN'),
  ('AAPL', 80, 175.00, 182.30, 'OPEN')
ON CONFLICT DO NOTHING;

-- RLS 정책 (선택사항 - 필요시 주석 해제)
-- ALTER TABLE open_positions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON open_positions FOR ALL USING (true);
-- ALTER TABLE rebalance_log ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON rebalance_log FOR ALL USING (true);
