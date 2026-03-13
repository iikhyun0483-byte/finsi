// app/api/dart/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchRecentDisclosures, calcImportance, summarizeDisclosure } from '@/lib/dart-client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') ?? 'list'

    if (action === 'list') {
      // 최근 공시 목록 (DB에서)
      const minImportance = Number(searchParams.get('minImportance') ?? 5)
      const symbol        = searchParams.get('symbol')
      let query = supabase
        .from('dart_disclosures')
        .select('*')
        .gte('importance', minImportance)
        .order('filed_at', { ascending: false })
        .limit(50)
      if (symbol) query = query.eq('symbol', symbol)
      const { data } = await query
      return NextResponse.json({ data: data ?? [] })
    }

    if (action === 'sync') {
      // 오늘 공시 수집 + DB 저장
      const today = new Date()
      const yyyymmdd = today.toISOString().slice(0,10).replace(/-/g,'')
      const disclosures = await fetchRecentDisclosures(yyyymmdd, yyyymmdd)

      let newCount = 0
      for (const d of disclosures) {
        const importance = calcImportance(d.reportNm, d.rmk)
        if (importance < 5) continue  // 중요도 5 미만 스킵

        const { error } = await supabase.from('dart_disclosures').upsert({
          rcept_no:        d.rceptNo,
          corp_name:       d.corpName,
          symbol:          d.stockCode,
          disclosure_type: d.reportNm,
          title:           d.reportNm,
          filed_at:        new Date().toISOString(),
          importance,
          raw_data:        d,
        }, { onConflict: 'rcept_no', ignoreDuplicates: true })

        if (!error) newCount++

        // 중요도 7 이상이면 AI 요약 생성
        if (importance >= 7) {
          const summary = await summarizeDisclosure(d.reportNm, d.corpName)
          await supabase.from('dart_disclosures')
            .update({ ai_summary: summary })
            .eq('rcept_no', d.rceptNo)
        }
      }
      return NextResponse.json({ synced: disclosures.length, saved: newCount })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
