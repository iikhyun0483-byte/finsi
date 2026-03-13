'use client'
import { useState, useEffect, useCallback } from 'react'

interface Attribution {
  strategy: string
  tradeCount: number
  totalPnl: number
  avgPnlPct: number
  winRate: number
}

interface TradeDetail {
  id: string
  symbol: string
  strategy: string | null
  entry_price: number
  exit_price: number | null
  pnl: number | null
  pnl_pct: number | null
  holding_days: number | null
  closed_at: string | null
  created_at: string
}

export default function AttributionPage() {
  const [summary, setSummary] = useState<Attribution[]>([])
  const [detail,  setDetail]  = useState<TradeDetail[]>([])
  const [tab,     setTab]     = useState<'summary' | 'detail'>('summary')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [s, d] = await Promise.all([
      fetch('/api/attribution?action=summary').then(r => r.json()),
      fetch('/api/attribution?action=detail').then(r => r.json()),
    ])
    setSummary(s.data ?? [])
    setDetail(d.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const totalPnl  = summary.reduce((s, a) => s + a.totalPnl, 0)
  const bestStrat = summary[0]

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">수익 귀속 분석</h1>
          <p className="text-gray-500 text-sm mt-1">
            어떤 전략이 실제로 돈 벌었는가
          </p>
        </div>

        {/* 요약 카드 */}
        {summary.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-500 text-xs">총 실현 손익</p>
              <p className={`font-bold text-xl ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString()}원
              </p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-500 text-xs">전략 수</p>
              <p className="font-bold text-xl text-white">{summary.length}개</p>
            </div>
            {bestStrat && (
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-gray-500 text-xs">최고 전략</p>
                <p className="font-bold text-orange-400 text-sm truncate">{bestStrat.strategy}</p>
                <p className="text-green-400 text-xs">
                  +{bestStrat.totalPnl.toLocaleString()}원
                </p>
              </div>
            )}
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-2 mb-4">
          {([['summary', '전략별 요약'], ['detail', '거래 내역']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-16">로딩 중...</div>
        ) : tab === 'summary' ? (
          summary.length === 0 ? (
            <div className="bg-gray-900 rounded-xl p-12 text-center text-gray-500">
              <p>거래 종료 후 자동 집계됩니다</p>
              <p className="text-xs mt-2">포지션 청산 시 /api/attribution POST로 기록</p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.map((a) => (
                <div
                  key={a.strategy}
                  className={`rounded-xl p-5 border ${
                    a.totalPnl >= 0
                      ? 'bg-green-900/10 border-green-800/30'
                      : 'bg-red-900/10 border-red-800/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-white font-bold">{a.strategy}</p>
                    <span className={`text-xl font-bold ${a.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {a.totalPnl >= 0 ? '+' : ''}{a.totalPnl.toLocaleString()}원
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-black/20 rounded-lg p-2">
                      <p className="text-gray-500">거래 수</p>
                      <p className="text-white font-bold">{a.tradeCount}건</p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-2">
                      <p className="text-gray-500">평균 수익률</p>
                      <p className={`font-bold ${a.avgPnlPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(a.avgPnlPct * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-2">
                      <p className="text-gray-500">승률</p>
                      <p className={`font-bold ${a.winRate >= 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                        {(a.winRate * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  {/* 수익률 바 */}
                  <div className="mt-3">
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${a.winRate >= 0.5 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${a.winRate * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          detail.length === 0 ? (
            <div className="bg-gray-900 rounded-xl p-12 text-center text-gray-500">
              거래 내역 없음
            </div>
          ) : (
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800 text-left">
                      <th className="p-3 font-normal">종목</th>
                      <th className="p-3 font-normal">전략</th>
                      <th className="p-3 font-normal text-right">진입</th>
                      <th className="p-3 font-normal text-right">청산</th>
                      <th className="p-3 font-normal text-right">손익</th>
                      <th className="p-3 font-normal text-right">보유일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.map((d) => (
                      <tr key={d.id} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                        <td className="p-3 text-white font-medium">{d.symbol}</td>
                        <td className="p-3 text-gray-400">{d.strategy ?? '-'}</td>
                        <td className="p-3 text-right text-gray-300">
                          {d.entry_price.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-gray-300">
                          {d.exit_price?.toLocaleString() ?? '-'}
                        </td>
                        <td className={`p-3 text-right font-bold ${
                          (d.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {d.pnl != null
                            ? `${d.pnl >= 0 ? '+' : ''}${d.pnl.toLocaleString()}`
                            : '-'}
                        </td>
                        <td className="p-3 text-right text-gray-500">
                          {d.holding_days != null ? `${d.holding_days}일` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
