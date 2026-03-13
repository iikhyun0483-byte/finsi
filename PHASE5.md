# PHASE 5 — 전 페이지 통합 + 한글화 + 시간 자유 입력 UI

---

## 핵심 원칙

- 모든 기간 입력: "3일" "18개월" "2027-06-30" 전부 허용
- 숫자 입력 즉시 계산 — 버튼 없어도 됨 (debounce 300ms)
- 하드코딩된 기간, 금액, 비율 전부 제거

---

## STEP 1. components/TimeRangeInput.tsx 신규 생성

```typescript
// components/TimeRangeInput.tsx
// 재사용 가능한 시간 범위 입력 컴포넌트

import { useState } from 'react'
import { TimeRange, TimeUnit, parseTimeInput, formatTimeRemaining, toDays } from '@/lib/time-utils'

interface TimeRangeInputProps {
  value: TimeRange | null
  onChange: (range: TimeRange) => void
  label?: string
}

const UNIT_LABELS: Record<TimeUnit, string> = {
  hour: '시간', day: '일', week: '주', month: '개월', year: '년',
}

export function TimeRangeInput({ value, onChange, label }: TimeRangeInputProps) {
  const [mode, setMode] = useState<'unit' | 'date'>('unit')
  const [inputText, setInputText] = useState('')

  function handleTextInput(text: string) {
    setInputText(text)
    if (!text) return
    const parsed = parseTimeInput(text)
    onChange(parsed)
  }

  function handleUnitChange(unit: TimeUnit) {
    const current = value ?? { value: 1, unit: 'year' }
    onChange({ ...current, unit, targetDate: undefined })
  }

  function handleValueChange(v: string) {
    const num = parseFloat(v)
    if (isNaN(num) || num <= 0) return
    const current = value ?? { value: 1, unit: 'year' }
    onChange({ ...current, value: num, targetDate: undefined })
  }

  function handleDateChange(date: string) {
    onChange({ value: 0, unit: 'day', targetDate: date })
  }

  const days = value ? toDays(value) : null
  const remaining = days != null ? formatTimeRemaining(days) : null

  return (
    <div>
      {label && <label className="text-gray-400 text-xs mb-2 block">{label}</label>}

      {/* 모드 전환 */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={() => setMode('unit')}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${
            mode === 'unit' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >기간 입력</button>
        <button
          onClick={() => setMode('date')}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${
            mode === 'date' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >날짜 지정</button>
        <button
          onClick={() => setMode('unit')}
          className="text-xs px-3 py-1 rounded-full bg-gray-800 text-gray-400"
          title="자연어 입력 예: '18개월', '3년', '2027-06-30'"
        >
          자연어 💬
        </button>
      </div>

      {mode === 'unit' ? (
        <div className="flex gap-2">
          <input
            type="number"
            min="0.1"
            step="0.5"
            placeholder="숫자"
            value={value?.targetDate ? '' : (value?.value ?? '')}
            onChange={e => handleValueChange(e.target.value)}
            className="w-24 bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white"
          />
          <select
            value={value?.unit ?? 'year'}
            onChange={e => handleUnitChange(e.target.value as TimeUnit)}
            className="bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            {(Object.entries(UNIT_LABELS) as [TimeUnit, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {/* 자연어 입력 */}
          <input
            placeholder="또는 '18개월' 직접 입력"
            value={inputText}
            onChange={e => handleTextInput(e.target.value)}
            className="flex-1 bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-sm"
          />
        </div>
      ) : (
        <input
          type="date"
          value={value?.targetDate ?? ''}
          min={new Date().toISOString().split('T')[0]}
          onChange={e => handleDateChange(e.target.value)}
          className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white"
        />
      )}

      {remaining && (
        <p className="text-orange-400 text-xs mt-1">
          → 약 {remaining} ({days != null ? Math.round(days) : 0}일)
        </p>
      )}
    </div>
  )
}
```

---

## STEP 2. components/MonteCarloWidget.tsx 신규 생성

