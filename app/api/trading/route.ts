// app/api/trading/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentPrice, getBalance, placeBuyOrder, placeSellOrder } from '@/lib/kis-api'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Risk Gate: 3가지 조건 체크
async function checkRiskGate(
  action: 'BUY'|'SELL',
  symbol: string,
  quantity: number,
  price: number
): Promise<{ pass: boolean; reason?: string }> {
  // 1. 자동매매 활성화 상태 체크
  const { data: config } = await supabase
    .from('autopilot_config')
    .select('*')
    .single()

  if (!config?.is_active) {
    return { pass: false, reason: '자동매매가 비활성화 상태입니다' }
  }

  // 2. 일일 손실 한도 체크
  const today = new Date().toISOString().slice(0,10)
  const { data: trades } = await supabase
    .from('trade_history')
    .select('profit_loss')
    .gte('executed_at', `${today}T00:00:00`)
    .lt('executed_at', `${today}T23:59:59`)

  const dailyLoss = trades
    ?.reduce((sum, t) => sum + (t.profit_loss ?? 0), 0) ?? 0

  const maxDailyLoss = config?.max_daily_loss ?? -500000
  if (dailyLoss < 0 && dailyLoss <= maxDailyLoss) {
    return { pass: false, reason: `일일 손실 한도 초과 (${dailyLoss.toLocaleString()}원)` }
  }

  // 3. 단일 주문 한도 체크 (매수 시만, 현금의 50% 초과 불가)
  if (action === 'BUY') {
    const balance = await getBalance()
    const orderAmount = price * quantity
    const maxOrderAmount = balance.cash * 0.5

    if (orderAmount > maxOrderAmount) {
      return { pass: false, reason: `단일 주문 한도 초과 (현금의 50%: ${maxOrderAmount.toLocaleString()}원)` }
    }
  }

  return { pass: true }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    if (action === 'balance') {
      const balance = await getBalance()
      return NextResponse.json({ success: true, balance })
    }

    if (action === 'price') {
      const symbol = searchParams.get('symbol')
      if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })
      const price = await getCurrentPrice(symbol)
      return NextResponse.json({ success: true, price })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, symbol, quantity, price = 0 } = body

    if (!['BUY','SELL'].includes(action)) {
      return NextResponse.json({ error: 'action must be BUY or SELL' }, { status: 400 })
    }
    if (!symbol || !quantity) {
      return NextResponse.json({ error: 'symbol and quantity required' }, { status: 400 })
    }

    // Risk Gate 체크
    const gateCheck = await checkRiskGate(action, symbol, quantity, price)
    if (!gateCheck.pass) {
      return NextResponse.json({
        success: false,
        blocked: true,
        reason: gateCheck.reason
      })
    }

    // 실제 주문 실행
    const result = action === 'BUY'
      ? await placeBuyOrder(symbol, quantity, price)
      : await placeSellOrder(symbol, quantity, price)

    // 거래 내역 저장
    if (result.success) {
      await supabase.from('trade_history').insert({
        symbol,
        action,
        quantity,
        price: price || await getCurrentPrice(symbol),
        order_no: result.orderNo,
        executed_at: new Date().toISOString(),
        profit_loss: 0, // 청산 시 계산
      })
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      orderNo: result.orderNo
    })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
