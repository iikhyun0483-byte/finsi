"use client"

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, DollarSign, Users, Briefcase } from 'lucide-react'

type CompareMode = 'montecarlo' | 'loan' | 'lifecycle' | 'business'

interface Scenario {
  name: string
  values: Record<string, string>
}

export default function ComparePage() {
  const [mode, setMode] = useState<CompareMode>('montecarlo')
  const [scenarioA, setScenarioA] = useState<Scenario>({ name: '시나리오 A', values: {} })
  const [scenarioB, setScenarioB] = useState<Scenario>({ name: '시나리오 B', values: {} })
  const [resultA, setResultA] = useState<any>(null)
  const [resultB, setResultB] = useState<any>(null)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)

  const updateA = (key: string, val: string) => {
    setScenarioA(prev => ({ ...prev, values: { ...prev.values, [key]: val } }))
  }
  const updateB = (key: string, val: string) => {
    setScenarioB(prev => ({ ...prev, values: { ...prev.values, [key]: val } }))
  }

  const buildBody = useCallback((scenario: Scenario) => {
    const v = scenario.values
    if (mode === 'montecarlo') {
      return {
        initialCapital: parseFloat(v.initialCapital || '0'),
        annualReturn: parseFloat(v.annualReturn || '0'),
        annualVolatility: parseFloat(v.annualVolatility || '0'),
        timeValue: parseFloat(v.timeValue || '0'),
        simulations: parseInt(v.simulations || '10000')
      }
    } else if (mode === 'loan') {
      return {
        calcType: 'loan',
        principal: parseFloat(v.principal || '0'),
        annualRate: parseFloat(v.annualRate || '0'),
        months: parseInt(v.months || '0'),
        repaymentType: v.repaymentType || 'equal-payment'
      }
    } else if (mode === 'lifecycle') {
      return {
        currentAge: parseInt(v.currentAge || '0'),
        retirementAge: parseInt(v.retirementAge || '0'),
        deathAge: parseInt(v.deathAge || '0'),
        currentAssets: parseFloat(v.currentAssets || '0'),
        currentLiabilities: parseFloat(v.currentLiabilities || '0'),
        monthlyIncome: parseFloat(v.monthlyIncome || '0'),
        monthlyExpense: parseFloat(v.monthlyExpense || '0'),
        incomeGrowthRate: parseFloat(v.incomeGrowthRate || '0') / 100,
        expenseInflationRate: parseFloat(v.expenseInflationRate || '0') / 100,
        investmentReturn: parseFloat(v.investmentReturn || '0') / 100,
        investmentVolatility: parseFloat(v.investmentVolatility || '0') / 100,
        retirementMonthlyExpense: parseFloat(v.retirementMonthlyExpense || '0'),
        pensionMonthly: parseFloat(v.pensionMonthly || '0'),
        pensionStartAge: parseInt(v.pensionStartAge || '0'),
        events: []
      }
    } else if (mode === 'business') {
      return {
        calcType: 'business',
        monthlyRevenue: parseFloat(v.monthlyRevenue || '0'),
        monthlyFixedCost: parseFloat(v.monthlyFixedCost || '0'),
        monthlyVariableCostRate: parseFloat(v.monthlyVariableCostRate || '0'),
        monthlyGrowthRate: parseFloat(v.monthlyGrowthRate || '0'),
        cashReserve: parseFloat(v.cashReserve || '0')
      }
    }
    return {}
  }, [mode])

  const runCalc = useCallback(async (scenario: Scenario, setSide: (r: any) => void, setLoading: (l: boolean) => void) => {
    const body = buildBody(scenario)
    setLoading(true)
    try {
      let endpoint = '/api/monte-carlo'
      if (mode === 'loan' || mode === 'business') endpoint = '/api/finance-calc'
      if (mode === 'lifecycle') endpoint = '/api/lifecycle'

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      setSide(data)
    } catch (e) {
      console.error(e)
      setSide({ error: '계산 실패' })
    } finally {
      setLoading(false)
    }
  }, [mode, buildBody])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(scenarioA.values).length > 0) runCalc(scenarioA, setResultA, setLoadingA)
    }, 500)
    return () => clearTimeout(timer)
  }, [scenarioA, mode, runCalc])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(scenarioB.values).length > 0) runCalc(scenarioB, setResultB, setLoadingB)
    }, 500)
    return () => clearTimeout(timer)
  }, [scenarioB, mode, runCalc])

  const renderInputs = (scenario: Scenario, update: (k: string, v: string) => void) => {
    const v = scenario.values
    if (mode === 'montecarlo') {
      return (
        <>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">초기 자산</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.initialCapital || ''} onChange={e => update('initialCapital', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">연 수익률 (%)</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.annualReturn || ''} onChange={e => update('annualReturn', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">연 변동성 (%)</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.annualVolatility || ''} onChange={e => update('annualVolatility', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">투자 기간 (년)</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.timeValue || ''} onChange={e => update('timeValue', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">시뮬레이션 횟수</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.simulations || ''} onChange={e => update('simulations', e.target.value)} />
          </label>
        </>
      )
    } else if (mode === 'loan') {
      return (
        <>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">대출 원금</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.principal || ''} onChange={e => update('principal', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">연 이자율 (%)</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.annualRate || ''} onChange={e => update('annualRate', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">대출 기간 (개월)</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.months || ''} onChange={e => update('months', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">상환 방식</span>
            <select className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.repaymentType || 'equal-payment'} onChange={e => update('repaymentType', e.target.value)}>
              <option value="equal-payment">원리금균등</option>
              <option value="equal-principal">원금균등</option>
            </select>
          </label>
        </>
      )
    } else if (mode === 'lifecycle') {
      return (
        <>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">현재 나이</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.currentAge || ''} onChange={e => update('currentAge', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">은퇴 나이</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.retirementAge || ''} onChange={e => update('retirementAge', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">기대 수명</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.deathAge || ''} onChange={e => update('deathAge', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">현재 자산</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.currentAssets || ''} onChange={e => update('currentAssets', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">현재 부채</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.currentLiabilities || ''} onChange={e => update('currentLiabilities', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">월 소득</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.monthlyIncome || ''} onChange={e => update('monthlyIncome', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">월 지출</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.monthlyExpense || ''} onChange={e => update('monthlyExpense', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">소득 증가율 (%)</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.incomeGrowthRate || ''} onChange={e => update('incomeGrowthRate', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">물가 상승률 (%)</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.expenseInflationRate || ''} onChange={e => update('expenseInflationRate', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">연 투자수익률 (%)</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.investmentReturn || ''} onChange={e => update('investmentReturn', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">연 변동성 (%)</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.investmentVolatility || ''} onChange={e => update('investmentVolatility', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">은퇴 후 월 지출</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.retirementMonthlyExpense || ''} onChange={e => update('retirementMonthlyExpense', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">국민연금 월액</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.pensionMonthly || ''} onChange={e => update('pensionMonthly', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">연금 수령 나이</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.pensionStartAge || ''} onChange={e => update('pensionStartAge', e.target.value)} />
          </label>
        </>
      )
    } else if (mode === 'business') {
      return (
        <>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">월 매출</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.monthlyRevenue || ''} onChange={e => update('monthlyRevenue', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">월 고정비</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.monthlyFixedCost || ''} onChange={e => update('monthlyFixedCost', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">변동비율 (%)</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.monthlyVariableCostRate || ''} onChange={e => update('monthlyVariableCostRate', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">월 성장률 (%)</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.monthlyGrowthRate || ''} onChange={e => update('monthlyGrowthRate', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 mb-3">
            <span className="text-gray-300 text-sm min-w-[140px]">보유 현금</span>
            <input type="text" className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-orange-500 focus:outline-none flex-1" value={v.cashReserve || ''} onChange={e => update('cashReserve', e.target.value)} />
          </label>
        </>
      )
    }
    return null
  }

  const renderResult = (result: any, loading: boolean) => {
    if (loading) return <div className="text-center text-[rgba(255,255,255,0.5)]">계산 중...</div>
    if (!result) return <div className="text-center text-[rgba(255,255,255,0.3)]">결과 대기</div>
    if (result.error) return <div className="text-center text-red-400">{result.error}</div>

    if (mode === 'montecarlo') {
      return (
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-300 text-sm min-w-[140px]">기대 수익률</span>
            <span className="font-mono text-lg font-semibold text-green-400">{(result.expectedReturn * 100).toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300 text-sm min-w-[140px]">최종 자산 중앙값</span>
            <span className="font-mono text-lg font-semibold text-white">{result.median.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300 text-sm min-w-[140px]">손실 확률</span>
            <span className="font-mono text-lg font-semibold text-red-400">{(result.probLoss * 100).toFixed(1)}%</span>
          </div>
        </div>
      )
    } else if (mode === 'loan') {
      return (
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-300 text-sm min-w-[140px]">월 상환액</span>
            <span className="font-mono text-lg font-semibold text-white">{result.monthlyPayment?.toLocaleString() || 'N/A'}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300 text-sm min-w-[140px]">총 이자</span>
            <span className="font-mono text-lg font-semibold text-red-400">{result.totalInterest?.toLocaleString() || 'N/A'}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300 text-sm min-w-[140px]">총 상환액</span>
            <span className="font-mono text-lg font-semibold text-white">{(result.totalInterest + parseFloat(scenarioA.values.principal || '0')).toLocaleString()}원</span>
          </div>
        </div>
      )
    } else if (mode === 'lifecycle') {
      return (
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-300 text-sm min-w-[140px]">은퇴 시 자산</span>
            <span className="font-mono text-lg font-semibold text-green-400">{result.retirementAssets?.toLocaleString() || 'N/A'}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300 text-sm min-w-[140px]">최종 순자산</span>
            <span className="font-mono text-lg font-semibold text-white">{result.finalNetWorth?.toLocaleString() || 'N/A'}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300 text-sm min-w-[140px]">생존 가능</span>
            <span className={result.survivalOk ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
              {result.survivalOk ? '✓ 가능' : '✗ 파산 위험'}
            </span>
          </div>
        </div>
      )
    } else if (mode === 'business') {
      return (
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-300 text-sm min-w-[140px]">손익분기 매출</span>
            <span className="font-mono text-lg font-semibold text-white">{result.breakEvenRevenue?.toLocaleString() || 'N/A'}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300 text-sm min-w-[140px]">영업이익률</span>
            <span className="font-mono text-lg font-semibold text-green-400">{result.margin?.toFixed(1) || 'N/A'}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300 text-sm min-w-[140px]">생존 판정</span>
            <span className={`font-mono text-lg font-semibold ${result.verdict === '안정' ? 'text-green-400' : result.verdict === '위험' ? 'text-red-400' : 'text-yellow-400'}`}>
              {result.verdict || 'N/A'}
            </span>
          </div>
        </div>
      )
    }
    return null
  }

  const compareMetric = (metricName: string, valA: number, valB: number, higherIsBetter: boolean) => {
    const winner = higherIsBetter ? (valA > valB ? 'A' : valB > valA ? 'B' : '동일') : (valA < valB ? 'A' : valB < valA ? 'B' : '동일')
    const diff = Math.abs(valA - valB)
    const diffPct = valB !== 0 ? ((valA - valB) / valB * 100) : 0

    return (
      <div className="flex items-center justify-between mb-3">
        <span className="label-display">{metricName}</span>
        <div className="flex items-center gap-2">
          <span className={winner === 'A' ? 'text-green-400' : 'text-[rgba(255,255,255,0.5)]'}>{valA.toLocaleString()}</span>
          <span className="text-[rgba(255,255,255,0.3)]">vs</span>
          <span className={winner === 'B' ? 'text-green-400' : 'text-[rgba(255,255,255,0.5)]'}>{valB.toLocaleString()}</span>
          <span className={`text-xs ${winner === 'A' ? 'text-green-400' : winner === 'B' ? 'text-red-400' : 'text-[rgba(255,255,255,0.3)]'}`}>
            ({diffPct > 0 ? '+' : ''}{diffPct.toFixed(1)}%)
          </span>
        </div>
      </div>
    )
  }

  const renderComparison = () => {
    if (!resultA || !resultB || resultA.error || resultB.error) return null

    if (mode === 'montecarlo') {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-orange-500 mb-4">비교 분석</h3>
          {compareMetric('최종 자산 중앙값', resultA.median, resultB.median, true)}
          {compareMetric('기대 수익률', resultA.expectedReturn * 100, resultB.expectedReturn * 100, true)}
          {compareMetric('손실 확률', resultA.probLoss * 100, resultB.probLoss * 100, false)}
        </div>
      )
    } else if (mode === 'loan') {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-orange-500 mb-4">비교 분석</h3>
          {compareMetric('총 이자', resultA.totalInterest, resultB.totalInterest, false)}
          {compareMetric('월 상환액', resultA.monthlyPayment, resultB.monthlyPayment, false)}
        </div>
      )
    } else if (mode === 'lifecycle') {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-orange-500 mb-4">비교 분석</h3>
          {compareMetric('은퇴 시 자산', resultA.retirementAssets, resultB.retirementAssets, true)}
          {compareMetric('최종 순자산', resultA.finalNetWorth, resultB.finalNetWorth, true)}
        </div>
      )
    } else if (mode === 'business') {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-orange-500 mb-4">비교 분석</h3>
          {compareMetric('손익분기 매출', resultA.breakEvenRevenue, resultB.breakEvenRevenue, false)}
          {compareMetric('영업이익률', resultA.margin, resultB.margin, true)}
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-orange-500 mb-6">A vs B 비교</h1>

        {/* Mode Selector */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { key: 'montecarlo', label: '투자 비교', icon: TrendingUp },
            { key: 'loan', label: '대출 비교', icon: DollarSign },
            { key: 'lifecycle', label: '인생설계 비교', icon: Users },
            { key: 'business', label: '사업 비교', icon: Briefcase },
          ].map(m => {
            const Icon = m.icon
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key as CompareMode)}
                className={`bg-gray-900 border rounded-lg p-4 ${mode === m.key ? 'border-orange-500' : 'border-gray-700'} hover:border-orange-400 transition-all`}
              >
                <Icon className="w-6 h-6 text-[#f97316] mx-auto mb-2" />
                <div className="text-sm font-semibold">{m.label}</div>
              </button>
            )
          })}
        </div>

        {/* Side by Side Comparison */}
        <div className="grid grid-cols-2 gap-6">
          {/* Scenario A */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-orange-500 mb-4">{scenarioA.name}</h2>
            {renderInputs(scenarioA, updateA)}
            <div className="mt-6 border-t border-[rgba(249,115,22,0.2)] pt-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">결과</h3>
              {renderResult(resultA, loadingA)}
            </div>
          </div>

          {/* Scenario B */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-orange-500 mb-4">{scenarioB.name}</h2>
            {renderInputs(scenarioB, updateB)}
            <div className="mt-6 border-t border-[rgba(249,115,22,0.2)] pt-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">결과</h3>
              {renderResult(resultB, loadingB)}
            </div>
          </div>
        </div>

        {/* Comparison Summary */}
        {renderComparison()}
      </div>
    </div>
  )
}
