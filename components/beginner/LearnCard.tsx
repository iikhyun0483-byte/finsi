"use client";

import { Card } from "@/components/common/Card";

interface LearnCardProps {
  icon: string;
  title: string;
  description: string;
  difficulty: "쉬움" | "보통" | "어려움";
}

export function LearnCard({ icon, title, description, difficulty }: LearnCardProps) {
  const difficultyColor =
    difficulty === "쉬움"
      ? "text-green-500 bg-green-500/10"
      : difficulty === "보통"
      ? "text-yellow-500 bg-yellow-500/10"
      : "text-red-500 bg-red-500/10";

  return (
    <Card className="hover:border-blue-500 cursor-pointer transition-all">
      <div className="flex items-start gap-4">
        <div className="text-4xl">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-bold">{title}</h3>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${difficultyColor}`}
            >
              {difficulty}
            </span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
        </div>
      </div>
    </Card>
  );
}
