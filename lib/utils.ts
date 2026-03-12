import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 숫자 포맷팅 (한국 원화) - 한국식 단위 표기
export const formatKRW = (amount: number): string => {
  if (amount >= 10000000000) {
    // 100억 이상: "125억원"
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);
    if (man >= 1000) {
      // 1000만원 이상이면 억 단위로 올림
      return `${eok + 1}억원`;
    }
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  } else if (amount >= 100000000) {
    // 1억~100억: "1억 2,500만원"
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  } else if (amount >= 10000) {
    // 1만~1억: "9,900만원"
    return `${Math.floor(amount / 10000).toLocaleString()}만원`;
  } else if (amount >= 0) {
    // 1만 미만: "9,500원"
    return `${amount.toLocaleString()}원`;
  } else {
    // 음수: "-125만원"
    return `-${formatKRW(Math.abs(amount))}`;
  }
};

// 숫자 포맷팅 (미국 달러)
export const formatUSD = (num: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// 달러 + 원화 병기
export const formatUSDWithKRW = (usd: number, exchangeRate: number): string => {
  const krw = usd * exchangeRate;
  return `${formatUSD(usd)} (${formatKRW(krw)})`;
};

// 퍼센트 포맷팅
export const formatPercent = (num: number, decimals: number = 2): string => {
  if (Math.abs(num) < 0.01) return "0%"; // 0.01% 미만은 0%로 표시
  const sign = num > 0 ? "+" : "";
  const formatted = num.toFixed(decimals).replace(/\.?0+$/, ""); // 불필요한 소수점 0 제거
  return `${sign}${formatted}%`;
};

// 점수에 따른 색상
export const getScoreColor = (score: number): string => {
  if (score >= 75) return "text-green-500";
  if (score >= 55) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
};

// 점수에 따른 배경색
export const getScoreBg = (score: number): string => {
  if (score >= 75) return "bg-green-500/10 border-green-500/30";
  if (score >= 55) return "bg-yellow-500/10 border-yellow-500/30";
  if (score >= 40) return "bg-orange-500/10 border-orange-500/30";
  return "bg-red-500/10 border-red-500/30";
};

// 점수에 따른 액션 메시지
export const getScoreAction = (score: number): string => {
  if (score >= 75) return "지금 사기 좋음";
  if (score >= 55) return "조금씩 사도 됨";
  if (score >= 40) return "관망";
  return "사지 마세요";
};

// 점수에 따른 이모지
export const getScoreEmoji = (score: number): string => {
  if (score >= 75) return "🟢";
  if (score >= 55) return "🟡";
  if (score >= 40) return "🟠";
  return "🔴";
};

// 숫자를 간단하게 표시 (1000 -> 1K)
export const formatCompact = (num: number): string => {
  const format = (n: number) => n.toFixed(1).replace(/\.0$/, ""); // .0 제거
  if (num >= 1_000_000_000) return `${format(num / 1_000_000_000)}B`;
  if (num >= 1_000_000) return `${format(num / 1_000_000)}M`;
  if (num >= 1_000) return `${format(num / 1_000)}K`;
  return Math.round(num).toString();
};
