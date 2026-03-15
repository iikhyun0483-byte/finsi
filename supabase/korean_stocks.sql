-- 한국 주식 테이블 생성
CREATE TABLE IF NOT EXISTS korean_stocks (
  code VARCHAR(6) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  market VARCHAR(10) NOT NULL CHECK (market IN ('KOSPI', 'KOSDAQ')),
  category VARCHAR(20) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_korean_stocks_category ON korean_stocks(category);
CREATE INDEX IF NOT EXISTS idx_korean_stocks_market ON korean_stocks(market);
CREATE INDEX IF NOT EXISTS idx_korean_stocks_enabled ON korean_stocks(enabled);

-- 데이터 삽입 (34개 종목)
INSERT INTO korean_stocks (code, name, market, category) VALUES
-- 대형주
('005930', '삼성전자', 'KOSPI', '대형주'),
('000660', 'SK하이닉스', 'KOSPI', '대형주'),
('373220', 'LG에너지솔루션', 'KOSPI', '대형주'),
('207940', '삼성바이오로직스', 'KOSPI', '대형주'),
('005380', '현대차', 'KOSPI', '대형주'),
('000270', '기아', 'KOSPI', '대형주'),
('005490', 'POSCO홀딩스', 'KOSPI', '대형주'),
('105560', 'KB금융', 'KOSPI', '대형주'),

-- 성장주
('247540', '에코프로비엠', 'KOSDAQ', '성장주'),
('068270', '셀트리온', 'KOSPI', '성장주'),
('293490', '카카오게임즈', 'KOSDAQ', '성장주'),
('263750', '펄어비스', 'KOSDAQ', '성장주'),
('028300', 'HLB', 'KOSDAQ', '성장주'),
('141080', '리가켐바이오', 'KOSDAQ', '성장주'),

-- AI/반도체
('042700', '한미반도체', 'KOSDAQ', 'AI/반도체'),
('058470', '리노공업', 'KOSDAQ', 'AI/반도체'),
('403870', 'HPSP', 'KOSDAQ', 'AI/반도체'),
('007660', '이수페타시스', 'KOSDAQ', 'AI/반도체'),
('394280', '오픈엣지테크놀로지', 'KOSDAQ', 'AI/반도체'),

-- 2차전지
('086520', '에코프로', 'KOSDAQ', '2차전지'),
('003670', '포스코퓨처엠', 'KOSPI', '2차전지'),
('066970', '엘앤에프', 'KOSPI', '2차전지'),
('006400', '삼성SDI', 'KOSPI', '2차전지'),

-- 바이오
('000100', '유한양행', 'KOSPI', '바이오'),
('128940', '한미약품', 'KOSPI', '바이오'),
('196170', '알테오젠', 'KOSDAQ', '바이오'),

-- 방산
('012450', '한화에어로스페이스', 'KOSPI', '방산'),
('079550', 'LIG넥스원', 'KOSPI', '방산'),
('064350', '현대로템', 'KOSPI', '방산'),

-- ETF
('069500', 'KODEX200', 'KOSPI', 'ETF'),
('091160', 'KODEX반도체', 'KOSPI', 'ETF'),
('133690', 'TIGER나스닥100', 'KOSPI', 'ETF'),
('305720', 'KODEX2차전지산업', 'KOSPI', 'ETF'),
('227830', 'TIGER방산', 'KOSPI', 'ETF')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  market = EXCLUDED.market,
  category = EXCLUDED.category,
  updated_at = NOW();

-- Row Level Security (RLS) 정책
ALTER TABLE korean_stocks ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Anyone can read korean_stocks" ON korean_stocks
  FOR SELECT USING (true);

-- 인증된 사용자만 수정 가능 (선택사항)
-- CREATE POLICY "Authenticated users can modify korean_stocks" ON korean_stocks
--   FOR ALL USING (auth.role() = 'authenticated');
