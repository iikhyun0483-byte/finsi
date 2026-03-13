'use client'
import { useState, useEffect, useRef } from 'react'
import { formatKRW } from '@/lib/format'
import { validate, sanitize } from '@/lib/input-validator'
import { TLabel, ResultRow } from '@/components/Tooltip'
import { ScenarioSave } from '@/components/ScenarioSave'

type CalcMode = 'loan' | 'affordability' | 'buyvsrent' | 'business'

const MODES: { key: CalcMode; label: string; icon: string; desc: string }[] = [
  { key: 'loan', label: '대출 계산기', icon: '🏦', desc: '이자·월납입·상환 일정' },
  { key: 'affordability', label: '대출 적정성', icon: '⚖️', desc: 'DTI·DSR·감당 가능 금액' },
  { key: 'buyvsrent', label: '매수 vs 전세', icon: '🏠', desc: '어느 쪽이 유리한가' },
  { key: 'business', label: '사업 생존 계산', icon: '🚀', desc: '런웨이·손익분기·생존 확률' },
]

export default function FinancePage() {
  const [mode, setMode] = useState<CalcMode>('loan')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 대출 계산기
  const [loan, setLoan] = useState({
    principal: '', annualRate: '', months: '',
    repaymentType: 'equal-payment' as 'equal-payment' | 'equal-principal',
    gracePeriodMonths: '0', startDate: '',
  })

  // 대출 적정성
  const [afford, setAfford] = useState({
    monthlyIncome: '', monthlyExpense: '', existingDebtPayment: '',
    newLoanPayment: '', totalAssets: '', loanPrincipal: '',
  })

  // 매수 vs 전세
  const [bvr, setBvr] = useState({
    currentAssets: '', monthlyIncome: '', analysisYears: '',
    buyPrice: '', downPayment: '', mortgagePrincipal: '',
    mortgageAnnualRate: '', mortgageMonths: '',
    propertyTaxRate: '0.4', maintenanceFeeMonthly: '',
    homeAppreciationRate: '',
    jeonseDeposit: '', jeonseDepositLoanRate: '',
    jeonseMonthlyFee: '', jeonseAppreciationRate: '',
    investmentReturn: '', investmentVolatility: '',
  })

  // 사업
  const [biz, setBiz] = useState({
    monthlyRevenue: '', monthlyFixedCost: '',
    monthlyVariableCostRate: '', cashReserve: '', monthlyGrowthRate: '',
  })

  const n = (v: string) => parseFloat(v) || 0
  const pct = (v: string) => parseFloat(v) / 100 || 0

  // 입력 바뀌면 자동 계산
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => calculate(), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [mode, loan, afford, bvr, biz])

  async function calculate() {
    setError(null)
    let body: any = { calcType: mode }

    if (mode === 'loan') {
      if (!loan.principal || !loan.annualRate || !loan.months) return
      body = { ...body, principal: n(loan.principal), annualRate: pct(loan.annualRate),
                months: n(loan.months), repaymentType: loan.repaymentType,
                gracePeriodMonths: n(loan.gracePeriodMonths),
                startDate: loan.startDate || undefined }
    } else if (mode === 'affordability') {
      if (!afford.monthlyIncome || !afford.newLoanPayment) return
      body = { ...body, monthlyIncome: n(afford.monthlyIncome),
                monthlyExpense: n(afford.monthlyExpense),
                existingDebtPayment: n(afford.existingDebtPayment),
                newLoanPayment: n(afford.newLoanPayment),
                totalAssets: n(afford.totalAssets),
                loanPrincipal: n(afford.loanPrincipal) }
    } else if (mode === 'buyvsrent') {
      if (!bvr.buyPrice || !bvr.jeonseDeposit || !bvr.analysisYears) return
      body = { ...body,
                currentAssets: n(bvr.currentAssets),
                monthlyIncome: n(bvr.monthlyIncome),
                analysisYears: n(bvr.analysisYears),
                buyPrice: n(bvr.buyPrice), downPayment: n(bvr.downPayment),
                mortgagePrincipal: n(bvr.mortgagePrincipal),
                mortgageAnnualRate: pct(bvr.mortgageAnnualRate),
                mortgageMonths: n(bvr.mortgageMonths),
                propertyTaxRate: pct(bvr.propertyTaxRate),
                maintenanceFeeMonthly: n(bvr.maintenanceFeeMonthly),
                homeAppreciationRate: pct(bvr.homeAppreciationRate),
                jeonseDeposit: n(bvr.jeonseDeposit),
                jeonseDepositLoanRate: pct(bvr.jeonseDepositLoanRate),
                jeonseMonthlyFee: n(bvr.jeonseMonthlyFee),
                jeonseAppreciationRate: pct(bvr.jeonseAppreciationRate),
                investmentReturn: pct(bvr.investmentReturn),
                investmentVolatility: pct(bvr.investmentVolatility) }
    } else if (mode === 'business') {
      if (!biz.monthlyRevenue || !biz.monthlyFixedCost) return
      body = { ...body,
                monthlyRevenue: n(biz.monthlyRevenue),
                monthlyFixedCost: n(biz.monthlyFixedCost),
                monthlyVariableCostRate: pct(biz.monthlyVariableCostRate),
                cashReserve: n(biz.cashReserve),
                monthlyGrowthRate: pct(biz.monthlyGrowthRate) }
    }

    setLoading(true)
    try {
      const res = await fetch('/api/finance-calc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const ic = "w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none text-sm"
  const lc = "text-gray-400 text-xs mb-1 block"

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-bold">💰 재무 계산기</h1>
          <p className="text-gray-400 text-sm mt-1">
            대출·적정성·매수vs전세·사업 — 숫자 입력 즉시 계산
          </p>
        </div>

        {/* 모드 선택 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {MODES.map(m => (
            <button key={m.key} onClick={() => { setMode(m.key); setResult(null) }}
              className={`p-4 rounded-xl text-left transition-all ${
                mode === m.key ? 'bg-orange-500 text-white' : 'bg-[#1a2035] text-gray-300 hover:bg-[#242b45]'
              }`}>
              <div className="text-2xl mb-1">{m.icon}</div>
              <div className="font-semibold text-sm">{m.label}</div>
              <div className={`text-xs mt-0.5 ${mode === m.key ? 'text-orange-100' : 'text-gray-500'}`}>{m.desc}</div>
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">

          {/* 입력 패널 */}
          <div className="bg-[#1a2035] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">입력</h3>
              {loading && <span className="text-orange-400 text-xs animate-pulse">계산 중...</span>}
            </div>

            {/* 대출 계산기 */}
            {mode === 'loan' && (
              <>
                <div><label className={lc}>대출 원금 (원) *</label>
                  <input type="number" placeholder="예: 300000000" value={loan.principal}
                    onChange={e => setLoan(v => ({ ...v, principal: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>연 이자율 (%) *</label>
                  <input type="number" step="0.1" placeholder="예: 4.5" value={loan.annualRate}
                    onChange={e => setLoan(v => ({ ...v, annualRate: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>대출 기간 (개월) *</label>
                  <input type="number" placeholder="예: 360 (30년)" value={loan.months}
                    onChange={e => setLoan(v => ({ ...v, months: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>상환 방식</label>
                  <select value={loan.repaymentType}
                    onChange={e => setLoan(v => ({ ...v, repaymentType: e.target.value as any }))}
                    className={ic}>
                    <option value="equal-payment">원리금균등 (매월 동일 납입)</option>
                    <option value="equal-principal">원금균등 (원금 고정, 이자 감소)</option>
                  </select></div>
                <div><label className={lc}>거치 기간 (개월, 이자만 납입)</label>
                  <input type="number" placeholder="예: 0" value={loan.gracePeriodMonths}
                    onChange={e => setLoan(v => ({ ...v, gracePeriodMonths: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>대출 시작일 (선택)</label>
                  <input type="date" value={loan.startDate}
                    onChange={e => setLoan(v => ({ ...v, startDate: e.target.value }))} className={ic} /></div>
              </>
            )}

            {/* 대출 적정성 */}
            {mode === 'affordability' && (
              <>
                <div><label className={lc}>월 소득 (원) *</label>
                  <input type="number" placeholder="예: 5000000" value={afford.monthlyIncome}
                    onChange={e => setAfford(v => ({ ...v, monthlyIncome: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>월 지출 (원, 대출 제외)</label>
                  <input type="number" placeholder="예: 2000000" value={afford.monthlyExpense}
                    onChange={e => setAfford(v => ({ ...v, monthlyExpense: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>기존 부채 월 납입액 (원)</label>
                  <input type="number" placeholder="예: 500000" value={afford.existingDebtPayment}
                    onChange={e => setAfford(v => ({ ...v, existingDebtPayment: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>신규 대출 월 납입액 (원) *</label>
                  <input type="number" placeholder="예: 1500000" value={afford.newLoanPayment}
                    onChange={e => setAfford(v => ({ ...v, newLoanPayment: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>총 자산 (원)</label>
                  <input type="number" placeholder="예: 200000000" value={afford.totalAssets}
                    onChange={e => setAfford(v => ({ ...v, totalAssets: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>대출 원금 (원)</label>
                  <input type="number" placeholder="예: 300000000" value={afford.loanPrincipal}
                    onChange={e => setAfford(v => ({ ...v, loanPrincipal: e.target.value }))} className={ic} /></div>
              </>
            )}

            {/* 매수 vs 전세 */}
            {mode === 'buyvsrent' && (
              <>
                <div><label className={lc}>비교 기간 (년) *</label>
                  <input type="number" placeholder="예: 10" value={bvr.analysisYears}
                    onChange={e => setBvr(v => ({ ...v, analysisYears: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>매수 — 집 가격 (원) *</label>
                  <input type="number" placeholder="예: 800000000" value={bvr.buyPrice}
                    onChange={e => setBvr(v => ({ ...v, buyPrice: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>매수 — 대출 원금 (원)</label>
                  <input type="number" placeholder="예: 400000000" value={bvr.mortgagePrincipal}
                    onChange={e => setBvr(v => ({ ...v, mortgagePrincipal: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>매수 — 대출 금리 (%)</label>
                  <input type="number" step="0.1" placeholder="예: 4.5" value={bvr.mortgageAnnualRate}
                    onChange={e => setBvr(v => ({ ...v, mortgageAnnualRate: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>매수 — 대출 기간 (개월)</label>
                  <input type="number" placeholder="예: 360" value={bvr.mortgageMonths}
                    onChange={e => setBvr(v => ({ ...v, mortgageMonths: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>매수 — 집값 연 상승률 (%)</label>
                  <input type="number" step="0.1" placeholder="예: 3" value={bvr.homeAppreciationRate}
                    onChange={e => setBvr(v => ({ ...v, homeAppreciationRate: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>매수 — 월 관리비 (원)</label>
                  <input type="number" placeholder="예: 300000" value={bvr.maintenanceFeeMonthly}
                    onChange={e => setBvr(v => ({ ...v, maintenanceFeeMonthly: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>전세 — 보증금 (원) *</label>
                  <input type="number" placeholder="예: 500000000" value={bvr.jeonseDeposit}
                    onChange={e => setBvr(v => ({ ...v, jeonseDeposit: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>전세 — 대출 금리 (%, 없으면 0)</label>
                  <input type="number" step="0.1" placeholder="예: 2.5" value={bvr.jeonseDepositLoanRate}
                    onChange={e => setBvr(v => ({ ...v, jeonseDepositLoanRate: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>전세 — 연 전세가 상승률 (%)</label>
                  <input type="number" step="0.1" placeholder="예: 3" value={bvr.jeonseAppreciationRate}
                    onChange={e => setBvr(v => ({ ...v, jeonseAppreciationRate: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>차액 투자 수익률 (%)</label>
                  <input type="number" step="0.1" placeholder="예: 7" value={bvr.investmentReturn}
                    onChange={e => setBvr(v => ({ ...v, investmentReturn: e.target.value }))} className={ic} /></div>
              </>
            )}

            {/* 사업 계산 */}
            {mode === 'business' && (
              <>
                <div><label className={lc}>월 매출 (원) *</label>
                  <input type="number" placeholder="예: 10000000" value={biz.monthlyRevenue}
                    onChange={e => setBiz(v => ({ ...v, monthlyRevenue: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>월 고정비 (원) *</label>
                  <input type="number" placeholder="예: 5000000" value={biz.monthlyFixedCost}
                    onChange={e => setBiz(v => ({ ...v, monthlyFixedCost: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>변동비율 (매출 대비 %, 예: 재료비)</label>
                  <input type="number" placeholder="예: 30" value={biz.monthlyVariableCostRate}
                    onChange={e => setBiz(v => ({ ...v, monthlyVariableCostRate: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>보유 현금 (런웨이 계산용, 원)</label>
                  <input type="number" placeholder="예: 30000000" value={biz.cashReserve}
                    onChange={e => setBiz(v => ({ ...v, cashReserve: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>월 매출 성장률 (%)</label>
                  <input type="number" step="0.1" placeholder="예: 5" value={biz.monthlyGrowthRate}
                    onChange={e => setBiz(v => ({ ...v, monthlyGrowthRate: e.target.value }))} className={ic} /></div>
              </>
            )}
          </div>

          {/* 결과 패널 */}
          <div className="bg-[#1a2035] rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">결과</h3>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm mb-3">{error}</div>
            )}

            {!result && !loading && (
              <p className="text-gray-500 text-sm">숫자를 입력하면 자동으로 계산됩니다</p>
            )}

            {/* 대출 결과 */}
            {result && mode === 'loan' && (
              <div className="space-y-3">
                {[
                  { label: loan.repaymentType === 'equal-payment' ? '월 납입액 (고정)' : '첫 달 납입액',
                    value: formatKRW(result.monthlyPayment ?? result.firstMonthPayment), color: 'text-orange-400' },
                  ...(loan.repaymentType === 'equal-principal' ? [
                    { label: '마지막 달 납입액', value: formatKRW(result.lastMonthPayment), color: 'text-green-400' },
                  ] : []),
                  { label: '총 납입액', value: formatKRW(result.totalPayment), color: 'text-white' },
                  { label: '총 이자', value: formatKRW(result.totalInterest), color: 'text-red-400' },
                  { label: '이자 비율', value: `${(result.interestRatio * 100).toFixed(1)}%`, color: 'text-yellow-400' },
                  { label: '원금 50% 상환 시점', value: `${result.breakEvenMonth}개월 후`, color: 'text-blue-400' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center py-2 border-b border-gray-800">
                    <span className="text-gray-400 text-sm">{r.label}</span>
                    <span className={`font-semibold ${r.color}`}>{r.value}</span>
                  </div>
                ))}

                {/* 상환 일정 미리보기 (12개월) */}
                {result.schedule?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-400 text-xs mb-2">상환 일정 (처음 12개월)</p>
                    <div className="overflow-x-auto max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-[#1a2035]">
                          <tr className="text-gray-500">
                            <th className="text-left py-1">월</th>
                            <th className="text-right py-1">납입액</th>
                            <th className="text-right py-1">원금</th>
                            <th className="text-right py-1">이자</th>
                            <th className="text-right py-1">잔액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.schedule.slice(0, 12).map((row: any) => (
                            <tr key={row.month} className="border-t border-gray-800">
                              <td className="py-1 text-gray-400">{row.month}월</td>
                              <td className="py-1 text-right text-white">{formatKRW(row.payment)}</td>
                              <td className="py-1 text-right text-blue-400">{formatKRW(row.principal)}</td>
                              <td className="py-1 text-right text-red-400">{formatKRW(row.interest)}</td>
                              <td className="py-1 text-right text-gray-300">{formatKRW(row.remainingBalance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 대출 적정성 결과 */}
            {result && mode === 'affordability' && (
              <div className="space-y-3">
                <div className={`text-center py-3 rounded-xl font-bold text-lg ${
                  result.verdict === '여유' ? 'bg-green-900/40 text-green-400' :
                  result.verdict === '적정' ? 'bg-blue-900/40 text-blue-400' :
                  result.verdict === '주의' ? 'bg-yellow-900/40 text-yellow-400' :
                  result.verdict === '위험' ? 'bg-orange-900/40 text-orange-400' :
                  'bg-red-900/40 text-red-400'
                }`}>
                  {result.verdict}
                </div>
                {[
                  { label: 'DTI (총부채상환비율)', value: `${(result.dti * 100).toFixed(1)}%`,
                    color: result.dti < 0.4 ? 'text-green-400' : result.dti < 0.5 ? 'text-yellow-400' : 'text-red-400' },
                  { label: '월 여유 현금', value: formatKRW(result.surplus),
                    color: result.surplus >= 0 ? 'text-green-400' : 'text-red-400' },
                  { label: '최대 감당 가능 대출', value: formatKRW(result.maxAffordableLoan), color: 'text-blue-400' },
                  { label: 'LTV (담보인정비율)', value: `${(result.ltv * 100).toFixed(1)}%`,
                    color: result.ltv < 0.6 ? 'text-green-400' : result.ltv < 0.8 ? 'text-yellow-400' : 'text-red-400' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400 text-sm">{r.label}</span>
                    <span className={`font-semibold ${r.color}`}>{r.value}</span>
                  </div>
                ))}
                <div className="space-y-1 mt-2">
                  {result.reasons?.map((r: string, i: number) => (
                    <p key={i} className="text-gray-400 text-xs">• {r}</p>
                  ))}
                </div>
              </div>
            )}

            {/* 매수 vs 전세 결과 */}
            {result && mode === 'buyvsrent' && (
              <div className="space-y-3">
                <div className={`text-center py-3 rounded-xl font-bold text-xl ${
                  result.winner === '매수' ? 'bg-blue-900/40 text-blue-400' :
                  result.winner === '전세' ? 'bg-green-900/40 text-green-400' :
                  'bg-gray-800 text-gray-300'
                }`}>
                  {result.winner} 유리 ({formatKRW(result.difference)} 차이)
                </div>
                {[
                  { label: `매수 순자산 (${result.years}년 후)`, value: formatKRW(result.buyNetWorth), color: 'text-blue-400' },
                  { label: `전세 순자산 (${result.years}년 후)`, value: formatKRW(result.rentNetWorth), color: 'text-green-400' },
                  { label: '매수 월평균 비용', value: formatKRW(result.buyMonthlyCost), color: 'text-orange-400' },
                  { label: '전세 월평균 비용', value: formatKRW(result.rentMonthlyCost), color: 'text-orange-400' },
                  { label: '매수 유리 전환 시점',
                    value: result.breakEvenYear ? `${result.breakEvenYear}년 후` : '분석 기간 내 없음',
                    color: result.breakEvenYear ? 'text-yellow-400' : 'text-gray-400' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400 text-sm">{r.label}</span>
                    <span className={`font-semibold ${r.color}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 사업 결과 */}
            {result && mode === 'business' && (
              <div className="space-y-3">
                <div className={`text-center py-3 rounded-xl font-bold text-xl ${
                  result.verdict === '안정' ? 'bg-green-900/40 text-green-400' :
                  result.verdict === '주의' ? 'bg-yellow-900/40 text-yellow-400' :
                  result.verdict === '위험' ? 'bg-orange-900/40 text-orange-400' :
                  'bg-red-900/40 text-red-400'
                }`}>
                  {result.verdict}
                </div>
                {[
                  { label: '영업이익률', value: `${(result.currentMargin * 100).toFixed(1)}%`,
                    color: result.currentMargin >= 0.1 ? 'text-green-400' : result.currentMargin >= 0 ? 'text-yellow-400' : 'text-red-400' },
                  { label: '손익분기 매출', value: formatKRW(result.breakEvenRevenue), color: 'text-blue-400' },
                  { label: '런웨이 (현금 소진까지)',
                    value: result.runway >= 999 ? '흑자 — 소진 없음' : `${result.runway.toFixed(1)}개월`,
                    color: result.runway >= 12 ? 'text-green-400' : result.runway >= 6 ? 'text-yellow-400' : 'text-red-400' },
                  { label: '12개월 생존 확률', value: `${(result.survivalProb * 100).toFixed(0)}%`,
                    color: result.survivalProb >= 0.8 ? 'text-green-400' : result.survivalProb >= 0.5 ? 'text-yellow-400' : 'text-red-400' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400 text-sm">{r.label}</span>
                    <span className={`font-semibold ${r.color}`}>{r.value}</span>
                  </div>
                ))}
                <div className="space-y-1 mt-2">
                  {result.recommendations?.map((r: string, i: number) => (
                    <p key={i} className="text-gray-400 text-xs">• {r}</p>
                  ))}
                </div>
              </div>
            )}

            {/* 시나리오 저장 */}
            {result && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <ScenarioSave
                  type={(mode === 'affordability' ? 'loan' : mode) as 'loan' | 'buyvsrent' | 'business'}
                  inputData={mode === 'loan' ? loan : mode === 'affordability' ? afford : mode === 'buyvsrent' ? bvr : biz}
                  resultData={result}
                  defaultLabel={`${MODES.find(m => m.key === mode)?.label}_${new Date().toLocaleDateString('ko-KR')}`}
                  onLoad={(input, res) => {
                    if (mode === 'loan') setLoan(prev => ({ ...prev, ...input }))
                    else if (mode === 'affordability') setAfford(prev => ({ ...prev, ...input }))
                    else if (mode === 'buyvsrent') setBvr(prev => ({ ...prev, ...input }))
                    else if (mode === 'business') setBiz(prev => ({ ...prev, ...input }))
                    setResult(res)
                  }}
                />
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
