-- FINSI 퀀트 투자 자동화 시스템 - Supabase 테이블 스키마
-- Supabase 대시보드에서 SQL Editor에 붙여넣기 실행

-- 1. 투자 신호 테이블
CREATE TABLE IF NOT EXISTS signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  asset_type VARCHAR(20) NOT NULL, -- stock, crypto, commodity, bond, reit
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  action VARCHAR(50) NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  price_krw DECIMAL(15, 0) NOT NULL,
  layer1_score INTEGER,
  layer2_score INTEGER,
  layer3_score INTEGER,
  rsi DECIMAL(5, 2),
  macd DECIMAL(10, 4),
  fear_greed INTEGER,
  high_risk BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_signals_symbol ON signals(symbol);
CREATE INDEX idx_signals_created_at ON signals(created_at DESC);
CREATE INDEX idx_signals_score ON signals(score DESC);

-- 2. 가격 히스토리 테이블
CREATE TABLE IF NOT EXISTS price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  open DECIMAL(12, 2) NOT NULL,
  high DECIMAL(12, 2) NOT NULL,
  low DECIMAL(12, 2) NOT NULL,
  close DECIMAL(12, 2) NOT NULL,
  volume BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol, date)
);

CREATE INDEX idx_price_history_symbol_date ON price_history(symbol, date DESC);

-- 3. 관심 종목 테이블
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  asset_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

CREATE INDEX idx_watchlist_user ON watchlist(user_id);

-- 4. 포트폴리오 테이블
CREATE TABLE IF NOT EXISTS portfolio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  quantity DECIMAL(18, 8) NOT NULL,
  avg_buy_price DECIMAL(12, 2) NOT NULL,
  current_price DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

CREATE INDEX idx_portfolio_user ON portfolio(user_id);

-- 5. 백테스트 결과 테이블
CREATE TABLE IF NOT EXISTS backtest_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy VARCHAR(50) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  period_years INTEGER NOT NULL,
  initial_capital DECIMAL(15, 0) NOT NULL,
  final_value DECIMAL(15, 0) NOT NULL,
  total_return DECIMAL(8, 2) NOT NULL,
  cagr DECIMAL(8, 2) NOT NULL,
  mdd DECIMAL(8, 2) NOT NULL,
  sharpe_ratio DECIMAL(6, 2),
  total_trades INTEGER,
  win_rate DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_backtest_strategy ON backtest_results(strategy);
CREATE INDEX idx_backtest_created_at ON backtest_results(created_at DESC);

-- 6. 매크로 지표 테이블
CREATE TABLE IF NOT EXISTS macro_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_type VARCHAR(50) NOT NULL, -- fear_greed, vix, fed_rate, buffett
  value DECIMAL(10, 2) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_macro_type_date ON macro_indicators(indicator_type, created_at DESC);

-- 7. 환율 테이블
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10, 4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency, created_at DESC);

-- 8. 투자 일지 테이블
CREATE TABLE IF NOT EXISTS trade_journal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ticker VARCHAR(20) NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('매수', '매도')),
  price DECIMAL(12, 2) NOT NULL,
  quantity DECIMAL(18, 8) NOT NULL,
  total_amount DECIMAL(18, 2) GENERATED ALWAYS AS (price * quantity) STORED,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trade_journal_user ON trade_journal(user_id);
CREATE INDEX idx_trade_journal_ticker ON trade_journal(ticker);
CREATE INDEX idx_trade_journal_date ON trade_journal(date DESC);

-- RLS (Row Level Security) 활성화 (선택사항)
-- ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE signals IS '실시간 투자 신호 (0~100점 스코어링)';
COMMENT ON TABLE price_history IS '자산별 가격 히스토리 (OHLCV)';
COMMENT ON TABLE watchlist IS '사용자 관심 종목';
COMMENT ON TABLE portfolio IS '사용자 포트폴리오';
COMMENT ON TABLE backtest_results IS '백테스팅 전략 결과';
COMMENT ON TABLE macro_indicators IS '거시경제 지표 (공포탐욕지수, VIX, 금리 등)';
COMMENT ON TABLE exchange_rates IS '실시간 환율 (USD/KRW)';
