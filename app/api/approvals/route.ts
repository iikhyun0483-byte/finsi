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
        .from('pending_approvals')
        .select('*')
        .eq('status', 'PENDING')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      return NextResponse.json({ success: true, requests: data ?? [] })
    }

    if (action === 'history') {
      // 승인/거부/만료 내역 조회
      const { data } = await supabase
        .from('pending_approvals')
        .select('*')
        .in('status', ['APPROVED','REJECTED','EXPIRED'])
        .order('approved_at', { ascending: false })
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
      const { symbol, orderType, quantity, amount, signalReason, signalScore } = body
      const request = createApprovalRequest(symbol, orderType, quantity, amount, signalReason, signalScore)

      const { data, error } = await supabase
        .from('pending_approvals')
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
        .from('pending_approvals')
        .select('*')
        .eq('id', id)
        .single()

      if (!request) {
        return NextResponse.json({ error: 'request not found' }, { status: 404 })
      }

      // 만료 체크
      if (checkExpired(request)) {
        await supabase
          .from('pending_approvals')
          .update({ status: 'EXPIRED', approved_at: new Date().toISOString() })
          .eq('id', id)

        return NextResponse.json({ success: false, expired: true })
      }

      // 주문 실행 시도
      const result = request.order_type === 'BUY'
        ? await placeBuyOrder(request.symbol, request.quantity, request.amount)
        : await placeSellOrder(request.symbol, request.quantity, request.amount)

      // KIS 미연동이어도 승인 상태는 저장
      await supabase
        .from('pending_approvals')
        .update({ status: 'APPROVED', approved_at: new Date().toISOString() })
        .eq('id', id)

      if (!result.success) {
        // KIS 미연동 시 승인은 완료, 주문 실행만 스킵
        return NextResponse.json({
          success: true,
          approved: true,
          orderExecuted: false,
          message: result.error ?? 'KIS 연동 후 실제 주문이 실행됩니다'
        })
      }

      // 주문 성공 시 거래 내역 저장
      await supabase.from('trade_history').insert({
        symbol: request.symbol,
        action: request.order_type,
        quantity: request.quantity,
        price: request.amount,
        order_no: result.orderNo,
        executed_at: new Date().toISOString(),
        profit_loss: 0,
      })

      return NextResponse.json({
        success: true,
        approved: true,
        orderExecuted: true,
        orderNo: result.orderNo
      })
    }

    // 거부 처리
    if (action === 'reject') {
      const { id } = body

      await supabase
        .from('pending_approvals')
        .update({ status: 'REJECTED', rejected_at: new Date().toISOString() })
        .eq('id', id)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
