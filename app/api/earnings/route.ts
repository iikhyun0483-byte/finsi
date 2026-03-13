// app/api/earnings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncEarnings } from '@/lib/earnings-tracker'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? 'list'
  const symbol = searchParams.get('symbol')

  try {
    if (action === 'list') {
      const today = new Date().toISOString().slice(0, 10)
      let query = supabase
        .from('earnings_calendar')
        .select('*')
        .gte('earnings_date', today)
        .order('earnings_date', { ascending: true })
        .limit(50)
      if (symbol) query = query.eq('symbol', symbol)
      const { data } = await query
      return NextResponse.json({ data: data ?? [] })
    }

    if (action === 'recent') {
      // 최근 실적 발표 결과 (서프라이즈 포함)
      const { data } = await supabase
        .from('earnings_calendar')
        .select('*')
        .not('actual_eps', 'is', null)
        .order('earnings_date', { ascending: false })
        .limit(20)
      return NextResponse.json({ data: data ?? [] })
    }

    if (action === 'sync') {
      const events = await syncEarnings()
      return NextResponse.json({ synced: events.length })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
