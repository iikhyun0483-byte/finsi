-- 동적 심볼 설정 테이블 (하드코딩 제거)
CREATE TABLE IF NOT EXISTS symbol_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('stock', 'crypto', 'commodity', 'bond', 'reit')),
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_symbol_config_enabled ON symbol_config(enabled, priority DESC);
CREATE INDEX idx_symbol_config_type ON symbol_config(asset_type, enabled);

-- 기본 심볼 데이터 삽입 (하드코딩 대체)
INSERT INTO symbol_config (symbol, name, asset_type, enabled, priority) VALUES
  -- 주식 ETF
  ('SPY', 'S&P 500', 'stock', true, 100),
  ('QQQ', 'NASDAQ 100', 'stock', true, 90),
  ('DIA', '다우존스', 'stock', true, 80),
  ('IWM', '러셀 2000', 'stock', true, 70),

  -- 원자재
  ('GLD', '금', 'commodity', true, 60),
  ('SLV', '은', 'commodity', true, 50),
  ('USO', '원유', 'commodity', true, 40),
  ('XLE', '에너지 섹터', 'commodity', true, 30),

  -- 채권
  ('TLT', '장기 국채', 'bond', true, 20),
  ('IEF', '중기 국채', 'bond', true, 15),
  ('SHY', '단기 국채', 'bond', true, 10),
  ('AGG', '종합 채권', 'bond', true, 5),

  -- 리츠
  ('VNQ', '부동산 리츠', 'reit', true, 25),
  ('IYR', '미국 부동산', 'reit', true, 20),

  -- 암호화폐
  ('BTC', '비트코인', 'crypto', true, 100),
  ('ETH', '이더리움', 'crypto', true, 90),
  ('SOL', '솔라나', 'crypto', true, 80),
  ('XRP', '리플', 'crypto', true, 70),
  ('ADA', '카르다노', 'crypto', true, 60),
  ('DOGE', '도지코인', 'crypto', true, 50),
  ('DOT', '폴카닷', 'crypto', true, 40),
  ('AVAX', '아발란체', 'crypto', true, 30)
ON CONFLICT (symbol) DO UPDATE
SET name = EXCLUDED.name,
    asset_type = EXCLUDED.asset_type,
    priority = EXCLUDED.priority,
    updated_at = NOW();

-- 시스템 설정 테이블
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 캐시 시간 설정 (하드코딩 제거)
INSERT INTO system_config (key, value, description) VALUES
  ('CACHE_CRYPTO_MINUTES', '5', '암호화폐 데이터 캐시 시간 (분)'),
  ('CACHE_EXCHANGE_MINUTES', '60', '환율 캐시 시간 (분)'),
  ('CACHE_NEWS_MINUTES', '60', '뉴스 캐시 시간 (분)'),
  ('API_RETRY_COUNT', '3', 'API 재시도 횟수'),
  ('API_RETRY_DELAY_MS', '500', 'API 재시도 딜레이 (밀리초)'),
  ('API_CALL_DELAY_MS', '100', 'API 호출 간 딜레이 (밀리초)'),
  ('DEFAULT_VIX', '15', '기본 VIX 값 (실시간 조회 실패시)'),
  ('DEFAULT_FED_RATE', '3.5', '기본 기준금리 (%)'),
  ('DEFAULT_BUFFETT', '100', '기본 Buffett Indicator'),
  ('DEFAULT_WIN_RATE', '50', '기본 승률 (%)'),
  ('MAX_SIGNALS_COUNT', '20', '최대 신호 개수')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();

COMMENT ON TABLE symbol_config IS '동적 심볼 설정 (하드코딩 제거)';
COMMENT ON TABLE system_config IS '시스템 설정 (캐시, API 딜레이 등)';
