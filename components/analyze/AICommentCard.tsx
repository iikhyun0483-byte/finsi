import { Activity } from "lucide-react";
import { TypingEffect } from "@/components/effects/TypingEffect";

interface AICommentCardProps {
  loading: boolean;
  comment: string | null;
}

export function AICommentCard({ loading, comment }: AICommentCardProps) {
  return (
    <div className="mt-6 jarvis-card p-5">
      <div className="label-display mb-3 flex items-center gap-2">
        <span className="text-[#00FFD1]">🤖</span>
        AI 투자 코멘트 (Gemini)
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <Activity className="w-4 h-4 animate-spin" />
          <span className="font-mono text-sm">AI 분석 중...</span>
        </div>
      ) : comment ? (
        <div className="font-noto text-sm leading-relaxed text-gray-300 bg-[rgba(0,255,180,0.05)] border border-[rgba(0,255,180,0.1)] rounded p-4">
          <TypingEffect text={comment} speed={20} />
        </div>
      ) : (
        <div className="font-mono text-sm text-gray-500">
          AI 코멘트를 생성하려면 Gemini API 키를 설정하세요.
        </div>
      )}
    </div>
  );
}
