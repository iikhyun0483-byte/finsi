// lib/time-utils.ts
// 시간 단위 변환 유틸 — 전체 앱에서 공통 사용

export type TimeUnit = 'hour' | 'day' | 'week' | 'month' | 'year'

export interface TimeRange {
  value: number
  unit: TimeUnit
  targetDate?: string // ISO 날짜 — 입력 시 value/unit 대신 사용
}

// 어떤 단위든 일(day)로 변환
export function toDays(range: TimeRange): number {
  if (range.targetDate) {
    const diff = new Date(range.targetDate).getTime() - Date.now()
    return Math.max(0, diff / (1000 * 60 * 60 * 24))
  }
  const map: Record<TimeUnit, number> = {
    hour:  1 / 24,
    day:   1,
    week:  7,
    month: 365.25 / 12,
    year:  365.25,
  }
  return range.value * map[range.unit]
}

export function toYears(days: number): number { return days / 365.25 }
export function toMonths(days: number): number { return days / (365.25 / 12) }
export function toTradingDays(days: number): number { return days * (252 / 365.25) }

// 사용자 입력 문자열 파싱
// "3일" "18개월" "2주" "1년" "2026-12-31" 전부 처리
export function parseTimeInput(input: string): TimeRange {
  const trimmed = input.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { value: 0, unit: 'day', targetDate: trimmed }
  }
  const num = parseFloat(trimmed.replace(/[^0-9.]/g, ''))
  if (isNaN(num)) return { value: 1, unit: 'year' }
  if (trimmed.includes('시간')) return { value: num, unit: 'hour' }
  if (trimmed.includes('주')) return { value: num, unit: 'week' }
  if (trimmed.includes('개월') || trimmed.includes('달') || trimmed.includes('월')) return { value: num, unit: 'month' }
  if (trimmed.includes('년') || trimmed.includes('year')) return { value: num, unit: 'year' }
  if (trimmed.includes('일')) return { value: num, unit: 'day' }
  return { value: num, unit: 'day' }
}

// 남은 시간을 사람이 읽기 쉬운 형태로
export function formatTimeRemaining(days: number): string {
  if (days < 1) return `${Math.round(days * 24)}시간`
  if (days < 7) return `${Math.round(days)}일`
  if (days < 30) return `${Math.round(days / 7)}주`
  if (days < 365) return `${Math.round(toMonths(days))}개월`
  return `${(days / 365.25).toFixed(1)}년`
}

// 두 날짜 사이 일수
export function daysBetween(from: string | Date, to: string | Date): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)
}

// 오늘부터 n일 후 날짜
export function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + Math.round(days))
  return d.toISOString().split('T')[0]
}
