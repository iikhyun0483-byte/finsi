// app/api/assets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 비주식 자산
export async function GET() {
  try {
    const [assets, liabilities, cashflow] = await Promise.all([
      supabase.from('assets_non_stock').select('*').order('created_at', { ascending: false }),
      supabase.from('liabilities').select('*').order('created_at', { ascending: false }),
      supabase.from('cashflow').select('*').order('date', { ascending: false }).limit(100),
    ])
    return NextResponse.json({
      assets: assets.data || [],
      liabilities: liabilities.data || [],
      cashflow: cashflow.data || [],
    })
  } catch (e) {
    console.error('[assets GET]', e)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { table, ...rest } = body
    const allowed = ['assets_non_stock', 'liabilities', 'cashflow']
    if (!allowed.includes(table)) {
      return NextResponse.json({ error: '허용되지 않은 테이블' }, { status: 400 })
    }
    const { data, error } = await supabase.from(table).insert(rest).select()
    if (error) throw error
    return NextResponse.json(data[0])
  } catch (e) {
    console.error('[assets POST]', e)
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }
}
