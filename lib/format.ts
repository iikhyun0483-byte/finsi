// lib/format.ts
// 핀시 전역 포맷 유틸리티 — 절대 수정 금지

export function formatKRW(amount: number): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (abs >= 1_000_000_000_000) {
    const jo = Math.floor(abs / 1_000_000_000_000)
    const eok = Math.floor((abs % 1_000_000_000_000) / 100_000_000)
    return `${sign}${jo}조 ${eok > 0 ? eok.toLocaleString() + '억원' : '원'}`
  }
  if (abs >= 100_000_000) {
    const eok = Math.floor(abs / 100_000_000)
    const man = Math.floor((abs % 100_000_000) / 10_000)
    return `${sign}${eok}억 ${man > 0 ? man.toLocaleString() + '만원' : '원'}`
  }
  if (abs >= 10_000) {
    const man = Math.floor(abs / 10_000)
    return `${sign}${man.toLocaleString()}만원`
  }
  return `${sign}${abs.toLocaleString()}원`
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPct(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`
}

export function formatPctRaw(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`
}

export function formatNumber(value: number, digits = 2): string {
  return value.toLocaleString('ko-KR', { maximumFractionDigits: digits })
}
