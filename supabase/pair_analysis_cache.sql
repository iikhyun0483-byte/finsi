-- Pair Analysis 캐시 테이블 생성
-- 통계적 차익거래 분석 결과를 10분간 캐싱

CREATE TABLE IF NOT EXISTS pair_analysis_cache (
  cache_key VARCHAR(100) PRIMARY KEY,  -- symbol1_symbol2_lookback
  symbol1 VARCHAR(20) NOT NULL,
  symbol2 VARCHAR(20) NOT NULL,
  lookback INTEGER NOT NULL,
  correlation DECIMAL(10,6),
  hedge_ratio DECIMAL(10,6),
  current_z_score DECIMAL(10,6),
  spread_mean DECIMAL(15,6),
  spread_std DECIMAL(15,6),
  half_life_num DECIMAL(10,2),    -- 숫자형 Half-Life
  half_life_str VARCHAR(20),      -- "발산" 문자열
  is_paired BOOLEAN DEFAULT false,
  data_points INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pair_cache_updated
  ON pair_analysis_cache(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_pair_cache_symbols
  ON pair_analysis_cache(symbol1, symbol2);

-- Row Level Security (RLS) 정책
ALTER TABLE pair_analysis_cache ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Anyone can read pair_analysis_cache" ON pair_analysis_cache
  FOR SELECT USING (true);

-- 인증된 사용자만 수정 가능 (API 서버용)
CREATE POLICY "Service role can modify pair_analysis_cache" ON pair_analysis_cache
  FOR ALL USING (auth.role() = 'service_role');

-- 주석
COMMENT ON TABLE pair_analysis_cache IS '통계적 차익거래 분석 결과 캐시 (10분 유효)';
COMMENT ON COLUMN pair_analysis_cache.cache_key IS '캐시 키: symbol1_symbol2_lookback';
COMMENT ON COLUMN pair_analysis_cache.correlation IS '피어슨 상관계수';
COMMENT ON COLUMN pair_analysis_cache.hedge_ratio IS 'OLS 헤지 비율 (beta)';
COMMENT ON COLUMN pair_analysis_cache.current_z_score IS '현재 Z-Score';
COMMENT ON COLUMN pair_analysis_cache.spread_mean IS '스프레드 평균';
COMMENT ON COLUMN pair_analysis_cache.spread_std IS '스프레드 표준편차';
COMMENT ON COLUMN pair_analysis_cache.half_life_num IS 'Half-Life (일 단위, 숫자)';
COMMENT ON COLUMN pair_analysis_cache.half_life_str IS 'Half-Life (발산 등 문자열)';
COMMENT ON COLUMN pair_analysis_cache.is_paired IS '공적분 관계 성립 여부';
COMMENT ON COLUMN pair_analysis_cache.data_points IS '사용된 데이터 포인트 수';
COMMENT ON COLUMN pair_analysis_cache.updated_at IS '마지막 업데이트 시각 (10분 후 만료)';
