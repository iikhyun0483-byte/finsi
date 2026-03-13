// components/UnlockGate.tsx
'use client'
import { useState, useEffect } from 'react'

interface UnlockGateProps {
  minSignals:  number
  featureName: string
  children:    React.ReactNode
}

export default function UnlockGate({ minSignals, featureName, children }: UnlockGateProps) {
  const [count,   setCount]   = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/signal-tracking?action=count')
      .then(r => r.json())
      .then(d => { setCount(d.count ?? 0); setLoading(false) })
      .catch(() => { setCount(0); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="text-gray-500 text-sm">확인 중...</div>
    </div>
  )

  if ((count ?? 0) < minSignals) return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔒</div>
        <p className="text-orange-400 font-bold text-xl mb-2">{featureName}</p>
        <p className="text-gray-400 text-sm mb-4">
          신호 데이터 {minSignals}개 이상 수집 시 활성화됩니다
        </p>
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">현재</span>
            <span className="text-orange-400 font-bold">{count} / {minSignals}개</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-2 bg-orange-500 rounded-full transition-all"
              style={{ width: `${Math.min((count ?? 0) / minSignals * 100, 100)}%` }} />
          </div>
          <p className="text-gray-600 text-xs mt-2">
            /signal 페이지에서 신호를 생성하면 자동으로 쌓입니다
          </p>
        </div>
      </div>
    </div>
  )

  return <>{children}</>
}
