-- ============================================================
-- FINSI PHASE 33~38 추가 SQL v4
-- Supabase SQL Editor → Run
-- ============================================================

-- ① 포지션 관리
CREATE TABLE IF NOT EXISTS open_positions (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol          text        NOT NULL UNIQUE,
  quantity        integer     NOT NULL DEFAULT 0,
  avg_price       numeric     NOT NULL DEFAULT 0,
  current_price   numeric     DEFAULT 0,
  stop_loss       numeric,
  target_price    numeric,
  entry_signal_id text,
  unrealized_pnl  numeric     DEFAULT 0,
  unrealized_pct  numeric     DEFAULT 0,
  status          text        DEFAULT 'OPEN',
  opened_at       timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ② KIS 토큰
CREATE TABLE IF NOT EXISTS kis_tokens (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token text        NOT NULL,
  token_type   text        DEFAULT 'Bearer',
  expires_at   timestamptz NOT NULL,
  is_paper     boolean     DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- ③ 매크로 지표
CREATE TABLE IF NOT EXISTS macro_indicators (
  id             uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_name text    NOT NULL,
  record_date    date    NOT NULL DEFAULT CURRENT_DATE,
  value          numeric NOT NULL,
  prev_value     numeric,
  change_pct     numeric,
  signal         text,
  source         text,
  created_at     timestamptz DEFAULT now()
);

-- ④ 실적 발표
CREATE TABLE IF NOT EXISTS earnings_calendar (
  id             uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol         text    NOT NULL,
  corp_name      text,
  earnings_date  date    NOT NULL,
  estimate_eps   numeric,
  actual_eps     numeric,
  surprise_pct   numeric,
  revenue_est    numeric,
  revenue_actual numeric,
  guidance       text,
  signal         text,
  created_at     timestamptz DEFAULT now()
);

-- ⑤ 리밸런싱
CREATE TABLE IF NOT EXISTS rebalance_log (
  id              uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  rebalance_date  date    NOT NULL DEFAULT CURRENT_DATE,
  before_weights  jsonb,
  after_weights   jsonb,
  trades_executed jsonb,
  drift_score     numeric,
  created_at      timestamptz DEFAULT now()
);

-- ⑥ 가격 알림
CREATE TABLE IF NOT EXISTS price_alerts (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol        text    NOT NULL,
  alert_type    text    NOT NULL,
  trigger_price numeric NOT NULL,
  is_active     boolean DEFAULT true,
  triggered_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- ⑦ 수익 귀속
CREATE TABLE IF NOT EXISTS attribution_log (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id     text,
  symbol        text    NOT NULL,
  entry_price   numeric NOT NULL,
  exit_price    numeric,
  pnl           numeric,
  pnl_pct       numeric,
  holding_days  integer,
  strategy      text,
  factor_scores jsonb,
  closed_at     timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- ⑧ 시스템 설정
CREATE TABLE IF NOT EXISTS system_config (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO system_config (key, value) VALUES
  ('trading_mode',       'PAPER'),
  ('signal_min_score',   '70'),
  ('auto_stop_loss_pct', '8'),
  ('max_position_cnt',   '10'),
  ('daily_loss_limit',   '500000'),
  ('kis_ready',          'false')
ON CONFLICT (key) DO NOTHING;

-- 결과 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
