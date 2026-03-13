# PHASE 3 — 자산관리 완전체
# 주식 + 비주식 + 부채 + 현금흐름 통합 페이지

---

## 목표
app/assets/page.tsx 신규 생성
순자산 = 주식자산 + 비주식자산 - 부채

---

## STEP 1. app/api/holdings/route.ts 확인 또는 생성

파일이 없으면 생성, 있으면 건드리지 말 것.

```typescript
// app/api/holdings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('holdings')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    console.error('[holdings GET]', e)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data, error } = await supabase.from('holdings').insert(body).select()
    if (error) throw error
    return NextResponse.json(data[0])
  } catch (e) {
    console.error('[holdings POST]', e)
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const { error } = await supabase.from('holdings').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[holdings DELETE]', e)
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  }
}
```

---

## STEP 2. app/api/assets/route.ts 생성

```typescript
// app/api/assets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 비주식 자산
export async function GET() {
  try {
    const [assets, liabilities, cashflow] = await Promise.all([
      supabase.from('assets_non_stock').select('*').order('created_at', { ascending: false }),
      supabase.from('liabilities').select('*').order('created_at', { ascending: false }),
      supabase.from('cashflow').select('*').order('date', { ascending: false }).limit(100),
    ])
    return NextResponse.json({
      assets: assets.data || [],
      liabilities: liabilities.data || [],
      cashflow: cashflow.data || [],
    })
  } catch (e) {
    console.error('[assets GET]', e)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { table, ...rest } = body
    const allowed = ['assets_non_stock', 'liabilities', 'cashflow']
    if (!allowed.includes(table)) {
      return NextResponse.json({ error: '허용되지 않은 테이블' }, { status: 400 })
    }
    const { data, error } = await supabase.from(table).insert(rest).select()
    if (error) throw error
    return NextResponse.json(data[0])
  } catch (e) {
    console.error('[assets POST]', e)
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }
}
```

---

## STEP 3. app/assets/page.tsx 생성

전체 파일 생성. NEXUS 디자인 유지.

```typescript
'use client'
import { useState, useEffect } from 'react'
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

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
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
    } finally {
      setLoading(false)
    }
  }

  // 순자산 계산
  const stockTotal = holdings.reduce((sum, h) => sum + h.buy_price * h.quantity, 0)
  const nonStockTotal = assets.reduce((sum, a) => sum + a.current_value, 0)
  const liabilityTotal = liabilities.reduce((sum, l) => sum + l.remaining, 0)
  const netWorth = stockTotal + nonStockTotal - liabilityTotal

  const monthlyIncome = cashflow
    .filter(c => c.type === 'income' && new Date(c.date).getMonth() === new Date().getMonth())
    .reduce((sum, c) => sum + c.amount, 0)
  const monthlyExpense = cashflow
    .filter(c => c.type === 'expense' && new Date(c.date).getMonth() === new Date().getMonth())
    .reduce((sum, c) => sum + c.amount, 0)
  const monthlySaving = monthlyIncome - monthlyExpense

  async function handleAddAsset() {
    if (!assetForm.name || !assetForm.current_value) return
    await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'assets_non_stock',
        category: assetForm.category,
        name: assetForm.name,
        purchase_price: Number(assetForm.purchase_price) || 0,
        current_value: Number(assetForm.current_value),
        note: assetForm.note,
        currency: 'KRW',
      }),
    })
    setShowAddAsset(false)
    setAssetForm({ category: '부동산', name: '', purchase_price: '', current_value: '', note: '' })
    fetchAll()
  }

  async function handleAddLiability() {
    if (!liabilityForm.name || !liabilityForm.remaining) return
    await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'liabilities',
        name: liabilityForm.name,
        principal: Number(liabilityForm.principal) || 0,
        remaining: Number(liabilityForm.remaining),
        interest_rate: Number(liabilityForm.interest_rate) || 0,
        due_date: liabilityForm.due_date || null,
        note: liabilityForm.note,
      }),
    })
    setShowAddLiability(false)
    setLiabilityForm({ name: '', principal: '', remaining: '', interest_rate: '', due_date: '', note: '' })
    fetchAll()
  }

  async function handleAddCashflow() {
    if (!cashflowForm.amount || !cashflowForm.date) return
    await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'cashflow',
        type: cashflowForm.type,
        category: cashflowForm.category,
        amount: Number(cashflowForm.amount),
        date: cashflowForm.date,
        note: cashflowForm.note,
        currency: 'KRW',
      }),
    })
    setShowAddCashflow(false)
    setCashflowForm({ type: 'income', category: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' })
    fetchAll()
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
                  <div className="text-right">
                    <p className="text-white font-medium">{formatKRW(a.current_value)}</p>
                    <p className={`text-sm ${gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {gain >= 0 ? '+' : ''}{formatPctRaw(gainPct)}
                    </p>
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
                <div className="text-right">
                  <p className="text-red-400 font-medium">{formatKRW(l.remaining)}</p>
                  <p className="text-gray-400 text-sm">원금 {formatKRW(l.principal)}</p>
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
                <p className={`font-medium ${c.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {c.type === 'income' ? '+' : '-'}{formatKRW(c.amount)}
                </p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
```

---

## STEP 4. 네비게이션에 자산관리 추가

app/layout.tsx 또는 네비게이션 컴포넌트에서
기존 nav 링크 목록을 찾아 아래 항목 추가 (기존 코드 수정 최소화):

```typescript
{ href: '/assets', label: '💼 자산관리' }
```

---

## STEP 5. 완료 확인

```bash
cd E:\dev\finsi
npm run build
```

에러 없으면 PHASE 3 완료.
