'use client'
import { useState, useCallback } from 'react'
import UnlockGate from '@/components/UnlockGate'

interface Prediction {
  probability: number
  confidence: string
  isActive: boolean
  sampleCount: number
}

interface Ensemble {
  finalScore: number
  mlWeight: number
}

export default function MLSignalPage() {
  const [signalScore, setSignalScore] = useState(75)
  const [factorScore, setFactorScore] = useState(0.5)
  const [result, setResult] = useState<{ prediction: Prediction; ensemble: Ensemble } | null>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const predict = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ml-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signalScore, factorScore }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'ML 예측 실패')
      }

      const data = await res.json()

      if (!data.success) {
        throw new Error('예측 결과를 받을 수 없습니다')
      }

      setResult(data)

      if (data.prediction.isActive) {
        showToast(`ML 예측 완료 (신뢰도: ${data.prediction.confidence})`, 'success')
      } else {
        showToast(`신호 데이터 부족 (${data.prediction.sampleCount}/100개)`, 'info')
      }
    } catch (error) {
      showToast(`오류: ${(error as Error).message}`, 'error')
      console.error('[ML Signal] Prediction error:', error)
    } finally {
      setLoading(false)
    }
  }, [signalScore, factorScore])

  const CONF_COLOR = { HIGH: 'text-green-400', MEDIUM: 'text-yellow-400', LOW: 'text-gray-400' }

  return (
    <UnlockGate minSignals={100} featureName="머신러닝 신호">
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

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">머신러닝 신호</h1>
          <p className="text-gray-500 text-sm mt-1">신호 100개+ 시 활성화 / 1,000개+ 시 HIGH 신뢰도</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 mb-4 space-y-4 text-sm">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">기존 신호 점수</span>
              <span className="text-orange-400 font-bold">{signalScore}점</span>
            </div>
            <input type="range" min={0} max={100} value={signalScore}
              onChange={e => setSignalScore(Number(e.target.value))}
              className="w-full accent-orange-500" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">팩터 스코어</span>
              <span className="text-orange-400 font-bold">{factorScore.toFixed(2)}</span>
            </div>
            <input type="range" min={-3} max={3} step={0.1} value={factorScore}
              onChange={e => setFactorScore(Number(e.target.value))}
              className="w-full accent-orange-500" />
          </div>
          <button onClick={predict} disabled={loading}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-xl font-semibold text-sm">
            {loading ? '예측 중...' : 'ML 예측 실행'}
          </button>
        </div>

        {result && (
          <div className="space-y-3">
            <div className="bg-gray-900 rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <p className="text-orange-400 font-semibold">앙상블 최종 점수</p>
                <span className={`text-3xl font-bold ${result.ensemble.finalScore >= 70 ? 'text-green-400' : result.ensemble.finalScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {result.ensemble.finalScore}점
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-black/30 rounded p-2">
                  <p className="text-gray-500">ML 확률</p>
                  <p className="text-white font-bold">{(result.prediction.probability*100).toFixed(1)}%</p>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <p className="text-gray-500">신뢰도</p>
                  <p className={`font-bold ${CONF_COLOR[result.prediction.confidence as keyof typeof CONF_COLOR]}`}>
                    {result.prediction.confidence}
                  </p>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <p className="text-gray-500">ML 비중</p>
                  <p className="text-orange-400 font-bold">{(result.ensemble.mlWeight*100).toFixed(0)}%</p>
                </div>
              </div>
            </div>

            {!result.prediction.isActive && (
              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 text-xs text-yellow-400">
                ⚠️ 현재 신호 {result.prediction.sampleCount}개 — 100개 이상 쌓이면 ML 정식 활성화
              </div>
            )}
          </div>
        )}

        <div className="mt-6 bg-gray-900/50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
          <p className="text-orange-400 font-medium">앙상블 구조</p>
          <p>규칙 기반 신호 + ML 예측 → 가중 평균</p>
          <p>신호 0~99개:   규칙 100% + ML 0%</p>
          <p>신호 100~999개: 규칙 70~40% + ML 30~60%</p>
          <p>신호 3,000개+: 규칙 40% + ML 60%</p>
        </div>
      </div>
    </div>
    </UnlockGate>
  )
}
