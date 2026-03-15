// app/api/dart/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  fetchRecentDisclosures,
  calcImportance,
  summarizeDisclosure,
  IMPORTANCE_THRESHOLDS,
  validateEnv
} from '@/lib/dart-client'

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
      const minImportance = Number(searchParams.get('minImportance') ?? IMPORTANCE_THRESHOLDS.MIN_SAVE)
      const symbol        = searchParams.get('symbol')
      const limit         = Number(searchParams.get('limit') ?? 50)

      let query = supabase
        .from('dart_disclosures')
        .select('*')
        .gte('importance', minImportance)
        .order('filed_at', { ascending: false })
        .limit(Math.min(limit, 100))  // 최대 100건

      if (symbol) {
        query = query.eq('symbol', symbol)
      }

      const { data, error } = await query

      if (error) {
        console.error('Supabase 조회 오류:', error)
        return NextResponse.json({
          error: `DB 조회 실패: ${error.message}`
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: data ?? [],
        count: data?.length ?? 0
      })
    }

    if (action === 'sync') {
      // 환경변수 검증
      const envCheck = validateEnv()
      if (!envCheck.valid) {
        return NextResponse.json({
          error: `환경변수 누락: ${envCheck.missing.join(', ')}. .env.local 파일에 추가하세요.`,
          missing: envCheck.missing
        }, { status: 400 })
      }

      // 오늘 공시 수집 + DB 저장
      const today = new Date()
      const yyyymmdd = today.toISOString().slice(0,10).replace(/-/g,'')

      let disclosures
      try {
        disclosures = await fetchRecentDisclosures(yyyymmdd, yyyymmdd)
      } catch (error) {
        return NextResponse.json({
          error: `DART API 호출 실패: ${(error as Error).message}`
        }, { status: 500 })
      }

      if (disclosures.length === 0) {
        return NextResponse.json({
          message: '오늘 날짜 공시가 없습니다.',
          synced: 0,
          saved: 0
        })
      }

      let newCount = 0
      const errors: string[] = []

      // 배치 처리를 위한 데이터 준비
      const toInsert = []
      const toSummarize: Array<{ rceptNo: string; reportNm: string; corpName: string }> = []

      for (const d of disclosures) {
        const importance = calcImportance(d.reportNm, d.rmk)
        if (importance < IMPORTANCE_THRESHOLDS.MIN_SAVE) continue

        // YYYYMMDD → ISO 8601 형식 변환
        const filedAt = `${d.rceptDt.slice(0,4)}-${d.rceptDt.slice(4,6)}-${d.rceptDt.slice(6,8)}T00:00:00Z`

        toInsert.push({
          rcept_no:        d.rceptNo,
          corp_name:       d.corpName,
          symbol:          d.stockCode,
          disclosure_type: d.reportNm,
          title:           d.reportNm,
          filed_at:        filedAt,
          importance,
          raw_data:        d,
        })

        // 중요도 7 이상이면 AI 요약 대상
        if (importance >= IMPORTANCE_THRESHOLDS.MIN_AI) {
          toSummarize.push({ rceptNo: d.rceptNo, reportNm: d.reportNm, corpName: d.corpName })
        }
      }

      // 배치 upsert
      if (toInsert.length > 0) {
        const { data: inserted, error } = await supabase
          .from('dart_disclosures')
          .upsert(toInsert, { onConflict: 'rcept_no', ignoreDuplicates: true })
          .select('rcept_no')

        if (error) {
          console.error('Supabase upsert 오류:', error)
          errors.push(`DB 저장 실패: ${error.message}`)
        } else {
          newCount = inserted?.length ?? toInsert.length
        }
      }

      // AI 요약 생성 (순차 처리 - rate limit 고려)
      for (const item of toSummarize) {
        try {
          const summary = await summarizeDisclosure(item.reportNm, item.corpName)
          await supabase
            .from('dart_disclosures')
            .update({ ai_summary: summary })
            .eq('rcept_no', item.rceptNo)

          // Rate limit 방지를 위한 지연 (500ms)
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error(`AI 요약 실패 (${item.rceptNo}):`, error)
          errors.push(`AI 요약 실패: ${item.corpName}`)
        }
      }

      return NextResponse.json({
        success: true,
        synced: disclosures.length,
        saved: newCount,
        summarized: toSummarize.length,
        errors: errors.length > 0 ? errors : undefined
      })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
