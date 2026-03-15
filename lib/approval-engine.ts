// lib/approval-engine.ts

export interface ApprovalRequest {
  id?: string
  symbol: string
  order_type: 'BUY'|'SELL'
  quantity: number
  amount: number
  signal_score?: number
  signal_reason: string
  status: 'PENDING'|'APPROVED'|'REJECTED'|'EXPIRED'
  created_at: string
  expires_at: string
  approved_at?: string
  rejected_at?: string
}

const EXPIRY_MINUTES = 30

// 승인 요청 생성 (만료 시간 자동 설정)
export function createApprovalRequest(
  symbol: string,
  orderType: 'BUY'|'SELL',
  quantity: number,
  amount: number,
  signalReason: string,
  signalScore?: number
): Omit<ApprovalRequest, 'id'> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + EXPIRY_MINUTES * 60 * 1000)

  return {
    symbol,
    order_type: orderType,
    quantity,
    amount,
    signal_score: signalScore,
    signal_reason: signalReason,
    status: 'PENDING',
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  }
}

// 만료된 요청 자동 처리
export function checkExpired(request: ApprovalRequest): boolean {
  if (request.status !== 'PENDING') return false
  return new Date() > new Date(request.expires_at)
}

// 남은 시간 계산 (초 단위)
export function getRemainingSeconds(expiresAt: string): number {
  const remaining = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.floor(remaining / 1000))
}

// 타임스탬프 → 한국 시각 포맷
export function formatKST(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}