```typescript
// components/MonteCarloWidget.tsx
// 어디서든 재사용 가능한 몬테카를로 위젯

'use client'
import { useState, useEffect, useRef } from 'react'
import { formatKRW } from '@/lib/format'
import { TimeRange } from '@/lib/time-utils'
import { TimeRangeInput } from './TimeRangeInput'

interface MonteCarloWidgetProps {
  defaultCapital?: number
}

export function MonteCarloWidget({ defaultCapital }: MonteCarloWidgetProps) {
  const [form, setForm] = useState({
    initialCapital: defaultCapital?.toString() ?? '',
    periodicContribution: '',
    contributionUnit: 'monthly' as 'daily' | 'monthly' | 'yearly',
    annualReturn: '',
    annualVolatility: '',
    simulations: '10000',
    withdrawalRate: '0',
    targetAmount: '',
  })
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 모든 필수값이 있으면 자동 계산
  useEffect(() => {
    if (!form.initialCapital || !form.annualReturn || !form.annualVolatility || !timeRange) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { calculate() }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [form, timeRange])

  async function calculate() {
    if (!form.initialCapital || !form.annualReturn || !form.annualVolatility || !timeRange) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/monte-carlo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialCapital: parseFloat(form.initialCapital),
          periodicContribution: parseFloat(form.periodicContribution) || 0,
          contributionUnit: form.contributionUnit,
          annualReturn: parseFloat(form.annualReturn) / 100,
          annualVolatility: parseFloat(form.annualVolatility) / 100,
          timeRange,
          simulations: parseInt(form.simulations),
          withdrawalRate: parseFloat(form.withdrawalRate) / 100 || 0,
          targetAmount: form.targetAmount ? parseFloat(form.targetAmount) : null,
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none"
  const labelClass = "text-gray-400 text-xs mb-1 block"

  return (
    <div className="bg-[#1a2035] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">🎲 몬테카를로 시뮬레이션</h3>
        {loading && <span className="text-orange-400 text-xs animate-pulse">계산 중...</span>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className={labelClass}>초기 자산 (원) *</label>
          <input type="number" placeholder="예: 50000000"
            value={form.initialCapital}
            onChange={e => setForm(v => ({ ...v, initialCapital: e.target.value }))}
            className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>연 기대수익률 (%)*</label>
          <input type="number" step="0.1" placeholder="예: 7"
            value={form.annualReturn}
            onChange={e => setForm(v => ({ ...v, annualReturn: e.target.value }))}
            className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>연 변동성 (%) *</label>
          <input type="number" step="0.1" placeholder="예: 15"
            value={form.annualVolatility}
            onChange={e => setForm(v => ({ ...v, annualVolatility: e.target.value }))}
            className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>정기 기여금 (원)</label>
          <div className="flex gap-1">
            <input type="number" placeholder="예: 500000"
              value={form.periodicContribution}
              onChange={e => setForm(v => ({ ...v, periodicContribution: e.target.value }))}
              className={inputClass} />
            <select value={form.contributionUnit}
              onChange={e => setForm(v => ({ ...v, contributionUnit: e.target.value as any }))}
              className="bg-[#0a0e1a] border border-gray-700 rounded-lg px-2 text-white text-sm">
              <option value="daily">일</option>
              <option value="monthly">월</option>
              <option value="yearly">년</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>시뮬레이션 횟수 *</label>
          <input type="number" placeholder="예: 10000"
            value={form.simulations}
            onChange={e => setForm(v => ({ ...v, simulations: e.target.value }))}
            className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>목표 금액 (원, 선택)</label>
          <input type="number" placeholder="예: 300000000"
            value={form.targetAmount}
            onChange={e => setForm(v => ({ ...v, targetAmount: e.target.value }))}
            className={inputClass} />
        </div>
      </div>

      {/* 시간 범위 입력 */}
      <div className="mb-4">
        <TimeRangeInput
          value={timeRange}
          onChange={setTimeRange}
          label="투자 기간 * (숫자+단위 또는 마감 날짜)"
        />
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">기간: {result.timeLabel}</span>
            <span className="text-gray-400 text-xs">{result.days.toFixed(0)}일</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '5% 최악', value: result.percentile5, color: 'text-red-400' },
              { label: '중간값 (50%)', value: result.median, color: 'text-orange-400' },
              { label: '95% 최선', value: result.percentile95, color: 'text-green-400' },
            ].map(c => (
              <div key={c.label} className="bg-[#0a0e1a] rounded-lg p-3 text-center">
                <p className="text-gray-400 text-xs mb-1">{c.label}</p>
                <p className={`font-bold text-sm ${c.color}`}>{formatKRW(c.value)}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {[
              { label: '원금 생존 확률', value: `${(result.survivalRate * 100).toFixed(1)}%`,
                color: result.survivalRate >= 0.7 ? 'text-green-400' : 'text-red-400' },
              { label: '파산 확률', value: `${(result.bankruptcyRate * 100).toFixed(1)}%`,
                color: result.bankruptcyRate <= 0.1 ? 'text-green-400' : 'text-red-400' },
              { label: '중간 MDD', value: `${(result.mddMedian * 100).toFixed(1)}%`, color: 'text-yellow-400' },
              ...(result.targetReachRate > 0 ? [{
                label: '목표 도달 확률',
                value: `${(result.targetReachRate * 100).toFixed(1)}%`,
                color: result.targetReachRate >= 0.5 ? 'text-green-400' : 'text-red-400',
              }] : []),
            ].map(c => (
              <div key={c.label} className="bg-[#0a0e1a] rounded-lg p-2 text-center">
                <p className="text-gray-500 mb-0.5">{c.label}</p>
                <p className={`font-semibold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## STEP 3. signal / analyze / portfolio / market 페이지에 앙상블 카드 추가

