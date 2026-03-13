// app/api/autopilot/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AutopilotConfig, DEFAULT_CONFIG, validateUniverse, EmergencyStopResult } from '@/lib/autopilot'
import { getBalance, placeSellOrder } from '@/lib/kis-api'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') ?? 'get'

    if (action === 'get') {
      const { data } = await supabase
        .from('autopilot_config')
        .select('*')
        .single()

      const config = data ?? DEFAULT_CONFIG

      return NextResponse.json({ success: true, config })
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

    // 설정 업데이트
    if (action === 'update') {
      const { config } = body as { config: AutopilotConfig }

      // Universe 검증
      if (!validateUniverse(config.universe)) {
        return NextResponse.json({ error: 'invalid universe format' }, { status: 400 })
      }

      const updatedConfig = {
        ...config,
        updated_at: new Date().toISOString()
      }

      await supabase
        .from('autopilot_config')
        .upsert(updatedConfig, { onConflict: 'id' })

      return NextResponse.json({ success: true, config: updatedConfig })
    }

    // 활성화/비활성화 토글
    if (action === 'toggle') {
      const { data: current } = await supabase
        .from('autopilot_config')
        .select('is_active')
        .single()

      const newStatus = !(current?.is_active ?? false)

      await supabase
        .from('autopilot_config')
        .upsert({ is_active: newStatus }, { onConflict: 'id' })

      return NextResponse.json({ success: true, is_active: newStatus })
    }

    // 긴급 정지 (모든 포지션 청산 + 비활성화)
    if (action === 'emergency_stop') {
      const balance = await getBalance()
      let closedCount = 0

      // 보유 종목 전체 시장가 매도
      for (const holding of balance.holdings) {
        const result = await placeSellOrder(holding.symbol, holding.quantity, 0)
        if (result.success) {
          closedCount++

          // 거래 내역 저장
          await supabase.from('trade_history').insert({
            symbol: holding.symbol,
            action: 'SELL',
            quantity: holding.quantity,
            price: holding.currentPrice,
            order_no: result.orderNo,
            executed_at: new Date().toISOString(),
            profit_loss: 0, // 청산 시 계산 필요
          })
        }
      }

      // Autopilot 비활성화
      await supabase
        .from('autopilot_config')
        .upsert({ is_active: false }, { onConflict: 'id' })

      const stopResult: EmergencyStopResult = {
        success: true,
        closedPositions: closedCount,
        message: `${closedCount}개 포지션 청산 완료, Autopilot 비활성화`
      }

      return NextResponse.json({ success: true, result: stopResult })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
