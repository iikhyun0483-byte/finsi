"use client";

import { useEffect, useState } from "react";

interface TypingEffectProps {
  text: string;
  speed?: number; // milliseconds per character
  className?: string;
}

export function TypingEffect({ text, speed = 30, className = "" }: TypingEffectProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText("");
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed]);

  return (
    <span className={className}>
      {displayedText}
      {currentIndex < text.length && (
        <span className="typing-cursor inline-block ml-1">|</span>
      )}
    </span>
  );
}
