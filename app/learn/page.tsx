"use client";

import { LearnCard } from "@/components/beginner/LearnCard";
import { SplitBuyCalc } from "@/components/beginner/SplitBuyCalc";
import { SellRules } from "@/components/beginner/SellRules";
import { PnLCalc } from "@/components/beginner/PnLCalc";

export default function LearnPage() {
  const basicLessons = [
    {
      icon: "📊",
      title: "주식이란 무엇인가?",
      description: "회사의 소유권 일부를 나타내는 증서. 주가가 오르면 수익, 내리면 손실이 발생합니다.",
      difficulty: "쉬움" as const,
    },
    {
      icon: "💰",
      title: "ETF란?",
      description: "여러 주식을 묶어놓은 상품. SPY(S&P500)는 미국 대표 500개 기업에 분산 투자하는 것과 같습니다.",
      difficulty: "쉬움" as const,
    },
    {
      icon: "📈",
      title: "장기 투자 vs 단기 투자",
      description: "장기 투자는 10년 이상 보유하며 복리 효과를 누림. 단기 투자는 빠른 수익을 추구하지만 위험도 높습니다.",
      difficulty: "쉬움" as const,
    },
    {
      icon: "🎯",
      title: "분산 투자의 중요성",
      description: "한 종목에 몰빵하지 말고 여러 자산(주식, 채권, 금 등)에 나눠 투자해 리스크를 줄입니다.",
      difficulty: "쉬움" as const,
    },
  ];

  const technicalLessons = [
    {
      icon: "📉",
      title: "RSI (상대강도지수)",
      description: "0~100 사이 값. 30 이하면 과매도(싸다), 70 이상이면 과매수(비싸다)를 의미합니다.",
      difficulty: "보통" as const,
    },
    {
      icon: "⚡",
      title: "MACD (이동평균수렴확산)",
      description: "단기/장기 이동평균선의 차이. MACD선이 시그널선 위로 가면 매수 신호입니다.",
      difficulty: "보통" as const,
    },
    {
      icon: "🎯",
      title: "볼린저밴드",
      description: "가격 변동 범위를 나타내는 띠. 하단 밴드 터치 시 반등 가능성이 높습니다.",
      difficulty: "보통" as const,
    },
    {
      icon: "📈",
      title: "골든크로스 / 데드크로스",
      description: "단기 이평선이 장기 이평선을 위로 돌파하면 골든크로스(상승), 아래로 이탈하면 데드크로스(하락)입니다.",
      difficulty: "보통" as const,
    },
  ];

  const advancedLessons = [
    {
      icon: "🚀",
      title: "듀얼 모멘텀 전략",
      description: "12개월 수익률이 양수이고 무위험자산보다 높을 때만 보유하는 전략. 게리 안토나치가 개발.",
      difficulty: "어려움" as const,
    },
    {
      icon: "💎",
      title: "가치 투자 vs 성장 투자",
      description: "가치 투자는 저평가된 기업 발굴. 성장 투자는 빠르게 성장하는 기업에 투자합니다.",
      difficulty: "어려움" as const,
    },
    {
      icon: "📊",
      title: "팩터 투자",
      description: "모멘텀, 가치, 퀄리티, 저변동성 등 특정 요인에 기반한 투자 전략입니다.",
      difficulty: "어려움" as const,
    },
    {
      icon: "🌍",
      title: "매크로 경제 이해하기",
      description: "금리, VIX, 공포탐욕지수 등 거시경제 지표가 주가에 미치는 영향을 파악합니다.",
      difficulty: "어려움" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <header className="border-b border-gray-800 bg-gradient-to-r from-[#0d1321] to-[#0f1e35]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="text-xs tracking-[4px] text-blue-400 mb-1">INVESTMENT EDUCATION</div>
          <h1 className="text-2xl font-bold">📚 투자 학습</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* 기초 개념 */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">🌱 기초 개념 (초보자 필수)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {basicLessons.map((lesson, i) => (
              <LearnCard key={i} {...lesson} />
            ))}
          </div>
        </div>

        {/* 기술적 지표 */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">📈 기술적 지표</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {technicalLessons.map((lesson, i) => (
              <LearnCard key={i} {...lesson} />
            ))}
          </div>
        </div>

        {/* 고급 전략 */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">🎓 고급 전략</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {advancedLessons.map((lesson, i) => (
              <LearnCard key={i} {...lesson} />
            ))}
          </div>
        </div>

        {/* 실전 도구 */}
        <div>
          <h2 className="text-lg font-bold mb-4">🛠️ 실전 계산 도구</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SplitBuyCalc />
            <SellRules />
            <PnLCalc />
          </div>
        </div>
      </main>
    </div>
  );
}
