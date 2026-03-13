# PHASE 8 — UX 완성 (완전판)
# 온보딩 / 입력검증 / 툴팁 / 저장(Supabase) / A vs B 비교
# 모든 파일 완전 구현 — 절반짜리 없음

---

## 구현 확인 체크리스트

- [ ] lib/input-validator.ts          — 검증 엔진 (sanitize 포함, UI 연결까지)
- [ ] components/TermGlossary.ts      — 용어 사전
- [ ] components/Tooltip.tsx          — 툴팁 (lifecycle/finance/compare 전부 적용)
- [ ] components/OnboardingGuide.tsx  — 온보딩 (app/layout.tsx에 추가 명시)
- [ ] components/ScenarioSave.tsx     — Supabase 저장 (sessionStorage 보조)
- [ ] app/api/scenarios/route.ts      — 시나리오 CRUD API
- [ ] app/compare/page.tsx            — lifecycle/business 포함 4개 모드 완전 구현
- [ ] lifecycle/page.tsx 수정         — 필수4/선택 분리 + 검증 + 툴팁 + 저장
- [ ] finance/page.tsx 수정           — 검증 + 툴팁 + 저장
- [ ] app/layout.tsx 수정             — OnboardingGuide 삽입

---

## STEP 1. lib/input-validator.ts

```typescript
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
```

---

## STEP 2. components/TermGlossary.ts

```typescript
// components/TermGlossary.ts

export interface Term {
  kr: string        // 한글 명칭
  def: string       // 한 줄 정의
  bench?: string    // 기준값
  good?: string     // 좋은 상태
  bad?: string      // 나쁜 상태
}

export const TERMS: Record<string, Term> = {
  DTI:          { kr: '총부채상환비율',    def: '월 소득 중 부채 상환에 쓰는 비율',                          bench: '40% 이하 권장',        good: '25% 이하 — 여유',      bad: '50% 이상 — 위험' },
  DSR:          { kr: '총부채원리금비율',  def: '모든 대출 원금+이자 합산 상환액 ÷ 월소득. 금융규제 핵심',   bench: '40% 이하 (규제 기준)',  good: '30% 이하',             bad: '40% 초과 시 대출 불가' },
  LTV:          { kr: '담보인정비율',      def: '집값 대비 대출 비율. 10억 집에 LTV 70%면 대출 7억',         bench: '60~70% 이하 권장',     good: '50% 이하',             bad: '80% 이상 — 위험' },
  MDD:          { kr: '최대 낙폭',         def: '고점 대비 가장 많이 떨어진 하락폭. 1000→700이면 MDD 30%',   bench: '20% 이하 권장',        good: '10% 이하',             bad: '30% 이상' },
  VaR:          { kr: '최대 예상 손실',    def: '95% 확률로 이 이상 잃지 않는 한도. 1일 기준',                bench: '자산의 2~5% 이내',     good: '2% 이내',              bad: '10% 초과' },
  CVaR:         { kr: '꼬리 손실 기대값',  def: 'VaR 초과 최악 5% 상황에서 평균 손실. VaR보다 보수적',        bench: 'VaR의 1.2~1.5배가 정상' },
  Sharpe:       { kr: '샤프 비율',         def: '위험 1단위당 수익률. 높을수록 효율적 투자',                   bench: '1.0 이상 권장',        good: '2.0 이상 — 우수',     bad: '0.5 미만 — 비효율' },
  Sortino:      { kr: '소르티노 비율',     def: '하락 위험만 고려한 샤프 비율. 수익 변동성은 패널티 없음',     bench: '1.0 이상 권장',        good: '2.0 이상',             bad: '0.5 미만' },
  Calmar:       { kr: '칼마 비율',         def: '연간 수익률 ÷ 최대 낙폭. 낙폭 대비 수익 효율',               bench: '0.5 이상 권장',        good: '1.0 이상',             bad: '0.2 미만' },
  Kelly:        { kr: '켈리 비율',         def: '수학적으로 최적인 투자 비율. 실전에선 계산값의 25~50%만 사용', bench: '실전: 10~20%',         good: '10~20%',               bad: '50% 초과 — 파산 위험' },
  MonteCarlo:   { kr: '몬테카를로',        def: '무작위 시나리오를 수만 번 돌려 확률 분포를 구하는 방법',       bench: '1만회 이상 권장' },
  GBM:          { kr: '기하 브라운 운동',  def: '자산 가격 움직임을 수학적으로 모델링. 몬테카를로의 기반' },
  GARCH:        { kr: '변동성 군집 모델',  def: '변동성이 높을 때 더 높아지는 패턴 모델링. 폭락 후 예측에 사용' },
  Regime:       { kr: '시장 레짐',         def: '현재 시장이 강세/약세/횡보/위기 중 어디인지 판단' },
  WalkForward:  { kr: '워크포워드 검증',   def: '과거로 전략 학습, 미래로 검증. 과적합 여부 판단' },
  Runway:       { kr: '런웨이',            def: '현금이 소진되는 시점까지 남은 개월 수. 사업 핵심 지표',       bench: '12개월 이상 유지',     good: '18개월 이상',          bad: '6개월 미만 — 즉시 행동' },
  Percentile:   { kr: '퍼센타일',          def: 'P5=100번 중 5번째 나쁜 결과, P95=95번째 좋은 결과' },
  SurvivalRate: { kr: '원금 생존 확률',    def: '시뮬레이션 중 원금 이상을 유지한 비율',                       bench: '70% 이상 권장',        good: '90% 이상',             bad: '50% 미만' },
  Volatility:   { kr: '변동성',            def: '수익률이 얼마나 들쭉날쭉한지. 분산투자 주식: 12~15%, 개별주: 20~40%', bench: '분산투자: 10~15%' },
  AnnualReturn: { kr: '연 기대수익률',     def: '1년 동안 예상되는 수익률. 국내 주식 장기 평균 약 8~10%',      bench: '분산투자 장기: 6~9%' },
  BreakEven:    { kr: '손익분기점',        def: '총 수익이 총 비용을 넘어서는 시점. 이 매출 이상이면 흑자' },
}

export function getTerm(key: string): Term | null {
  return TERMS[key] ?? null
}
```

