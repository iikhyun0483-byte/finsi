'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { formatKRW } from '@/lib/format'
import { saveSnapshot, loadHistory, type CashflowSnapshot } from '@/lib/cashflow-storage'
import type { CashflowInput, CashflowResult } from '@/lib/cashflow-engine'

type InputMode = 'simple' | 'detail'

// InputRow를 컴포넌트 외부로 이동 (포커스 유지)
const InputRow = ({ label, field, unit, placeholder = '0', value, onChange }: {
  label: string
  field: string
  unit: string
  placeholder?: string
  value: string
  onChange: (field: string, value: string) => void
}) => (
  <div className="flex items-center gap-2">
    <label className="text-gray-400 text-xs w-32 flex-shrink-0">{label}</label>
    <input
      type="number"
      value={value}
      onChange={e => onChange(field, e.target.value)}
      placeholder={placeholder}
      className="flex-1 bg-gray-800 rounded px-3 py-2 text-white text-sm outline-none focus:ring-1 focus:ring-orange-500 min-w-0"
    />
    <span className="text-gray-500 text-xs w-8 flex-shrink-0">{unit}</span>
  </div>
)

export default function CashflowPage() {
  const [mode, setMode] = useState<InputMode>('simple')
  const [result, setResult] = useState<CashflowResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'current' | 'scenario' | 'history'>('current')
  const [extraRepay, setExtraRepay] = useState(0)
  const [history, setHistory] = useState<CashflowSnapshot[]>([])
  const [userId] = useState(() => {
    if (typeof window === 'undefined') return 'anonymous'
    let id = localStorage.getItem('finsi_user_id')
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('finsi_user_id', id) }
    return id
  })
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const [s, setS] = useState({
    monthlyIncome: '', otherIncome: '',
    fixedExpense: '', variableExpense: '',
    totalDebt: '', debtName: '부채', debtRate: '', monthlyRepayment: '',
    currentAssets: '', assetName: '금융자산', assetReturn: '',
    emergencyFund: '',
    goalAmount: '', goalYears: '',
    inflationRate: '3', salaryGrowthRate: '2',
    employmentType: 'employee' as CashflowInput['employmentType'],
    // 리스크 파라미터 — 사용자 입력
    emergencyMedicalCost: '500',    // 만원 단위
    assetDropPercent: '30',         // %
    rateHikePercent: '2',           // %
    // 또래 비교 — 사용자 직접 입력 (출처 필수)
    benchmarkLiquidity: '',
    benchmarkNetWorth: '',
    benchmarkSource: '',
  })

  const n = (v: string) => parseFloat(v.replace(/,/g, '')) || 0
  const pct = (v: string) => parseFloat(v) / 100 || 0

  function buildInput(): CashflowInput {
    const incomes = [{ name: '주수입', monthly: n(s.monthlyIncome), isStable: true }]
    if (n(s.otherIncome) > 0) incomes.push({ name: '기타수입', monthly: n(s.otherIncome), isStable: false })

    return {
      incomes,
      fixedExpense: n(s.fixedExpense),
      variableExpense: n(s.variableExpense),
      debts: n(s.totalDebt) > 0 ? [{
        name: s.debtName || '부채',
        principal: n(s.totalDebt),
        annualRate: pct(s.debtRate),
        monthlyPayment: n(s.monthlyRepayment),
      }] : [],
      assets: n(s.currentAssets) > 0 ? [{
        name: s.assetName || '금융자산',
        value: n(s.currentAssets),
        annualReturn: pct(s.assetReturn),
      }] : [],
      emergencyFund: n(s.emergencyFund),
      goals: n(s.goalAmount) > 0 ? [{ label: '목표', targetAmount: n(s.goalAmount), targetYears: n(s.goalYears) }] : [],
      lifeEvents: [],
      inflationRate: pct(s.inflationRate),
      salaryGrowthRate: pct(s.salaryGrowthRate),
      employmentType: s.employmentType,
      riskParams: {
        emergencyMedicalCost: n(s.emergencyMedicalCost) * 10000,
        assetDropPercent: pct(s.assetDropPercent),
        rateHikePercent: pct(s.rateHikePercent),
      },
      ...(n(s.benchmarkLiquidity) > 0 && {
        benchmarkLiquidity: n(s.benchmarkLiquidity),
        benchmarkNetWorth: n(s.benchmarkNetWorth),
        benchmarkSource: s.benchmarkSource,
      }),
    }
  }

  const calculate = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const input = buildInput()
      const res = await fetch('/api/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data)
      // 자동 저장 (Supabase 에러 무시)
      try {
        await saveSnapshot(userId, input, data)
      } catch (e) {
        console.warn('Snapshot save failed (ignored):', e)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [s, userId])

  useEffect(() => {
    loadHistory(userId)
      .then(setHistory)
      .catch(e => console.warn('History load failed (ignored):', e))
  }, [userId])

  function handleChange(field: string, value: string) {
    setS(prev => ({ ...prev, [field]: value }))
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(calculate, 800)
  }

  // 슬라이더 추가상환 효과 계산 (클라이언트 단순 근사)
  function getSliderEffect(extra: number) {
    if (!result || result.debtAnalysis.length === 0) return null
    const top = result.debtAnalysis[0]
    const r = top.item.annualRate / 12
    let rem = top.item.principal
    let months = 0
    let interest = 0
    while (rem > 1 && months < 600) {
      const i = rem * r
      const p = top.item.monthlyPayment + extra - i
      if (p <= 0) break
      interest += i
      rem -= p
      months++
    }
    return {
      months,
      interestSaved: Math.max(top.totalInterestLeft - Math.round(interest), 0),
      originalMonths: top.remainingMonths,
    }
  }

  const sliderEffect = getSliderEffect(extraRepay)

  const netColor = result
    ? result.monthly.netCash > 0 ? 'text-green-400'
    : result.monthly.netCash > -100_000 ? 'text-yellow-400'
    : 'text-red-400'
    : 'text-gray-400'

  const liqColor = result
    ? result.liquidity >= 6 ? 'text-green-400'
    : result.liquidity >= 3 ? 'text-yellow-400'
    : 'text-red-400'
    : 'text-gray-400'

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">재무 생존 분석</h1>
            <p className="text-gray-500 text-sm mt-1">수치로 확인하고, 수치로 결정한다</p>
          </div>
          <div className="text-xs text-gray-600">정확도 ±15% — 더 정확하려면 상세 입력 사용</div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── 입력 패널 */}
          <div className="space-y-3">

            {/* 고용형태 */}
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-orange-400 text-xs font-medium mb-2">고용형태</p>
              <div className="flex gap-2">
                {(['employee', 'self', 'freelance'] as const).map(t => (
                  <button key={t}
                    onClick={() => handleChange('employmentType', t)}
                    className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                      s.employmentType === t ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}>
                    {t === 'employee' ? '직장인' : t === 'self' ? '자영업' : '프리랜서'}
                  </button>
                ))}
              </div>
            </div>

            {/* 수입 */}
            <div className="bg-gray-900 rounded-xl p-4 space-y-2">
              <p className="text-orange-400 text-xs font-medium">수입</p>
              <InputRow label="월수입 (세전)" field="monthlyIncome" unit="원" value={s.monthlyIncome} onChange={handleChange} />
              <InputRow label="기타수입 (월)" field="otherIncome" unit="원" value={s.otherIncome} onChange={handleChange} />
            </div>

            {/* 지출 */}
            <div className="bg-gray-900 rounded-xl p-4 space-y-2">
              <p className="text-orange-400 text-xs font-medium">지출</p>
              <InputRow label="월 고정지출" field="fixedExpense" unit="원" value={s.fixedExpense} onChange={handleChange} />
              <InputRow label="월 변동지출" field="variableExpense" unit="원" value={s.variableExpense} onChange={handleChange} />
            </div>

            {/* 부채 */}
            <div className="bg-gray-900 rounded-xl p-4 space-y-2">
              <p className="text-orange-400 text-xs font-medium">부채 (없으면 0)</p>
              <InputRow label="부채명" field="debtName" unit="" value={s.debtName} onChange={handleChange} placeholder="예: 신용대출" />
              <InputRow label="현재 잔액" field="totalDebt" unit="원" value={s.totalDebt} onChange={handleChange} />
              <InputRow label="연이자율" field="debtRate" unit="%" value={s.debtRate} onChange={handleChange} />
              <InputRow label="월 납입액" field="monthlyRepayment" unit="원" value={s.monthlyRepayment} onChange={handleChange} />
            </div>

            {/* 자산 */}
            <div className="bg-gray-900 rounded-xl p-4 space-y-2">
              <p className="text-orange-400 text-xs font-medium">자산</p>
              <InputRow label="자산명" field="assetName" unit="" value={s.assetName} onChange={handleChange} placeholder="예: 금융자산" />
              <InputRow label="현재 가치" field="currentAssets" unit="원" value={s.currentAssets} onChange={handleChange} />
              <InputRow label="예상 연수익률" field="assetReturn" unit="%" value={s.assetReturn} onChange={handleChange} />
              <InputRow label="비상금" field="emergencyFund" unit="원" value={s.emergencyFund} onChange={handleChange} />
            </div>

            {/* 목표 + 거시 */}
            <div className="bg-gray-900 rounded-xl p-4 space-y-2">
              <p className="text-orange-400 text-xs font-medium">목표 / 거시변수</p>
              <InputRow label="목표금액" field="goalAmount" unit="원" value={s.goalAmount} onChange={handleChange} />
              <InputRow label="목표시점" field="goalYears" unit="년후" value={s.goalYears} onChange={handleChange} />
              <InputRow label="물가상승률" field="inflationRate" unit="%" value={s.inflationRate} onChange={handleChange} placeholder="3" />
              <InputRow label="임금상승률" field="salaryGrowthRate" unit="%" value={s.salaryGrowthRate} onChange={handleChange} placeholder="2" />
            </div>

            {/* 리스크 파라미터 — 사용자 입력 */}
            <div className="bg-gray-900 rounded-xl p-4 space-y-2">
              <p className="text-orange-400 text-xs font-medium">리스크 시나리오 파라미터</p>
              <InputRow label="긴급의료비" field="emergencyMedicalCost" unit="만원" value={s.emergencyMedicalCost} onChange={handleChange} placeholder="500" />
              <InputRow label="자산하락 시나리오" field="assetDropPercent" unit="%" value={s.assetDropPercent} onChange={handleChange} placeholder="30" />
              <InputRow label="금리상승 시나리오" field="rateHikePercent" unit="%" value={s.rateHikePercent} onChange={handleChange} placeholder="2" />
            </div>

            {/* 또래 비교 — 선택 입력, 출처 필수 */}
            <div className="bg-gray-900 rounded-xl p-4 space-y-2">
              <p className="text-orange-400 text-xs font-medium">또래 비교 <span className="text-gray-500">(선택 — 출처 입력 시 표시)</span></p>
              <InputRow label="또래 평균 유동성" field="benchmarkLiquidity" unit="개월" value={s.benchmarkLiquidity} onChange={handleChange} />
              <InputRow label="또래 평균 순자산" field="benchmarkNetWorth" unit="원" value={s.benchmarkNetWorth} onChange={handleChange} />
              <div className="flex items-center gap-2">
                <label className="text-gray-400 text-xs w-32 flex-shrink-0">출처</label>
                <input
                  type="text"
                  value={s.benchmarkSource}
                  onChange={e => handleChange('benchmarkSource', e.target.value)}
                  placeholder="예: 통계청 2024 가계금융복지조사"
                  className="flex-1 bg-gray-800 rounded px-3 py-2 text-white text-xs outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <button
              onClick={calculate}
              disabled={loading}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl font-medium text-sm transition-colors">
              {loading ? '계산 중...' : '계산하기'}
            </button>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm">{error}</div>
            )}
          </div>

          {/* ── 결과 패널 */}
          {result && (
            <div className="space-y-3">

              {/* 탭 */}
              <div className="flex gap-2">
                {(['current', 'scenario', 'history'] as const).map(t => (
                  <button key={t}
                    onClick={() => setActiveTab(t)}
                    className={`flex-1 py-2 rounded text-xs font-medium transition-colors ${
                      activeTab === t ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}>
                    {t === 'current' ? '현재 분석' : t === 'scenario' ? 'A/B/C 비교' : '변화 추이'}
                  </button>
                ))}
              </div>

              {/* ── 현재 분석 탭 */}
              {activeTab === 'current' && (
                <div className="space-y-3">

                  {/* 섹션 1: 현금흐름 */}
                  <div className="bg-gray-900 rounded-xl p-4">
                    <p className="text-orange-400 text-xs font-medium mb-3">이번 달 현금흐름</p>
                    <div className="space-y-1.5">
                      {[
                        { label: '세전 수입', value: result.monthly.totalIncome, color: 'text-green-400' },
                        { label: '세후 실수령', value: result.monthly.afterTaxIncome, color: 'text-green-300', indent: true },
                        { label: '고정지출', value: -result.monthly.fixedExpense, color: 'text-red-400' },
                        { label: '변동지출', value: -result.monthly.variableExpense, color: 'text-red-300' },
                        { label: '이자', value: -result.monthly.totalInterest, color: 'text-red-400' },
                        { label: '원금상환', value: -result.monthly.totalRepayment, color: 'text-red-300' },
                      ].map(({ label, value, color, indent }) => (
                        <div key={label} className={`flex justify-between text-sm ${indent ? 'pl-3 text-xs' : ''}`}>
                          <span className="text-gray-400">{label}</span>
                          <span className={color}>
                            {value >= 0 ? '+' : ''}{formatKRW(value)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-gray-700 pt-2 flex justify-between font-bold">
                        <span>실제 남는 돈</span>
                        <span className={`text-lg ${netColor}`}>{formatKRW(result.monthly.netCash)}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
                      <div>
                        <span className="text-gray-400 text-sm">현금유동성</span>
                        <p className="text-gray-500 text-xs">실직해도 버티는 기간</p>
                      </div>
                      <span className={`text-2xl font-bold ${liqColor}`}>
                        {result.liquidity >= 99 ? '∞' : result.liquidity.toFixed(1)}개월
                      </span>
                    </div>
                  </div>

                  {/* 섹션 2: 빚 타임라인 */}
                  {result.debtAnalysis.length > 0 && (
                    <div className="bg-gray-900 rounded-xl p-4">
                      <p className="text-orange-400 text-xs font-medium mb-3">빚 타임라인</p>
                      {result.debtAnalysis.map((d, i) => (
                        <div key={i} className="border border-gray-700 rounded-lg p-3 mb-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white text-sm font-medium">{d.item.name}</span>
                            <span className="text-xs text-gray-500">우선순위 {d.optimalOrder}위 · 연 {(d.item.annualRate * 100).toFixed(1)}%</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                            <div>
                              <span className="text-gray-500">완납 예정</span>
                              <p className="text-white">{d.payoffDate}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">남은 이자</span>
                              <p className="text-red-400">{formatKRW(d.totalInterestLeft)}</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* 추가상환 슬라이더 */}
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-gray-400 text-xs mb-2">
                          월 추가상환 슬라이더: <span className="text-orange-400 font-bold">{extraRepay.toLocaleString()}원</span>
                        </p>
                        <input
                          type="range" min={0} max={500000} step={10000}
                          value={extraRepay}
                          onChange={e => setExtraRepay(Number(e.target.value))}
                          className="w-full accent-orange-500"
                        />
                        {sliderEffect && extraRepay > 0 && (
                          <div className="mt-2 bg-green-900/20 border border-green-700/50 rounded p-2 text-xs">
                            <span className="text-green-400">
                              완납 {sliderEffect.months}개월 ({sliderEffect.originalMonths - sliderEffect.months}개월 단축)
                              · 이자 {formatKRW(sliderEffect.interestSaved)} 절약
                            </span>
                          </div>
                        )}
                      </div>

                      {result.interestSavedIfOptimal > 0 && (
                        <div className="mt-2 bg-blue-900/20 border border-blue-700/50 rounded-lg p-2 text-xs">
                          <span className="text-blue-400">
                            고이율 우선 상환 시 이자 {formatKRW(result.interestSavedIfOptimal)} 추가 절약 가능
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 섹션 3: 미래 연결선 */}
                  <div className="bg-gray-900 rounded-xl p-4">
                    <p className="text-orange-400 text-xs font-medium mb-3">미래 순자산</p>
                    <div className="grid grid-cols-4 gap-2">
                      {result.future.map(f => (
                        <div key={f.year} className="text-center bg-gray-800 rounded-lg p-2">
                          <p className="text-gray-500 text-xs">{f.year}년 후</p>
                          <p className="text-white text-xs font-bold mt-1">{formatKRW(f.nominalNetWorth)}</p>
                          <p className="text-gray-600 text-xs">실질</p>
                          <p className="text-gray-500 text-xs">{formatKRW(f.realNetWorth)}</p>
                          {f.totalDebt === 0 && <p className="text-green-400 text-xs mt-1">빚 0 ✅</p>}
                          {f.goalAchieved.length > 0 && <p className="text-orange-400 text-xs">{f.goalAchieved[0]} ✅</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 섹션 4: 변수 대비 */}
                  <div className="bg-gray-900 rounded-xl p-4">
                    <p className="text-orange-400 text-xs font-medium mb-3">변수 대비</p>
                    <div className="grid grid-cols-2 gap-2">
                      {result.risks.map((r, i) => (
                        <div key={i} className={`rounded-lg p-3 border ${
                          r.covered ? 'border-green-700/50 bg-green-900/10' : 'border-red-700/50 bg-red-900/10'
                        }`}>
                          <p className="text-white text-xs font-medium">{r.label}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{r.description}</p>
                          {r.survivalMonths !== null ? (
                            <p className={`text-sm font-bold mt-1 ${r.covered ? 'text-green-400' : 'text-red-400'}`}>
                              {r.survivalMonths}개월 버팀
                            </p>
                          ) : (
                            <p className="text-sm font-bold mt-1 text-yellow-400">
                              {formatKRW(r.impact)} {r.survivalMonths === null && r.label.includes('하락') ? '감소' : '추가'}
                            </p>
                          )}
                          <p className={`text-xs mt-0.5 ${r.covered ? 'text-green-400' : 'text-red-400'}`}>
                            {r.covered ? '✅ 커버' : '❌ 위험'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 섹션 5: 지금 당장 할 것 */}
                  {result.actions.length > 0 && (
                    <div className="bg-gray-900 rounded-xl p-4">
                      <p className="text-orange-400 text-xs font-medium mb-3">지금 당장 할 것</p>
                      <div className="space-y-2">
                        {result.actions.slice(0, 3).map((a, i) => (
                          <div key={i} className={`rounded-lg p-3 border ${
                            a.urgency === 'immediate' ? 'border-red-700/50 bg-red-900/10'
                            : a.urgency === 'thisMonth' ? 'border-yellow-700/50 bg-yellow-900/10'
                            : 'border-gray-700'
                          }`}>
                            <div className="flex gap-2">
                              <span className="text-orange-400 font-bold text-sm">{i + 1}</span>
                              <div>
                                <p className="text-white text-sm">{a.action}</p>
                                <p className="text-green-400 text-xs mt-0.5">→ {a.expectedBenefit}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 또래 비교 — 출처 있을 때만 표시 */}
                  {s.benchmarkSource && n(s.benchmarkLiquidity) > 0 && (
                    <div className="bg-gray-900 rounded-xl p-4">
                      <p className="text-orange-400 text-xs font-medium mb-1">또래 비교</p>
                      <p className="text-gray-600 text-xs mb-3">출처: {s.benchmarkSource}</p>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">현금유동성</span>
                            <span className={result.liquidity >= n(s.benchmarkLiquidity) ? 'text-green-400' : 'text-red-400'}>
                              나 {result.liquidity.toFixed(1)}개월 / 평균 {s.benchmarkLiquidity}개월
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 단일 수입 경고 */}
                  {result.incomeRisk === 'single' && (
                    <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-3">
                      <p className="text-red-400 text-sm font-medium">⚠️ 단일 수입 리스크</p>
                      <p className="text-gray-400 text-xs mt-1">
                        수입 루트 1개. 실직 즉시 위기. 부업/배당 추가 권장.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── 시나리오 A/B/C 비교 탭 */}
              {activeTab === 'scenario' && result.scenarios && (
                <div className="space-y-3">
                  <p className="text-gray-400 text-xs">같은 조건에서 선택에 따른 10년 후 차이</p>

                  {/* 10년 후 순자산 비교 */}
                  <div className="bg-gray-900 rounded-xl p-4">
                    <p className="text-orange-400 text-xs font-medium mb-3">10년 후 순자산 비교</p>
                    <div className="space-y-3">
                      {result.scenarios.map((sc, i) => {
                        const fw = sc.future.find(f => f.year === 10)
                        const maxVal = Math.max(...result.scenarios.map(s => s.future.find(f => f.year === 10)?.nominalNetWorth ?? 0))
                        const pct = maxVal > 0 ? ((fw?.nominalNetWorth ?? 0) / maxVal) * 100 : 0
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-white font-medium">{sc.label}</span>
                              <span className="text-gray-400">{sc.description}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-800 rounded-full h-3">
                                <div
                                  className={`h-3 rounded-full ${i === 0 ? 'bg-gray-500' : i === 1 ? 'bg-blue-500' : 'bg-orange-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`text-sm font-bold w-24 text-right ${
                                i === 0 ? 'text-gray-300' : i === 1 ? 'text-blue-400' : 'text-orange-400'
                              }`}>
                                {formatKRW(fw?.nominalNetWorth ?? 0)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* 연도별 상세 비교 */}
                  <div className="bg-gray-900 rounded-xl p-4">
                    <p className="text-orange-400 text-xs font-medium mb-3">연도별 순자산</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500">
                            <td className="pb-2">시나리오</td>
                            {[1, 3, 5, 10].map(y => <td key={y} className="pb-2 text-right">{y}년후</td>)}
                          </tr>
                        </thead>
                        <tbody className="space-y-1">
                          {result.scenarios.map((sc, i) => (
                            <tr key={i} className="border-t border-gray-800">
                              <td className={`py-2 font-medium ${i === 0 ? 'text-gray-300' : i === 1 ? 'text-blue-400' : 'text-orange-400'}`}>
                                {sc.label.split('.')[0]}
                              </td>
                              {sc.future.map(f => (
                                <td key={f.year} className="py-2 text-right text-gray-300">
                                  {formatKRW(f.nominalNetWorth)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-gray-600 text-xs mt-2">
                      {result.scenarios[2] && result.scenarios[0] ? (
                        `C - A 차이 (10년): ${formatKRW(
                          (result.scenarios[2].future.find(f=>f.year===10)?.nominalNetWorth??0) -
                          (result.scenarios[0].future.find(f=>f.year===10)?.nominalNetWorth??0)
                        )}`
                      ) : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* ── 변화 추이 탭 */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  {history.length === 0 ? (
                    <div className="bg-gray-900 rounded-xl p-6 text-center">
                      <p className="text-gray-500 text-sm">아직 저장된 데이터가 없습니다</p>
                      <p className="text-gray-600 text-xs mt-1">계산할 때마다 자동 저장됩니다</p>
                    </div>
                  ) : (
                    <div className="bg-gray-900 rounded-xl p-4">
                      <p className="text-orange-400 text-xs font-medium mb-3">월별 변화 추이</p>
                      <div className="space-y-2">
                        {history.map((h, i) => (
                          <div key={h.id} className="flex justify-between items-center border-b border-gray-800 pb-2">
                            <span className="text-gray-500 text-xs">{h.snapshot_date}</span>
                            <div className="flex gap-4 text-xs">
                              <span className={h.net_cash > 0 ? 'text-green-400' : 'text-red-400'}>
                                {formatKRW(h.net_cash)}
                              </span>
                              <span className={`${
                                h.liquidity_months >= 6 ? 'text-green-400'
                                : h.liquidity_months >= 3 ? 'text-yellow-400'
                                : 'text-red-400'
                              }`}>
                                {h.liquidity_months?.toFixed(1)}개월
                              </span>
                              <span className="text-gray-300">{formatKRW(h.net_worth)}</span>
                            </div>
                            {i > 0 && history[i-1] && (
                              <span className={`text-xs ${h.net_cash > history[i-1].net_cash ? 'text-green-400' : 'text-red-400'}`}>
                                {h.net_cash > history[i-1].net_cash ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
