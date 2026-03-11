"use client";

import { Badge } from "@/components/common/Badge";
import { formatUSD, formatKRW } from "@/lib/utils";

interface ActionCardProps {
  symbol: string;
  name: string;
  price: number;
  priceKRW: number;
  score: number;
  action: string;
  highRisk?: boolean;
}

export function ActionCard({
  symbol,
  name,
  price,
  priceKRW,
  score,
  action,
  highRisk,
}: ActionCardProps) {
  const emoji =
    score >= 75 ? "🟢" : score >= 55 ? "🟡" : score >= 40 ? "🟠" : "🔴";

  return (
    <div className="bg-[#0a1020] border border-gray-800 rounded-xl p-5 hover:border-blue-500 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold">{symbol}</span>
            {highRisk && <Badge variant="danger">HIGH RISK</Badge>}
          </div>
          <div className="text-xs text-gray-400">{name}</div>
        </div>
        <div className="text-2xl">{emoji}</div>
      </div>

      <div className="mb-3">
        <div className="text-xl font-bold text-white mb-1">
          {formatUSD(price)}
        </div>
        <div className="text-sm text-gray-400">{formatKRW(priceKRW)}</div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 mb-1">신호 점수</div>
          <div
            className={`text-2xl font-bold ${
              score >= 75
                ? "text-green-500"
                : score >= 55
                ? "text-yellow-500"
                : score >= 40
                ? "text-orange-500"
                : "text-red-500"
            }`}
          >
            {score}점
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">액션</div>
          <div className="text-sm font-bold text-blue-400">{action}</div>
        </div>
      </div>
    </div>
  );
}
