-- Earnings 관련 테이블 스키마
-- 생성일: 2026-03-16

-- 1. earnings_calendar 테이블 (실적 발표 캘린더)
CREATE TABLE IF NOT EXISTS earnings_calendar (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol          text NOT NULL,
  corp_name       text,
  earnings_date   date NOT NULL,
  estimate_eps    numeric,
  actual_eps      numeric,
  surprise_pct    numeric,
  signal          text CHECK (signal IN ('BUY', 'SELL', 'HOLD', 'UPCOMING')),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(symbol, earnings_date)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_earnings_calendar_symbol ON earnings_calendar(symbol);
CREATE INDEX IF NOT EXISTS idx_earnings_calendar_date ON earnings_calendar(earnings_date DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_calendar_signal ON earnings_calendar(signal);

-- 코멘트 추가
COMMENT ON TABLE earnings_calendar IS '실적 발표 캘린더 (Finnhub API)';
COMMENT ON COLUMN earnings_calendar.symbol IS '종목 심볼 (티커)';
COMMENT ON COLUMN earnings_calendar.corp_name IS '기업명';
COMMENT ON COLUMN earnings_calendar.earnings_date IS '실적 발표일';
COMMENT ON COLUMN earnings_calendar.estimate_eps IS '예상 EPS (Earnings Per Share)';
COMMENT ON COLUMN earnings_calendar.actual_eps IS '실제 EPS (발표 후)';
COMMENT ON COLUMN earnings_calendar.surprise_pct IS '서프라이즈 % (실제-예상)/예상';
COMMENT ON COLUMN earnings_calendar.signal IS '매매 신호 (BUY: 매수, SELL: 매도, HOLD: 중립, UPCOMING: 발표 예정)';

-- RLS 정책 (선택사항 - 필요시 주석 해제)
-- ALTER TABLE earnings_calendar ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON earnings_calendar FOR ALL USING (true);
