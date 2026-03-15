-- Performance 관련 테이블 스키마
-- 생성일: 2025-03-15

-- 1. performance_snapshots 테이블 (성과 스냅샷)
CREATE TABLE IF NOT EXISTS performance_snapshots (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date  date NOT NULL DEFAULT CURRENT_DATE,
  total_value    numeric NOT NULL CHECK (total_value >= 0),
  cash           numeric DEFAULT 0 CHECK (cash >= 0),
  return_1m      numeric DEFAULT 0,
  return_3m      numeric DEFAULT 0,
  return_ytd     numeric DEFAULT 0,
  sharpe_ratio   numeric,
  max_dd         numeric CHECK (max_dd >= 0 AND max_dd <= 1),
  win_rate       numeric CHECK (win_rate >= 0 AND win_rate <= 1),
  trade_count    integer DEFAULT 0 CHECK (trade_count >= 0),
  created_at     timestamptz DEFAULT now(),
  UNIQUE(snapshot_date)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_date ON performance_snapshots(snapshot_date DESC);

-- 코멘트 추가
COMMENT ON TABLE performance_snapshots IS '성과 스냅샷 (일별, trade_history 기반 자동 계산)';
COMMENT ON COLUMN performance_snapshots.snapshot_date IS '스냅샷 날짜 (하루 1개만 저장)';
COMMENT ON COLUMN performance_snapshots.total_value IS '총 자산 (원)';
COMMENT ON COLUMN performance_snapshots.cash IS '현금 보유액 (원)';
COMMENT ON COLUMN performance_snapshots.return_1m IS '1개월 수익률 (0.05 = 5%)';
COMMENT ON COLUMN performance_snapshots.return_3m IS '3개월 수익률';
COMMENT ON COLUMN performance_snapshots.return_ytd IS 'YTD 수익률 (연초 대비)';
COMMENT ON COLUMN performance_snapshots.sharpe_ratio IS '샤프지수 (연율화)';
COMMENT ON COLUMN performance_snapshots.max_dd IS '최대 낙폭 (0.15 = -15%)';
COMMENT ON COLUMN performance_snapshots.win_rate IS '승률 (0.65 = 65%)';
COMMENT ON COLUMN performance_snapshots.trade_count IS '총 거래 횟수';

-- RLS 정책 (선택사항 - 필요시 주석 해제)
-- ALTER TABLE performance_snapshots ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON performance_snapshots FOR ALL USING (true);
