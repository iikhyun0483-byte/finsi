'use client'
import { useState, useEffect, useCallback } from 'react'
import type { OptimizationResult } from '@/lib/optimizer'
import UnlockGate from '@/components/UnlockGate'

export default function OptimizationPage() {
  const [result,  setResult]  = useState<OptimizationResult | null>(null)
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const run = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/optimization')
      const data = await res.json()

      if (data.error) {
        showToast(`오류: ${data.error}`, 'error')
        return
      }

      setResult(data.result)
      setHistory(data.history ?? [])

      if (data.result?.isSignificant) {
        if (data.result.changes.length > 0) {
          showToast('최적화 완료! 파라미터가 자동 적용되었습니다', 'success')
        } else {
          showToast('최적화 완료! 현재 파라미터 유지', 'info')
        }
      } else {
        showToast('신호 데이터 부족 (100개 이상 필요)', 'info')
      }
    } catch (error) {
      showToast(`오류: ${(error as Error).message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { run() }, [run])

  return (
    <UnlockGate minSignals={100} featureName="파라미터 자동 최적화">
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
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
            <h1 className="text-2xl font-bold text-orange-400">파라미터 자동 최적화</h1>
            <p className="text-gray-500 text-sm mt-1">신호 100개 이상 시 자동 활성화</p>
          </div>
          <button onClick={run} disabled={loading}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm font-semibold">
            {loading ? '분석 중...' : '최적화 실행'}
          </button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className={`rounded-xl p-5 border ${
              result.isSignificant
                ? 'bg-green-900/10 border-green-800/40'
                : 'bg-gray-900 border-gray-800'
            }`}>
              <div className="flex justify-between items-center mb-3">
                <p className="text-orange-400 font-semibold">최적화 상태</p>
                <span className={`text-sm font-bold ${result.isSignificant ? 'text-green-400' : 'text-gray-500'}`}>
                  {result.isSignificant ? '✅ 활성' : `⏳ 비활성 (${result.signalCount}/100)`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                <div className="bg-black/30 rounded p-2">
                  <p className="text-gray-500">신호 수</p>
                  <p className="text-white font-bold">{result.signalCount}개</p>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <p className="text-gray-500">7일 정확도</p>
                  <p className={`font-bold ${result.accuracy7d >= 0.6 ? 'text-green-400' : result.accuracy7d >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {(result.accuracy7d * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <p className="text-gray-500">권장</p>
                  <p className="text-orange-400 text-xs">{result.recommendation}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-orange-400 text-sm font-semibold mb-3">최적 팩터 가중치</p>
              {Object.entries(result.factorWeights).map(([k, v]) => (
                <div key={k} className="flex items-center gap-3 mb-2">
                  <span className="text-gray-400 text-xs w-16">{k}</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full">
                    <div className="h-2 bg-orange-500 rounded-full"
                      style={{ width: `${v * 100}%` }} />
                  </div>
                  <span className="text-orange-400 text-xs w-10 text-right">{(v*100).toFixed(0)}%</span>
                </div>
              ))}
            </div>

            {result.changes.length > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4">
                <p className="text-yellow-400 text-sm font-semibold mb-2">권장 변경사항</p>
                {result.changes.map((c, i) => (
                  <div key={i} className="text-xs text-yellow-300/70 mb-1">
                    {c.param}: {c.old} → {c.new} ({c.reason})
                  </div>
                ))}
              </div>
            )}

            {history.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-orange-400 text-sm font-semibold mb-3">최적화 이력</p>
                {history.map((h, i) => (
                  <div key={i} className="flex justify-between text-xs py-1.5 border-b border-gray-800/40">
                    <span className="text-gray-400">{h.run_date as string}</span>
                    <span className="text-white">{h.signal_count as number}개</span>
                    <span className={`font-bold ${(h.accuracy_7d as number) >= 0.6 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {((h.accuracy_7d as number) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </UnlockGate>
  )
}
