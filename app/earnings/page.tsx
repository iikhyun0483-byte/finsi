'use client'
import { useState, useEffect, useCallback } from 'react'

interface Earning {
  id: string
  symbol: string
  corp_name: string | null
  earnings_date: string
  estimate_eps: number | null
  actual_eps: number | null
  surprise_pct: number | null
  signal: string | null
}

function SurpriseTag({ pct }: { pct: number }) {
  const color =
    pct > 15 ? 'bg-green-600' :
    pct > 5  ? 'bg-green-800' :
    pct < -15 ? 'bg-red-600' :
    pct < -5  ? 'bg-red-800' : 'bg-gray-700'
  return (
    <span className={`${color} text-white text-xs px-2 py-0.5 rounded-full font-bold`}>
      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

function SignalBadge({ signal }: { signal: string | null }) {
  if (!signal || signal === 'UPCOMING') return (
    <span className="text-gray-500 text-xs">발표 예정</span>
  )
  const meta: Record<string, { color: string; label: string }> = {
    BUY:  { color: 'text-green-400', label: '매수' },
    SELL: { color: 'text-red-400',   label: '매도' },
    HOLD: { color: 'text-gray-400',  label: '중립' },
  }
  const m = meta[signal] ?? { color: 'text-gray-400', label: signal }
  return <span className={`text-xs font-bold ${m.color}`}>{m.label}</span>
}

export default function EarningsPage() {
  const [upcoming, setUpcoming] = useState<Earning[]>([])
  const [recent,   setRecent]   = useState<Earning[]>([])
  const [tab,      setTab]      = useState<'upcoming' | 'recent'>('upcoming')
  const [syncing,  setSyncing]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }, [])

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([
        fetch('/api/earnings?action=list').then(res => res.json()),
        fetch('/api/earnings?action=recent').then(res => res.json()),
      ])
      setUpcoming(u.data ?? [])
      setRecent(r.data ?? [])
    } catch (e) {
      console.error('❌ Load error:', e)
      showToast(`데이터 로드 실패: ${(e as Error).message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const sync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/earnings?action=sync')
      const json = await res.json()

      if (!res.ok) {
        console.error('❌ Sync failed:', json)
        showToast(`동기화 실패: ${json.error || '알 수 없는 오류'}`, 'error')
        return
      }

      console.log('✅ Sync completed:', json)
      showToast(`동기화 완료 (${json.synced || 0}개 종목)`, 'success')
      await load()
    } catch (e) {
      console.error('❌ Sync error:', e)
      showToast(`동기화 오류: ${e instanceof Error ? e.message : '네트워크 오류'}`, 'error')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().slice(0, 10)
  const displayList = tab === 'upcoming' ? upcoming : recent

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
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
            <h1 className="text-2xl font-bold text-orange-400">실적 발표 캘린더</h1>
            <p className="text-gray-500 text-sm mt-1">
              어닝 서프라이즈 → PEAD 매매 신호
            </p>
          </div>
          <button
            onClick={sync}
            disabled={syncing}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm font-semibold"
          >
            {syncing ? '수집 중...' : '🔄 동기화'}
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-4">
          {([['upcoming', '📅 예정'], ['recent', '📊 결과']] as const).map(([key, label]) => (
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
        ) : displayList.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
            <p className="text-gray-400 mb-3">데이터 없음</p>
            <button
              onClick={sync}
              disabled={syncing}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm"
            >
              {syncing ? '수집 중...' : '동기화'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {displayList.map((e) => {
              const isToday = e.earnings_date === today
              const hasSurprise = e.surprise_pct !== null
              return (
                <div
                  key={e.id}
                  className={`rounded-xl p-4 border transition-colors ${
                    isToday
                      ? 'bg-orange-900/20 border-orange-700/40'
                      : hasSurprise && e.surprise_pct! > 5
                      ? 'bg-green-900/10 border-green-800/30'
                      : hasSurprise && e.surprise_pct! < -5
                      ? 'bg-red-900/10 border-red-800/30'
                      : 'bg-gray-900 border-gray-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-white">{e.symbol}</span>
                        {e.corp_name && (
                          <span className="text-gray-500 text-xs">{e.corp_name}</span>
                        )}
                        {isToday && (
                          <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                            오늘
                          </span>
                        )}
                        <SignalBadge signal={e.signal} />
                      </div>
                      <p className="text-gray-500 text-xs">{e.earnings_date}</p>
                      {hasSurprise && e.surprise_pct! > 5 && (
                        <p className="text-green-400 text-xs mt-1">
                          PEAD 효과 — 발표 후 3~5일 상승 모멘텀 가능성
                        </p>
                      )}
                      {hasSurprise && e.surprise_pct! < -5 && (
                        <p className="text-red-400 text-xs mt-1">
                          어닝 쇼크 — 발표 후 하락 압력 지속 가능성
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      {hasSurprise ? (
                        <div className="space-y-1">
                          <SurpriseTag pct={e.surprise_pct!} />
                          <p className="text-gray-500 text-xs">
                            예상 {e.estimate_eps?.toFixed(2) ?? '-'} / 실제 {e.actual_eps?.toFixed(2) ?? '-'}
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-xs">
                          예상 EPS<br />
                          <span className="text-white font-medium">
                            {e.estimate_eps?.toFixed(2) ?? '-'}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-4 bg-gray-900/50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
          <p className="text-orange-400 font-medium mb-1">PEAD (Post Earnings Announcement Drift)</p>
          <p>서프라이즈 +15%+ → 1~5일 평균 +4~8% 추가 상승</p>
          <p>쇼크 -15%- → 1~5일 평균 -5~10% 추가 하락</p>
          <p>진입 타이밍: 발표 당일 종가 또는 익일 시가</p>
          <p className="text-gray-700 mt-1">출처: Finnhub API</p>
        </div>
      </div>
    </div>
  )
}
