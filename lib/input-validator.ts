// lib/input-validator.ts

export type FieldKey =
  | 'currentAge' | 'retirementAge' | 'deathAge' | 'pensionStartAge'
  | 'currentAssets' | 'currentLiabilities' | 'monthlyIncome' | 'monthlyExpense'
  | 'retirementMonthlyExpense' | 'pensionMonthly' | 'initialCapital' | 'principal'
  | 'annualReturn' | 'annualVolatility' | 'investmentReturn' | 'investmentVolatility'
  | 'incomeGrowthRate' | 'expenseInflationRate' | 'annualRate'
  | 'homeAppreciationRate' | 'jeonseAppreciationRate' | 'monthlyVariableCostRate'
  | 'monthlyGrowthRate' | 'propertyTaxRate'
  | 'months' | 'mortgageMonths' | 'analysisYears' | 'simulations'
  | 'timeValue' | 'withdrawalRate' | 'monthlyRevenue' | 'monthlyFixedCost'
  | 'buyPrice' | 'jeonseDeposit' | 'cashReserve'

export interface FieldRule {
  min?: number
  max?: number
  required?: boolean
  integer?: boolean
  label: string
  unit?: string   // 표시용 단위 (%, 원, 개월 등)
}

export const RULES: Record<FieldKey, FieldRule> = {
  currentAge:               { min: 1,    max: 100,       required: true,  integer: true,  label: '현재 나이',           unit: '세' },
  retirementAge:            { min: 20,   max: 100,       required: true,  integer: true,  label: '은퇴 나이',           unit: '세' },
  deathAge:                 { min: 30,   max: 120,       required: false, integer: true,  label: '기대 수명',           unit: '세' },
  pensionStartAge:          { min: 50,   max: 80,        required: false, integer: true,  label: '연금 수령 나이',      unit: '세' },
  currentAssets:            { min: 0,                    required: false,                 label: '현재 자산',           unit: '원' },
  currentLiabilities:       { min: 0,                    required: false,                 label: '현재 부채',           unit: '원' },
  monthlyIncome:            { min: 0,                    required: true,                  label: '월 소득',             unit: '원' },
  monthlyExpense:           { min: 0,                    required: true,                  label: '월 지출',             unit: '원' },
  retirementMonthlyExpense: { min: 0,                    required: false,                 label: '은퇴 후 월 지출',     unit: '원' },
  pensionMonthly:           { min: 0,                    required: false,                 label: '국민연금 월액',       unit: '원' },
  initialCapital:           { min: 1,                    required: true,                  label: '초기 자산',           unit: '원' },
  principal:                { min: 1,                    required: true,                  label: '대출 원금',           unit: '원' },
  buyPrice:                 { min: 1,                    required: true,                  label: '매수가',              unit: '원' },
  jeonseDeposit:            { min: 1,                    required: true,                  label: '전세 보증금',         unit: '원' },
  cashReserve:              { min: 0,                    required: false,                 label: '보유 현금',           unit: '원' },
  monthlyRevenue:           { min: 0,                    required: true,                  label: '월 매출',             unit: '원' },
  monthlyFixedCost:         { min: 0,                    required: true,                  label: '월 고정비',           unit: '원' },
  annualReturn:             { min: -50,  max: 100,       required: true,                  label: '연 수익률',           unit: '%' },
  annualVolatility:         { min: 0.1,  max: 200,       required: true,                  label: '연 변동성',           unit: '%' },
  investmentReturn:         { min: -50,  max: 100,       required: false,                 label: '연 투자수익률',       unit: '%' },
  investmentVolatility:     { min: 0.1,  max: 200,       required: false,                 label: '연 변동성',           unit: '%' },
  incomeGrowthRate:         { min: -20,  max: 50,        required: false,                 label: '소득 증가율',         unit: '%' },
  expenseInflationRate:     { min: 0,    max: 30,        required: false,                 label: '물가 상승률',         unit: '%' },
  annualRate:               { min: 0,    max: 50,        required: true,                  label: '연 이자율',           unit: '%' },
  homeAppreciationRate:     { min: -30,  max: 50,        required: false,                 label: '집값 상승률',         unit: '%' },
  jeonseAppreciationRate:   { min: -20,  max: 50,        required: false,                 label: '전세가 상승률',       unit: '%' },
  monthlyVariableCostRate:  { min: 0,    max: 99,        required: false,                 label: '변동비율',            unit: '%' },
  monthlyGrowthRate:        { min: -50,  max: 100,       required: false,                 label: '월 성장률',           unit: '%' },
  propertyTaxRate:          { min: 0,    max: 5,         required: false,                 label: '재산세율',            unit: '%' },
  withdrawalRate:           { min: 0,    max: 100,       required: false,                 label: '연 인출률',           unit: '%' },
  months:                   { min: 1,    max: 600,       required: true,  integer: true,  label: '기간',                unit: '개월' },
  mortgageMonths:           { min: 1,    max: 600,       required: false, integer: true,  label: '대출 기간',           unit: '개월' },
  analysisYears:            { min: 1,    max: 50,        required: true,  integer: true,  label: '비교 기간',           unit: '년' },
  simulations:              { min: 1000, max: 1_000_000, required: false, integer: true,  label: '시뮬레이션 횟수',     unit: '회' },
  timeValue:                { min: 0.1,                  required: true,                  label: '기간',                unit: '' },
}

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export function validate(
  values: Record<string, string>,
  keys: FieldKey[],
  extras?: Record<string, string>   // 논리 관계 에러 추가
): ValidationResult {
  const errors: Record<string, string> = { ...extras }

  for (const key of keys) {
    if (errors[key]) continue  // 이미 에러 있으면 스킵
    const rule = RULES[key]
    if (!rule) continue
    const raw = values[key] ?? ''
    const val = parseFloat(raw)

    if (rule.required && (raw.trim() === '' || isNaN(val))) {
      errors[key] = `${rule.label}을(를) 입력하세요`
      continue
    }
    if (raw.trim() === '') continue
    if (isNaN(val)) { errors[key] = `${rule.label}: 숫자를 입력하세요`; continue }
    if (rule.min !== undefined && val < rule.min) {
      errors[key] = `${rule.label} 최솟값: ${rule.min}${rule.unit ?? ''}`
      continue
    }
    if (rule.max !== undefined && val > rule.max) {
      errors[key] = `${rule.label} 최댓값: ${rule.max}${rule.unit ?? ''}`
      continue
    }
    if (rule.integer && !Number.isInteger(val)) {
      errors[key] = `${rule.label}: 소수점 없이 입력하세요`
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

// 입력값 실시간 정제 — onChange에서 직접 사용
export function sanitize(value: string, key: FieldKey): string {
  const rule = RULES[key]
  if (!rule) return value
  // 숫자/소수점/마이너스만 허용
  let cleaned = value.replace(/[^0-9.-]/g, '')
  // 마이너스는 맨 앞에만
  if (cleaned.indexOf('-') > 0) cleaned = cleaned.replace(/-/g, '')
  if (cleaned === '' || cleaned === '-') return cleaned
  const num = parseFloat(cleaned)
  if (isNaN(num)) return ''
  // 최댓값 초과 시 즉시 클램핑
  if (rule.max !== undefined && num > rule.max) return String(rule.max)
  return cleaned
}

// 논리 관계 검증 — 별도 호출
export function validateLifecycleLogic(
  currentAge: string, retirementAge: string, deathAge: string
): Record<string, string> {
  const errors: Record<string, string> = {}
  const ca = parseFloat(currentAge), ra = parseFloat(retirementAge), da = parseFloat(deathAge)
  if (!isNaN(ca) && !isNaN(ra) && ra <= ca)
    errors.retirementAge = `은퇴 나이는 현재 나이(${ca}세)보다 커야 합니다`
  if (!isNaN(ra) && !isNaN(da) && da <= ra)
    errors.deathAge = `기대 수명은 은퇴 나이(${ra}세)보다 커야 합니다`
  return errors
}
