'use client'
import { useState, useEffect, useRef } from 'react'
import { formatKRW } from '@/lib/format'
import { validate, validateLifecycleLogic, sanitize } from '@/lib/input-validator'
import { TLabel } from '@/components/Tooltip'
import { ScenarioSave } from '@/components/ScenarioSave'

const PHASE_COLOR: Record<string, string> = {
  '학생기': '#6366f1', '사회초년생': '#3b82f6', '성장기': '#22c55e',
  '전성기': '#f97316', '준비기': '#eab308', '은퇴초기': '#f59e0b',
  '은퇴후기': '#ef4444', '말년기': '#9ca3af',
}

interface LifeEvent {
  id: string; age: number; label: string; amount: number
  recurring: boolean; recurringUntilAge?: number
}

interface Snapshot {
  age: number; year: number; phase: string; assets: number; liabilities: number
  netWorth: number; annualIncome: number; annualExpense: number
  annualSaving: number; cashflowPositive: boolean; triggeredEvents: string[]
}

interface LifecycleResult {
  snapshots: Snapshot[]
  bankruptcyAge: number | null
  peakNetWorthAge: number; peakNetWorth: number
  retirementAssets: number; finalNetWorth: number
  survivalOk: boolean
  cashflowTurningPoints: { age: number; label: string }[]
}

