"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { SplitBuyCalc } from "@/components/beginner/SplitBuyCalc";
import { SellRules } from "@/components/beginner/SellRules";

export default function PlanPage() {
  const steps = [
    {
      icon: "📚",
      title: "1단계: 기초 학습",
      items: [
        "주식, ETF (상장지수펀드), 암호화폐 기본 개념 이해",
        "리스크와 수익률의 관계 파악",
        "분산 투자의 중요성 인지",
      ],
      duration: "1-2주",
    },
    {
      icon: "🎯",
      title: "2단계: 목표 설정",
      items: [
        "투자 목표 금액 설정 (예: 노후 자금 1억)",
        "투자 기간 결정 (예: 10년)",
        "월 투자 가능 금액 계산",
      ],
      duration: "1주",
    },
    {
      icon: "📊",
      title: "3단계: 전략 선택",
      items: [
        "본인의 리스크 성향 파악 (공격/중립/보수)",
        "투자 전략 선택 (장기보유, 골든크로스 등)",
        "자산 배분 비율 결정 (주식 60% + 채권 40% 등)",
      ],
      duration: "1-2주",
    },
    {
      icon: "💰",
      title: "4단계: 소액 시작",
      items: [
        "100만원 이하 소액으로 시작",
        "분할 매수 전략 사용",
        "실전 경험 쌓기",
      ],
      duration: "1-3개월",
    },
    {
      icon: "📈",
      title: "5단계: 모니터링",
      items: [
        "매주 포트폴리오 점검",
        "신호 점수 확인 (FINSI 활용)",
        "투자 일지 작성",
      ],
      duration: "지속",
    },
    {
      icon: "🔄",
      title: "6단계: 리밸런싱",
      items: [
        "분기별 자산 배분 재조정",
        "수익 종목 일부 매도",
        "저평가 자산 추가 매수",
      ],
      duration: "분기마다",
    },
  ];

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <header className="border-b border-gray-800 bg-gradient-to-r from-[#0d1321] to-[#0f1e35]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="text-xs tracking-[4px] text-blue-400 mb-1">INVESTMENT ROADMAP</div>
          <h1 className="text-2xl font-bold">🗺️ 투자 계획 로드맵</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* 인트로 */}
        <Card className="mb-8">
          <CardContent>
            <div className="text-center py-6">
              <div className="text-4xl mb-4">🎯</div>
              <h2 className="text-xl font-bold mb-2">초보자를 위한 6단계 투자 로드맵</h2>
              <p className="text-sm text-gray-400">
                처음 시작하는 분들을 위한 체계적인 투자 가이드
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 단계별 가이드 */}
        <div className="space-y-6 mb-8">
          {steps.map((step, i) => (
            <Card key={i}>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{step.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold">{step.title}</h3>
                      <div className="text-xs text-gray-500 bg-gray-800 rounded-full px-3 py-1">
                        {step.duration}
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {step.items.map((item, j) => (
                        <li key={j} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 실전 도구 */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">🛠️ 실전 계획 도구</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SplitBuyCalc />
            <SellRules />
          </div>
        </div>

        {/* 추천 자료 */}
        <Card>
          <CardHeader>
            <CardTitle>📖 추천 학습 자료</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                <div className="text-2xl">📘</div>
                <div>
                  <div className="font-semibold mb-1">주식 투자 무작정 따라하기</div>
                  <div className="text-xs text-gray-400">국내 주식 입문서</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                <div className="text-2xl">📗</div>
                <div>
                  <div className="font-semibold mb-1">현명한 투자자 (벤저민 그레이엄)</div>
                  <div className="text-xs text-gray-400">가치 투자의 바이블</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                <div className="text-2xl">📙</div>
                <div>
                  <div className="font-semibold mb-1">듀얼 모멘텀 투자 전략</div>
                  <div className="text-xs text-gray-400">게리 안토나치의 퀀트 전략</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
