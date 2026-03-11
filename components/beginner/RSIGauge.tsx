"use client";

interface RSIGaugeProps {
  rsi: number;
}

export function RSIGauge({ rsi }: RSIGaugeProps) {
  const getZone = () => {
    if (rsi < 30) return { label: "과매도", desc: "매수 타이밍", color: "text-green-500" };
    if (rsi < 40) return { label: "저평가", desc: "관심 영역", color: "text-blue-500" };
    if (rsi < 60) return { label: "중립", desc: "관망", color: "text-gray-400" };
    if (rsi < 70) return { label: "고평가", desc: "주의", color: "text-orange-500" };
    return { label: "과매수", desc: "매도 고려", color: "text-red-500" };
  };

  const zone = getZone();

  return (
    <div className="bg-[#0a1020] border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">RSI (상대강도지수)</div>
          <div className="text-[10px] text-gray-600">Relative Strength Index</div>
        </div>
        <div className={`text-3xl font-bold ${zone.color}`}>{rsi.toFixed(1).replace(/\.0$/, "")}</div>
      </div>

      {/* RSI 게이지 */}
      <div className="relative h-2 bg-gray-800 rounded-full mb-2">
        <div
          className="absolute top-0 h-full w-1 bg-white rounded-full transition-all"
          style={{ left: `${rsi}%` }}
        />
        <div className="absolute top-0 left-0 w-[30%] h-full bg-green-500/30" />
        <div className="absolute top-0 left-[70%] w-[30%] h-full bg-red-500/30" />
      </div>

      <div className="flex justify-between text-[9px] text-gray-600 mb-3">
        <span>0 (과매도)</span>
        <span>30</span>
        <span>50</span>
        <span>70</span>
        <span>100 (과매수)</span>
      </div>

      <div className="text-center">
        <div className={`text-sm font-bold ${zone.color}`}>{zone.label}</div>
        <div className="text-xs text-gray-400">{zone.desc}</div>
      </div>
    </div>
  );
}
