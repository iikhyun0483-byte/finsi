"use client";

import { Badge } from "@/components/common/Badge";
import { formatUSD, formatKRW } from "@/lib/utils";
import { CircularGauge } from "@/components/effects/CircularGauge";
import { EnergyWave } from "@/components/effects/EnergyWave";
import { CountUp } from "@/components/effects/CountUp";

interface ActionCardProps {
  symbol: string;
  name: string;
  price: number;
  priceKRW: number;
  score: number;
  action: string;
  highRisk?: boolean;
  goldenCross?: boolean;
  deadCross?: boolean;
  volumeSpike?: boolean;
  week52High?: boolean;
  week52Low?: boolean;
  bollingerRSI?: 'oversold' | 'overbought' | 'neutral';
}

export function ActionCard({
  symbol,
  name,
  price,
  priceKRW,
  score,
  action,
  highRisk,
  goldenCross,
  deadCross,
  volumeSpike,
  week52High,
  week52Low,
  bollingerRSI,
}: ActionCardProps) {
  const emoji =
    score >= 75 ? "🟢" : score >= 55 ? "🟡" : score >= 40 ? "🟠" : "🔴";

  return (
    <div className="bg-[#0a1020] border border-gray-800 rounded-xl p-5 hover-glow-enhanced transition-all card-fade-in depth-3d will-change-transform">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-lg font-bold">{symbol}</span>
            {highRisk && <Badge variant="danger">HIGH RISK</Badge>}
            {goldenCross && <Badge variant="success">골든크로스</Badge>}
            {deadCross && <Badge variant="danger">데드크로스</Badge>}
            {volumeSpike && <Badge variant="warning">거래량급증</Badge>}
            {week52High && <Badge variant="success">52주신고가</Badge>}
            {week52Low && <Badge variant="info">52주신저가</Badge>}
            {bollingerRSI === 'oversold' && <Badge variant="success">BB+RSI 과매도</Badge>}
            {bollingerRSI === 'overbought' && <Badge variant="danger">BB+RSI 과매수</Badge>}
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

      {/* Energy Wave Bars */}
      <div className="mb-4">
        <EnergyWave value={score} bars={7} />
      </div>

      {/* Score Gauge and Action */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CircularGauge value={score} size={60} strokeWidth={6} />
          <div>
            <div className="text-xs text-gray-500 mb-1">신호 점수</div>
            <div
              className={`text-2xl font-bold number-glow ${
                score >= 75
                  ? "text-green-500"
                  : score >= 55
                  ? "text-yellow-500"
                  : score >= 40
                  ? "text-orange-500"
                  : "text-red-500"
              }`}
            >
              <CountUp end={score} duration={1500} decimals={0} />점
            </div>
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
