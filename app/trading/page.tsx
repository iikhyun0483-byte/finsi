'use client'
import { useState, useEffect } from 'react'
import { Zap, DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

interface Balance {
  cash: number
  totalValue: number
  holdings: Array<{ symbol: string; quantity: number; currentPrice: number; value: number }>
}

export default function TradingPage() {
  const [balance, setBalance] = useState<Balance | null>(null)
  const [symbol, setSymbol] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const loadBalance = async () => {
    const res = await fetch('/api/trading?action=balance')
    const data = await res.json()
    if (data.success) setBalance(data.balance)
  }

  useEffect(() => { loadBalance() }, [])

  const executeTrade = async (action: 'BUY'|'SELL') => {
    if (!symbol || !quantity) {
      setResult('종목코드와 수량을 입력하세요')
      return
    }

    setLoading(true)
    setResult('')

    try {
      const res = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          symbol: symbol.toUpperCase(),
          quantity: Number(quantity),
          price: Number(price) || 0
        })
      })

      const data = await res.json()

      if (data.blocked) {
        setResult(`🚫 리스크 게이트 차단: ${data.reason}`)
      } else if (data.success) {
        setResult(`✅ ${action} 주문 성공: ${data.orderNo}`)
        loadBalance() // 잔고 새로고침
      } else {
        setResult(`❌ 주문 실패: ${data.message}`)
      }
    } catch(e) {
      setResult(`오류: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
              <Zap className="w-7 h-7" />
              실시간 거래 실행
            </h1>
            <span className="px-2 py-0.5 bg-yellow-600/20 border border-yellow-600/40 rounded text-xs text-yellow-400">
              KIS 연동 예정
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">KIS API 연동 · Risk Gate 보호</p>
        </div>

        {/* 잔고 현황 */}
        {balance && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <p className="text-gray-400 text-sm">예수금</p>
              </div>
              <p className="text-2xl font-bold text-white">
                {balance.cash.toLocaleString()}원
              </p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <p className="text-gray-400 text-sm mb-2">총 평가액</p>
              <p className="text-2xl font-bold text-cyan-400">
                {balance.totalValue.toLocaleString()}원
              </p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <p className="text-gray-400 text-sm mb-2">보유 종목 수</p>
              <p className="text-2xl font-bold text-white">
                {balance.holdings.length}개
              </p>
            </div>
          </div>
        )}

        {/* 보유 종목 */}
        {balance && balance.holdings.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-5 mb-6 border border-gray-800">
            <h2 className="text-lg font-bold text-white mb-3">보유 종목</h2>
            <div className="space-y-2">
              {balance.holdings.map((h, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-800/50 rounded-lg p-3">
                  <div>
                    <p className="font-bold text-white">{h.symbol}</p>
                    <p className="text-sm text-gray-400">{h.quantity}주</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">{h.currentPrice.toLocaleString()}원</p>
                    <p className="text-sm text-cyan-400">{h.value.toLocaleString()}원</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 주문 패널 */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            주문 실행 (Risk Gate 적용)
          </h2>

          <div className="space-y-4 mb-5">
            <input
              type="text"
              placeholder="종목코드 (예: 005930)"
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white"
            />
            <input
              type="number"
              placeholder="수량"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white"
            />
            <input
              type="number"
              placeholder="가격 (비우면 시장가)"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full bg-gray-800 rounded-lg px-4 py-3 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => executeTrade('BUY')}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-lg py-3 font-bold"
            >
              <TrendingUp className="w-5 h-5" />
              {loading ? '처리 중...' : '매수'}
            </button>
            <button
              onClick={() => executeTrade('SELL')}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-lg py-3 font-bold"
            >
              <TrendingDown className="w-5 h-5" />
              {loading ? '처리 중...' : '매도'}
            </button>
          </div>

          {result && (
            <div className={`rounded-lg p-4 text-sm ${
              result.includes('성공') ? 'bg-green-900/30 text-green-400' :
              result.includes('차단') ? 'bg-yellow-900/30 text-yellow-400' :
              'bg-red-900/30 text-red-400'
            }`}>
              {result}
            </div>
          )}
        </div>

        <div className="mt-5 bg-gray-900/50 rounded-xl p-4 text-xs text-gray-500">
          <p className="font-semibold text-gray-400 mb-2">Risk Gate 조건</p>
          <ul className="list-disc list-inside space-y-1">
            <li>자동매매 활성화 상태 체크</li>
            <li>일일 손실 한도 초과 여부</li>
            <li>단일 주문 한도 (현금의 50%) 초과 여부</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
