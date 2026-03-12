"use client";

interface EnergyWaveProps {
  value: number; // 0-100, affects amplitude
  bars?: number;
  className?: string;
}

export function EnergyWave({ value, bars = 5, className = "" }: EnergyWaveProps) {
  // Calculate amplitude based on value (higher value = higher bars)
  const amplitude = (value / 100) * 100;

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
    <div className={`flex items-end gap-1 h-12 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => {
        // Create wave pattern with sine
        const height = amplitude * (0.3 + 0.7 * Math.sin((i / bars) * Math.PI));
        const delay = i * 0.1;

        return (
          <div
            key={i}
            className="flex-1 rounded-t will-change-transform"
            style={{
              backgroundColor: color,
              height: `${Math.max(height, 10)}%`,
              animation: `energy-wave 2s ease-in-out infinite`,
              animationDelay: `${delay}s`,
              boxShadow: `0 0 8px ${color}`,
              opacity: 0.8
            }}
          />
        );
      })}
    </div>
  );
}
