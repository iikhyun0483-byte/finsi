// app/api/attribution/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAttributionSummary, recordAttribution } from '@/lib/attribution'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const action = new URL(req.url).searchParams.get('action') ?? 'summary'
  try {
    if (action === 'summary') {
      const data = await getAttributionSummary()
      return NextResponse.json({ data })
    }
    if (action === 'detail') {
      const { data } = await supabase
        .from('attribution_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      return NextResponse.json({ data: data ?? [] })
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    await recordAttribution(body)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
