'use client'
import { useState, useEffect, useCallback } from 'react'

interface Snapshot {
  snapshot_date: string
  total_value:   number
  return_1m:     number
  return_3m:     number
  return_ytd:    number
  sharpe_ratio:  number | null
  max_dd:        number | null
  win_rate:      number | null
  trade_count:   number
}

export default function PerformancePage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [latest,    setLatest]    = useState<Snapshot | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const loadSnapshots = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/performance?action=list')
      if (!res.ok) throw new Error('데이터 로드 실패')

      const data = await res.json()
      setSnapshots(data.data ?? [])
      setLatest(data.data?.[0] ?? null)
    } catch (error) {
      showToast(`오류: ${(error as Error).message}`, 'error')
      console.error('[Performance] Load error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const generateSnapshot = useCallback(async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/performance?action=generate')
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '스냅샷 생성 실패')
      }

      const data = await res.json()
      if (!data.success) throw new Error('스냅샷 생성 실패')

      showToast('성과 스냅샷 생성 완료', 'success')
      await loadSnapshots()
    } catch (error) {
      showToast(`오류: ${(error as Error).message}`, 'error')
      console.error('[Performance] Generate error:', error)
    } finally {
      setGenerating(false)
    }
  }, [loadSnapshots])

  useEffect(() => {
    loadSnapshots()
  }, [loadSnapshots])

  const retColor = (v: number) => v >= 0 ? 'text-green-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-orange-400">성과 대시보드</h1>
              <p className="text-gray-500 text-sm mt-1">실전 운용 성과 — trade_history 기반 자동 계산</p>
            </div>
            <button
              onClick={generateSnapshot}
              disabled={generating || loading}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm font-semibold"
            >
              {generating ? '생성 중...' : '스냅샷 생성'}
            </button>
          </div>
        </div>

        {loading && !latest ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center text-gray-500 mb-6">
            로딩 중...
          </div>
        ) : latest ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: '총 자산', value: `${latest.total_value.toLocaleString()}원`, color: 'text-white' },
                { label: '월 수익률', value: `${latest.return_1m >= 0 ? '+' : ''}${(latest.return_1m*100).toFixed(2)}%`, color: retColor(latest.return_1m) },
                { label: 'YTD', value: `${latest.return_ytd >= 0 ? '+' : ''}${(latest.return_ytd*100).toFixed(2)}%`, color: retColor(latest.return_ytd) },
                { label: '샤프 지수', value: latest.sharpe_ratio?.toFixed(2) ?? '-', color: 'text-orange-400' },
              ].map(m => (
                <div key={m.label} className="bg-gray-900 rounded-xl p-4">
                  <p className="text-gray-500 text-xs">{m.label}</p>
                  <p className={`font-bold text-lg ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: '최대 낙폭', value: latest.max_dd != null ? `-${(latest.max_dd*100).toFixed(1)}%` : '-', color: 'text-red-400' },
                { label: '승률', value: latest.win_rate != null ? `${(latest.win_rate*100).toFixed(1)}%` : '-', color: 'text-green-400' },
                { label: '총 거래', value: `${latest.trade_count}회`, color: 'text-white' },
              ].map(m => (
                <div key={m.label} className="bg-gray-900 rounded-xl p-4">
                  <p className="text-gray-500 text-xs">{m.label}</p>
                  <p className={`font-bold text-lg ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-gray-900 rounded-xl p-12 text-center text-gray-500 mb-6">
            성과 데이터 없음 — 운용 시작 후 자동 축적
          </div>
        )}

        {snapshots.length > 1 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-orange-400 text-sm font-semibold mb-3">월별 성과 이력</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left pb-2 font-normal">날짜</th>
                    <th className="text-right pb-2 font-normal">총자산</th>
                    <th className="text-right pb-2 font-normal">월수익</th>
                    <th className="text-right pb-2 font-normal">YTD</th>
                    <th className="text-right pb-2 font-normal">샤프</th>
                    <th className="text-right pb-2 font-normal">MDD</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map(s => (
                    <tr key={s.snapshot_date} className="border-b border-gray-800/40">
                      <td className="py-1.5 text-gray-400">{s.snapshot_date}</td>
                      <td className="py-1.5 text-right text-white">{s.total_value.toLocaleString()}</td>
                      <td className={`py-1.5 text-right font-bold ${retColor(s.return_1m)}`}>
                        {s.return_1m >= 0 ? '+' : ''}{(s.return_1m*100).toFixed(2)}%
                      </td>
                      <td className={`py-1.5 text-right ${retColor(s.return_ytd)}`}>
                        {s.return_ytd >= 0 ? '+' : ''}{(s.return_ytd*100).toFixed(2)}%
                      </td>
                      <td className="py-1.5 text-right text-orange-400">
                        {s.sharpe_ratio?.toFixed(2) ?? '-'}
                      </td>
                      <td className="py-1.5 text-right text-red-400">
                        {s.max_dd != null ? `-${(s.max_dd*100).toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
