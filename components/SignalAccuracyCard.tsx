'use client'
import { useEffect, useState } from 'react'
import type { SignalAccuracy } from '@/lib/signal-tracker'

export default function SignalAccuracyCard({ symbol }: { symbol: string }) {
  const [data,    setData]    = useState<SignalAccuracy | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!symbol) return
    fetch('/api/signal-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accuracy', symbol }),
    })
      .then(r => r.json())
      .then(d => setData(d.data))
      .finally(() => setLoading(false))
  }, [symbol])

  if (loading) return (
    <div className="bg-gray-800 rounded-lg p-3 text-xs text-gray-500 animate-pulse">
      정확도 로딩 중...
    </div>
  )

  if (!data) return (
    <div className="bg-gray-800/50 border border-gray-700/40 rounded-lg p-3 text-xs text-gray-500">
      신호 추적 데이터 없음
      <p className="text-gray-700 mt-0.5">이 신호 기록 시 7일 후부터 정확도가 쌓입니다</p>
    </div>
  )

  const accColor = data.accuracy7d>=0.6 ? 'text-green-400' : data.accuracy7d>=0.5 ? 'text-yellow-400' : 'text-red-400'
  const evColor  = data.expectedValue>0 ? 'text-green-400' : 'text-red-400'

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <p className="text-orange-400 text-xs font-semibold">{symbol} 신호 정확도</p>
        {!data.isStatisticallySignificant && (
          <span className="text-yellow-600 text-xs">샘플 부족 ({data.totalSignals}/30)</span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div>
          <p className="text-gray-500">7일 적중률</p>
          <p className={`font-bold ${accColor}`}>{(data.accuracy7d*100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-gray-500">30일 적중률</p>
          <p className="text-white font-bold">{(data.accuracy30d*100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-gray-500">기대값</p>
          <p className={`font-bold ${evColor}`}>
            {data.expectedValue>0?'+':''}{(data.expectedValue*100).toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-gray-500">샘플</p>
          <p className="text-white font-bold">{data.totalSignals}회</p>
        </div>
      </div>
    </div>
  )
}
