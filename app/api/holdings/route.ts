// app/api/holdings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('holdings')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    console.error('[holdings GET]', e)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data, error } = await supabase.from('holdings').insert(body).select()
    if (error) throw error
    return NextResponse.json(data[0])
  } catch (e) {
    console.error('[holdings POST]', e)
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const { error } = await supabase.from('holdings').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[holdings DELETE]', e)
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  }
}
