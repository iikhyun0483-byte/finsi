"use client";

/**
 * FINSI 통합 신호 점수 시각화 컴포넌트
 *
 * 3레이어 점수 + 원형 게이지 + VIX 경고
 */

interface ScoreGaugeProps {
  score: number;           // 0~100 통합 점수
  signal: string;          // BUY, SELL, HOLD, CAUTION
  confidence: number;      // 신뢰도 0~100
  layer1: number;          // Layer1 기술분석 점수
  layer2: number;          // Layer2 매크로 점수
  layer3: number;          // Layer3 뉴스 점수
  vixPenalty: boolean;     // VIX 감쇠 적용 여부
}

export function ScoreGauge({
  score,
  signal,
  confidence,
  layer1,
  layer2,
  layer3,
  vixPenalty,
}: ScoreGaugeProps) {
  // 점수별 색상 결정
  const getScoreColor = (s: number): string => {
    if (s >= 70) return '#00FF41'; // 초록 (BUY)
    if (s >= 30) return '#00FFD1'; // 청록 (HOLD)
    return '#FF4466'; // 빨강 (SELL)
  };

  // 신호별 색상
  const getSignalColor = (): string => {
    if (signal === 'BUY') return '#00FF41';
    if (signal === 'SELL') return '#FF4466';
    if (signal === 'CAUTION') return '#FF8800'; // 주황
    return '#00FFD1'; // HOLD
  };

  const scoreColor = getScoreColor(score);
  const signalColor = getSignalColor();

  // 원형 게이지 계산
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="jarvis-card p-6 hover-glow-enhanced depth-3d">
      <div className="label-display mb-4 flex items-center justify-between">
        <span>통합 신호 점수</span>
        {vixPenalty && (
          <span className="text-xs text-orange-500 animate-pulse">⚠ VIX 감쇠</span>
        )}
      </div>

      {/* 원형 게이지 */}
      <div className="flex justify-center mb-6">
        <div className="relative" style={{ width: 180, height: 180 }}>
          <svg
            width={180}
            height={180}
            className="transform -rotate-90"
          >
            {/* 배경 원 */}
            <circle
              cx={90}
              cy={90}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={16}
            />
            {/* 진행 원 */}
            <circle
              cx={90}
              cy={90}
              r={radius}
              fill="none"
              stroke={scoreColor}
              strokeWidth={16}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 8px ${scoreColor})`,
                transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </svg>

          {/* 중앙 점수 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className="font-orbitron text-5xl font-bold"
              style={{
                color: scoreColor,
                textShadow: `0 0 20px ${scoreColor}`,
              }}
            >
              {score}
            </div>
            <div className="text-xs text-gray-400 mt-1">/ 100</div>
          </div>
        </div>
      </div>

      {/* 신호 및 신뢰도 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-[rgba(0,20,45,0.5)] border border-[rgba(0,212,255,0.1)] rounded p-3">
          <div className="text-xs text-gray-400 mb-1">신호</div>
          <div
            className={`font-orbitron text-xl font-bold ${
              signal === 'CAUTION' ? 'animate-pulse' : ''
            }`}
            style={{ color: signalColor }}
          >
            {signal}
          </div>
        </div>
        <div className="bg-[rgba(0,20,45,0.5)] border border-[rgba(0,212,255,0.1)] rounded p-3">
          <div className="text-xs text-gray-400 mb-1">신뢰도</div>
          <div
            className="font-orbitron text-xl font-bold"
            style={{
              color: confidence >= 70 ? '#00FF41' : confidence >= 50 ? '#FFD700' : '#FF4466',
            }}
          >
            {confidence}%
          </div>
        </div>
      </div>

      {/* 3개 레이어 바 */}
      <div className="space-y-3">
        <LayerBar label="Layer 1 · 기술분석" score={layer1} color="#00FF41" />
        <LayerBar label="Layer 2 · 매크로" score={layer2} color="#00FFD1" />
        <LayerBar label="Layer 3 · AI 뉴스" score={layer3} color="#00AAFF" />
      </div>

      {/* CAUTION 경고 */}
      {signal === 'CAUTION' && (
        <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded animate-pulse">
          <div className="flex items-center gap-2 text-orange-500 text-sm">
            <span className="text-lg">⚠️</span>
            <span>고위험 시장 상황 — 신중한 투자 필요</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 레이어 바 컴포넌트
 */
function LayerBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="font-orbitron text-sm font-bold" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="h-2 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, rgba(${hexToRgb(color)},0.3), ${color})`,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Hex to RGB 변환
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0,255,180';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
