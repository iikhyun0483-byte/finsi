"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";

export default function KnowledgePage() {
  const [selectedCategory, setSelectedCategory] = useState("전체");

  const glossary = [
    {
      term: "ETF (상장지수펀드)",
      korean: "상장지수펀드",
      eng: "Exchange Traded Fund",
      desc: "주식처럼 거래소에서 사고팔 수 있는 인덱스 펀드. SPY는 S&P 500 지수를 추종합니다.",
      category: "기초",
    },
    {
      term: "RSI (상대강도지수)",
      korean: "상대강도지수",
      eng: "Relative Strength Index",
      desc: "0-100 사이 값으로 과매수(70 이상)/과매도(30 이하)를 판단하는 지표입니다.",
      category: "기술",
    },
    {
      term: "MACD (이동평균 수렴·확산)",
      korean: "이동평균수렴확산",
      eng: "Moving Average Convergence Divergence",
      desc: "단기/장기 이동평균선의 차이로 매수/매도 타이밍을 포착합니다.",
      category: "기술",
    },
    {
      term: "볼린저밴드",
      korean: "가격 변동 범위 띠",
      eng: "Bollinger Bands",
      desc: "가격의 표준편차를 이용해 상단/하단 밴드를 그려 변동성을 측정합니다.",
      category: "기술",
    },
    {
      term: "골든크로스",
      korean: "황금 교차",
      eng: "Golden Cross",
      desc: "단기 이동평균선이 장기 이동평균선을 위로 돌파할 때 발생하는 강력한 매수 신호입니다.",
      category: "기술",
    },
    {
      term: "데드크로스",
      korean: "죽음의 교차",
      eng: "Dead Cross",
      desc: "단기 이동평균선이 장기 이동평균선을 아래로 이탈할 때 발생하는 매도 신호입니다.",
      category: "기술",
    },
    {
      term: "VIX (시장공포지수)",
      korean: "변동성 지수",
      eng: "Volatility Index",
      desc: "시장의 공포 정도를 나타냅니다. 높을수록 변동성이 크고 불안정합니다.",
      category: "매크로",
    },
    {
      term: "공포탐욕지수",
      korean: "시장 심리 지수",
      eng: "Fear & Greed Index",
      desc: "0-100 사이 값. 0에 가까울수록 극도의 공포(매수 기회), 100에 가까울수록 극도의 탐욕(위험)입니다.",
      category: "매크로",
    },
    {
      term: "버핏지수",
      korean: "시총/GDP 비율",
      eng: "Buffett Indicator",
      desc: "주식 시장 시가총액을 GDP로 나눈 값. 100% 이상이면 고평가, 이하면 저평가로 봅니다.",
      category: "매크로",
    },
    {
      term: "듀얼 모멘텀",
      korean: "이중 모멘텀",
      eng: "Dual Momentum",
      desc: "절대 모멘텀(수익률이 양수)과 상대 모멘텀(무위험자산 대비)을 동시에 확인하는 전략입니다.",
      category: "전략",
    },
    {
      term: "샤프지수",
      korean: "위험 대비 수익률",
      eng: "Sharpe Ratio",
      desc: "위험(변동성) 대비 초과 수익률을 측정. 1.0 이상이면 우수합니다.",
      category: "성과",
    },
    {
      term: "MDD (최대낙폭)",
      korean: "최대 낙폭",
      eng: "Maximum Drawdown",
      desc: "투자 기간 중 최고점 대비 최대 하락폭. 손실을 견딜 수 있는 정도를 판단합니다.",
      category: "성과",
    },
    {
      term: "CAGR (연평균복리수익률)",
      korean: "연평균 복리 수익률",
      eng: "Compound Annual Growth Rate",
      desc: "투자 기간 동안의 평균 연간 수익률. 복리 효과를 포함합니다.",
      category: "성과",
    },
    {
      term: "리밸런싱",
      korean: "자산 재조정",
      eng: "Rebalancing",
      desc: "목표 자산 배분 비율을 유지하기 위해 주기적으로 매도/매수하는 것입니다.",
      category: "전략",
    },
  ];

  const categories = ["전체", "기초", "기술", "매크로", "전략", "성과"];

  const filteredGlossary =
    selectedCategory === "전체"
      ? glossary
      : glossary.filter((item) => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <header className="border-b border-gray-800 bg-gradient-to-r from-[#0d1321] to-[#0f1e35]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="text-xs tracking-[4px] text-blue-400 mb-1">INVESTMENT GLOSSARY</div>
          <h1 className="text-2xl font-bold">📖 투자 용어 사전</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* 카테고리 필터 */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  selectedCategory === cat
                    ? "bg-blue-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 용어 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGlossary.map((item, i) => (
            <Card key={i}>
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xl font-bold mb-1">{item.term}</div>
                    <div className="text-sm text-gray-400 mb-1">{item.korean}</div>
                    <div className="text-xs text-gray-500">{item.eng}</div>
                  </div>
                  <Badge variant="info">{item.category}</Badge>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredGlossary.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <div className="text-4xl mb-4">📭</div>
            <div>해당 카테고리의 용어가 없습니다</div>
          </div>
        )}
      </main>
    </div>
  );
}
