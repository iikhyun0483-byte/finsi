"use client";

/**
 * FINSI Kelly Criterion 포지션 산출 결과 카드
 *
 * 권장 투자 비율, 손절가, 익절가, 손익비 표시
 */

import { formatUSD, formatKRW } from '@/lib/utils';
import type { KellyOutput } from '@/lib/kelly';

interface KellyCardProps {
  kellyOutput: KellyOutput;
  ticker: string;
  currentPrice: number;
  priceInKRW?: number; // 원화 환산 가격 (선택)
}

export function KellyCard({
  kellyOutput,
  ticker,
  currentPrice,
  priceInKRW,
}: KellyCardProps) {
  const {
    kellyFraction,
    safeAllocation,
    stopLoss,
    takeProfit,
    riskReward,
  } = kellyOutput;

  // 투자 비율 색상
  const getAllocationColor = (allocation: number): string => {
    if (allocation >= 0.15) return '#00FF41'; // 15% 이상: 초록
    if (allocation >= 0.08) return '#FFD700'; // 8~15%: 노랑
    if (allocation >= 0.03) return '#00FFD1'; // 3~8%: 청록
    return '#FF4466'; // 3% 미만: 빨강 (투자 부적합)
  };

  const allocationColor = getAllocationColor(safeAllocation);

  return (
    <div className="jarvis-card p-6 hover-glow-enhanced depth-3d">
      <div className="label-display mb-4 flex items-center justify-between">
        <span>Kelly Criterion 포지션 산출</span>
        <span className="text-xs text-[rgba(0,212,255,0.4)]">{ticker}</span>
      </div>

      {/* 권장 투자 비율 (핵심 지표) */}
      <div className="bg-[rgba(0,20,45,0.5)] border border-[rgba(0,212,255,0.15)] rounded-lg p-5 mb-4">
        <div className="text-xs text-gray-400 mb-2">권장 투자 비율 (Half-Kelly)</div>
        <div
          className="font-orbitron text-5xl font-bold mb-1"
          style={{
            color: allocationColor,
            textShadow: `0 0 20px ${allocationColor}`,
          }}
        >
          {(safeAllocation * 100).toFixed(1)}%
        </div>
        <div className="text-xs text-gray-500">
          전체 포트폴리오 대비 투자 권장 비율
        </div>
      </div>

      {/* 손절가 / 익절가 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
          <div className="text-xs text-red-400 mb-1">손절가 (Stop Loss)</div>
          <div className="font-orbitron text-lg font-bold text-red-500">
            {formatUSD(stopLoss)}
          </div>
          {priceInKRW && (
            <div className="text-xs text-gray-500 mt-1">
              {formatKRW(stopLoss * (priceInKRW / currentPrice))}
            </div>
          )}
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
          <div className="text-xs text-green-400 mb-1">익절가 (Take Profit)</div>
          <div className="font-orbitron text-lg font-bold text-green-500">
            {formatUSD(takeProfit)}
          </div>
          {priceInKRW && (
            <div className="text-xs text-gray-500 mt-1">
              {formatKRW(takeProfit * (priceInKRW / currentPrice))}
            </div>
          )}
        </div>
      </div>

      {/* 손익비 및 Pure Kelly */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[rgba(0,20,45,0.5)] border border-[rgba(0,212,255,0.1)] rounded p-3">
          <div className="text-xs text-gray-400 mb-1">손익비 (Risk/Reward)</div>
          <div className="font-orbitron text-xl font-bold text-[#00FFD1]">
            {riskReward.toFixed(2)}
          </div>
        </div>

        <div className="bg-[rgba(0,20,45,0.5)] border border-[rgba(0,212,255,0.1)] rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Pure Kelly</div>
          <div className="font-orbitron text-xl font-bold text-[#00AAFF]">
            {(kellyFraction * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Half-Kelly 설명 */}
      <div className="bg-[rgba(0,255,180,0.03)] border border-[rgba(0,255,180,0.08)] rounded p-3">
        <div className="flex items-start gap-2">
          <span className="text-[#00FFD1] flex-shrink-0">ℹ️</span>
          <div className="text-xs text-gray-400 leading-relaxed">
            <strong className="text-[#00FFD1]">Half-Kelly 전략:</strong> 순수 Kelly 비율의 50%를
            권장합니다. 풀 Kelly는 이론적 최적이나 실전에서 변동성이 크므로, Half-Kelly로
            안정성을 확보하면서 장기 성장을 추구합니다.
          </div>
        </div>
      </div>

      {/* 투자 부적합 경고 */}
      {safeAllocation < 0.03 && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <span>⚠️</span>
            <span>투자 비율 3% 미만 — 현재 신호로는 투자 부적합</span>
          </div>
        </div>
      )}
    </div>
  );
}
