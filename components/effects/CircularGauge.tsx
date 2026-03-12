"use client";

interface CircularGaugeProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function CircularGauge({
  value,
  size = 80,
  strokeWidth = 8,
  className = ""
}: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  // Color based on value
  const color =
    value >= 75
      ? "#00FF41"
      : value >= 55
      ? "#FFD700"
      : value >= 40
      ? "#FF8800"
      : "#FF4466";

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="rotate-gauge"
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle with gradient */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
            transition: "stroke-dashoffset 1s ease-out, stroke 0.3s ease"
          }}
        />
      </svg>
      {/* Center value */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          fontSize: size * 0.25,
          fontWeight: "bold",
          color
        }}
      >
        {value}
      </div>
    </div>
  );
}
