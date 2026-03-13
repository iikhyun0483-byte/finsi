// lib/dart-client.ts
// DART 오픈API: https://opendart.fss.or.kr
// 무료, 일 10,000건

const DART_API_KEY = process.env.DART_API_KEY!
const DART_BASE    = 'https://opendart.fss.or.kr/api'

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
  const url = `${DART_BASE}/list.json?crtfc_key=${DART_API_KEY}&bgn_de=${startDate}&end_de=${endDate}&page_count=100`
  const res  = await fetch(url, { next: { revalidate: 300 } })
  const data = await res.json()
  if (data.status !== '000') return []
  return (data.list ?? []).map((d: Record<string, string>) => ({
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

// Gemini AI 요약 (3줄)
export async function summarizeDisclosure(title: string, corpName: string): Promise<string> {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + process.env.GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `주식 투자자 관점에서 다음 공시를 3줄로 요약해. 회사: ${corpName}, 공시: ${title}. 형식: 1.핵심내용 2.주가영향 3.투자자행동` }]
        }]
      })
    })
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '요약 실패'
  } catch {
    return '요약 불가'
  }
}
