// app/api/optimization/route.ts
import { NextResponse } from 'next/server'
import { runOptimization } from '@/lib/optimizer'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const result = await runOptimization()
    const { data: history } = await supabase
      .from('optimization_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    return NextResponse.json({ result, history: history ?? [] })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
