// app/api/scenarios/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/scenarios?type=lifecycle&userId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const userId = searchParams.get('userId')

  const query = supabase
    .from('saved_scenarios')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (type) query.eq('type', type)
  if (userId) query.eq('user_id', userId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/scenarios — 저장
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, label, inputData, resultData, userId } = body

  if (!type || !label || !inputData || !resultData) {
    return NextResponse.json({ error: 'type, label, inputData, resultData 필수' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('saved_scenarios')
    .insert({
      type,
      label,
      input_data: inputData,
      result_data: resultData,
      user_id: userId ?? 'anonymous',
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/scenarios?id=xxx
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 })

  const { error } = await supabase.from('saved_scenarios').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