각 파일에서 기존 결과 섹션 바로 아래에 추가 (기존 코드 수정 최소):

```typescript
// 상단에 추가
import { runEnsemble } from '@/lib/ensemble-engine'

// 결과 표시 영역 아래에 추가
{score != null && (
  (() => {
    const ensemble = runEnsemble({
      score,
      kellyFraction: kellyFraction ?? 0.1,
      vixLevel: vixLevel ?? 20,
      regime: regime ?? 'neutral',
      rsi: rsi ?? 50,
      maSignal: maSignal ?? 'neutral',
      volumeSignal: 'normal',
    })
    return (
      <div className="bg-[#1a2035] rounded-xl p-5 mt-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">🤖 앙상블 최종 판단</h3>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-2xl font-bold ${
            ensemble.verdict.includes('매수') ? 'text-green-400' :
            ensemble.verdict.includes('매도') ? 'text-red-400' : 'text-yellow-400'
          }`}>{ensemble.verdict}</span>
          <span className="text-gray-400 text-sm">확신도 {ensemble.confidence}%</span>
        </div>
        <div className="space-y-1 mb-3">
          {ensemble.reasoning.map((r, i) => (
            <p key={i} className="text-gray-400 text-xs">• {r}</p>
          ))}
        </div>
        <div className="flex justify-between text-sm border-t border-gray-700 pt-3">
          <span className="text-gray-400">
            조정 Kelly: <span className="text-orange-400 font-medium">
              {(ensemble.finalKelly * 100).toFixed(1)}%
            </span>
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            ensemble.riskLevel === 'extreme' ? 'bg-red-900 text-red-400' :
            ensemble.riskLevel === 'high' ? 'bg-orange-900 text-orange-400' :
            ensemble.riskLevel === 'medium' ? 'bg-yellow-900 text-yellow-400' :
            'bg-green-900 text-green-400'
          }`}>
            {ensemble.riskLevel === 'extreme' ? '극단 위험' :
             ensemble.riskLevel === 'high' ? '높은 위험' :
             ensemble.riskLevel === 'medium' ? '중간 위험' : '낮은 위험'}
          </span>
        </div>
      </div>
    )
  })()
)}
```

---

## STEP 4. 한글 표기 전수 교체

파일 전체 검색 후 교체:

| 영어 원문 | 한글 병기 |
|---|---|
| Sharpe Ratio | 샤프 비율 (Sharpe) |
| Sortino Ratio | 소르티노 비율 (Sortino) |
| Calmar Ratio | 칼마 비율 (Calmar) |
| Max Drawdown | 최대 낙폭 (MDD) |
| VaR | 최대 예상 손실 (VaR) |
| CVaR | 꼬리 손실 기대값 (CVaR) |
| Win Rate | 승률 |
| Kelly Fraction | 켈리 비율 |
| Volatility | 변동성 |
| Annual Return | 연간 수익률 |
| Backtest | 백테스트 |
| Signal | 매매 신호 |
| Bullish | 강세 |
| Bearish | 약세 |
| RSI | RSI (과매수/과매도 지수) |
| Golden Cross | 골든크로스 |
| Dead Cross | 데드크로스 |
| Regime | 시장 레짐 |
| Bull Market | 강세장 |
| Bear Market | 약세장 |
| Monte Carlo | 몬테카를로 |
| Simulation | 시뮬레이션 |

---

## STEP 5. 완료 확인

```bash
cd E:\dev\finsi
npx tsc --noEmit
npm run build
```

에러 없으면 PHASE 5 완료.