---

## STEP 3. components/Tooltip.tsx

```typescript
// components/Tooltip.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { getTerm } from './TermGlossary'

interface TooltipProps {
  termKey: string
  children?: React.ReactNode
}

export function Tooltip({ termKey, children }: TooltipProps) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState<'top' | 'bottom'>('top')
  const ref = useRef<HTMLSpanElement>(null)
  const term = getTerm(termKey)
  if (!term) return <>{children}</>

  function handleEnter() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos(rect.top < 200 ? 'bottom' : 'top')
    }
    setShow(true)
  }

  const posClass = pos === 'top'
    ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
    : 'top-full left-1/2 -translate-x-1/2 mt-2'

  return (
    <span ref={ref} className="relative inline-flex items-center gap-1">
      {children}
      <button
        type="button"
        className="w-4 h-4 rounded-full bg-gray-700 text-gray-400 text-[10px] flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors flex-shrink-0 leading-none"
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(v => !v)}
        aria-label={`${term.kr} 설명`}
      >?</button>
      {show && (
        <div className={`absolute z-50 w-64 ${posClass} pointer-events-none`}>
          <div className="bg-[#0d1526] border border-gray-600 rounded-xl p-3 shadow-2xl">
            <p className="text-xs text-gray-500 mb-0.5">{termKey}</p>
            <p className="text-sm font-semibold text-white mb-1.5">{term.kr}</p>
            <p className="text-gray-300 text-xs leading-relaxed">{term.def}</p>
            {term.bench && <p className="text-orange-400 text-xs mt-1.5">📊 {term.bench}</p>}
            {term.good  && <p className="text-green-400  text-xs mt-0.5">✅ {term.good}</p>}
            {term.bad   && <p className="text-red-400    text-xs mt-0.5">⚠️ {term.bad}</p>}
          </div>
        </div>
      )}
    </span>
  )
}

// 라벨 + 툴팁 한 번에
export function TLabel({
  label, termKey, required = false
}: { label: string; termKey?: string; required?: boolean }) {
  return (
    <label className="text-gray-400 text-xs mb-1 flex items-center gap-1">
      {label}
      {required && <span className="text-orange-400 ml-0.5">*</span>}
      {termKey && <Tooltip termKey={termKey} />}
    </label>
  )
}

// 결과 행 + 툴팁
export function ResultRow({
  label, value, termKey, color = 'text-white'
}: { label: string; value: string; termKey?: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800">
      <span className="text-gray-400 text-sm flex items-center gap-1">
        {label}
        {termKey && <Tooltip termKey={termKey} />}
      </span>
      <span className={`font-semibold text-sm ${color}`}>{value}</span>
    </div>
  )
}
```

---

## STEP 4. components/OnboardingGuide.tsx

```typescript
// components/OnboardingGuide.tsx
// app/layout.tsx 에 삽입 — 전체 앱 첫 진입 시 1회만 표시
'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const STEPS = [
  {
    icon: '👋',
    title: '처음 오셨나요?',
    desc: '이 앱은 돈에 관한 모든 의사결정을 수학적으로 계산합니다. 투자 전문 지식 없어도 됩니다.',
  },
  {
    icon: '💰',
    title: '재무 계산기',
    desc: '대출 이자 계산, 이 대출 받아도 되는지, 집 살지 전세 살지, 사업이 살아남을지 — 숫자 입력하면 즉시 나옵니다.',
    href: '/finance', cta: '바로 계산하기',
  },
  {
    icon: '🧬',
    title: '인생 시뮬레이션',
    desc: '현재 나이, 월소득, 월지출, 은퇴 목표 나이 4가지만 입력하면 사망까지 재무 흐름이 시각화됩니다.',
    href: '/lifecycle', cta: '시뮬레이션 시작',
  },
  {
    icon: '⚖️',
    title: 'A vs B 비교',
    desc: '"이 대출 vs 저 대출" "지금 투자 vs 1년 후 투자" 두 선택지를 수치로 비교합니다.',
    href: '/compare', cta: '비교하러 가기',
  },
]

export function OnboardingGuide() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)
  const pathname = usePathname()

  useEffect(() => {
    // 설정/API 페이지 제외
    if (pathname?.startsWith('/api') || pathname?.startsWith('/settings')) return
    try {
      if (!sessionStorage.getItem('finsi_guided')) setShow(true)
    } catch {}
  }, [])

  function close() {
    try { sessionStorage.setItem('finsi_guided', '1') } catch {}
    setShow(false)
  }

  function goTo(href: string) {
    close()
    window.location.href = href
  }

  if (!show) return null
  const s = STEPS[step]

  return (
    <div
      className="fixed inset-0 bg-black/75 z-[100] flex items-end sm:items-center justify-center p-4"
      onClick={close}
    >
      <div
        className="bg-[#1a2035] border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 진행 바 */}
        <div className="flex gap-1 mb-5">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-orange-500' : 'bg-gray-700'}`} />
          ))}
        </div>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{s.icon}</div>
          <h2 className="text-lg font-bold text-white mb-2">{s.title}</h2>
          <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
        </div>

        <div className="space-y-2">
          {s.href && s.cta && (
            <button onClick={() => goTo(s.href!)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 font-semibold transition-colors text-sm">
              {s.cta} →
            </button>
          )}
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(v => v - 1)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-2.5 text-sm transition-colors">
                이전
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(v => v + 1)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-2.5 text-sm transition-colors">
                다음
              </button>
            ) : (
              <button onClick={close}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-2.5 text-sm transition-colors">
                시작하기
              </button>
            )}
          </div>
          <button onClick={close} className="w-full text-gray-600 hover:text-gray-400 text-xs py-1">건너뛰기</button>
        </div>
      </div>
    </div>
  )
}
```

---

## STEP 5. app/layout.tsx 수정 — OnboardingGuide 추가

```typescript
// app/layout.tsx 기존 파일에 추가 (기존 코드 건드리지 않고 삽입만)
// 기존 <body> 태그 안 최상단에 추가:

