'use client'
import { useState, useEffect } from 'react'

interface SupplyData {
  symbol: string
  trade_date: string
  foreign_net: number
  inst_net: number
  retail_net: number
  supply_score: number
}

const SCORE_COLOR = (s: number) =>
  s >= 60  ? 'text-green-400' :
  s >= 20  ? 'text-green-300' :
  s <= -60 ? 'text-red-400'   :
  s <= -20 ? 'text-red-300'   : 'text-gray-400'

const WATCHLIST = ['005930', '000660', 'SPY', 'QQQ', 'NVDA', 'AAPL']

export default function SupplyPage() {
  const [data,    setData]    = useState<SupplyData[]>([])
  const [symbol,  setSymbol]  = useState('')
  const [signal,  setSignal]  = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  const loadSignal = async (sym: string) => {
    setLoading(true)
    const res = await fetch(`/api/supply?action=signal&symbol=${sym}`)
    const json = await res.json()
    setSignal(json)
    setLoading(false)
  }

  useEffect(() => {
    fetch('/api/supply?action=list')
      .then(r => r.json())
      .then(d => setData(d.data ?? []))
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">수급 추적</h1>
          <p className="text-gray-500 text-sm mt-1">외국인/기관 순매수 — 개인보다 먼저 아는 수급</p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {WATCHLIST.map(s => (
            <button key={s} onClick={() => { setSymbol(s); loadSignal(s) }}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors
                ${symbol===s ? 'text-orange-400 border-orange-500 bg-orange-900/20' : 'text-gray-500 border-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="종목코드 입력 (예: 005930)"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-white text-sm"
          />
          <button onClick={() => loadSignal(symbol)} disabled={!symbol || loading}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm font-semibold">
            조회
          </button>
        </div>

        {signal && (
          <div className="bg-gray-900 rounded-xl p-5 mb-6">
            <div className="flex justify-between items-center mb-3">
              <p className="text-orange-400 font-bold">{symbol} 수급 신호</p>
              <span className={`text-lg font-bold ${SCORE_COLOR(signal.score as number)}`}>
                {(signal.score as number) > 0 ? '+' : ''}{signal.score as number}점
              </span>
            </div>
            <p className={`text-sm font-medium mb-2 ${SCORE_COLOR(signal.score as number)}`}>
              {signal.signal as string} — {signal.reason as string}
            </p>
            {Array.isArray(signal.data) && signal.data.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-left pb-1 font-normal">날짜</th>
                      <th className="text-right pb-1 font-normal">외국인</th>
                      <th className="text-right pb-1 font-normal">기관</th>
                      <th className="text-right pb-1 font-normal">개인</th>
                      <th className="text-right pb-1 font-normal">점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(signal.data as SupplyData[]).map(d => (
                      <tr key={d.trade_date} className="border-b border-gray-800/40">
                        <td className="py-1 text-gray-400">{d.trade_date}</td>
                        <td className={`py-1 text-right ${d.foreign_net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(d.foreign_net / 1e8).toFixed(1)}억
                        </td>
                        <td className={`py-1 text-right ${d.inst_net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(d.inst_net / 1e8).toFixed(1)}억
                        </td>
                        <td className={`py-1 text-right ${d.retail_net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(d.retail_net / 1e8).toFixed(1)}억
                        </td>
                        <td className={`py-1 text-right font-bold ${SCORE_COLOR(d.supply_score)}`}>
                          {d.supply_score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-900/50 rounded-xl p-4">
          <p className="text-orange-400 text-xs font-semibold mb-2">수급 점수 계산 기준</p>
          <div className="grid grid-cols-3 gap-3 text-xs text-gray-400">
            <div><span className="text-white">외국인 40%</span><p className="mt-0.5">스마트머니 대표 지표</p></div>
            <div><span className="text-white">기관 40%</span><p className="mt-0.5">연기금/자산운용 동향</p></div>
            <div><span className="text-white">프로그램 20%</span><p className="mt-0.5">차익/비차익 프로그램</p></div>
          </div>
          <p className="text-gray-600 text-xs mt-2">
            ※ KIS API 연동 전: 수동 입력 또는 증권사 HTS에서 복사 붙여넣기
          </p>
        </div>
      </div>
    </div>
  )
}
