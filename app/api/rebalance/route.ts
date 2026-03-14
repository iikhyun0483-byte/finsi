// app/api/rebalance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcDrift, calcRebalanceTrades, logRebalance } from '@/lib/rebalancer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data } = await supabase
    .from('rebalance_log')
    .select('*')
    .order('rebalance_date', { ascending: false })
    .limit(10)
  return NextResponse.json({ history: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, weights, totalValue, before, after, trades, driftScore } = body

    if (action === 'calc') {
      const tv = totalValue ?? 10_000_000
      const { drift, maxDrift, needsRebalance } = await calcDrift(weights)
      const tradesResult = await calcRebalanceTrades(weights, tv)
      return NextResponse.json({ drift, maxDrift, needsRebalance, trades: tradesResult })
    }

    if (action === 'log') {
      await logRebalance(before, after, trades, driftScore)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
