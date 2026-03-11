"use client";

import { getScoreColor, getScoreEmoji, getScoreAction } from "@/lib/utils";

interface ScoreMeterProps {
  score: number;
  label?: string;
}

export function ScoreMeter({ score, label = "투자 점수" }: ScoreMeterProps) {
  const emoji = getScoreEmoji(score);
  const action = getScoreAction(score);
  const color = getScoreColor(score);

  return (
    <div className="bg-[#0a1020] border border-gray-800 rounded-xl p-6">
      <div className="text-center">
        <div className="text-xs text-gray-400 mb-2">{label}</div>
        <div className="text-6xl mb-4">{emoji}</div>
        <div className={`text-5xl font-bold mb-2 ${color}`}>{score}점</div>
        <div className="text-sm text-gray-300 mb-4">{action}</div>

        {/* 점수 바 */}
        <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              score >= 75
                ? "bg-green-500"
                : score >= 55
                ? "bg-yellow-500"
                : score >= 40
                ? "bg-orange-500"
                : "bg-red-500"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* 구간 표시 */}
        <div className="grid grid-cols-4 gap-1 mt-3 text-[10px] text-gray-500">
          <div className={score < 40 ? "text-red-500 font-bold" : ""}>0-39 사지마세요</div>
          <div className={score >= 40 && score < 55 ? "text-orange-500 font-bold" : ""}>
            40-54 관망
          </div>
          <div className={score >= 55 && score < 75 ? "text-yellow-500 font-bold" : ""}>
            55-74 조금씩
          </div>
          <div className={score >= 75 ? "text-green-500 font-bold" : ""}>75-100 매수</div>
        </div>
      </div>
    </div>
  );
}
