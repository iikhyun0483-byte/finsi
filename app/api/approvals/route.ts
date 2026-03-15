// app/api/approvals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createApprovalRequest, checkExpired } from '@/lib/approval-engine'
import { placeBuyOrder, placeSellOrder } from '@/lib/kis-api'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') ?? 'list'

    if (action === 'list') {
      // 만료되지 않은 PENDING 요청만 조회
      const { data } = await supabase
        .from('approval_queue')
        .select('*')
        .eq('status', 'PENDING')
        .gte('expires_at', new Date().toISOString())
        .order('requested_at', { ascending: false })

      return NextResponse.json({ success: true, requests: data ?? [] })
    }

    if (action === 'history') {
      // 승인/거부/만료 내역 조회
      const { data } = await supabase
        .from('approval_queue')
        .select('*')
        .in('status', ['APPROVED','REJECTED','EXPIRED'])
        .order('reviewed_at', { ascending: false })
        .limit(50)

      return NextResponse.json({ success: true, history: data ?? [] })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    // 승인 요청 생성
    if (action === 'request') {
      const { symbol, tradeAction, quantity, price, reason } = body
      const request = createApprovalRequest(symbol, tradeAction, quantity, price, reason)

      const { data, error } = await supabase
        .from('approval_queue')
        .insert(request)
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({ success: true, request: data })
    }

    // 승인 처리 → 즉시 주문 실행
    if (action === 'approve') {
      const { id } = body

      // 요청 조회
      const { data: request } = await supabase
        .from('approval_queue')
        .select('*')
        .eq('id', id)
        .single()

      if (!request) {
        return NextResponse.json({ error: 'request not found' }, { status: 404 })
      }

      // 만료 체크
      if (checkExpired(request)) {
        await supabase
          .from('approval_queue')
          .update({ status: 'EXPIRED', reviewed_at: new Date().toISOString() })
          .eq('id', id)

        return NextResponse.json({ success: false, expired: true })
      }

      // 주문 실행
      const result = request.action === 'BUY'
        ? await placeBuyOrder(request.symbol, request.quantity, request.price)
        : await placeSellOrder(request.symbol, request.quantity, request.price)

      if (!result.success) {
        return NextResponse.json({ success: false, message: result.error ?? '주문 실패' })
      }

      // 상태 업데이트 + 거래 내역 저장
      await supabase
        .from('approval_queue')
        .update({ status: 'APPROVED', reviewed_at: new Date().toISOString() })
        .eq('id', id)

      await supabase.from('trade_history').insert({
        symbol: request.symbol,
        action: request.action,
        quantity: request.quantity,
        price: request.price,
        order_no: result.orderNo,
        executed_at: new Date().toISOString(),
        profit_loss: 0,
      })

      return NextResponse.json({ success: true, orderNo: result.orderNo })
    }

    // 거부 처리
    if (action === 'reject') {
      const { id } = body

      await supabase
        .from('approval_queue')
        .update({ status: 'REJECTED', reviewed_at: new Date().toISOString() })
        .eq('id', id)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
