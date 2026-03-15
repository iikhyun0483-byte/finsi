'use client'
import { useState, useEffect, useCallback } from 'react'
import type { OpenPosition } from '@/lib/position-manager'

interface Summary {
  totalValue:  number
  totalCost:   number
  totalPnl:    number
  totalPnlPct: number
  positions:   OpenPosition[]
}

export default function PositionsPage() {
  const [summary,  setSummary]  = useState<Summary | null>(null)
  const [selected, setSelected] = useState<OpenPosition | null>(null)
  const [stopLoss, setStopLoss] = useState('')
  const [target,   setTarget]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [syncing,  setSyncing]  = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/positions?action=summary')
      if (!res.ok) {
        console.error('❌ Failed to load positions')
        showToast('포지션 로드 실패', 'error')
        return
      }
      const d = await res.json()
      setSummary(d)
    } catch (e) {
      console.error('❌ Load error:', e)
      showToast(`로드 오류: ${(e as Error).message}`, 'error')
    }
  }, [showToast])

  const sync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/positions?action=sync')
      const data = await res.json()

      if (!res.ok || !data.synced) {
        // KIS API 실패 시 Yahoo Finance로 대체
        console.log('⚠️ KIS API unavailable, using Yahoo Finance')
        showToast('Yahoo Finance로 가격 업데이트 중...', 'info')

        const yahooRes = await fetch('/api/positions?action=updatePricesYahoo')
        const yahooData = await yahooRes.json()

        if (yahooData.updated > 0) {
          showToast(`가격 업데이트 완료 (${yahooData.updated}개 종목)`, 'success')
        } else {
          showToast('가격 업데이트 실패', 'warning')
        }
      } else {
        showToast('KIS 동기화 완료', 'success')
      }

      await load()
    } catch (e) {
      console.error('❌ Sync error:', e)
      showToast(`동기화 오류: ${(e as Error).message}`, 'error')
    } finally {
      setSyncing(false)
    }
  }

  const saveStop = async () => {
    if (!selected) return

    const stop = Number(stopLoss)
    const targetNum = Number(target)

    // 입력 검증
    if (stopLoss && (isNaN(stop) || stop <= 0)) {
      showToast('손절가는 0보다 커야 합니다', 'warning')
      return
    }
    if (target && (isNaN(targetNum) || targetNum <= selected.avgPrice)) {
      showToast('목표가는 평균단가보다 높아야 합니다', 'warning')
      return
    }
    if (stopLoss && target && stop >= targetNum) {
      showToast('손절가는 목표가보다 낮아야 합니다', 'warning')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_stop',
          symbol: selected.symbol,
          stopLoss: stop || null,
          targetPrice: targetNum || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        showToast(`저장 실패: ${error.error || '알 수 없는 오류'}`, 'error')
        return
      }

      showToast('손절/목표가 설정 완료', 'success')
      await load()
      setSelected(null)
      setStopLoss('')
      setTarget('')
    } catch (e) {
      console.error('❌ Save error:', e)
      showToast(`저장 오류: ${(e as Error).message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [load])

  const pct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
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

        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-orange-400">포지션 관리</h1>
              <span className="px-2 py-0.5 bg-yellow-600/20 border border-yellow-600/40 rounded text-xs text-yellow-400">
                KIS 연동 예정
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">실시간 손익 + 손절/목표가 자동 관리</p>
          </div>
          <button onClick={sync} disabled={syncing}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm font-semibold">
            {syncing ? '동기화 중...' : '🔄 KIS 동기화'}
          </button>
        </div>

        {summary && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: '평가금액', v: `${summary.totalValue.toLocaleString()}원`, c: 'text-white' },
                { label: '매입금액', v: `${summary.totalCost.toLocaleString()}원`,  c: 'text-gray-400' },
                { label: '평가손익', v: `${summary.totalPnl >= 0 ? '+' : ''}${summary.totalPnl.toLocaleString()}원`, c: summary.totalPnl >= 0 ? 'text-green-400' : 'text-red-400' },
                { label: '수익률', v: pct(summary.totalPnlPct), c: summary.totalPnlPct >= 0 ? 'text-green-400' : 'text-red-400' },
              ].map(m => (
                <div key={m.label} className="bg-gray-900 rounded-xl p-4">
                  <p className="text-gray-500 text-xs">{m.label}</p>
                  <p className={`font-bold text-base ${m.c}`}>{m.v}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {summary.positions.length === 0 ? (
                <div className="bg-gray-900 rounded-xl p-12 text-center text-gray-500">
                  보유 포지션 없음
                </div>
              ) : summary.positions.map(p => (
                <div key={p.symbol}
                  className={`rounded-xl p-4 border cursor-pointer hover:opacity-90 ${
                    p.unrealizedPct >= 0.05 ? 'bg-green-900/10 border-green-800/40' :
                    p.unrealizedPct <= -0.05 ? 'bg-red-900/10 border-red-800/40' :
                    'bg-gray-900 border-gray-800'
                  }`}
                  onClick={() => { setSelected(p); setStopLoss(String(p.stopLoss ?? '')); setTarget(String(p.targetPrice ?? '')) }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{p.symbol}</span>
                        <span className="text-gray-500 text-xs">{p.quantity}주</span>
                        {p.stopLoss && <span className="text-red-400 text-xs">손절 {p.stopLoss.toLocaleString()}</span>}
                        {p.targetPrice && <span className="text-green-400 text-xs">목표 {p.targetPrice.toLocaleString()}</span>}
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">
                        평균 {p.avgPrice.toLocaleString()} → 현재 {p.currentPrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${p.unrealizedPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {pct(p.unrealizedPct)}
                      </p>
                      <p className={`text-xs ${p.unrealizedPnl >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {p.unrealizedPnl >= 0 ? '+' : ''}{p.unrealizedPnl.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {selected && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
            onClick={() => setSelected(null)}>
            <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between mb-4">
                <p className="font-bold text-orange-400">{selected.symbol} 손절/목표 설정</p>
                <button onClick={() => setSelected(null)} className="text-gray-500">✕</button>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-red-400 text-xs mb-1">손절가 (현재: {selected.currentPrice.toLocaleString()})</p>
                  <input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)}
                    placeholder={String(Math.round(selected.avgPrice * 0.92))}
                    className="w-full bg-gray-800 rounded px-3 py-2 text-white" />
                  <p className="text-gray-600 text-xs mt-0.5">
                    매입가 -8% = {Math.round(selected.avgPrice * 0.92).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-green-400 text-xs mb-1">목표가</p>
                  <input type="number" value={target} onChange={e => setTarget(e.target.value)}
                    placeholder={String(Math.round(selected.avgPrice * 1.20))}
                    className="w-full bg-gray-800 rounded px-3 py-2 text-white" />
                  <p className="text-gray-600 text-xs mt-0.5">
                    매입가 +20% = {Math.round(selected.avgPrice * 1.20).toLocaleString()}
                  </p>
                </div>
                <button onClick={saveStop} disabled={loading}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-xl font-semibold text-sm">
                  {loading ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
