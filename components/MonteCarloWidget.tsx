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