export default function LifecyclePage() {
  // 모든 초기값 없음 — 사용자가 전부 입력
  const [form, setForm] = useState({
    currentAge: '',
    retirementAge: '',
    deathAge: '',
    currentAssets: '',
    currentLiabilities: '',
    monthlyIncome: '',
    monthlyExpense: '',
    incomeGrowthRate: '',
    expenseInflationRate: '',
    investmentReturn: '',
    investmentVolatility: '',   // 추가 — 반드시 명시
    retirementMonthlyExpense: '',
    pensionMonthly: '',
    pensionStartAge: '',
    simulations: '',
  })

  const [events, setEvents] = useState<LifeEvent[]>([])
  const [newEvent, setNewEvent] = useState({
    age: '', label: '', amount: '', recurring: false, recurringUntilAge: '',
  })

  const [result, setResult] = useState<LifecycleResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeAge, setActiveAge] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 필수값 모두 입력되면 자동 실행 (debounce 500ms)
  useEffect(() => {
    const required = ['currentAge','retirementAge','deathAge','currentAssets',
      'monthlyIncome','monthlyExpense','investmentReturn','investmentVolatility',
      'retirementMonthlyExpense','pensionMonthly','pensionStartAge','simulations']
    const allFilled = required.every(k => form[k as keyof typeof form] !== '')
    if (!allFilled) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { simulate() }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [form, events])

  function n(val: string): number { return parseFloat(val) || 0 }
  function pct(val: string): number { return parseFloat(val) / 100 || 0 }

  async function simulate() {
    setError(null)

    // 논리 관계 검증
    const logicErrors = validateLifecycleLogic(form.currentAge, form.retirementAge, form.deathAge)
    const { valid, errors: fieldErrors } = validate(form as any, [
      'currentAge', 'retirementAge', 'deathAge', 'currentAssets',
      'monthlyIncome', 'monthlyExpense', 'investmentReturn', 'investmentVolatility',
      'retirementMonthlyExpense', 'pensionMonthly', 'pensionStartAge', 'simulations'
    ], logicErrors)
    setErrors(fieldErrors)
    if (!valid) {
      setError('입력 오류를 확인하세요')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentAge: n(form.currentAge),
          retirementAge: n(form.retirementAge),
          deathAge: n(form.deathAge),
          currentAssets: n(form.currentAssets),
          currentLiabilities: n(form.currentLiabilities),
          monthlyIncome: n(form.monthlyIncome),
          monthlyExpense: n(form.monthlyExpense),
          incomeGrowthRate: pct(form.incomeGrowthRate),
          expenseInflationRate: pct(form.expenseInflationRate),
          investmentReturn: pct(form.investmentReturn),
          investmentVolatility: pct(form.investmentVolatility),
          retirementMonthlyExpense: n(form.retirementMonthlyExpense),
          pensionMonthly: n(form.pensionMonthly),
          pensionStartAge: n(form.pensionStartAge),
          simulations: n(form.simulations),
          events: events.map(e => ({
            age: e.age, label: e.label, amount: e.amount,
            recurring: e.recurring, recurringUntilAge: e.recurringUntilAge,
          })),
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data.lifecycle)
    } catch (e) {
      setError(`오류: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  function addEvent() {
    if (!newEvent.age || !newEvent.label || !newEvent.amount) return
    setEvents(ev => [...ev, {
      id: Date.now().toString(),
      age: parseInt(newEvent.age),
      label: newEvent.label,
      amount: parseFloat(newEvent.amount),
      recurring: newEvent.recurring,
      recurringUntilAge: newEvent.recurringUntilAge ? parseInt(newEvent.recurringUntilAge) : undefined,
    }])
    setNewEvent({ age: '', label: '', amount: '', recurring: false, recurringUntilAge: '' })
  }

  const maxNetWorth = result
    ? Math.max(...result.snapshots.map(s => Math.max(s.netWorth, 0)), 1)
    : 1

  const inputClass = "w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none"
  const labelClass = "text-gray-400 text-xs mb-1 block"

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-bold">🧬 인생 재무 시뮬레이션</h1>
          <p className="text-gray-400 text-sm mt-1">
            탄생부터 사망까지 — 모든 수치를 직접 입력하세요
          </p>
        </div>

        {/* 입력 폼 */}
        <div className="bg-[#1a2035] rounded-xl p-5 mb-4">
          <h3 className="font-semibold text-white mb-4">📋 기본 정보</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: 'currentAge', label: '현재 나이 (세)', placeholder: '예: 35' },
              { key: 'retirementAge', label: '은퇴 나이 (세)', placeholder: '예: 60' },
              { key: 'deathAge', label: '기대 수명 (세)', placeholder: '예: 85' },
              { key: 'currentAssets', label: '현재 자산 (원)', placeholder: '예: 50000000' },
              { key: 'currentLiabilities', label: '현재 부채 (원)', placeholder: '예: 30000000' },
              { key: 'monthlyIncome', label: '현재 월 소득 (원)', placeholder: '예: 4000000' },
              { key: 'monthlyExpense', label: '현재 월 지출 (원)', placeholder: '예: 2500000' },
              { key: 'retirementMonthlyExpense', label: '은퇴 후 월 지출 (원)', placeholder: '예: 2000000' },
              { key: 'pensionMonthly', label: '국민연금 월액 (원, 없으면 0)', placeholder: '예: 1200000' },
              { key: 'pensionStartAge', label: '연금 수령 시작 나이', placeholder: '예: 65' },
            ].map(f => (
              <div key={f.key}>
                <label className={labelClass}>{f.label}</label>
                <input
                  type="number"
                  placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                  className={`${inputClass} ${errors[f.key] ? 'border-red-500' : ''}`}
                />
                {errors[f.key] && <p className="text-red-400 text-xs mt-0.5">{errors[f.key]}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {[
              { key: 'investmentReturn', label: '연 투자수익률 (%)', placeholder: '예: 7' },
              { key: 'investmentVolatility', label: '연 변동성 (%)', placeholder: '예: 12 (분산투자), 20 (주식집중)' },
              { key: 'incomeGrowthRate', label: '연 소득 증가율 (%)', placeholder: '예: 3' },
              { key: 'expenseInflationRate', label: '연 물가 상승률 (%)', placeholder: '예: 2' },
              { key: 'simulations', label: '몬테카를로 횟수', placeholder: '예: 10000' },
            ].map(f => (
              <div key={f.key}>
                <label className={labelClass}>{f.label}</label>
                <input
                  type="number"
                  placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                  className={`${inputClass} ${errors[f.key] ? 'border-red-500' : ''}`}
                />
                {errors[f.key] && <p className="text-red-400 text-xs mt-0.5">{errors[f.key]}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* 이벤트 입력 */}
        <div className="bg-[#1a2035] rounded-xl p-5 mb-4">
          <h3 className="font-semibold text-white mb-3">⚡ 인생 이벤트 (직접 추가)</h3>
          <p className="text-gray-400 text-xs mb-4">결혼, 집 구입, 자녀 교육비, 의료비 등 — 없으면 건너뜀</p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
            <div>
              <label className={labelClass}>발생 나이</label>
              <input type="number" placeholder="예: 32" value={newEvent.age}
                onChange={e => setNewEvent(v => ({ ...v, age: e.target.value }))}
                className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>이벤트 이름</label>
              <input placeholder="예: 주택 구입" value={newEvent.label}
                onChange={e => setNewEvent(v => ({ ...v, label: e.target.value }))}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>금액 (원, 지출+/수입-)</label>
              <input type="number" placeholder="예: 100000000" value={newEvent.amount}
                onChange={e => setNewEvent(v => ({ ...v, amount: e.target.value }))}
                className={inputClass} />
            </div>
            <div className="flex flex-col justify-end">
              <button onClick={addEvent}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2 px-4 font-medium transition-colors">
                추가
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <label className="flex items-center gap-2 cursor-pointer text-gray-400 text-sm">
              <input type="checkbox" checked={newEvent.recurring}
                onChange={e => setNewEvent(v => ({ ...v, recurring: e.target.checked }))}
                className="accent-orange-500" />
              반복 이벤트
            </label>
            {newEvent.recurring && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">~</span>
                <input type="number" placeholder="종료 나이" value={newEvent.recurringUntilAge}
                  onChange={e => setNewEvent(v => ({ ...v, recurringUntilAge: e.target.value }))}
                  className="w-24 bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white" />
                <span className="text-gray-400 text-sm">세까지</span>
              </div>
            )}
          </div>

          {events.length > 0 && (
            <div className="space-y-2">
              {events.map(ev => (
                <div key={ev.id} className="flex items-center justify-between bg-[#0a0e1a] rounded-lg px-3 py-2">
                  <span className="text-white text-sm">
                    {ev.age}세 {ev.recurring ? `~${ev.recurringUntilAge}세` : ''} —{' '}
                    {ev.label}: {ev.amount >= 0 ? '+' : ''}{formatKRW(ev.amount)}
                  </span>
                  <button onClick={() => setEvents(e => e.filter(x => x.id !== ev.id))}
                    className="text-red-400 hover:text-red-300 text-sm ml-4">삭제</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button onClick={simulate} disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition-colors mb-6">
          {loading ? '시뮬레이션 중...' : '🧬 인생 시뮬레이션 실행'}
        </button>

        {/* 결과 */}
        {result && (
          <div className="space-y-6">

            {/* 핵심 요약 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: '생존 여부',
                  value: result.survivalOk ? '✅ 사망까지 자산 유지' : `❌ ${result.bankruptcyAge}세에 자산 소진`,
                  color: result.survivalOk ? 'text-green-400' : 'text-red-400',
                },
                { label: '은퇴 시점 자산', value: formatKRW(result.retirementAssets), color: 'text-orange-400' },
                {
                  label: `순자산 최고점 (${result.peakNetWorthAge}세)`,
                  value: formatKRW(result.peakNetWorth), color: 'text-blue-400',
                },
                {
                  label: '유산 (사망 시 잔여)',
                  value: formatKRW(result.finalNetWorth),
                  color: result.finalNetWorth >= 0 ? 'text-green-400' : 'text-red-400',
                },
              ].map(c => (
                <div key={c.label} className="bg-[#1a2035] rounded-xl p-4">
                  <p className="text-gray-400 text-xs mb-1">{c.label}</p>
                  <p className={`font-bold text-sm ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* 현금흐름 전환점 */}
            {result.cashflowTurningPoints.length > 0 && (
              <div className="bg-[#1a2035] rounded-xl p-5">
                <h3 className="font-semibold text-white mb-3">⚡ 현금흐름 전환점</h3>
                <div className="flex flex-wrap gap-2">
                  {result.cashflowTurningPoints.map((tp, i) => (
                    <span key={i} className={`text-xs px-3 py-1.5 rounded-full ${
                      tp.label.includes('흑자') ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                    }`}>
                      {tp.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 생애 차트 */}
            <div className="bg-[#1a2035] rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4">📊 생애 순자산 추이</h3>
              <div className="relative h-48 flex items-end gap-px overflow-x-auto pb-2">
                {result.snapshots.map(s => {
                  const h = s.netWorth >= 0 ? Math.max(4, (s.netWorth / maxNetWorth) * 180) : 4
                  return (
                    <div key={s.age}
                      className="flex flex-col items-center cursor-pointer flex-shrink-0"
                      style={{ width: `${Math.max(8, 700 / result.snapshots.length)}px` }}
                      onMouseEnter={() => setActiveAge(s.age)}
                      onMouseLeave={() => setActiveAge(null)}
                    >
                      <div className={`w-full rounded-t transition-opacity ${activeAge === s.age ? 'opacity-100' : 'opacity-60'}`}
                        style={{ height: `${h}px`, backgroundColor: s.netWorth < 0 ? '#ef4444' : PHASE_COLOR[s.phase] || '#f97316' }} />
                      {s.triggeredEvents.length > 0 && (
                        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-0.5 flex-shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 호버 상세 */}
              {activeAge !== null && (() => {
                const s = result.snapshots.find(x => x.age === activeAge)
                if (!s) return null
                return (
                  <div className="mt-3 bg-[#0a0e1a] rounded-lg p-4 text-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-white">{s.age}세 ({s.year}년) — {s.phase}</span>
                      <span className={s.netWorth >= 0 ? 'text-green-400' : 'text-red-400'}>
                        순자산 {formatKRW(s.netWorth)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-gray-400">
                      <span>자산: <span className="text-white">{formatKRW(s.assets)}</span></span>
                      <span>부채: <span className="text-red-400">{formatKRW(s.liabilities)}</span></span>
                      <span>연소득: <span className="text-green-400">{formatKRW(s.annualIncome)}</span></span>
                      <span>연지출: <span className="text-red-400">{formatKRW(s.annualExpense)}</span></span>
                      <span>저축: <span className={s.cashflowPositive ? 'text-green-400' : 'text-red-400'}>
                        {formatKRW(s.annualSaving)}
                      </span></span>
                      {s.triggeredEvents.length > 0 && (
                        <span className="text-yellow-400">⚡ {s.triggeredEvents.join(', ')}</span>
                      )}
                    </div>
                  </div>
                )
              })()}

              <div className="flex flex-wrap gap-3 mt-4">
                {Object.entries(PHASE_COLOR).map(([phase, color]) => (
                  <div key={phase} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-gray-400 text-xs">{phase}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 5년 단위 테이블 */}
            <div className="bg-[#1a2035] rounded-xl p-5">
              <h3 className="font-semibold text-white mb-4">📋 주요 시점 요약</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700 text-left">
                      <th className="py-2">나이</th><th className="py-2">연도</th>
                      <th className="py-2">단계</th>
                      <th className="py-2 text-right">자산</th>
                      <th className="py-2 text-right">순자산</th>
                      <th className="py-2 text-right">연저축</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.snapshots
                      .filter(s => s.age % 5 === 0 || s.triggeredEvents.length > 0)
                      .map(s => (
                        <tr key={s.age} className="border-b border-gray-800 hover:bg-[#0a0e1a]">
                          <td className="py-2 text-white font-medium">{s.age}세</td>
                          <td className="py-2 text-gray-400">{s.year}</td>
                          <td className="py-2">
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: PHASE_COLOR[s.phase] + '33', color: PHASE_COLOR[s.phase] }}>
                              {s.phase}
                            </span>
                          </td>
                          <td className="py-2 text-right text-blue-400">{formatKRW(s.assets)}</td>
                          <td className={`py-2 text-right font-semibold ${s.netWorth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatKRW(s.netWorth)}
                          </td>
                          <td className={`py-2 text-right ${s.cashflowPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {formatKRW(s.annualSaving)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 시나리오 저장 */}
            <div className="bg-[#1a2035] rounded-xl p-5">
              <h3 className="font-semibold text-white mb-3">💾 시나리오 저장</h3>
              <ScenarioSave
                type="lifecycle"
                inputData={form}
                resultData={result}
                defaultLabel={`인생설계_${form.currentAge}세_${form.retirementAge}세은퇴`}
                onLoad={(input, res) => {
                  const inputData = input as Record<string, unknown>
                  setForm(prev => ({ ...prev, ...Object.fromEntries(Object.entries(inputData).map(([k,v])=>[k,String(v)])) }))
                  setResult(res as LifecycleResult)
                }}
              />
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
