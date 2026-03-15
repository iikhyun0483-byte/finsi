-- Autopilot 관련 테이블 스키마
-- 생성일: 2025-03-15

-- 1. autopilot_config 테이블에 컬럼 추가
ALTER TABLE autopilot_config
ADD COLUMN IF NOT EXISTS max_daily_loss numeric DEFAULT -500000,
ADD COLUMN IF NOT EXISTS max_position_size numeric DEFAULT 30,
ADD COLUMN IF NOT EXISTS strategy text DEFAULT 'MOMENTUM' CHECK (strategy IN ('MOMENTUM', 'MEAN_REVERSION', 'SENTIMENT'));

-- 기본 universe를 한국 주식으로 변경
UPDATE autopilot_config
SET universe = ARRAY['005930','000660','035420','051910']
WHERE universe = ARRAY['SPY','QQQ','AAPL','MSFT'];

-- 코멘트 추가
COMMENT ON COLUMN autopilot_config.max_daily_loss IS '일일 최대 손실 한도 (음수, 예: -500000 = -50만원)';
COMMENT ON COLUMN autopilot_config.max_position_size IS '단일 종목 최대 비중 (%, 예: 30 = 총자산의 30%)';
COMMENT ON COLUMN autopilot_config.strategy IS '전략 (MOMENTUM/MEAN_REVERSION/SENTIMENT)';

-- 2. autopilot_status 테이블 생성 (실시간 상태 추적)
CREATE TABLE IF NOT EXISTS autopilot_status (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  last_check_at       timestamptz,
  signals_today       integer DEFAULT 0,
  last_signal_at      timestamptz,
  last_trade_at       timestamptz,
  total_signals       integer DEFAULT 0,
  total_trades        integer DEFAULT 0,
  updated_at          timestamptz DEFAULT now()
);

-- 기본 레코드 삽입
INSERT INTO autopilot_status (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- 코멘트 추가
COMMENT ON TABLE autopilot_status IS 'Autopilot 실시간 상태 추적';
COMMENT ON COLUMN autopilot_status.last_check_at IS '마지막 모니터링 시간';
COMMENT ON COLUMN autopilot_status.signals_today IS '오늘 생성된 신호 개수';
COMMENT ON COLUMN autopilot_status.last_signal_at IS '마지막 신호 생성 시간';
COMMENT ON COLUMN autopilot_status.last_trade_at IS '마지막 거래 실행 시간';
COMMENT ON COLUMN autopilot_status.total_signals IS '누적 신호 개수';
COMMENT ON COLUMN autopilot_status.total_trades IS '누적 거래 개수';

-- RLS 정책 (선택사항 - 필요시 주석 해제)
-- ALTER TABLE autopilot_status ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON autopilot_status FOR ALL USING (true);
