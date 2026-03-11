"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";

export function SellRules() {
  const rules = [
    {
      icon: "🎯",
      title: "목표 수익률 달성",
      desc: "10~20% 수익 달성 시 일부 매도",
      color: "text-green-500",
    },
    {
      icon: "🛡️",
      title: "손절 라인",
      desc: "매수가 대비 -7% 손실 시 손절",
      color: "text-red-500",
    },
    {
      icon: "⚠️",
      title: "악재 발생",
      desc: "실적 부진, 규제 이슈 등 악재 시",
      color: "text-orange-500",
    },
    {
      icon: "📉",
      title: "기술적 신호",
      desc: "데드크로스, RSI 70 이상 과매수",
      color: "text-yellow-500",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>📋 매도 타이밍 체크리스트</CardTitle>
        <p className="text-xs text-gray-400 mt-1">Sell Signal Checklist</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rules.map((rule, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-gray-900 rounded-lg p-3"
            >
              <div className="text-2xl">{rule.icon}</div>
              <div className="flex-1">
                <div className={`text-sm font-bold ${rule.color} mb-1`}>
                  {rule.title}
                </div>
                <div className="text-xs text-gray-400">{rule.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <div className="text-xs text-blue-400">
            💡 <span className="font-bold">원칙 지키기:</span> 감정에 흔들리지 말고
            정해진 룰을 따르세요!
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
