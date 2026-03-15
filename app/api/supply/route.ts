// app/api/supply/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcSupplyScore, detectConsecutiveForeign, generateSupplySignal, CONSECUTIVE_DAYS } from '@/lib/supply-demand'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

console.log('[Supply API] Initialized with Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')
    const action = searchParams.get('action') ?? 'list'

    if (action === 'list') {
      console.log('[Supply API] List action, symbol:', symbol || 'all')

      let query = supabase
        .from('supply_demand')
        .select('*')
        .order('trade_date', { ascending: false })
        .limit(100)

      if (symbol) {
        query = query.eq('symbol', symbol)
      }

      const { data, error } = await query

      if (error) {
        console.error('[Supply API] List query error:', error)

        // 테이블 미생성 에러 특별 처리
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          return NextResponse.json({
            error: 'supply_demand 테이블이 존재하지 않습니다. supabase/supply_demand.sql 파일을 Supabase Dashboard에서 실행하세요.',
            hint: 'Supabase Dashboard > SQL Editor에서 supply_demand.sql 파일 실행',
            sql_file: 'supabase/supply_demand.sql'
          }, { status: 500 })
        }

        return NextResponse.json({
          error: `DB 조회 실패: ${error.message}`
        }, { status: 500 })
      }

      console.log(`[Supply API] Found ${data?.length ?? 0} records`)
      return NextResponse.json({ success: true, data: data ?? [] })
    }

    if (action === 'signal' && symbol) {
      console.log(`[Supply API] Signal action for symbol: ${symbol}`)

      const { data, error } = await supabase
        .from('supply_demand')
        .select('*')
        .eq('symbol', symbol)
        .order('trade_date', { ascending: false })
        .limit(10)

      if (error) {
        console.error('[Supply API] Signal query error:', error)
        return NextResponse.json({
          error: `DB 조회 실패: ${error.message}`
        }, { status: 500 })
      }

      if (!data || data.length === 0) {
        console.log(`[Supply API] No data found for ${symbol}`)
        return NextResponse.json({
          signal: 'NEUTRAL',
          reason: '데이터 없음 — 수동 입력 또는 KIS API 연동 필요',
          score: 0,
          data: []
        })
      }

      const latest = data[0]
      const consecutive = detectConsecutiveForeign(
        data.map(d => ({ tradeDate: d.trade_date, foreignNet: d.foreign_net })),
        CONSECUTIVE_DAYS
      )
      const signal = generateSupplySignal(latest.supply_score, consecutive)

      console.log(`[Supply API] Signal: ${signal.signal}, Score: ${latest.supply_score}, Consecutive: ${consecutive}`)

      return NextResponse.json({
        success: true,
        ...signal,
        score: latest.supply_score,
        consecutiveDays: consecutive ? CONSECUTIVE_DAYS : 0,
        data: data.slice(0, 5)
      })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    console.error('[Supply API] Unexpected error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// 수동 데이터 입력 (POST)
export async function POST(req: NextRequest) {
  try {
    console.log('[Supply API] POST - Manual data input')

    const body = await req.json()

    if (!body.symbol || body.symbol.trim() === '') {
      return NextResponse.json({
        error: '종목코드(symbol)가 필요합니다.'
      }, { status: 400 })
    }

    const score = calcSupplyScore(
      body.foreignNet ?? 0,
      body.instNet ?? 0,
      body.programNet ?? 0
    )

    const tradeDate = body.tradeDate || new Date().toISOString().slice(0, 10)

    console.log(`[Supply API] Inserting data for ${body.symbol} on ${tradeDate}, score: ${score}`)

    const { data, error } = await supabase
      .from('supply_demand')
      .upsert({
        symbol:       body.symbol.trim().toUpperCase(),
        trade_date:   tradeDate,
        foreign_net:  body.foreignNet ?? 0,
        inst_net:     body.instNet ?? 0,
        retail_net:   body.retailNet ?? 0,
        program_net:  body.programNet ?? 0,
        supply_score: score,
      }, { onConflict: 'symbol,trade_date' })
      .select()

    if (error) {
      console.error('[Supply API] Upsert error:', error)
      return NextResponse.json({
        error: `DB 저장 실패: ${error.message}`
      }, { status: 500 })
    }

    console.log('[Supply API] Data saved successfully')

    return NextResponse.json({
      success: true,
      score,
      data: data?.[0]
    })
  } catch(e) {
    console.error('[Supply API] POST error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
