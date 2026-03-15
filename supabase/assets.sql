-- 자산 관리 관련 테이블 스키마
-- 생성일: 2026-03-16

-- 1. 비금융 자산 테이블
CREATE TABLE IF NOT EXISTS assets_non_stock (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  name text NOT NULL,
  purchase_price numeric DEFAULT 0,
  current_value numeric NOT NULL,
  purchase_date date,
  currency text DEFAULT 'KRW',
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_assets_non_stock_category ON assets_non_stock(category);
CREATE INDEX IF NOT EXISTS idx_assets_non_stock_created_at ON assets_non_stock(created_at DESC);

-- 코멘트 추가
COMMENT ON TABLE assets_non_stock IS '비금융 자산 (부동산, 차량, 귀금속, 현금, 보험, 지식재산 등)';
COMMENT ON COLUMN assets_non_stock.category IS '자산 카테고리 (부동산, 차량, 귀금속, 현금, 보험, 지식재산, 기타)';
COMMENT ON COLUMN assets_non_stock.name IS '자산 이름';
COMMENT ON COLUMN assets_non_stock.purchase_price IS '취득가 (원)';
COMMENT ON COLUMN assets_non_stock.current_value IS '현재 가치 (원)';
COMMENT ON COLUMN assets_non_stock.purchase_date IS '취득일';
COMMENT ON COLUMN assets_non_stock.currency IS '통화 (기본: KRW)';
COMMENT ON COLUMN assets_non_stock.note IS '메모';

-- 2. 부채 테이블
CREATE TABLE IF NOT EXISTS liabilities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  principal numeric DEFAULT 0,
  remaining numeric NOT NULL,
  interest_rate numeric DEFAULT 0,
  due_date date,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_liabilities_created_at ON liabilities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_liabilities_due_date ON liabilities(due_date);

-- 코멘트 추가
COMMENT ON TABLE liabilities IS '부채 (대출, 신용카드, 기타 부채)';
COMMENT ON COLUMN liabilities.name IS '부채 이름 (예: 주택담보대출)';
COMMENT ON COLUMN liabilities.principal IS '원금 (원)';
COMMENT ON COLUMN liabilities.remaining IS '잔액 (원)';
COMMENT ON COLUMN liabilities.interest_rate IS '이자율 (%)';
COMMENT ON COLUMN liabilities.due_date IS '상환일/만기일';
COMMENT ON COLUMN liabilities.note IS '메모';

-- 3. 현금흐름 테이블
CREATE TABLE IF NOT EXISTS cashflow (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text,
  amount numeric NOT NULL,
  date date NOT NULL,
  currency text DEFAULT 'KRW',
  note text,
  created_at timestamptz DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_cashflow_date ON cashflow(date DESC);
CREATE INDEX IF NOT EXISTS idx_cashflow_type ON cashflow(type);
CREATE INDEX IF NOT EXISTS idx_cashflow_category ON cashflow(category);

-- 코멘트 추가
COMMENT ON TABLE cashflow IS '현금흐름 (수입/지출)';
COMMENT ON COLUMN cashflow.type IS '타입 (income: 수입, expense: 지출)';
COMMENT ON COLUMN cashflow.category IS '카테고리 (월급, 식비, 교통비 등)';
COMMENT ON COLUMN cashflow.amount IS '금액 (원)';
COMMENT ON COLUMN cashflow.date IS '날짜';
COMMENT ON COLUMN cashflow.currency IS '통화 (기본: KRW)';
COMMENT ON COLUMN cashflow.note IS '메모';

-- RLS 정책 (선택사항 - 필요시 주석 해제)
-- ALTER TABLE assets_non_stock ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON assets_non_stock FOR ALL USING (true);

-- ALTER TABLE liabilities ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON liabilities FOR ALL USING (true);

-- ALTER TABLE cashflow ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON cashflow FOR ALL USING (true);
