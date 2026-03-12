"use client";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  data,
  width = 60,
  height = 20,
  className = ""
}: SparklineProps) {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  const isPositive = data[data.length - 1] >= data[0];

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? "#00FF41" : "#FF4466"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: `drop-shadow(0 0 2px ${isPositive ? "#00FF41" : "#FF4466"})`
        }}
      />
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="2"
        fill={isPositive ? "#00FF41" : "#FF4466"}
        style={{
          filter: `drop-shadow(0 0 3px ${isPositive ? "#00FF41" : "#FF4466"})`
        }}
      />
    </svg>
  );
}
