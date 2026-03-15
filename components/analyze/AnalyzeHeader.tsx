import { Activity } from "lucide-react";

export function AnalyzeHeader() {
  return (
    <header className="border-b border-[rgba(0,212,255,0.12)] bg-[rgba(0,20,45,0.3)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 py-5">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-[#00d4ff]" />
          <div>
            <div className="font-mono text-xs tracking-[3px] text-[rgba(0,212,255,0.7)] mb-1">
              J.A.R.V.I.S ASSET ANALYZER
            </div>
            <h1 className="font-orbitron text-2xl font-bold text-[#00d4ff] tracking-wide">
              종목 분석 시스템
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}
