-- ============================================================
-- FINSI PHASE 18~32 Supabase SQL
-- Supabase Dashboard → SQL Editor → 전체 붙여넣기 → Run
-- ============================================================

-- PHASE 18: DART 공시
CREATE TABLE IF NOT EXISTS dart_disclosures (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  rcept_no         text        UNIQUE,
  corp_name        text        NOT NULL,
  symbol           text,
  disclosure_type  text        NOT NULL,
  title            text        NOT NULL,
  filed_at         timestamptz NOT NULL,
  ai_summary       text,
  importance       integer     DEFAULT 0,
  raw_data         jsonb,
  notified         boolean     DEFAULT false,
  created_at       timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dart_symbol
  ON dart_disclosures (symbol, filed_at DESC);
CREATE INDEX IF NOT EXISTS idx_dart_importance
  ON dart_disclosures (importance DESC, filed_at DESC);

-- PHASE 19: 수급 추적
CREATE TABLE IF NOT EXISTS supply_demand (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol       text        NOT NULL,
  trade_date   date        NOT NULL,
  foreign_net  numeric     DEFAULT 0,
  inst_net     numeric     DEFAULT 0,
  retail_net   numeric     DEFAULT 0,
  program_net  numeric     DEFAULT 0,
  supply_score numeric     DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(symbol, trade_date)
);
CREATE INDEX IF NOT EXISTS idx_sd_symbol
  ON supply_demand (symbol, trade_date DESC);

CREATE TABLE IF NOT EXISTS insider_trades (
  id           uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol       text    NOT NULL,
  insider_name text,
  trade_type   text,
  shares       numeric,
  price        numeric,
  trade_date   date,
  report_date  date,
  created_at   timestamptz DEFAULT now()
);

-- PHASE 20: 감정 지표
CREATE TABLE IF NOT EXISTS sentiment_scores (
  id               uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol           text,
  score_date       date    NOT NULL DEFAULT CURRENT_DATE,
  fear_greed       integer,
  news_score       numeric,
  community_score  numeric,
  search_trend     numeric,
  composite        numeric,
  signal           text,
  created_at       timestamptz DEFAULT now(),
  UNIQUE(symbol, score_date)
);
CREATE INDEX IF NOT EXISTS idx_sentiment_symbol
  ON sentiment_scores (symbol, score_date DESC);

-- PHASE 21: KIS API 주문
CREATE TABLE IF NOT EXISTS kis_orders (
  id           uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol       text    NOT NULL,
  order_type   text    NOT NULL,
  quantity     integer NOT NULL,
  price        numeric,
  order_no     text,
  status       text    DEFAULT 'PENDING',
  signal_id    text,
  executed_at  timestamptz,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_symbol
  ON kis_orders (symbol, created_at DESC);

CREATE TABLE IF NOT EXISTS kis_executions (
  id           uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     uuid,
  symbol       text    NOT NULL,
  order_type   text    NOT NULL,
  quantity     integer NOT NULL,
  price        numeric NOT NULL,
  amount       numeric NOT NULL,
  executed_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trading_sessions (
  id             uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  mode           text    NOT NULL DEFAULT 'MANUAL',
  is_active      boolean DEFAULT false,
  daily_loss     numeric DEFAULT 0,
  max_daily_loss numeric DEFAULT 500000,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

INSERT INTO trading_sessions (mode, is_active, max_daily_loss)
SELECT 'MANUAL', false, 500000
WHERE NOT EXISTS (SELECT 1 FROM trading_sessions);

-- PHASE 22: 반자동 승인
CREATE TABLE IF NOT EXISTS pending_approvals (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol        text    NOT NULL,
  order_type    text    NOT NULL,
  quantity      integer NOT NULL,
  amount        numeric NOT NULL,
  signal_score  integer,
  signal_reason text,
  expires_at    timestamptz NOT NULL,
  status        text    DEFAULT 'PENDING',
  approved_at   timestamptz,
  rejected_at   timestamptz,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pa_status
  ON pending_approvals (status, expires_at);

-- PHASE 23: 오토파일럿
CREATE TABLE IF NOT EXISTS autopilot_config (
  id                uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active         boolean DEFAULT false,
  target_return     numeric DEFAULT 20,
  max_dd_percent    numeric DEFAULT 15,
  max_daily_trades  integer DEFAULT 3,
  max_position_pct  numeric DEFAULT 10,
  min_signal_score  integer DEFAULT 80,
  universe          text[]  DEFAULT ARRAY['SPY','QQQ','AAPL','MSFT'],
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

INSERT INTO autopilot_config DEFAULT VALUES
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS autopilot_log (
  id         uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  action     text    NOT NULL,
  symbol     text,
  amount     numeric,
  reason     text,
  result     text,
  created_at timestamptz DEFAULT now()
);

-- PHASE 24: 파라미터 최적화
CREATE TABLE IF NOT EXISTS parameter_history (
  id               uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  param_name       text    NOT NULL,
  old_value        numeric,
  new_value        numeric,
  reason           text,
  accuracy_before  numeric,
  accuracy_after   numeric,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS optimization_log (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  run_date      date    NOT NULL DEFAULT CURRENT_DATE,
  signal_count  integer,
  accuracy_7d   numeric,
  best_factors  jsonb,
  changes_made  jsonb,
  created_at    timestamptz DEFAULT now()
);

-- PHASE 26: 성과 리포트
CREATE TABLE IF NOT EXISTS performance_snapshots (
  id             uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date  date    NOT NULL DEFAULT CURRENT_DATE,
  total_value    numeric NOT NULL,
  cash           numeric DEFAULT 0,
  return_1m      numeric DEFAULT 0,
  return_3m      numeric DEFAULT 0,
  return_ytd     numeric DEFAULT 0,
  sharpe_ratio   numeric,
  max_dd         numeric,
  win_rate       numeric,
  trade_count    integer DEFAULT 0,
  created_at     timestamptz DEFAULT now(),
  UNIQUE(snapshot_date)
);

-- ============================================================
-- 결과 확인
-- ============================================================
SELECT table_name,
  (SELECT count(*) FROM information_schema.columns c
   WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS cols
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
