-- Approvals 관련 테이블 스키마
-- 생성일: 2025-03-15

-- 1. pending_approvals 테이블 (승인 대기 큐)
CREATE TABLE IF NOT EXISTS pending_approvals (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol        text NOT NULL,
  order_type    text NOT NULL CHECK (order_type IN ('BUY', 'SELL')),
  quantity      integer NOT NULL CHECK (quantity > 0),
  amount        numeric NOT NULL CHECK (amount >= 0),
  signal_score  integer CHECK (signal_score >= 0 AND signal_score <= 100),
  signal_reason text NOT NULL,
  expires_at    timestamptz NOT NULL,
  status        text DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','EXPIRED')),
  approved_at   timestamptz,
  rejected_at   timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pa_status ON pending_approvals(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_pa_symbol ON pending_approvals(symbol);
CREATE INDEX IF NOT EXISTS idx_pa_created ON pending_approvals(created_at DESC);

-- 코멘트 추가
COMMENT ON TABLE pending_approvals IS '자동매매 승인 대기 큐 (30분 자동 만료)';
COMMENT ON COLUMN pending_approvals.symbol IS '종목코드 (예: 005930, AAPL)';
COMMENT ON COLUMN pending_approvals.order_type IS '주문 유형 (BUY/SELL)';
COMMENT ON COLUMN pending_approvals.quantity IS '주문 수량';
COMMENT ON COLUMN pending_approvals.amount IS '주문 가격 (0 = 시장가)';
COMMENT ON COLUMN pending_approvals.signal_score IS '신호 점수 (0-100)';
COMMENT ON COLUMN pending_approvals.signal_reason IS '신호 발생 이유';
COMMENT ON COLUMN pending_approvals.expires_at IS '만료 시간 (30분 후)';
COMMENT ON COLUMN pending_approvals.status IS '상태 (PENDING/APPROVED/REJECTED/EXPIRED)';
COMMENT ON COLUMN pending_approvals.approved_at IS '승인 시간';
COMMENT ON COLUMN pending_approvals.rejected_at IS '거부 시간';

-- 샘플 데이터 (테스트용)
INSERT INTO pending_approvals (
  symbol, order_type, quantity, amount, signal_score, signal_reason, expires_at
) VALUES
  (
    '005930',
    'BUY',
    10,
    75000,
    85,
    '모멘텀 신호 + RSI 과매도',
    NOW() + INTERVAL '25 minutes'
  ),
  (
    'AAPL',
    'SELL',
    5,
    0,
    78,
    '고점 도달 + 수급 이탈',
    NOW() + INTERVAL '15 minutes'
  ),
  (
    'TSLA',
    'BUY',
    3,
    250.50,
    92,
    '강한 매수 신호 + 거래량 급증',
    NOW() + INTERVAL '28 minutes'
  )
ON CONFLICT DO NOTHING;

-- RLS 정책 (선택사항 - 필요시 주석 해제)
-- ALTER TABLE pending_approvals ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON pending_approvals FOR ALL USING (true);
