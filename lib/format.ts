/**
 * FINSI 한국 금액 표기 유틸리티
 *
 * 올바른 표기: 4억 8,377만원
 * 잘못된 표기: ₩48377만
 */

export function formatKRW(amount: number): string {
  if (amount >= 100000000) {
    // 1억 이상
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man.toLocaleString('ko-KR')}만원` : `${eok}억원`;
  } else if (amount >= 10000) {
    // 1만 ~ 1억
    return `${Math.floor(amount / 10000).toLocaleString('ko-KR')}만원`;
  }
  // 1만 미만
  return `${amount.toLocaleString('ko-KR')}원`;
}

// 예시:
// formatKRW(483770000) → "4억 8,377만원"
// formatKRW(150000000) → "1억 5,000만원"
// formatKRW(50000000)  → "5,000만원"
// formatKRW(1500000)   → "150만원"
