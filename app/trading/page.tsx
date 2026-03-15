'use client'
import { useState, useEffect, useCallback } from 'react'
import { Zap, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Shield } from 'lucide-react'

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
  const [kisConnected, setKisConnected] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const loadBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/trading?action=balance')
      const data = await res.json()
      if (data.success) {
        setBalance(data.balance)
        setKisConnected(true)
      } else {
        setKisConnected(false)
        if (data.error?.includes('KIS 연동')) {
          showToast('KIS API 연동 후 사용 가능합니다', 'info')
        }
      }
    } catch (error) {
      setKisConnected(false)
      console.error('잔고 조회 실패:', error)
    }
  }, [])

  useEffect(() => { loadBalance() }, [loadBalance])

  const executeTrade = async (action: 'BUY'|'SELL') => {
    if (!kisConnected) {
      showToast('KIS 연동 후 사용 가능합니다', 'error')
      setResult('❌ KIS API 연동이 필요합니다')
      return
    }

    if (!symbol || !quantity) {
      showToast('종목코드와 수량을 입력하세요', 'error')
      setResult('❌ 종목코드와 수량을 입력하세요')
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
        showToast(`리스크 게이트 차단: ${data.reason}`, 'error')
        setResult(`🚫 리스크 게이트 차단: ${data.reason}`)
      } else if (data.success) {
        showToast(`${action} 주문 성공!`, 'success')
        setResult(`✅ ${action} 주문 성공: ${data.orderNo}`)
        loadBalance() // 잔고 새로고침
      } else {
        showToast(data.error || '주문 실패', 'error')
        setResult(`❌ 주문 실패: ${data.error}`)
      }
    } catch(e) {
      const errorMsg = (e as Error).message
      showToast(`오류: ${errorMsg}`, 'error')
      setResult(`오류: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* 토스트 알림 */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-opacity ${
            toast.type === 'success' ? 'bg-green-600' :
            toast.type === 'error' ? 'bg-red-600' :
            'bg-blue-600'
          }`}>
            <p className="text-sm font-medium text-white">{toast.message}</p>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
              <Zap className="w-7 h-7" />
              실시간 거래 실행
            </h1>
            <span className={`px-2 py-0.5 border rounded text-xs ${
              kisConnected
                ? 'bg-green-600/20 border-green-600/40 text-green-400'
                : 'bg-yellow-600/20 border-yellow-600/40 text-yellow-400'
            }`}>
              {kisConnected ? 'KIS 연동 완료' : 'KIS 연동 예정'}
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
              disabled={loading || !kisConnected}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg py-3 font-bold transition-all"
            >
              <TrendingUp className="w-5 h-5" />
              {loading ? '처리 중...' : '매수'}
            </button>
            <button
              onClick={() => executeTrade('SELL')}
              disabled={loading || !kisConnected}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg py-3 font-bold transition-all"
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

        {/* Risk Gate 한도 표시 */}
        <div className="mt-5 bg-gray-900/50 rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-gray-300">Risk Gate 보호 한도</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-gray-400 text-xs mb-1">일일 최대 손실 한도</p>
              <p className="text-2xl font-bold text-red-400">-500,000원</p>
              <p className="text-gray-500 text-xs mt-1">하루 누적 손실이 이 한도를 초과하면 거래 차단</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-gray-400 text-xs mb-1">단일 주문 한도</p>
              <p className="text-2xl font-bold text-orange-400">예수금의 50%</p>
              <p className="text-gray-500 text-xs mt-1">한 번에 예수금의 절반 이상 주문 불가</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 mb-2">📋 Risk Gate 체크 항목</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-500">
              <li>자동매매 활성화 상태 확인</li>
              <li>일일 손실 한도 초과 여부 확인</li>
              <li>단일 주문 금액 한도 확인 (매수 시)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
