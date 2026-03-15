'use client'
import { useState, useEffect } from 'react'

interface Disclosure {
  id: string
  corp_name: string
  symbol: string | null
  disclosure_type: string
  title: string
  filed_at: string
  ai_summary: string | null
  importance: number
}

interface SyncResult {
  success?: boolean
  synced: number
  saved: number
  summarized?: number
  errors?: string[]
  error?: string
  missing?: string[]
  message?: string
}

const IMP_COLOR = (n: number) =>
  n >= 9 ? 'text-red-400 bg-red-900/20 border-red-700/40' :
  n >= 7 ? 'text-orange-400 bg-orange-900/20 border-orange-700/40' :
  n >= 5 ? 'text-yellow-400 bg-yellow-900/20 border-yellow-700/40' :
           'text-gray-400 bg-gray-900/20 border-gray-700/40'

const IMPORTANCE_FILTERS = [5, 7, 9] as const

export default function DisclosurePage() {
  const [data,     setData]     = useState<Disclosure[]>([])
  const [loading,  setLoading]  = useState(true)
  const [syncing,  setSyncing]  = useState(false)
  const [minImp,   setMinImp]   = useState<number>(5)
  const [selected, setSelected] = useState<Disclosure | null>(null)
  const [toast,    setToast]    = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  // 토스트 표시 헬퍼
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  // LocalStorage에서 마지막 동기화 시간 로드
  useEffect(() => {
    const lastSyncStr = localStorage.getItem('dart_last_sync')
    if (lastSyncStr) {
      setLastSync(new Date(lastSyncStr))
    }
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dart?action=list&minImportance=${minImp}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const json = await res.json()

      if (json.error) {
        throw new Error(json.error)
      }

      setData(json.data ?? [])
    } catch (error) {
      console.error('공시 목록 로드 실패:', error)
      showToast(`공시 로드 실패: ${(error as Error).message}`, 'error')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const sync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/dart?action=sync')
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const result: SyncResult = await res.json()

      if (result.error) {
        // 환경변수 누락 등의 에러
        if (result.missing && result.missing.length > 0) {
          showToast(`환경변수 누락: ${result.missing.join(', ')}. .env.local 파일을 확인하세요.`, 'error')
        } else {
          showToast(`동기화 실패: ${result.error}`, 'error')
        }
        return
      }

      // 성공 메시지
      const syncMsg = result.message
        ? result.message
        : `${result.synced}개 수집, ${result.saved}개 저장${result.summarized ? `, ${result.summarized}개 AI 요약` : ''}`

      showToast(syncMsg, 'success')

      // 경고 메시지 (부분 실패)
      if (result.errors && result.errors.length > 0) {
        console.warn('동기화 중 일부 오류:', result.errors)
        showToast(`일부 오류 발생: ${result.errors[0]}`, 'info')
      }

      // 마지막 동기화 시간 저장
      const now = new Date()
      setLastSync(now)
      localStorage.setItem('dart_last_sync', now.toISOString())

      // 목록 새로고침
      await load()
    } catch (error) {
      console.error('동기화 실패:', error)
      showToast(`동기화 실패: ${(error as Error).message}`, 'error')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => { load() }, [minImp])

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

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">DART 공시 피드</h1>
            <p className="text-gray-500 text-sm mt-1">
              중요 공시 실시간 수집 + AI 요약
              {lastSync && (
                <span className="ml-2 text-gray-600">
                  • 마지막 동기화: {lastSync.toLocaleString('ko-KR')}
                </span>
              )}
            </p>
          </div>
          <button onClick={sync} disabled={syncing}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors">
            {syncing ? '수집 중...' : '🔄 공시 동기화'}
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {IMPORTANCE_FILTERS.map(v => (
            <button key={v} onClick={() => setMinImp(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${minImp===v ? 'text-orange-400 border-orange-500 bg-orange-900/20' : 'text-gray-500 border-gray-700 hover:border-gray-600'}`}>
              중요도 {v}+
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-16">로딩 중...</div>
        ) : (
          <div className="space-y-2">
            {data.map(d => (
              <div key={d.id} onClick={() => setSelected(d)}
                className={`rounded-xl p-4 border cursor-pointer hover:opacity-80 transition-opacity ${IMP_COLOR(d.importance)}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white">{d.corp_name}</span>
                      {d.symbol && <span className="text-gray-500 text-xs">{d.symbol}</span>}
                      <span className="text-xs px-1.5 py-0.5 rounded bg-black/30">
                        중요도 {d.importance}
                      </span>
                    </div>
                    <p className="text-sm">{d.title}</p>
                    {d.ai_summary && (
                      <p className="text-gray-400 text-xs mt-1 line-clamp-2">{d.ai_summary}</p>
                    )}
                  </div>
                  <span className="text-gray-600 text-xs ml-4 shrink-0">
                    {new Date(d.filed_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            ))}
            {data.length === 0 && (
              <div className="text-center text-gray-500 py-16">
                공시 없음 — 동기화 버튼으로 수집하세요
              </div>
            )}
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
            onClick={() => setSelected(null)}>
            <div className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between mb-3">
                <span className="text-orange-400 font-bold">{selected.corp_name}</span>
                <button onClick={() => setSelected(null)} className="text-gray-500">✕</button>
              </div>
              <p className="text-white font-medium mb-3">{selected.title}</p>
              <div className="bg-black/30 rounded-lg p-3 text-sm text-gray-300">
                {selected.ai_summary ?? 'AI 요약 없음 (중요도 7 미만)'}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span>중요도: {selected.importance}/10</span>
                <span>{new Date(selected.filed_at).toLocaleString('ko-KR')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
