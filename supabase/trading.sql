-- Trading 관련 테이블 스키마
-- 생성일: 2025-03-15

-- 1. autopilot_config 테이블에 max_daily_loss 컬럼 추가
ALTER TABLE autopilot_config
ADD COLUMN IF NOT EXISTS max_daily_loss numeric DEFAULT -500000;

COMMENT ON COLUMN autopilot_config.max_daily_loss IS '일일 최대 손실 한도 (음수, 예: -500000 = -50만원)';

-- 2. trade_history 테이블 생성
CREATE TABLE IF NOT EXISTS trade_history (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol        text NOT NULL,
  action        text NOT NULL CHECK (action IN ('BUY', 'SELL')),
  quantity      integer NOT NULL CHECK (quantity > 0),
  price         numeric NOT NULL CHECK (price >= 0),
  order_no      text,
  profit_loss   numeric DEFAULT 0,
  executed_at   timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_trade_history_symbol ON trade_history(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_history_executed_at ON trade_history(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_history_action ON trade_history(action);

-- 코멘트 추가
COMMENT ON TABLE trade_history IS '거래 내역 (KIS API 연동 후 실거래 기록)';
COMMENT ON COLUMN trade_history.symbol IS '종목코드 (예: 005930)';
COMMENT ON COLUMN trade_history.action IS '매수/매도 구분';
COMMENT ON COLUMN trade_history.quantity IS '거래 수량';
COMMENT ON COLUMN trade_history.price IS '체결 가격';
COMMENT ON COLUMN trade_history.order_no IS 'KIS 주문번호';
COMMENT ON COLUMN trade_history.profit_loss IS '손익 (청산 시 계산)';
COMMENT ON COLUMN trade_history.executed_at IS '체결 시간';

-- RLS 정책 (선택사항 - 필요시 주석 해제)
-- ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON trade_history FOR ALL USING (true);