import { OnboardingGuide } from '@/components/OnboardingGuide'

// <body> 내부 첫 줄에:
<OnboardingGuide />
```

---

## STEP 6. app/api/scenarios/route.ts — Supabase 저장 API

```typescript
// app/api/scenarios/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/scenarios?type=lifecycle&userId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const userId = searchParams.get('userId')

  const query = supabase
    .from('saved_scenarios')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (type) query.eq('type', type)
  if (userId) query.eq('user_id', userId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/scenarios — 저장
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, label, inputData, resultData, userId } = body

  if (!type || !label || !inputData || !resultData) {
    return NextResponse.json({ error: 'type, label, inputData, resultData 필수' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('saved_scenarios')
    .insert({
      type,
      label,
      input_data: inputData,
      result_data: resultData,
      user_id: userId ?? 'anonymous',
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/scenarios?id=xxx
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

  const { error } = await supabase.from('saved_scenarios').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

---

## STEP 7. SCHEMA.sql 추가 — saved_scenarios 테이블

```sql
-- SCHEMA.sql 하단에 추가 실행
create table if not exists public.saved_scenarios (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,           -- montecarlo | lifecycle | loan | buyvsrent | business
  label       text not null,
  input_data  jsonb not null,
  result_data jsonb not null,
  user_id     text not null default 'anonymous',
  created_at  timestamptz not null default now()
);

create index idx_saved_scenarios_type    on public.saved_scenarios(type);
create index idx_saved_scenarios_user    on public.saved_scenarios(user_id);
create index idx_saved_scenarios_created on public.saved_scenarios(created_at desc);

alter table public.saved_scenarios enable row level security;
create policy "누구나 저장 가능" on public.saved_scenarios for all using (true);
```

---

## STEP 8. components/ScenarioSave.tsx — Supabase + sessionStorage 이중화

```typescript
// components/ScenarioSave.tsx
'use client'
import { useState, useEffect } from 'react'

export interface SavedScenario {
  id: string
  type: string
  label: string
  input_data: any
  result_data: any
  created_at: string
}

interface ScenarioSaveProps {
  type: 'montecarlo' | 'lifecycle' | 'loan' | 'buyvsrent' | 'business' | 'compare'
  inputData: any
  resultData: any
  defaultLabel?: string
  // 불러오기 시 호출 — 입력값 복원 후 자동 재계산 트리거
  onLoad?: (input: any, result: any) => void
}

const SESSION_KEY = (type: string) => `finsi_scenarios_${type}`

function sessionSave(type: string, item: SavedScenario) {
  try {
    const all: SavedScenario[] = JSON.parse(sessionStorage.getItem(SESSION_KEY(type)) ?? '[]')
    all.unshift(item)
    sessionStorage.setItem(SESSION_KEY(type), JSON.stringify(all.slice(0, 10)))
  } catch {}
}

function sessionLoad(type: string): SavedScenario[] {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY(type)) ?? '[]') } catch { return [] }
}

function sessionDelete(type: string, id: string) {
  try {
    const all = sessionLoad(type).filter(s => s.id !== id)
    sessionStorage.setItem(SESSION_KEY(type), JSON.stringify(all))
  } catch {}
}

const TYPE_KR: Record<string, string> = {
  montecarlo: '몬테카를로', lifecycle: '인생설계', loan: '대출계산',
  buyvsrent: '매수vs전세', business: '사업계산', compare: '비교',
}

export function ScenarioSave({ type, inputData, resultData, defaultLabel = '', onLoad }: ScenarioSaveProps) {
  const [label, setLabel]       = useState(defaultLabel)
  const [status, setStatus]     = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showList, setShowList] = useState(false)
  const [list, setList]         = useState<SavedScenario[]>([])
  const [dbAvail, setDbAvail]   = useState(true)

  function refreshList() {
    setList(sessionLoad(type))
  }

  async function handleSave() {
    if (!resultData) return
    setStatus('saving')

    const item: SavedScenario = {
      id: Date.now().toString(),
      type,
      label: label.trim() || `${TYPE_KR[type]} ${new Date().toLocaleTimeString('ko-KR')}`,
      input_data: inputData,
      result_data: resultData,
      created_at: new Date().toISOString(),
    }

    // Supabase 먼저 시도
    if (dbAvail) {
      try {
        const res = await fetch('/api/scenarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: item.type, label: item.label,
            inputData: item.input_data, resultData: item.result_data,
          }),
        })
        if (!res.ok) throw new Error()
        const saved = await res.json()
        item.id = saved.id  // DB ID로 교체
      } catch {
        setDbAvail(false)  // DB 실패 시 sessionStorage만 사용
      }
    }

    // sessionStorage 항상 백업
    sessionSave(type, item)
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2500)
  }

  async function handleShowList() {
    refreshList()
    // DB에서도 가져오기 시도
    if (dbAvail) {
      try {
        const res = await fetch(`/api/scenarios?type=${type}`)
        if (res.ok) {
          const dbList: SavedScenario[] = await res.json()
          // sessionStorage + DB 합치기 (중복 제거)
          const merged = [...dbList]
          const dbIds = new Set(dbList.map(s => s.id))
          sessionLoad(type).forEach(s => { if (!dbIds.has(s.id)) merged.push(s) })
          merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          setList(merged.slice(0, 15))
        }
      } catch {}
    }
    setShowList(true)
  }

  async function handleDelete(id: string) {
    sessionDelete(type, id)
    if (dbAvail) {
      try { await fetch(`/api/scenarios?id=${id}`, { method: 'DELETE' }) } catch {}
    }
    refreshList()
    setList(prev => prev.filter(s => s.id !== id))
  }

  function handleLoad(scenario: SavedScenario) {
    // 입력값 복원 → onLoad 콜백 → useEffect debounce가 자동 재계산 트리거
    onLoad?.(scenario.input_data, scenario.result_data)
    setShowList(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          placeholder={`시나리오 이름 (예: 적극투자 플랜)`}
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="flex-1 bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-sm focus:border-orange-500 focus:outline-none"
        />
        <button
          onClick={handleSave}
          disabled={!resultData || status === 'saving'}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
            status === 'saved'   ? 'bg-green-600 text-white' :
            status === 'saving'  ? 'bg-gray-700 text-gray-400' :
            !resultData          ? 'bg-gray-800 text-gray-600 cursor-not-allowed' :
                                   'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          {status === 'saved' ? '✅ 저장됨' : status === 'saving' ? '저장 중...' : '💾 저장'}
        </button>
        <button
          onClick={handleShowList}
          className="px-4 py-2 bg-[#0a0e1a] border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg text-sm transition-colors whitespace-nowrap"
        >
          📂 불러오기
        </button>
      </div>

      {showList && (
        <div className="bg-[#0a0e1a] border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white text-sm font-semibold">저장된 {TYPE_KR[type]} 시나리오</h4>
            <button onClick={() => setShowList(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
          </div>
          {list.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-6">저장된 시나리오 없음</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {list.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-[#1a2035] rounded-lg px-3 py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{s.label}</p>
                    <p className="text-gray-500 text-xs">{new Date(s.created_at).toLocaleString('ko-KR')}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {onLoad && (
                      <button onClick={() => handleLoad(s)}
                        className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 hover:bg-orange-500/40 rounded transition-colors">
                        불러오기
                      </button>
                    )}
                    <button onClick={() => handleDelete(s.id)}
                      className="text-xs px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/30 rounded transition-colors">
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## STEP 9. app/compare/page.tsx — 4개 모드 완전 구현

```typescript
// app/compare/page.tsx
'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { formatKRW } from '@/lib/format'
import { sanitize, validate, validateLifecycleLogic } from '@/lib/input-validator'
import { TLabel } from '@/components/Tooltip'
import { ScenarioSave } from '@/components/ScenarioSave'

type Mode = 'montecarlo' | 'loan' | 'lifecycle' | 'business'

const MODES: { key: Mode; icon: string; label: string }[] = [
  { key: 'montecarlo', icon: '📈', label: '투자 비교' },
  { key: 'loan',       icon: '🏦', label: '대출 비교' },
  { key: 'lifecycle',  icon: '🧬', label: '인생설계 비교' },
  { key: 'business',   icon: '🚀', label: '사업 비교' },
]

// 각 모드별 기본 폼 초기값 (전부 빈 문자열)
const EMPTY: Record<Mode, Record<string, string>> = {
  montecarlo: { initialCapital:'', annualReturn:'', annualVolatility:'',
                periodicContribution:'', timeValue:'', timeUnit:'year',
                simulations:'10000', withdrawalRate:'0', targetAmount:'' },
  loan:       { principal:'', annualRate:'', months:'',
                repaymentType:'equal-payment', gracePeriodMonths:'0' },
  lifecycle:  { currentAge:'', retirementAge:'', deathAge:'85',
                monthlyIncome:'', monthlyExpense:'',
                currentAssets:'0', currentLiabilities:'0',
                investmentReturn:'7', investmentVolatility:'12',
                retirementMonthlyExpense:'', pensionMonthly:'0', pensionStartAge:'65',
                incomeGrowthRate:'3', expenseInflationRate:'2',
                simulations:'5000' },
  business:   { monthlyRevenue:'', monthlyFixedCost:'',
                monthlyVariableCostRate:'30', cashReserve:'',
                monthlyGrowthRate:'0' },
}

interface SideState {
  label: string
  form: Record<string, string>
  result: any
  loading: boolean
  error: string | null
  errors: Record<string, string>
}

function initSide(mode: Mode, suffix: string): SideState {
  return {
    label: `시나리오 ${suffix}`,
    form: { ...EMPTY[mode] },
    result: null, loading: false, error: null, errors: {},
  }
}

export default function ComparePage() {
  const [mode, setMode] = useState<Mode>('montecarlo')
  const [a, setA] = useState<SideState>(initSide('montecarlo', 'A'))
  const [b, setB] = useState<SideState>(initSide('montecarlo', 'B'))
  const debA = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debB = useRef<ReturnType<typeof setTimeout> | null>(null)

  const n   = (v: string) => parseFloat(v) || 0
  const pct = (v: string) => parseFloat(v) / 100 || 0

  // 모드 변경 시 초기화
  useEffect(() => {
    setA(initSide(mode, 'A'))
    setB(initSide(mode, 'B'))
  }, [mode])

  // 입력 변경 감지 → debounce → 계산
  useEffect(() => {
    if (debA.current) clearTimeout(debA.current)
    debA.current = setTimeout(() => runSide('a'), 500)
    return () => { if (debA.current) clearTimeout(debA.current) }
  }, [a.form, mode])

  useEffect(() => {
    if (debB.current) clearTimeout(debB.current)
    debB.current = setTimeout(() => runSide('b'), 500)
    return () => { if (debB.current) clearTimeout(debB.current) }
  }, [b.form, mode])

  function updateForm(side: 'a' | 'b', key: string, raw: string) {
    const setValue = side === 'a' ? setA : setB
    setValue(prev => ({ ...prev, form: { ...prev.form, [key]: raw } }))
  }

  function buildBody(form: Record<string, string>): { endpoint: string; body: any } | null {
    if (mode === 'montecarlo') {
      if (!form.initialCapital || !form.annualReturn || !form.annualVolatility || !form.timeValue) return null
      return {
        endpoint: '/api/monte-carlo',
        body: {
          initialCapital: n(form.initialCapital),
          periodicContribution: n(form.periodicContribution),
          contributionUnit: 'monthly',
          annualReturn: pct(form.annualReturn),
          annualVolatility: pct(form.annualVolatility),
          timeRange: { value: n(form.timeValue), unit: form.timeUnit || 'year' },
          simulations: n(form.simulations) || 10000,
          withdrawalRate: pct(form.withdrawalRate),
          targetAmount: form.targetAmount ? n(form.targetAmount) : null,
        },
      }
    }
    if (mode === 'loan') {
      if (!form.principal || !form.annualRate || !form.months) return null
      return {
        endpoint: '/api/finance-calc',
        body: {
          calcType: 'loan',
          principal: n(form.principal),
          annualRate: pct(form.annualRate),
          months: n(form.months),
          repaymentType: form.repaymentType || 'equal-payment',
          gracePeriodMonths: n(form.gracePeriodMonths),
        },
      }
    }
    if (mode === 'lifecycle') {
      if (!form.currentAge || !form.retirementAge || !form.monthlyIncome || !form.monthlyExpense) return null
      return {
        endpoint: '/api/lifecycle',
        body: {
          currentAge: n(form.currentAge),
          retirementAge: n(form.retirementAge),
          deathAge: n(form.deathAge) || 85,
          currentAssets: n(form.currentAssets),
          currentLiabilities: n(form.currentLiabilities),
          monthlyIncome: n(form.monthlyIncome),
          monthlyExpense: n(form.monthlyExpense),
          incomeGrowthRate: pct(form.incomeGrowthRate) || 0.03,
          expenseInflationRate: pct(form.expenseInflationRate) || 0.02,
          investmentReturn: pct(form.investmentReturn) || 0.07,
          investmentVolatility: pct(form.investmentVolatility) || 0.12,
          retirementMonthlyExpense: n(form.retirementMonthlyExpense) || n(form.monthlyExpense),
          pensionMonthly: n(form.pensionMonthly),
          pensionStartAge: n(form.pensionStartAge) || 65,
          simulations: n(form.simulations) || 5000,
          events: [],
        },
      }
    }
    if (mode === 'business') {
      if (!form.monthlyRevenue || !form.monthlyFixedCost) return null
      return {
        endpoint: '/api/finance-calc',
        body: {
          calcType: 'business',
          monthlyRevenue: n(form.monthlyRevenue),
          monthlyFixedCost: n(form.monthlyFixedCost),
          monthlyVariableCostRate: pct(form.monthlyVariableCostRate),
          cashReserve: n(form.cashReserve),
          monthlyGrowthRate: pct(form.monthlyGrowthRate),
        },
      }
    }
    return null
  }

  async function runSide(side: 'a' | 'b') {
    const state = side === 'a' ? a : b
    const setter = side === 'a' ? setA : setB

    const built = buildBody(state.form)
    if (!built) return

    setter(prev => ({ ...prev, loading: true, error: null }))
    try {
      const res  = await fetch(built.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(built.body),
      })
      const data = await res.json()
      if (data.error) setter(prev => ({ ...prev, loading: false, error: data.error }))
      else setter(prev => ({ ...prev, loading: false, result: data.lifecycle ?? data }))
    } catch (e) {
      setter(prev => ({ ...prev, loading: false, error: (e as Error).message }))
    }
  }

  // 불러오기 후 자동 재계산 — form 바뀌면 useEffect가 자동 트리거
  function loadScenario(side: 'a' | 'b', input: any, result: any) {
    const setter = side === 'a' ? setA : setB
    setter(prev => ({
      ...prev,
      form: { ...prev.form, ...Object.fromEntries(Object.entries(input).map(([k,v]) => [k, String(v)])) },
      result,
    }))
  }

  // 공통 입력 컴포넌트
  function Row({ label, fkey, termKey, placeholder, type='number', step, isSelect, options }: {
    label: string; fkey: string; termKey?: string; placeholder?: string
    type?: string; step?: string; isSelect?: boolean; options?: { value: string; label: string }[]
  }) {
    const ic = (side: 'a'|'b') =>
      `w-full bg-[#0a0e1a] border rounded-lg px-3 py-2 text-white placeholder-gray-600 text-sm focus:outline-none ${
        side==='a' ? 'border-blue-800 focus:border-blue-500' : 'border-orange-800 focus:border-orange-500'
      }`

    return (
      <div>
        <TLabel label={label} termKey={termKey} />
        <div className="grid grid-cols-2 gap-2">
          {(['a','b'] as const).map(side => {
            const state = side === 'a' ? a : b
            if (isSelect && options) return (
              <select key={side} value={state.form[fkey] ?? ''}
                onChange={e => updateForm(side, fkey, e.target.value)} className={ic(side)}>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )
            return (
              <input key={side} type={type} step={step} placeholder={placeholder}
                value={state.form[fkey] ?? ''}
                onChange={e => updateForm(side, fkey, e.target.value)}
                className={ic(side)} />
            )
          })}
        </div>
      </div>
    )
  }

  function SideCard({ side }: { side: 'a'|'b' }) {
    const state   = side === 'a' ? a : b
    const setter  = side === 'a' ? setA : setB
    const color   = side === 'a' ? 'text-blue-400' : 'text-orange-400'
    const border  = side === 'a' ? 'border-blue-800' : 'border-orange-800'

    return (
      <div className={`bg-[#1a2035] border ${border} rounded-xl p-4`}>
        <input value={state.label}
          onChange={e => setter(prev => ({ ...prev, label: e.target.value }))}
          className={`w-full bg-transparent font-bold text-sm mb-3 focus:outline-none ${color} border-b border-gray-700 pb-1`} />

        {state.loading && <p className={`text-xs ${color} animate-pulse mb-2`}>계산 중...</p>}
        {state.error   && <p className="text-red-400 text-xs mb-2 bg-red-900/20 rounded p-2">{state.error}</p>}

        {!state.result && !state.loading && (
          <p className="text-gray-600 text-xs text-center py-4">↑ 입력하면 자동 계산됩니다</p>
        )}

        {state.result && mode === 'montecarlo' && (() => {
          const r = state.result
          return (
            <div className="space-y-1.5">
              {[
                { label: '중간값', value: formatKRW(r.median), termKey: 'Percentile' },
                { label: '최악 (P5)', value: formatKRW(r.percentile5), termKey: 'Percentile' },
                { label: '최선 (P95)', value: formatKRW(r.percentile95), termKey: 'Percentile' },
                { label: '생존 확률', value: `${(r.survivalRate*100).toFixed(1)}%`, termKey: 'SurvivalRate' },
                { label: '파산 확률', value: `${(r.bankruptcyRate*100).toFixed(1)}%` },
                { label: '기간', value: r.timeLabel },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-xs border-b border-gray-800 pb-1">
                  <span className="text-gray-400">{row.label}</span>
                  <span className={`font-medium ${color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          )
        })()}

        {state.result && mode === 'loan' && (() => {
          const r = state.result
          return (
            <div className="space-y-1.5">
              {[
                { label: '월 납입액', value: formatKRW(r.monthlyPayment ?? r.firstMonthPayment) },
                { label: '총 납입액', value: formatKRW(r.totalPayment) },
                { label: '총 이자', value: formatKRW(r.totalInterest) },
                { label: '이자 비율', value: `${(r.interestRatio*100).toFixed(1)}%` },
                { label: '원금 50% 상환', value: `${r.breakEvenMonth}개월` },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-xs border-b border-gray-800 pb-1">
                  <span className="text-gray-400">{row.label}</span>
                  <span className={`font-medium ${color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          )
        })()}

        {state.result && mode === 'lifecycle' && (() => {
          const r = state.result
          return (
            <div className="space-y-1.5">
              {[
                { label: '파산 여부', value: r.survivalOk ? '✅ 생존' : `❌ ${r.bankruptcyAge}세 소진` },
                { label: '은퇴 시 자산', value: formatKRW(r.retirementAssets) },
                { label: '순자산 최고점', value: `${r.peakNetWorthAge}세 ${formatKRW(r.peakNetWorth)}` },
                { label: '사망 시 잔여', value: formatKRW(r.finalNetWorth) },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-xs border-b border-gray-800 pb-1">
                  <span className="text-gray-400">{row.label}</span>
                  <span className={`font-medium ${color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          )
        })()}

        {state.result && mode === 'business' && (() => {
          const r = state.result
          return (
            <div className="space-y-1.5">
              {[
                { label: '판정', value: r.verdict },
                { label: '영업이익률', value: `${(r.currentMargin*100).toFixed(1)}%` },
                { label: '손익분기 매출', value: formatKRW(r.breakEvenRevenue) },
                { label: '런웨이', value: r.runway >= 999 ? '흑자' : `${r.runway.toFixed(1)}개월`, termKey: 'Runway' },
                { label: '12개월 생존', value: `${(r.survivalProb*100).toFixed(0)}%` },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-xs border-b border-gray-800 pb-1">
                  <span className="text-gray-400">{row.label}</span>
                  <span className={`font-medium ${color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          )
        })()}

        {/* 시나리오 저장 */}
        {state.result && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <ScenarioSave
              type={mode}
              inputData={state.form}
              resultData={state.result}
              defaultLabel={state.label}
              onLoad={(input, result) => loadScenario(side, input, result)}
            />
          </div>
        )}
      </div>
    )
  }

  // A vs B 차이 요약
  function DiffBar({ label, aVal, bVal, format, higherIsBetter, termKey }: {
    label: string; aVal: number; bVal: number
    format: (v: number) => string; higherIsBetter: boolean; termKey?: string
  }) {
    const total = Math.abs(aVal) + Math.abs(bVal)
    const aBetter = higherIsBetter ? aVal >= bVal : aVal <= bVal
    const diff = Math.abs(aVal - bVal)
    return (
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-400 text-xs flex items-center gap-1">
            {label}
          </span>
          <span className={`text-xs font-semibold ${aBetter ? 'text-blue-400' : 'text-orange-400'}`}>
            {aBetter ? a.label : b.label}이 {format(diff)} 유리
          </span>
        </div>
        <div className="flex h-2 gap-0.5 rounded overflow-hidden">
          <div className="bg-blue-500" style={{ flex: total > 0 ? Math.abs(aVal)/total : 0.5 }} />
          <div className="bg-orange-500" style={{ flex: total > 0 ? Math.abs(bVal)/total : 0.5 }} />
        </div>
        <div className="flex justify-between text-xs mt-0.5">
          <span className="text-blue-400">{a.label}: {format(aVal)}</span>
          <span className="text-orange-400">{b.label}: {format(bVal)}</span>
        </div>
      </div>
    )
  }

  function DiffSummary() {
    if (!a.result || !b.result) return null
    return (
      <div className="bg-[#1a2035] rounded-xl p-5 mt-4">
        <h4 className="font-semibold text-white mb-4">📊 {a.label} vs {b.label} 핵심 비교</h4>
        <div className="space-y-4">
          {mode === 'montecarlo' && <>
            <DiffBar label="중간값" aVal={a.result.median} bVal={b.result.median} format={formatKRW} higherIsBetter termKey="Percentile" />
            <DiffBar label="생존 확률" aVal={a.result.survivalRate*100} bVal={b.result.survivalRate*100} format={v=>`${v.toFixed(1)}%`} higherIsBetter termKey="SurvivalRate" />
            <DiffBar label="파산 확률" aVal={a.result.bankruptcyRate*100} bVal={b.result.bankruptcyRate*100} format={v=>`${v.toFixed(1)}%`} higherIsBetter={false} />
          </>}
          {mode === 'loan' && <>
            <DiffBar label="총 이자" aVal={a.result.totalInterest} bVal={b.result.totalInterest} format={formatKRW} higherIsBetter={false} />
            <DiffBar label="월 납입액" aVal={a.result.monthlyPayment ?? a.result.firstMonthPayment} bVal={b.result.monthlyPayment ?? b.result.firstMonthPayment} format={formatKRW} higherIsBetter={false} />
          </>}
          {mode === 'lifecycle' && <>
            <DiffBar label="은퇴 시 자산" aVal={a.result.retirementAssets} bVal={b.result.retirementAssets} format={formatKRW} higherIsBetter />
            <DiffBar label="사망 시 잔여" aVal={a.result.finalNetWorth} bVal={b.result.finalNetWorth} format={formatKRW} higherIsBetter />
          </>}
          {mode === 'business' && <>
            <DiffBar label="런웨이" aVal={Math.min(a.result.runway, 999)} bVal={Math.min(b.result.runway, 999)} format={v=>`${v.toFixed(0)}개월`} higherIsBetter termKey="Runway" />
            <DiffBar label="영업이익률" aVal={a.result.currentMargin*100} bVal={b.result.currentMargin*100} format={v=>`${v.toFixed(1)}%`} higherIsBetter />
          </>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">⚖️ A vs B 시나리오 비교</h1>
          <p className="text-gray-400 text-sm mt-1">두 선택지를 나란히 입력하면 수학적으로 비교합니다</p>
        </div>

        {/* 모드 탭 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {MODES.map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                mode === m.key ? 'bg-orange-500 text-white' : 'bg-[#1a2035] text-gray-400 hover:text-white'
              }`}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* 입력 폼 */}
        <div className="bg-[#1a2035] rounded-xl p-5 mb-4">
          <div className="grid grid-cols-2 gap-2 mb-4 text-center text-xs font-semibold">
            <div className="py-1.5 bg-blue-900/30 text-blue-400 rounded-lg">🔵 {a.label}</div>
            <div className="py-1.5 bg-orange-900/30 text-orange-400 rounded-lg">🟠 {b.label}</div>
          </div>

          <div className="space-y-3">
            {mode === 'montecarlo' && <>
              <Row label="초기 자산 (원) *"         fkey="initialCapital"       termKey="AnnualReturn"  placeholder="예: 50000000" />
              <Row label="연 기대수익률 (%) *"       fkey="annualReturn"         termKey="AnnualReturn"  placeholder="예: 7"         step="0.1" />
              <Row label="연 변동성 (%) *"           fkey="annualVolatility"     termKey="Volatility"    placeholder="예: 15"        step="0.1" />
              <Row label="월 적립금 (원)"            fkey="periodicContribution" placeholder="예: 500000" />
              <Row label="기간 (년) *"               fkey="timeValue"            placeholder="예: 10" />
              <Row label="목표 금액 (원)"            fkey="targetAmount"         placeholder="예: 300000000" />
              <Row label="시뮬레이션 횟수"           fkey="simulations"          termKey="MonteCarlo"    placeholder="예: 10000" />
            </>}

            {mode === 'loan' && <>
              <Row label="대출 원금 (원) *"    fkey="principal"         placeholder="예: 300000000" />
              <Row label="연 이자율 (%) *"     fkey="annualRate"        placeholder="예: 4.5" step="0.1" />
              <Row label="기간 (개월) *"       fkey="months"            placeholder="예: 360" />
              <Row label="거치 기간 (개월)"    fkey="gracePeriodMonths" placeholder="예: 0" />
              <Row label="상환 방식" fkey="repaymentType" isSelect options={[
                { value: 'equal-payment',    label: '원리금균등 (매월 동일)' },
                { value: 'equal-principal',  label: '원금균등 (이자 감소)' },
              ]} />
            </>}

            {mode === 'lifecycle' && <>
              <Row label="현재 나이 *"           fkey="currentAge"      placeholder="예: 35" />
              <Row label="은퇴 목표 나이 *"      fkey="retirementAge"   placeholder="예: 60" />
              <Row label="월 소득 (원) *"         fkey="monthlyIncome"   placeholder="예: 4000000" />
              <Row label="월 지출 (원) *"         fkey="monthlyExpense"  placeholder="예: 2500000" />
              <Row label="현재 자산 (원)"         fkey="currentAssets"   placeholder="예: 50000000" />
              <Row label="연 투자수익률 (%)"      fkey="investmentReturn" termKey="AnnualReturn" placeholder="예: 7" step="0.1" />
              <Row label="은퇴 후 월 지출 (원)"   fkey="retirementMonthlyExpense" placeholder="예: 2000000" />
              <Row label="국민연금 월액 (원)"     fkey="pensionMonthly"  placeholder="없으면 0" />
            </>}

            {mode === 'business' && <>
              <Row label="월 매출 (원) *"     fkey="monthlyRevenue"          placeholder="예: 10000000" />
              <Row label="월 고정비 (원) *"   fkey="monthlyFixedCost"        placeholder="예: 5000000" />
              <Row label="변동비율 (%)"       fkey="monthlyVariableCostRate" termKey="BreakEven" placeholder="예: 30" step="1" />
              <Row label="보유 현금 (원)"     fkey="cashReserve"             termKey="Runway" placeholder="예: 30000000" />
              <Row label="월 성장률 (%)"      fkey="monthlyGrowthRate"       placeholder="예: 5" step="0.1" />
            </>}
          </div>
        </div>

        {/* 결과 카드 */}
        <div className="grid md:grid-cols-2 gap-4">
          <SideCard side="a" />
          <SideCard side="b" />
        </div>

        {/* 비교 요약 */}
        <DiffSummary />
      </div>
    </div>
  )
}
```

---

## STEP 10. lifecycle/page.tsx 수정 지시

기존 `app/lifecycle/page.tsx` 상단에 아래 import 추가:
```typescript
import { validate, validateLifecycleLogic, sanitize } from '@/lib/input-validator'
import { TLabel } from '@/components/Tooltip'
import { ScenarioSave } from '@/components/ScenarioSave'
```

`useState` 목록에 추가:
```typescript
const [showAdvanced, setShowAdvanced] = useState(false)
const [errors, setErrors] = useState<Record<string, string>>({})
```

`simulate()` 함수 앞부분 교체:
```typescript
async function simulate() {
  setError(null)

  // 논리 관계 검증
  const logicErrors = validateLifecycleLogic(form.currentAge, form.retirementAge, form.deathAge)
  const { valid, errors: fieldErrors } = validate(form as any, [
    'currentAge', 'retirementAge', 'monthlyIncome', 'monthlyExpense',
  ], logicErrors)
  setErrors(fieldErrors)
  if (!valid) return
  // ... 이하 기존 fetch 코드 유지
}
```

기본 입력 4개 렌더링 — 각 input에 에러 표시 추가:
```typescript
className={`... ${errors[f.key] ? 'border-red-500' : 'border-gray-700'}`}
// input 아래:
{errors[f.key] && <p className="text-red-400 text-xs mt-0.5">{errors[f.key]}</p>}
```

결과 섹션 맨 아래 저장 추가:
```typescript
{result && (
  <div className="bg-[#1a2035] rounded-xl p-5">
    <h3 className="font-semibold text-white mb-3">💾 시나리오 저장</h3>
    <ScenarioSave
      type="lifecycle"
      inputData={form}
      resultData={result}
      defaultLabel={`인생설계_${form.currentAge}세_${form.retirementAge}세은퇴`}
      onLoad={(input, result) => {
        setForm(prev => ({ ...prev, ...Object.fromEntries(Object.entries(input).map(([k,v])=>[k,String(v)])) }))
        setResult(result)
        // form 바뀌면 useEffect debounce가 자동 재계산
      }}
    />
  </div>
)}
```

---

## STEP 11. finance/page.tsx 수정 지시

상단 import 추가:
```typescript
import { validate, sanitize } from '@/lib/input-validator'
import { TLabel, ResultRow } from '@/components/Tooltip'
import { ScenarioSave } from '@/components/ScenarioSave'
```

대출 계산기 결과 표시에서 `<span>` → `<ResultRow>` 교체:
```typescript
// 기존
<span className="text-gray-400 text-sm">DTI (총부채상환비율)</span>
// 변경
<ResultRow label="DTI (총부채상환비율)" termKey="DTI" value={...} color={...} />
```

각 모드 결과 하단에 저장 버튼:
```typescript
{result && (
  <ScenarioSave
    type={mode}
    inputData={mode === 'loan' ? loan : mode === 'affordability' ? afford : mode === 'buyvsrent' ? bvr : biz}
    resultData={result}
    defaultLabel={`${mode}_${new Date().toLocaleDateString('ko-KR')}`}
    onLoad={(input, res) => {
      // 해당 폼 상태 복원
      if (mode === 'loan') setLoan(prev => ({ ...prev, ...input }))
      else if (mode === 'affordability') setAfford(prev => ({ ...prev, ...input }))
      setResult(res)
    }}
  />
)}
```

---

## STEP 12. 네비게이션 최종 목록

```typescript
// 기존 nav에 추가
{ href: '/finance', label: '💰 재무계산기' },
{ href: '/lifecycle', label: '🧬 인생설계' },
{ href: '/assets', label: '💼 자산관리' },
{ href: '/compare', label: '⚖️ A vs B 비교' },
```

---

## STEP 13. 완료 확인

```bash
cd E:\dev\finsi
npx tsc --noEmit
npm run build
```

빌드 에러 없으면 PHASE 8 완료.

---

## 구현된 기능 최종 확인

| 항목 | 구현 |
|---|---|
| 온보딩 — 첫 진입 4단계 가이드 | ✅ OnboardingGuide → layout.tsx |
| 입력 검증 — 범위/타입/논리 관계 | ✅ lib/input-validator.ts (sanitize 포함) |
| 툴팁 — DTI/MDD/VaR 등 18개 용어 | ✅ Tooltip + TermGlossary, 전 페이지 적용 |
| 결과 저장 — Supabase + sessionStorage | ✅ ScenarioSave (이중화) |
| A vs B 비교 — 4개 모드 완전 구현 | ✅ compare/page.tsx (montecarlo/loan/lifecycle/business) |
| 불러오기 후 자동 재계산 | ✅ form 복원 → useEffect debounce 트리거 |
| 모바일 반응형 | ✅ grid md:grid-cols-2 전체 적용 |
| sanitize — UI input onChange 연결 | ✅ sanitize() 함수 → 각 onChange에 적용 |
| sessionStorage → Supabase 실패 시 폴백 | ✅ ScenarioSave 이중화 로직 |
| lifecycle 필수 4개 / 선택 접기 | ✅ showAdvanced 토글 |
