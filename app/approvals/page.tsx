'use client'
import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { ApprovalRequest, getRemainingSeconds, formatKST } from '@/lib/approval-engine'

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(getRemainingSeconds(expiresAt))

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(getRemainingSeconds(expiresAt))
    }, 1000)
    return () => clearInterval(timer)
  }, [expiresAt])

  if (remaining <= 0) return <span className="text-red-400">만료됨</span>

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <span className={remaining < 300 ? 'text-red-400' : 'text-yellow-400'}>
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  )
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(false)

  const loadRequests = async () => {
    const res = await fetch('/api/approvals?action=list')
    const data = await res.json()
    if (data.success) setRequests(data.requests)
  }

  useEffect(() => {
    loadRequests()
    const interval = setInterval(loadRequests, 5000) // 5초마다 새로고침
    return () => clearInterval(interval)
  }, [])

  const handleApprove = async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', id })
      })
      const data = await res.json()

      if (data.success) {
        alert(`✅ 승인 완료: 주문번호 ${data.orderNo}`)
      } else if (data.expired) {
        alert('⏰ 요청이 만료되었습니다')
      } else {
        alert(`❌ 실행 실패: ${data.message}`)
      }

      loadRequests()
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (id: string) => {
    setLoading(true)
    try {
      await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', id })
      })
      alert('🚫 거부 완료')
      loadRequests()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
              <AlertTriangle className="w-7 h-7" />
              승인 대기 큐 (30분 자동 만료)
            </h1>
            <span className="px-2 py-0.5 bg-yellow-600/20 border border-yellow-600/40 rounded text-xs text-yellow-400">
              KIS 연동 예정
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Autopilot이 제안한 거래를 검토하고 승인/거부하세요
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-10 text-center border border-gray-800">
            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">승인 대기 중인 요청이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                        req.action === 'BUY' ? 'bg-green-600' : 'bg-red-600'
                      }`}>
                        {req.action}
                      </span>
                      <span className="text-xl font-bold text-white">{req.symbol}</span>
                    </div>
                    <p className="text-gray-400 text-sm">{req.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">남은 시간</p>
                    <p className="text-lg font-bold">
                      <CountdownTimer expiresAt={req.expires_at} />
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-gray-500">수량</p>
                    <p className="text-white font-semibold">{req.quantity}주</p>
                  </div>
                  <div>
                    <p className="text-gray-500">가격</p>
                    <p className="text-white font-semibold">
                      {req.price === 0 ? '시장가' : `${req.price.toLocaleString()}원`}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">요청 시각</p>
                    <p className="text-white font-semibold">{formatKST(req.requested_at).slice(11,19)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleApprove(req.id!)}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-lg py-2.5 font-bold"
                  >
                    <CheckCircle className="w-5 h-5" />
                    승인 & 실행
                  </button>
                  <button
                    onClick={() => handleReject(req.id!)}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-lg py-2.5 font-bold"
                  >
                    <XCircle className="w-5 h-5" />
                    거부
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 bg-gray-900/50 rounded-xl p-4 text-xs text-gray-500">
          <p className="font-semibold text-gray-400 mb-2">승인 워크플로우</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Autopilot이 신호 감지 시 승인 요청 생성 (30분 유효)</li>
            <li>승인 시 즉시 KIS API를 통해 주문 실행</li>
            <li>거부 또는 만료 시 주문 취소</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
