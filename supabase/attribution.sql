-- Attribution 관련 테이블 스키마
-- 생성일: 2026-03-16

-- 1. attribution_log 테이블 (수익 귀속 분석)
CREATE TABLE IF NOT EXISTS attribution_log (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id       uuid,
  symbol          text NOT NULL,
  entry_price     numeric NOT NULL CHECK (entry_price > 0),
  exit_price      numeric NOT NULL CHECK (exit_price > 0),
  quantity        integer NOT NULL CHECK (quantity > 0),
  pnl             numeric,
  pnl_pct         numeric,
  strategy        text NOT NULL,
  factor_scores   jsonb DEFAULT '{}',
  holding_days    integer CHECK (holding_days >= 0),
  closed_at       timestamptz NOT NULL,
  created_at      timestamptz DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_attribution_log_strategy ON attribution_log(strategy);
CREATE INDEX IF NOT EXISTS idx_attribution_log_symbol ON attribution_log(symbol);
CREATE INDEX IF NOT EXISTS idx_attribution_log_closed_at ON attribution_log(closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_attribution_log_pnl ON attribution_log(pnl DESC);

-- 코멘트 추가
COMMENT ON TABLE attribution_log IS '수익 귀속 분석 로그 (어떤 전략이 실제로 수익을 냈는가)';
COMMENT ON COLUMN attribution_log.signal_id IS '신호 ID (signals 테이블 참조, nullable)';
COMMENT ON COLUMN attribution_log.symbol IS '종목 심볼';
COMMENT ON COLUMN attribution_log.entry_price IS '진입 가격';
COMMENT ON COLUMN attribution_log.exit_price IS '청산 가격';
COMMENT ON COLUMN attribution_log.quantity IS '거래 수량';
COMMENT ON COLUMN attribution_log.pnl IS '실현 손익 (원)';
COMMENT ON COLUMN attribution_log.pnl_pct IS '손익률 (0.05 = 5%)';
COMMENT ON COLUMN attribution_log.strategy IS '전략명 (정규화됨: UPPERCASE, TRIM)';
COMMENT ON COLUMN attribution_log.factor_scores IS '팩터 점수 (JSON)';
COMMENT ON COLUMN attribution_log.holding_days IS '보유 기간 (일)';
COMMENT ON COLUMN attribution_log.closed_at IS '청산 시각';

-- RLS 정책 (선택사항 - 필요시 주석 해제)
-- ALTER TABLE attribution_log ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON attribution_log FOR ALL USING (true);
