// app/api/supply/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcSupplyScore, detectConsecutiveForeign, generateSupplySignal } from '@/lib/supply-demand'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol')
    const action = searchParams.get('action') ?? 'list'

    if (action === 'list') {
      let query = supabase
        .from('supply_demand')
        .select('*')
        .order('trade_date', { ascending: false })
        .limit(100)
      if (symbol) query = query.eq('symbol', symbol)
      const { data } = await query
      return NextResponse.json({ data: data ?? [] })
    }

    if (action === 'signal' && symbol) {
      const { data } = await supabase
        .from('supply_demand')
        .select('*')
        .eq('symbol', symbol)
        .order('trade_date', { ascending: false })
        .limit(10)

      if (!data || data.length === 0) {
        return NextResponse.json({ signal: 'NEUTRAL', reason: '데이터 없음', score: 0 })
      }

      const latest = data[0]
      const consecutive = detectConsecutiveForeign(
        data.map(d => ({ tradeDate: d.trade_date, foreignNet: d.foreign_net }))
      )
      const signal = generateSupplySignal(latest.supply_score, consecutive)
      return NextResponse.json({ ...signal, score: latest.supply_score, data: data.slice(0, 5) })
    }

    // 수동 데이터 입력 (KIS API 연동 전 임시)
    if (action === 'manual') {
      const body = await req.json?.() ?? {}
      const score = calcSupplyScore(body.foreignNet, body.instNet, body.programNet)
      await supabase.from('supply_demand').upsert({
        symbol:       body.symbol,
        trade_date:   body.tradeDate ?? new Date().toISOString().slice(0,10),
        foreign_net:  body.foreignNet ?? 0,
        inst_net:     body.instNet    ?? 0,
        retail_net:   body.retailNet  ?? 0,
        program_net:  body.programNet ?? 0,
        supply_score: score,
      }, { onConflict: 'symbol,trade_date' })
      return NextResponse.json({ ok: true, score })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
