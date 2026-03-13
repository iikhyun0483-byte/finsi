'use client'
import { useState, useEffect } from 'react'
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

  const load = async () => {
    const res = await fetch('/api/positions?action=summary')
    const d   = await res.json()
    setSummary(d)
  }

  const sync = async () => {
    setSyncing(true)
    await fetch('/api/positions?action=sync')
    await load()
    setSyncing(false)
  }

  const saveStop = async () => {
    if (!selected) return
    setLoading(true)
    await fetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set_stop',
        symbol: selected.symbol,
        stopLoss:    Number(stopLoss),
        targetPrice: Number(target),
      }),
    })
    await load()
    setSelected(null)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const pct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">포지션 관리</h1>
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
