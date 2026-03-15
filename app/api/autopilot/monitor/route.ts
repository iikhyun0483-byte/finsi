// app/api/autopilot/monitor/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateSignal } from '@/lib/autopilot'
import { createApprovalRequest } from '@/lib/approval-engine'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Yahoo Finance에서 주식 데이터 가져오기 (무료)
async function getStockData(symbol: string) {
  try {
    // Yahoo Finance API (무료, 키 불필요)
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=30d`,
      { next: { revalidate: 300 } } // 5분 캐시
    )

    if (!res.ok) {
      console.warn(`[Monitor] Yahoo Finance error for ${symbol}:`, res.status)
      return null
    }

    const data = await res.json()
    const quote = data?.chart?.result?.[0]

    if (!quote) return null

    const indicators = quote.indicators?.quote?.[0]
    const closes = indicators?.close ?? []
    const currentPrice = closes[closes.length - 1]

    if (!currentPrice) return null

    // MA20 계산
    const last20 = closes.slice(-20)
    const ma20 = last20.reduce((sum: number, p: number) => sum + p, 0) / last20.length

    // RSI 계산 (간단 버전)
    const rsi = calculateRSI(closes.slice(-14))

    return {
      symbol,
      price: currentPrice,
      ma20,
      rsi,
      sentiment: 50 // 감정은 기본값 (sentiment API와 통합 가능)
    }
  } catch (error) {
    console.error(`[Monitor] Failed to fetch ${symbol}:`, error)
    return null
  }
}

// RSI 계산 (14일 기준)
function calculateRSI(prices: number[]): number {
  if (prices.length < 2) return 50

  let gains = 0
  let losses = 0

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    if (change > 0) {
      gains += change
    } else {
      losses += Math.abs(change)
    }
  }

  const avgGain = gains / (prices.length - 1)
  const avgLoss = losses / (prices.length - 1)

  if (avgLoss === 0) return 100

  const rs = avgGain / avgLoss
  const rsi = 100 - (100 / (1 + rs))

  return Math.round(rsi)
}

export async function GET() {
  try {
    // 1. autopilot_config 조회
    const { data: config } = await supabase
      .from('autopilot_config')
      .select('*')
      .single()

    if (!config || !config.is_active) {
      return NextResponse.json({
        success: true,
        message: 'Autopilot is not active',
        signals: 0
      })
    }

    const { universe, strategy } = config
    let signalsGenerated = 0

    // 2. 각 종목별 신호 생성
    for (const symbol of universe) {
      const stockData = await getStockData(symbol)

      if (!stockData) {
        console.warn(`[Monitor] No data for ${symbol}`)
        continue
      }

      // 3. 신호 생성
      const signal = generateSignal(strategy, symbol, stockData)

      if (signal.action === 'HOLD') {
        continue // 신호 없음
      }

      // 4. 승인 큐에 추가
      const approvalRequest = createApprovalRequest(
        symbol,
        signal.action,
        10, // 기본 수량 (설정에서 가져올 수도 있음)
        0,  // 시장가
        signal.reason,
        Math.round(stockData.rsi) // 신호 점수로 RSI 사용
      )

      const { error } = await supabase
        .from('pending_approvals')
        .insert(approvalRequest)

      if (error) {
        console.error(`[Monitor] Failed to create approval for ${symbol}:`, error)
      } else {
        signalsGenerated++
        console.log(`[Monitor] Signal generated: ${symbol} ${signal.action} - ${signal.reason}`)
      }
    }

    // 5. 상태 업데이트
    const now = new Date().toISOString()
    const today = now.slice(0, 10)

    // 오늘 생성된 신호 개수 조회
    const { count } = await supabase
      .from('pending_approvals')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)

    // 현재 total_signals 값 가져오기
    const { data: currentStatus } = await supabase
      .from('autopilot_status')
      .select('total_signals')
      .single()

    const newTotalSignals = (currentStatus?.total_signals ?? 0) + signalsGenerated

    await supabase
      .from('autopilot_status')
      .update({
        last_check_at: now,
        signals_today: count ?? 0,
        last_signal_at: signalsGenerated > 0 ? now : undefined,
        total_signals: newTotalSignals,
        updated_at: now
      })
      .limit(1)

    return NextResponse.json({
      success: true,
      message: `Monitored ${universe.length} symbols`,
      signals: signalsGenerated,
      timestamp: now
    })
  } catch (error) {
    console.error('[Monitor] Error:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
}
