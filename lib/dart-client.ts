// lib/dart-client.ts
// DART 오픈API: https://opendart.fss.or.kr
// 무료, 일 10,000건

const DART_API_KEY = process.env.DART_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const DART_BASE    = 'https://opendart.fss.or.kr/api'

// 중요도 임계값 상수
export const IMPORTANCE_THRESHOLDS = {
  MIN_SAVE: 5,    // 저장 최소 중요도
  MIN_AI: 7,      // AI 요약 최소 중요도
  FILTERS: [5, 7, 9] as const,  // UI 필터 옵션
}

// 환경변수 검증
export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = []
  if (!DART_API_KEY) missing.push('DART_API_KEY')
  if (!GEMINI_API_KEY) missing.push('GEMINI_API_KEY')
  return { valid: missing.length === 0, missing }
}

export interface DartDisclosure {
  rceptNo:     string
  corpName:    string
  stockCode:   string | null
  reportNm:    string
  rceptDt:     string
  rmk:         string
}

// 최신 공시 목록 조회 (최대 100건)
export async function fetchRecentDisclosures(
  startDate: string,  // YYYYMMDD
  endDate:   string
): Promise<DartDisclosure[]> {
  if (!DART_API_KEY) {
    throw new Error('DART_API_KEY 환경변수가 설정되지 않았습니다. .env.local에 추가하세요.')
  }

  const url = `${DART_BASE}/list.json?crtfc_key=${DART_API_KEY}&bgn_de=${startDate}&end_de=${endDate}&page_count=100`

  console.log(`[DART Client] Fetching from: ${DART_BASE}/list.json`)
  console.log(`[DART Client] Date range: ${startDate} ~ ${endDate}`)

  const res  = await fetch(url, { next: { revalidate: 300 } })

  if (!res.ok) {
    console.error(`[DART Client] HTTP error: ${res.status} ${res.statusText}`)
    throw new Error(`DART API 오류: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()

  console.log(`[DART Client] API response status: ${data.status}`)
  console.log(`[DART Client] API response message: ${data.message || 'none'}`)

  if (data.status !== '000') {
    const errorMsg = data.message || `DART API 상태 코드: ${data.status}`
    console.error(`[DART Client] API error: ${errorMsg}`)
    throw new Error(errorMsg)
  }

  if (!data.list || data.list.length === 0) {
    console.log('[DART Client] No disclosures found')
    return []
  }

  console.log(`[DART Client] Found ${data.list.length} disclosures`)

  return data.list.map((d: Record<string, string>) => ({
    rceptNo:   d.rcept_no,
    corpName:  d.corp_name,
    stockCode: d.stock_code || null,
    reportNm:  d.report_nm,
    rceptDt:   d.rcept_dt,
    rmk:       d.rmk ?? '',
  }))
}

// 공시 중요도 계산
// 종류별 기본 점수 + 금액 규모 보정
export function calcImportance(reportNm: string, rmk: string): number {
  const title = reportNm.toLowerCase()
  let score = 0

  // 고중요도 (8~10)
  if (title.includes('단일판매') || title.includes('공급계약')) score = 8
  if (title.includes('유상증자'))    score = 9
  if (title.includes('자기주식취득')) score = 8
  if (title.includes('잠정실적'))    score = 9
  if (title.includes('최대주주변경')) score = 10
  if (title.includes('합병'))        score = 10
  if (title.includes('소송'))        score = 7

  // 중중요도 (5~7)
  if (title.includes('임원'))        score = Math.max(score, 6)
  if (title.includes('배당'))        score = Math.max(score, 5)
  if (title.includes('전환사채'))    score = Math.max(score, 7)

  // 저중요도
  if (score === 0) score = 3

  // 금액 언급 시 +1
  if (rmk && (rmk.includes('억') || rmk.includes('조'))) score = Math.min(score + 1, 10)

  return score
}

// AI 요약 프롬프트 상수
const AI_SUMMARY_PROMPT = (corpName: string, title: string) =>
  `주식 투자자 관점에서 다음 공시를 3줄로 요약해. 회사: ${corpName}, 공시: ${title}. 형식: 1.핵심내용 2.주가영향 3.투자자행동`

// Gemini AI 요약 (3줄)
export async function summarizeDisclosure(title: string, corpName: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY 환경변수가 설정되지 않았습니다. AI 요약을 건너뜁니다.')
    return '(AI 요약 사용 불가 - API 키 미설정)'
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: AI_SUMMARY_PROMPT(corpName, title) }]
          }]
        })
      }
    )

    if (!res.ok) {
      console.error(`Gemini API 오류: ${res.status} ${res.statusText}`)
      return '(AI 요약 실패 - API 오류)'
    }

    const data = await res.json()
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!summary) {
      console.warn('Gemini API 응답에 요약 텍스트가 없습니다:', data)
      return '(AI 요약 실패 - 응답 없음)'
    }

    return summary.trim()
  } catch (error) {
    console.error('AI 요약 중 예외 발생:', error)
    return '(AI 요약 불가 - 오류 발생)'
  }
}
