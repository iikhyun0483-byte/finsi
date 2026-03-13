// app/api/performance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? 'list'

  if (action === 'list') {
    const { data } = await supabase
      .from('performance_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(24)
    return NextResponse.json({ data: data ?? [] })
  }
  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    await supabase.from('performance_snapshots').upsert({
      snapshot_date: new Date().toISOString().slice(0,10),
      total_value:   body.totalValue,
      cash:          body.cash ?? 0,
      return_1m:     body.return1m ?? 0,
      return_3m:     body.return3m ?? 0,
      return_ytd:    body.returnYtd ?? 0,
      sharpe_ratio:  body.sharpeRatio,
      max_dd:        body.maxDd,
      win_rate:      body.winRate,
      trade_count:   body.tradeCount ?? 0,
    }, { onConflict: 'snapshot_date' })
    return NextResponse.json({ ok: true })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
