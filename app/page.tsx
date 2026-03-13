"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, TrendingUp, Zap, BarChart3, Globe, Briefcase, Star, BookOpen, Map, Settings, Bot, Book, FileText, AlertTriangle } from "lucide-react";
import { getIndicatorLabel } from "@/lib/design-system";
import { ParticleBackground } from "@/components/effects/ParticleBackground";
import { CountUp } from "@/components/effects/CountUp";

export default function Home() {
  const [macro, setMacro] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMacro(data.macroIndicators);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#000810] text-white relative">
      {/* Particle Background */}
      <ParticleBackground />

      {/* Starfield Background */}
      <div className="stars-layer stars-small" />
      <div className="stars-layer stars-medium" />
      <div className="stars-layer stars-large" />

      {/* Header */}
      <header className="border-b border-[rgba(0,212,255,0.12)] bg-[rgba(0,20,45,0.3)] backdrop-blur-xl relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-[#00d4ff]" />
            <div>
              <div className="font-mono text-xs tracking-[3px] text-[rgba(0,212,255,0.7)] mb-1">
                J.A.R.V.I.S QUANTITATIVE INVESTMENT SYSTEM
              </div>
              <h1 className="font-orbitron text-2xl font-bold text-[#00d4ff] tracking-wide">
                FINSI 퀀트 투자 자동화
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="mx-auto max-w-7xl px-6 py-8 relative z-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-6 h-6 text-[#00d4ff]" />
            <h2 className="font-orbitron text-xl font-bold text-[#00d4ff]">MARKET INDICATORS</h2>
          </div>
          <p className="font-mono text-sm text-[rgba(255,255,255,0.5)] tracking-wide">
            REAL-TIME GLOBAL MARKET ANALYSIS
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {loading ? (
            <div className="col-span-4 text-center py-10">
              <Activity className="w-12 h-12 text-[#00d4ff] mx-auto mb-4 animate-pulse" />
              <div className="font-mono text-sm text-[rgba(0,212,255,0.7)] tracking-wide">
                LOADING MARKET DATA...
              </div>
            </div>
          ) : macro ? (
            [
              { label: getIndicatorLabel("Fear & Greed"), value: Math.round(macro.fearGreed), color: "status-warning" },
              { label: getIndicatorLabel("VIX"), value: macro.vix.toFixed(1).replace(/\.0$/, ""), color: "status-profit" },
              { label: "미국 기준금리 (Fed Rate)", value: macro.fedRate >= 0 ? `${macro.fedRate.toFixed(2).replace(/\.?0+$/, "")}%` : "N/A", color: macro.fedRate >= 0 ? "status-cyan" : "text-[rgba(255,255,255,0.3)]" },
              { label: getIndicatorLabel("Buffett Indicator"), value: Math.round(macro.buffett), color: "status-warning" },
            ].map((stat, i) => (
              <div key={i} className={`jarvis-card p-5 card-fade-in depth-3d stagger-${(i % 4) + 1}`}>
                <div className="label-display mb-3">{stat.label}</div>
                <div className={`number-display text-3xl ${stat.color} number-glow`}>
                  {typeof stat.value === 'number' ? (
                    <CountUp end={stat.value} duration={1500} decimals={0} />
                  ) : typeof stat.value === 'string' && !stat.value.includes('N/A') && !stat.value.includes('%') ? (
                    <CountUp end={parseFloat(stat.value)} duration={1500} decimals={1} />
                  ) : (
                    stat.value
                  )}
                </div>
              </div>
            ))
          ) : null}
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: "/signal", icon: TrendingUp, label: "오늘의 신호", desc: "Today's Signals" },
            { href: "/backtest", icon: Zap, label: "백테스팅", desc: "Strategy Test" },
            { href: "/analyze", icon: BarChart3, label: "종목 분석", desc: "Asset Analysis" },
            { href: "/factors", icon: BarChart3, label: "🔬 팩터 스크리너", desc: "Factor Screener" },
            { href: "/stat-arb", icon: TrendingUp, label: "⚡ 차익거래", desc: "Stat Arbitrage" },
            { href: "/risk-control", icon: AlertTriangle, label: "🛡️ 리스크 제어", desc: "Risk Control" },
            { href: "/trade-calc", icon: BarChart3, label: "🧮 행동 계산기", desc: "Trade Calculator" },
            { href: "/market", icon: Globe, label: "시장 현황", desc: "Market Overview" },
            { href: "/portfolio", icon: Briefcase, label: "내 포트폴리오", desc: "My Portfolio" },
            { href: "/assets", icon: Briefcase, label: "자산 관리", desc: "Asset Management" },
            { href: "/watchlist", icon: Star, label: "관심 종목", desc: "Watchlist" },
            { href: "/journal", icon: FileText, label: "투자 일지", desc: "Trade Journal" },
            { href: "/my-patterns", icon: BarChart3, label: "📊 내 패턴", desc: "My Patterns" },
            { href: "/learn", icon: BookOpen, label: "투자 학습", desc: "Learn" },
            { href: "/plan", icon: Map, label: "투자 계획", desc: "Investment Plan" },
            { href: "/lifecycle", icon: FileText, label: "🧬 인생설계", desc: "Life Planning" },
            { href: "/finance", icon: FileText, label: "💰 재무계산기", desc: "Finance Calculator" },
            { href: "/compare", icon: BarChart3, label: "⚖️ A vs B 비교", desc: "Compare Scenarios" },
            { href: "/cashflow", icon: AlertTriangle, label: "🔴 재무 생존", desc: "Survival Analysis" },
            { href: "/knowledge", icon: Book, label: "용어 사전", desc: "Glossary" },
            { href: "/auto-trade", icon: Bot, label: "자동매매", desc: "Auto Trading" },
            { href: "/settings", icon: Settings, label: "설정", desc: "Settings" },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
            <Link
              key={i}
              href={item.href}
              className={`jarvis-card p-6 hover:border-[rgba(0,212,255,0.4)] transition-all group hover-glow-enhanced card-fade-in depth-3d stagger-${(i % 4) + 1}`}
            >
              <Icon className="w-8 h-8 mb-3 text-[#00d4ff] group-hover:scale-110 transition-transform" />
              <div className="font-orbitron font-bold text-white mb-1">{item.label}</div>
              <div className="font-mono text-xs text-[rgba(0,212,255,0.5)] tracking-wide uppercase">{item.desc}</div>
            </Link>
          );
          })}
        </div>

        {/* Status */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-500">시스템 정상 작동 중</span>
          </div>
        </div>
      </main>
    </div>
  );
}
