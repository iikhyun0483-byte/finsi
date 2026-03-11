"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gradient-to-r from-[#0d1321] to-[#0f1e35]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs tracking-[4px] text-blue-400 mb-1">QUANTITATIVE INVESTMENT SYSTEM</div>
              <h1 className="text-2xl font-bold">FINSI 퀀트 투자 자동화</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-2">📊 실시간 시장 지표</h2>
          <p className="text-sm text-gray-400">AI가 분석한 글로벌 시장 현황</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {loading ? (
            <div className="col-span-4 text-center py-10 text-gray-500">
              ⚙️ 시장 데이터 로딩 중...
            </div>
          ) : macro ? (
            [
              { label: "공포탐욕지수", eng: "Fear & Greed", value: Math.round(macro.fearGreed), color: "text-yellow-500" },
              { label: "VIX 변동성", eng: "Volatility Index", value: macro.vix.toFixed(1).replace(/\.0$/, ""), color: "text-green-500" },
              { label: "미국 기준금리", eng: "Fed Rate", value: macro.fedRate >= 0 ? `${macro.fedRate.toFixed(2).replace(/\.?0+$/, "")}%` : "API 키 미설정", color: macro.fedRate >= 0 ? "text-blue-500" : "text-gray-500" },
              { label: "버핏지수", eng: "Buffett Indicator", value: Math.round(macro.buffett), color: "text-orange-500" },
            ].map((stat, i) => (
              <div key={i} className="bg-[#0a1020] border border-gray-800 rounded-xl p-5">
                <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
                <div className="text-[10px] text-gray-600 mb-3">{stat.eng}</div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </div>
            ))
          ) : null}
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: "/signal", icon: "🎯", label: "오늘의 신호", desc: "Today's Signals" },
            { href: "/backtest", icon: "⚡", label: "백테스팅", desc: "Strategy Test" },
            { href: "/analyze", icon: "📊", label: "종목 분석", desc: "Asset Analysis" },
            { href: "/market", icon: "🌍", label: "시장 현황", desc: "Market Overview" },
            { href: "/portfolio", icon: "💼", label: "내 포트폴리오", desc: "My Portfolio" },
            { href: "/watchlist", icon: "⭐", label: "관심 종목", desc: "Watchlist" },
            { href: "/learn", icon: "📚", label: "투자 학습", desc: "Learn" },
            { href: "/plan", icon: "🗺️", label: "투자 계획", desc: "Investment Plan" },
            { href: "/knowledge", icon: "📖", label: "용어 사전", desc: "Glossary" },
            { href: "/auto-trade", icon: "🤖", label: "자동매매", desc: "Auto Trading" },
            { href: "/settings", icon: "⚙️", label: "설정", desc: "Settings" },
          ].map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="bg-[#0a1020] border border-gray-800 rounded-xl p-6 hover:border-blue-500 transition-all"
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="font-bold mb-1">{item.label}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </Link>
          ))}
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
