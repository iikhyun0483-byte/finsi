'use client'
import { useState, useEffect, useCallback } from 'react'

interface Trade {
  symbol: string
  action: 'BUY' | 'SELL'
  amount: number
  reason: string
}

interface DriftItem {
  target: number
  current: number
  diff: number
}

interface RebalanceLog {
  id: string
  rebalance_date: string
  drift_score: number | null
  trades_executed: Trade[] | null
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  SPY: 0.40,
  QQQ: 0.20,
  AAPL: 0.15,
  MSFT: 0.15,
  NVDA: 0.10,
}

export default function RebalancePage() {
  const [weights,    setWeights]    = useState<Record<string, number>>(DEFAULT_WEIGHTS)
  const [newSymbol,  setNewSymbol]  = useState('')
  const [totalValue, setTotalValue] = useState(10_000_000)
  const [drift,      setDrift]      = useState<Record<string, DriftItem> | null>(null)
  const [maxDrift,   setMaxDrift]   = useState<number | null>(null)
  const [trades,     setTrades]     = useState<Trade[]>([])
  const [history,    setHistory]    = useState<RebalanceLog[]>([])
  const [loading,    setLoading]    = useState(false)
  const [executing,  setExecuting]  = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/rebalance')
      if (!res.ok) {
        console.error('❌ Failed to load history')
        showToast('이력 로드 실패', 'error')
        return
      }
      const d = await res.json()
      setHistory(d.history ?? [])
    } catch (e) {
      console.error('❌ Load history error:', e)
      showToast(`이력 로드 오류: ${(e as Error).message}`, 'error')
    }
  }, [showToast])

  useEffect(() => { loadHistory() }, [loadHistory])

  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0)
  const isValid     = Math.abs(totalWeight - 1) <= 0.01

  const calc = async () => {
    if (!isValid) {
      showToast('비중 합계가 100%가 아닙니다', 'warning')
      return
    }

    setLoading(true)
    try {
      // 1. 먼저 가격 업데이트
      const priceRes = await fetch('/api/rebalance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updatePrices' }),
      })
      const priceData = await priceRes.json()

      if (priceData.updated > 0) {
        console.log(`✅ Price updated: ${priceData.updated} symbols`)
      }
      if (priceData.failed?.length > 0) {
        console.warn(`⚠️ Failed to update: ${priceData.failed.join(', ')}`)
      }

      // 2. 리밸런싱 계산
      const res = await fetch('/api/rebalance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'calc', weights, totalValue }),
      })

      if (!res.ok) {
        const error = await res.json()
        showToast(`계산 실패: ${error.error || '알 수 없는 오류'}`, 'error')
        return
      }

      const data = await res.json()
      setDrift(data.drift ?? null)
      setMaxDrift(data.maxDrift ?? null)
      setTrades(data.trades ?? [])

      showToast('리밸런싱 계산 완료', 'success')
    } catch (e) {
      console.error('❌ Calc error:', e)
      showToast(`계산 오류: ${(e as Error).message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const executeRebalance = async () => {
    if (!drift || !maxDrift || trades.length === 0) {
      showToast('먼저 리밸런싱을 계산하세요', 'warning')
      return
    }

    setExecuting(true)
    try {
      // 현재 비중 계산
      const currentWeights: Record<string, number> = {}
      for (const [sym, d] of Object.entries(drift)) {
        currentWeights[sym] = d.current
      }

      // 리밸런싱 로그 저장
      const res = await fetch('/api/rebalance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log',
          before: currentWeights,
          after: weights,
          trades,
          driftScore: maxDrift,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        showToast(`실행 실패: ${error.error || '알 수 없는 오류'}`, 'error')
        return
      }

      showToast(`리밸런싱 실행 완료 (${trades.length}건)`, 'success')

      // 이력 다시 로드
      await loadHistory()

      // 결과 초기화
      setDrift(null)
      setMaxDrift(null)
      setTrades([])
    } catch (e) {
      console.error('❌ Execute error:', e)
      showToast(`실행 오류: ${(e as Error).message}`, 'error')
    } finally {
      setExecuting(false)
    }
  }

  const addSymbol = () => {
    const sym = newSymbol.trim().toUpperCase()
    if (!sym || weights[sym] !== undefined) return
    setWeights(p => ({ ...p, [sym]: 0 }))
    setNewSymbol('')
  }

  const removeSymbol = (sym: string) => {
    setWeights(p => {
      const next = { ...p }
      delete next[sym]
      return next
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        {/* 토스트 알림 */}
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

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">포트폴리오 리밸런싱</h1>
          <p className="text-gray-500 text-sm mt-1">
            비중 드리프트 5% 이상 시 리밸런싱 권장
          </p>
        </div>

        {/* 비중 설정 */}
        <div className="bg-gray-900 rounded-xl p-5 mb-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-orange-400 font-semibold text-sm">목표 비중 설정</p>
            <span className={`text-sm font-bold ${isValid ? 'text-green-400' : 'text-red-400'}`}>
              합계 {(totalWeight * 100).toFixed(0)}%
              {!isValid && ' ⚠️ 100% 맞춰야 함'}
            </span>
          </div>

          <div className="space-y-3 mb-4">
            {Object.entries(weights).map(([sym, w]) => (
              <div key={sym} className="flex items-center gap-3">
                <span className="text-white text-sm font-medium w-14 shrink-0">{sym}</span>
                <input
                  type="range"
                  min={0} max={1} step={0.01}
                  value={w ?? 0}
                  onChange={e => setWeights(p => ({ ...p, [sym]: Number(e.target.value) }))}
                  className="flex-1 accent-orange-500"
                />
                <span className="text-orange-400 text-sm w-10 text-right shrink-0">
                  {((w ?? 0) * 100).toFixed(0)}%
                </span>
                <button
                  onClick={() => removeSymbol(sym)}
                  className="text-gray-600 hover:text-red-400 text-xs shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* 종목 추가 */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="종목 추가 (예: TSLA)"
              value={newSymbol}
              onChange={e => setNewSymbol(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && addSymbol()}
              className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-white text-sm"
            />
            <button
              onClick={addSymbol}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
            >
              추가
            </button>
          </div>

          {/* 총 자산 */}
          <div className="mb-4">
            <p className="text-gray-500 text-xs mb-1">총 포트폴리오 금액 (원)</p>
            <input
              type="number"
              value={totalValue ?? 10000000}
              onChange={e => setTotalValue(Number(e.target.value) || 0)}
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>

          <button
            onClick={calc}
            disabled={loading || !isValid}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-xl font-semibold text-sm"
          >
            {loading ? '계산 중...' : '리밸런싱 계산'}
          </button>
        </div>

        {/* 드리프트 현황 */}
        {maxDrift !== null && (
          <div className={`rounded-xl p-4 border mb-4 ${
            maxDrift > 0.05
              ? 'bg-orange-900/20 border-orange-700/40'
              : 'bg-green-900/10 border-green-800/30'
          }`}>
            <div className="flex justify-between items-center">
              <p className={`font-bold ${maxDrift > 0.05 ? 'text-orange-400' : 'text-green-400'}`}>
                최대 드리프트: {(maxDrift * 100).toFixed(1)}%
              </p>
              <span className={`text-sm ${maxDrift > 0.05 ? 'text-orange-300' : 'text-green-300'}`}>
                {maxDrift > 0.05 ? '리밸런싱 필요' : '정상 범위'}
              </span>
            </div>

            {drift && Object.entries(drift).length > 0 && (
              <div className="mt-3 space-y-1">
                {Object.entries(drift)
                  .sort((a, b) => Math.abs(b[1].diff) - Math.abs(a[1].diff))
                  .map(([sym, d]) => (
                  <div key={sym} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 w-12">{sym}</span>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 bg-orange-500 rounded-full"
                        style={{ width: `${Math.min(d.current * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-gray-400 w-20 text-right">
                      {(d.current * 100).toFixed(1)}% / {(d.target * 100).toFixed(0)}%
                    </span>
                    <span className={`w-14 text-right font-bold ${
                      Math.abs(d.diff) > 0.05 ? 'text-orange-400' : 'text-gray-500'
                    }`}>
                      {d.diff >= 0 ? '+' : ''}{(d.diff * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 필요 거래 */}
        {trades.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4 mb-4">
            <p className="text-orange-400 font-semibold text-sm mb-3">
              필요 거래 ({trades.length}건)
            </p>
            <div className="space-y-2 mb-4">
              {trades.map((t, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-3 flex justify-between items-center ${
                    t.action === 'BUY' ? 'bg-green-900/20' : 'bg-red-900/20'
                  }`}
                >
                  <div>
                    <span className={`font-bold text-sm ${
                      t.action === 'BUY' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {t.action === 'BUY' ? '매수' : '매도'} {t.symbol}
                    </span>
                    <p className="text-gray-500 text-xs mt-0.5">{t.reason}</p>
                  </div>
                  <span className="text-white font-bold text-sm">
                    {t.amount.toLocaleString()}원
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={executeRebalance}
              disabled={executing}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-xl font-semibold text-sm"
            >
              {executing ? '실행 중...' : '리밸런싱 실행'}
            </button>
          </div>
        )}

        {/* 리밸런싱 이력 */}
        {history.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-orange-400 font-semibold text-sm mb-3">리밸런싱 이력</p>
            {history.map((h) => (
              <div key={h.id} className="flex justify-between items-center py-2 border-b border-gray-800/40 text-xs">
                <span className="text-gray-400">{h.rebalance_date}</span>
                <span className="text-orange-400">
                  드리프트 {h.drift_score != null ? `${(h.drift_score * 100).toFixed(1)}%` : '-'}
                </span>
                <span className="text-gray-400">
                  {h.trades_executed ? `${(h.trades_executed as Trade[]).length}건 실행` : '-'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
