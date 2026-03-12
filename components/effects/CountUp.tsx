"use client";

import { useEffect, useState, useRef } from "react";

interface CountUpProps {
  end: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}

export function CountUp({ end, duration = 1000, decimals = 0, suffix = "", className = "" }: CountUpProps) {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      const percentage = Math.min(progress / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - percentage, 3);
      const current = eased * end;

      setCount(current);

      if (percentage < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  return (
    <span className={className}>
      {count.toFixed(decimals).replace(/\.0+$/, "")}
      {suffix}
    </span>
  );
}
