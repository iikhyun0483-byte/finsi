-- Macro 관련 테이블 스키마
-- 생성일: 2025-03-15

-- 1. macro_data 테이블 (매크로 경제 지표)
CREATE TABLE IF NOT EXISTS macro_data (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_type  text NOT NULL UNIQUE,
  value           numeric NOT NULL,
  signal          text CHECK (signal IN ('RISK_ON', 'RISK_OFF', 'NEUTRAL')),
  source          text,
  impact          text,
  updated_at      timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  CONSTRAINT valid_indicator CHECK (indicator_type IN ('VIX', 'DXY', 'FEDFUNDS', 'UNRATE', 'CPIAUCSL_PCH', 'T10Y2Y'))
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_macro_data_indicator ON macro_data(indicator_type);
CREATE INDEX IF NOT EXISTS idx_macro_data_updated ON macro_data(updated_at DESC);

-- 코멘트 추가
COMMENT ON TABLE macro_data IS '매크로 경제 지표 (VIX, 금리, 실업률, CPI 등)';
COMMENT ON COLUMN macro_data.indicator_type IS '지표 종류 (VIX, DXY, FEDFUNDS, UNRATE, CPIAUCSL_PCH, T10Y2Y)';
COMMENT ON COLUMN macro_data.value IS '지표 값';
COMMENT ON COLUMN macro_data.signal IS '신호 (RISK_ON: 안전, RISK_OFF: 위험, NEUTRAL: 중립)';
COMMENT ON COLUMN macro_data.source IS '데이터 출처 (Yahoo Finance, FRED 등)';
COMMENT ON COLUMN macro_data.impact IS '영향 설명';

-- RLS 정책 (선택사항 - 필요시 주석 해제)
-- ALTER TABLE macro_data ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON macro_data FOR ALL USING (true);
