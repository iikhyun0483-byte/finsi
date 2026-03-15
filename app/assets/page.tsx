'use client'
import { useState, useEffect, useCallback } from 'react'
import { formatKRW, formatPctRaw } from '@/lib/format'

type AssetCategory =
  | '부동산' | '차량' | '귀금속' | '현금' | '보험' | '지식재산' | '기타'

interface NonStockAsset {
  id: string
  category: AssetCategory
  name: string
  purchase_price: number
  current_value: number
  purchase_date?: string
  currency: string
  note?: string
}

interface Liability {
  id: string
  name: string
  principal: number
  remaining: number
  interest_rate: number
  due_date?: string
  note?: string
}

interface CashFlow {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  date: string
  note?: string
}

interface Holding {
  id: string
  ticker: string
  name?: string
  buy_price: number
  quantity: number
  asset_type: string
  currency: string
}

const CATEGORY_ICON: Record<string, string> = {
  부동산: '🏠', 차량: '🚗', 귀금속: '🪙', 현금: '💵',
  보험: '🛡️', 지식재산: '📄', 기타: '📦',
}

export default function AssetsPage() {
  const [tab, setTab] = useState<'overview' | 'stock' | 'nonstock' | 'liability' | 'cashflow'>('overview')
  const [assets, setAssets] = useState<NonStockAsset[]>([])
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [cashflow, setCashflow] = useState<CashFlow[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [showAddLiability, setShowAddLiability] = useState(false)
  const [showAddCashflow, setShowAddCashflow] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)

  // 폼 상태
  const [assetForm, setAssetForm] = useState({
    category: '부동산' as AssetCategory,
    name: '', purchase_price: '', current_value: '', note: '',
  })
  const [liabilityForm, setLiabilityForm] = useState({
    name: '', principal: '', remaining: '', interest_rate: '', due_date: '', note: '',
  })
  const [cashflowForm, setCashflowForm] = useState({
    type: 'income' as 'income' | 'expense',
    category: '', amount: '', date: new Date().toISOString().split('T')[0], note: '',
  })

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [assetsRes, holdingsRes] = await Promise.all([
        fetch('/api/assets').then(r => r.json()),
        fetch('/api/holdings').then(r => r.json()),
      ])
      setAssets(assetsRes.assets || [])
      setLiabilities(assetsRes.liabilities || [])
      setCashflow(assetsRes.cashflow || [])
      setHoldings(Array.isArray(holdingsRes) ? holdingsRes : [])
    } catch (e) {
      console.error('[AssetsPage fetch]', e)
      showToast('데이터 로드 실패', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { fetchAll() }, [fetchAll])

  // 순자산 계산
  const stockTotal = holdings.reduce((sum, h) => sum + h.buy_price * h.quantity, 0)
  const nonStockTotal = assets.reduce((sum, a) => sum + a.current_value, 0)
  const liabilityTotal = liabilities.reduce((sum, l) => sum + l.remaining, 0)
  const netWorth = stockTotal + nonStockTotal - liabilityTotal

  const now = new Date()
  const monthlyIncome = cashflow
    .filter(c => {
      const date = new Date(c.date)
      return c.type === 'income' &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
    })
    .reduce((sum, c) => sum + c.amount, 0)
  const monthlyExpense = cashflow
    .filter(c => {
      const date = new Date(c.date)
      return c.type === 'expense' &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
    })
    .reduce((sum, c) => sum + c.amount, 0)
  const monthlySaving = monthlyIncome - monthlyExpense

  async function handleAddAsset() {
    if (!assetForm.name.trim() || !assetForm.current_value) {
      showToast('필수 항목을 입력하세요', 'warning')
      return
    }

    const current = parseFloat(assetForm.current_value)
    if (isNaN(current) || current < 0) {
      showToast('현재 가치는 0 이상이어야 합니다', 'warning')
      return
    }

    const purchase = assetForm.purchase_price ? parseFloat(assetForm.purchase_price) : 0
    if (assetForm.purchase_price && (isNaN(purchase) || purchase < 0)) {
      showToast('취득가는 0 이상이어야 합니다', 'warning')
      return
    }

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'assets_non_stock',
          category: assetForm.category,
          name: assetForm.name.trim(),
          purchase_price: purchase,
          current_value: current,
          note: assetForm.note.trim(),
          currency: 'KRW',
        }),
      })

      if (!res.ok) {
        showToast('자산 추가 실패', 'error')
        return
      }

      showToast('자산이 추가되었습니다', 'success')
      setShowAddAsset(false)
      setAssetForm({ category: '부동산', name: '', purchase_price: '', current_value: '', note: '' })
      fetchAll()
    } catch (e) {
      console.error('[handleAddAsset]', e)
      showToast(`네트워크 오류: ${(e as Error).message}`, 'error')
    }
  }

  async function handleAddLiability() {
    if (!liabilityForm.name.trim() || !liabilityForm.remaining) {
      showToast('필수 항목을 입력하세요', 'warning')
      return
    }

    const remaining = parseFloat(liabilityForm.remaining)
    if (isNaN(remaining) || remaining < 0) {
      showToast('잔액은 0 이상이어야 합니다', 'warning')
      return
    }

    const principal = liabilityForm.principal ? parseFloat(liabilityForm.principal) : 0
    if (liabilityForm.principal && (isNaN(principal) || principal < 0)) {
      showToast('원금은 0 이상이어야 합니다', 'warning')
      return
    }

    const interestRate = liabilityForm.interest_rate ? parseFloat(liabilityForm.interest_rate) : 0
    if (liabilityForm.interest_rate && (isNaN(interestRate) || interestRate < 0)) {
      showToast('이자율은 0 이상이어야 합니다', 'warning')
      return
    }

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'liabilities',
          name: liabilityForm.name.trim(),
          principal,
          remaining,
          interest_rate: interestRate,
          due_date: liabilityForm.due_date || null,
          note: liabilityForm.note.trim(),
        }),
      })

      if (!res.ok) {
        showToast('부채 추가 실패', 'error')
        return
      }

      showToast('부채가 추가되었습니다', 'success')
      setShowAddLiability(false)
      setLiabilityForm({ name: '', principal: '', remaining: '', interest_rate: '', due_date: '', note: '' })
      fetchAll()
    } catch (e) {
      console.error('[handleAddLiability]', e)
      showToast(`네트워크 오류: ${(e as Error).message}`, 'error')
    }
  }

  async function handleAddCashflow() {
    if (!cashflowForm.amount || !cashflowForm.date) {
      showToast('금액과 날짜를 입력하세요', 'warning')
      return
    }

    const amount = parseFloat(cashflowForm.amount)
    if (isNaN(amount) || amount <= 0) {
      showToast('금액은 0보다 커야 합니다', 'warning')
      return
    }

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'cashflow',
          type: cashflowForm.type,
          category: cashflowForm.category.trim(),
          amount,
          date: cashflowForm.date,
          note: cashflowForm.note.trim(),
          currency: 'KRW',
        }),
      })

      if (!res.ok) {
        showToast('현금흐름 추가 실패', 'error')
        return
      }

      showToast('현금흐름이 추가되었습니다', 'success')
      setShowAddCashflow(false)
      setCashflowForm({ type: 'income', category: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' })
      fetchAll()
    } catch (e) {
      console.error('[handleAddCashflow]', e)
      showToast(`네트워크 오류: ${(e as Error).message}`, 'error')
    }
  }

  async function handleDelete(table: string, id: string, name: string) {
    try {
      const res = await fetch('/api/assets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id }),
      })

      if (!res.ok) {
        showToast('삭제 실패', 'error')
        return
      }

      showToast(`${name} 삭제되었습니다`, 'info')
      fetchAll()
    } catch (e) {
      console.error('[handleDelete]', e)
      showToast(`네트워크 오류: ${(e as Error).message}`, 'error')
    }
  }

  const tabs = [
    { key: 'overview', label: '전체 요약' },
    { key: 'stock', label: '주식/ETF/코인' },
    { key: 'nonstock', label: '비금융 자산' },
    { key: 'liability', label: '부채' },
    { key: 'cashflow', label: '현금흐름' },
  ] as const

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Toast 알림 */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-opacity ${
            toast.type === 'success' ? 'bg-green-600' :
            toast.type === 'error' ? 'bg-red-600' :
            toast.type === 'warning' ? 'bg-yellow-600' :
            'bg-blue-600'
          }`}>
            <p className="text-sm font-medium text-white">{toast.message}</p>
          </div>
        )}

        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            💼 자산 관리
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            전체 자산 · 부채 · 현금흐름 통합 관리
          </p>
        </div>

        {/* 순자산 요약 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#1a2035] rounded-xl p-4 col-span-2 md:col-span-1">
            <p className="text-gray-400 text-xs mb-1">순자산 (Net Worth)</p>
            <p className={`text-xl font-bold ${netWorth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatKRW(netWorth)}
            </p>
          </div>
          <div className="bg-[#1a2035] rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">총 자산</p>
            <p className="text-lg font-bold text-blue-400">{formatKRW(stockTotal + nonStockTotal)}</p>
          </div>
          <div className="bg-[#1a2035] rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">총 부채</p>
            <p className="text-lg font-bold text-red-400">{formatKRW(liabilityTotal)}</p>
          </div>
          <div className="bg-[#1a2035] rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">이번달 저축</p>
            <p className={`text-lg font-bold ${monthlySaving >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatKRW(monthlySaving)}
            </p>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap font-medium transition-colors ${
                tab === t.key
                  ? 'bg-orange-500 text-white'
                  : 'bg-[#1a2035] text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center text-gray-400 py-12">불러오는 중...</div>
        )}

        {/* 전체 요약 탭 */}
        {!loading && tab === 'overview' && (
          <div className="space-y-4">
            {/* 자산 구성 비율 */}
            <div className="bg-[#1a2035] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">자산 구성</h3>
              <div className="space-y-3">
                {[
                  { label: '주식/ETF/코인', value: stockTotal, color: 'bg-blue-500' },
                  { label: '비금융 자산', value: nonStockTotal, color: 'bg-orange-500' },
                  { label: '부채 (차감)', value: liabilityTotal, color: 'bg-red-500' },
                ].map(item => {
                  const total = stockTotal + nonStockTotal
                  const pct = total > 0 ? (item.value / total) * 100 : 0
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">{item.label}</span>
                        <span className="text-white font-medium">{formatKRW(item.value)}</span>
                      </div>
                      <div className="h-2 bg-[#0a0e1a] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 이번달 현금흐름 */}
            <div className="bg-[#1a2035] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">이번달 현금흐름</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-gray-400 text-xs mb-1">수입</p>
                  <p className="text-green-400 font-bold">{formatKRW(monthlyIncome)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">지출</p>
                  <p className="text-red-400 font-bold">{formatKRW(monthlyExpense)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">저축</p>
                  <p className={`font-bold ${monthlySaving >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatKRW(monthlySaving)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 주식 탭 */}
        {!loading && tab === 'stock' && (
          <div className="space-y-3">
            {holdings.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                보유 종목 없음 — 포트폴리오 또는 워치리스트에서 추가하세요
              </div>
            ) : (
              holdings.map(h => (
                <div key={h.id} className="bg-[#1a2035] rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-white">{h.ticker}</p>
                    <p className="text-gray-400 text-sm">{h.name || h.asset_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatKRW(h.buy_price * h.quantity)}</p>
                    <p className="text-gray-400 text-sm">{h.quantity}주 × {formatKRW(h.buy_price)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 비주식 자산 탭 */}
        {!loading && tab === 'nonstock' && (
          <div className="space-y-3">
            <button
              onClick={() => setShowAddAsset(true)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 font-medium transition-colors"
            >
              + 비금융 자산 추가
            </button>

            {showAddAsset && (
              <div className="bg-[#1a2035] rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-white">비금융 자산 추가</h3>
                <select
                  value={assetForm.category}
                  onChange={e => setAssetForm(f => ({ ...f, category: e.target.value as AssetCategory }))}
                  className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  {(['부동산', '차량', '귀금속', '현금', '보험', '지식재산', '기타'] as AssetCategory[]).map(c => (
                    <option key={c} value={c}>{CATEGORY_ICON[c]} {c}</option>
                  ))}
                </select>
                <input
                  placeholder="자산 이름 (예: 강남 아파트)"
                  value={assetForm.name}
                  onChange={e => setAssetForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
                />
                <input
                  type="number"
                  placeholder="취득가 (원)"
                  value={assetForm.purchase_price}
                  onChange={e => setAssetForm(f => ({ ...f, purchase_price: e.target.value }))}
                  className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
                />
                <input
                  type="number"
                  placeholder="현재 가치 (원) *필수"
                  value={assetForm.current_value}
                  onChange={e => setAssetForm(f => ({ ...f, current_value: e.target.value }))}
                  className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
                />
                <div className="flex gap-2">
                  <button onClick={handleAddAsset} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2 font-medium">저장</button>
                  <button onClick={() => setShowAddAsset(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2">취소</button>
                </div>
              </div>
            )}

            {assets.map(a => {
              const gain = a.current_value - a.purchase_price
              const gainPct = a.purchase_price > 0 ? (gain / a.purchase_price) * 100 : 0
              return (
                <div key={a.id} className="bg-[#1a2035] rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-white">
                      {CATEGORY_ICON[a.category]} {a.name}
                    </p>
                    <p className="text-gray-400 text-sm">{a.category}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-white font-medium">{formatKRW(a.current_value)}</p>
                      <p className={`text-sm ${gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {gain >= 0 ? '+' : ''}{formatPctRaw(gainPct)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete('assets_non_stock', a.id, a.name)}
                      className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 부채 탭 */}
        {!loading && tab === 'liability' && (
          <div className="space-y-3">
            <button
              onClick={() => setShowAddLiability(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3 font-medium transition-colors"
            >
              + 부채 추가
            </button>

            {showAddLiability && (
              <div className="bg-[#1a2035] rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-white">부채 추가</h3>
                <input placeholder="부채 이름 (예: 주택담보대출)" value={liabilityForm.name}
                  onChange={e => setLiabilityForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                <input type="number" placeholder="원금 (원)" value={liabilityForm.principal}
                  onChange={e => setLiabilityForm(f => ({ ...f, principal: e.target.value }))}
                  className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                <input type="number" placeholder="잔액 (원) *필수" value={liabilityForm.remaining}
                  onChange={e => setLiabilityForm(f => ({ ...f, remaining: e.target.value }))}
                  className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                <input type="number" placeholder="이자율 (%)" value={liabilityForm.interest_rate}
                  onChange={e => setLiabilityForm(f => ({ ...f, interest_rate: e.target.value }))}
                  className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                <div className="flex gap-2">
                  <button onClick={handleAddLiability} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 font-medium">저장</button>
                  <button onClick={() => setShowAddLiability(false)} className="flex-1 bg-gray-700 text-white rounded-lg py-2">취소</button>
                </div>
              </div>
            )}

            {liabilities.map(l => (
              <div key={l.id} className="bg-[#1a2035] rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-white">🔴 {l.name}</p>
                  <p className="text-gray-400 text-sm">이자 {l.interest_rate}%</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-red-400 font-medium">{formatKRW(l.remaining)}</p>
                    <p className="text-gray-400 text-sm">원금 {formatKRW(l.principal)}</p>
                  </div>
                  <button
                    onClick={() => handleDelete('liabilities', l.id, l.name)}
                    className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 현금흐름 탭 */}
        {!loading && tab === 'cashflow' && (
          <div className="space-y-3">
            <button
              onClick={() => setShowAddCashflow(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-medium transition-colors"
            >
              + 수입/지출 추가
            </button>

            {showAddCashflow && (
              <div className="bg-[#1a2035] rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-white">수입/지출 추가</h3>
                <div className="flex gap-2">
                  {(['income', 'expense'] as const).map(t => (
                    <button key={t} onClick={() => setCashflowForm(f => ({ ...f, type: t }))}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        cashflowForm.type === t
                          ? t === 'income' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                      {t === 'income' ? '수입' : '지출'}
                    </button>
                  ))}
                </div>
                <input placeholder="카테고리 (예: 월급, 식비)" value={cashflowForm.category}
                  onChange={e => setCashflowForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                <input type="number" placeholder="금액 (원)" value={cashflowForm.amount}
                  onChange={e => setCashflowForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                <input type="date" value={cashflowForm.date}
                  onChange={e => setCashflowForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white" />
                <div className="flex gap-2">
                  <button onClick={handleAddCashflow} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-medium">저장</button>
                  <button onClick={() => setShowAddCashflow(false)} className="flex-1 bg-gray-700 text-white rounded-lg py-2">취소</button>
                </div>
              </div>
            )}

            {cashflow.slice(0, 30).map(c => (
              <div key={c.id} className="bg-[#1a2035] rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-white">
                    {c.type === 'income' ? '🟢' : '🔴'} {c.category || (c.type === 'income' ? '수입' : '지출')}
                  </p>
                  <p className="text-gray-400 text-sm">{c.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`font-medium ${c.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {c.type === 'income' ? '+' : '-'}{formatKRW(c.amount)}
                  </p>
                  <button
                    onClick={() => handleDelete('cashflow', c.id, c.category || (c.type === 'income' ? '수입' : '지출'))}
                    className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
