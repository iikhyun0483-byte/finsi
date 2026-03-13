// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')

  if (key) {
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', key)
      .single()
    return NextResponse.json({ value: data?.value ?? null })
  }

  const { data } = await supabase
    .from('system_config')
    .select('*')
    .order('key')
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const { key, value } = await req.json()
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key, value 필수' }, { status: 400 })
    }
    await supabase.from('system_config').upsert(
      { key, value: String(value), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
