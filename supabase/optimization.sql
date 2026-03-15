-- Optimization 관련 테이블 스키마
-- 생성일: 2025-03-15

-- 1. signal_tracking 테이블 (신호 추적 및 정확도 측정)
CREATE TABLE IF NOT EXISTS signal_tracking (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol          text NOT NULL,
  signal_date     date NOT NULL,
  signal_type     text CHECK (signal_type IN ('BUY', 'SELL')),
  signal_score    integer CHECK (signal_score >= 0 AND signal_score <= 100),
  entry_price     numeric NOT NULL CHECK (entry_price > 0),
  price_7d        numeric,
  return_7d       numeric,
  is_correct_7d   boolean,
  price_30d       numeric,
  return_30d      numeric,
  is_correct_30d  boolean,
  is_backfilled   boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(symbol, signal_date, signal_type)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_signal_tracking_symbol ON signal_tracking(symbol);
CREATE INDEX IF NOT EXISTS idx_signal_tracking_date ON signal_tracking(signal_date DESC);
CREATE INDEX IF NOT EXISTS idx_signal_tracking_correct_7d ON signal_tracking(is_correct_7d) WHERE is_correct_7d IS NOT NULL;

-- 코멘트 추가
COMMENT ON TABLE signal_tracking IS '신호 추적 및 정확도 측정 (7일/30일 수익률)';
COMMENT ON COLUMN signal_tracking.signal_score IS '신호 점수 (0-100, 팩터 가중치 합산)';
COMMENT ON COLUMN signal_tracking.is_correct_7d IS '7일 후 신호 정확도 (BUY면 상승, SELL이면 하락)';
COMMENT ON COLUMN signal_tracking.is_backfilled IS '과거 데이터 백필 여부';

-- 2. optimization_log 테이블 (최적화 실행 이력)
CREATE TABLE IF NOT EXISTS optimization_log (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_date      date NOT NULL DEFAULT CURRENT_DATE,
  signal_count  integer,
  accuracy_7d   numeric CHECK (accuracy_7d >= 0 AND accuracy_7d <= 1),
  best_factors  jsonb,
  changes_made  jsonb,
  created_at    timestamptz DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_optimization_log_date ON optimization_log(run_date DESC);

-- 코멘트 추가
COMMENT ON TABLE optimization_log IS '파라미터 최적화 실행 이력';
COMMENT ON COLUMN optimization_log.best_factors IS '최적 팩터 가중치 (JSON: {momentum, value, quality, lowVol, volume})';
COMMENT ON COLUMN optimization_log.changes_made IS '권장 변경사항 배열 (JSON)';

-- 3. settings 테이블에 팩터 가중치 컬럼 추가
-- settings 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS settings (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           text DEFAULT 'default',
  factor_weights    jsonb DEFAULT '{"momentum": 0.25, "value": 0.20, "quality": 0.25, "lowVol": 0.15, "volume": 0.15}'::jsonb,
  min_signal_score  integer DEFAULT 70 CHECK (min_signal_score >= 0 AND min_signal_score <= 100),
  last_optimized_at timestamptz,
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- 기본 설정 삽입
INSERT INTO settings (user_id, factor_weights, min_signal_score)
VALUES ('default', '{"momentum": 0.25, "value": 0.20, "quality": 0.25, "lowVol": 0.15, "volume": 0.15}'::jsonb, 70)
ON CONFLICT (user_id) DO NOTHING;

-- 코멘트 추가
COMMENT ON TABLE settings IS '사용자 설정 (팩터 가중치, 신호 임계값 등)';
COMMENT ON COLUMN settings.factor_weights IS '최적화된 팩터 가중치 (자동 업데이트)';
COMMENT ON COLUMN settings.min_signal_score IS '최소 신호 점수 임계값 (자동 조정 가능)';
COMMENT ON COLUMN settings.last_optimized_at IS '마지막 최적화 실행 시각';

-- RLS 정책 (선택사항 - 필요시 주석 해제)
-- ALTER TABLE signal_tracking ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE optimization_log ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON signal_tracking FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON optimization_log FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON settings FOR ALL USING (true);
