"use client";

import { useEffect, useState, useCallback } from "react";
import { ScoreMeter } from "@/components/beginner/ScoreMeter";
import { RSIGauge } from "@/components/beginner/RSIGauge";
import { ActionCard } from "@/components/beginner/ActionCard";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { formatUSD, formatKRW } from "@/lib/utils";

interface Signal {
  symbol: string;
  name: string;
  assetType: string;
  score: number;
  action: string;
  price: number;
  price_krw: number;
  layer1Score: number;
  layer2Score: number;
  layer3Score: number;
  rsi: number;
  macd: number;
  highRisk?: boolean;
}

interface MacroIndicators {
  fearGreed: number;
  vix: number;
  fedRate: number;
  buffett: number;
}

export default function SignalPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [macro, setMacro] = useState<MacroIndicators | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string>("all");
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/signal");
      const data = await response.json();

      if (data.success) {
        setSignals(data.signals || []);
        setMacro(data.macroIndicators);
        console.log(`✅ 신호 업데이트 완료 (${new Date().toLocaleTimeString()})`);
      } else {
        setError("신호 데이터를 가져오는데 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to fetch signals:", error);
      setError("서버 연결에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 페이지 로드 시 자동으로 신호 불러오기
  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // 설정 불러오기
  useEffect(() => {
    const savedSettings = localStorage.getItem("finsi_settings");
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setAutoRefreshEnabled(settings.autoRefresh || false);
        setRefreshInterval(settings.refreshInterval || 5);
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
  }, []);

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const intervalMs = refreshInterval * 60 * 1000;
    console.log(`🔄 자동 새로고침 활성화 (${refreshInterval}분마다)`);

    const timer = setInterval(() => {
      console.log(`🔄 자동 새로고침 실행 중...`);
      fetchSignals();
    }, intervalMs);

    return () => {
      console.log("🔄 자동 새로고침 비활성화");
      clearInterval(timer);
    };
  }, [autoRefreshEnabled, refreshInterval, fetchSignals]);

  const filteredSignals =
    selectedAsset === "all"
      ? signals
      : signals.filter((s) => s.assetType === selectedAsset);

  const topSignal = filteredSignals[0];

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gradient-to-r from-[#0d1321] to-[#0f1e35]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs tracking-[4px] text-blue-400 mb-1">
                TODAY'S INVESTMENT SIGNALS
              </div>
              <h1 className="text-2xl font-bold">🎯 오늘의 투자 신호</h1>
            </div>
            <Button onClick={fetchSignals} disabled={loading}>
              {loading ? "⚙️ 분석 중..." : "🔄 새로고침"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <div className="text-lg text-gray-400">AI가 시장을 분석하는 중...</div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⚠️</div>
            <div className="text-lg text-red-400 mb-4">{error}</div>
            <Button onClick={fetchSignals}>🔄 다시 시도</Button>
          </div>
        ) : (
          <>
            {/* 최고 점수 신호 */}
            {topSignal && (
              <div className="mb-8">
                <h2 className="text-lg font-bold mb-4">⭐ 오늘의 베스트 신호</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ScoreMeter score={topSignal.score} label={topSignal.name} />
                  <RSIGauge rsi={topSignal.rsi} />
                  <div className="bg-[#0a1020] border border-gray-800 rounded-xl p-6">
                    <div className="text-xs text-gray-400 mb-4">레이어별 점수</div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Layer 1 (기술)</span>
                        <span className="text-lg font-bold text-blue-400">
                          {topSignal.layer1Score}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Layer 2 (팩터)</span>
                        <span className="text-lg font-bold text-green-400">
                          {topSignal.layer2Score}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Layer 3 (매크로)</span>
                        <span className="text-lg font-bold text-yellow-400">
                          {topSignal.layer3Score}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 매크로 지표 */}
            {macro && (
              <div className="mb-8">
                <h2 className="text-lg font-bold mb-4">🌍 시장 환경 지표</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: "공포탐욕지수",
                      eng: "Fear & Greed",
                      value: Math.round(macro.fearGreed),
                      suffix: "",
                    },
                    { label: "VIX 변동성", eng: "Volatility", value: macro.vix.toFixed(1).replace(/\.0$/, ""), suffix: "" },
                    {
                      label: "미국 기준금리",
                      eng: "Fed Rate",
                      value: macro.fedRate >= 0 ? macro.fedRate.toFixed(2).replace(/\.?0+$/, "") : "미설정",
                      suffix: macro.fedRate >= 0 ? "%" : "",
                    },
                    {
                      label: "버핏지수",
                      eng: "Buffett Indicator",
                      value: Math.round(macro.buffett),
                      suffix: "",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="bg-[#0a1020] border border-gray-800 rounded-xl p-5"
                    >
                      <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                      <div className="text-[10px] text-gray-600 mb-3">{item.eng}</div>
                      <div className="text-2xl font-bold text-white">
                        {item.value}
                        {item.suffix}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 자산 필터 */}
            <div className="mb-6">
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: "all", label: "전체", icon: "🌐" },
                  { key: "stock", label: "주식/ETF", icon: "📈" },
                  { key: "crypto", label: "암호화폐", icon: "₿" },
                  { key: "commodity", label: "원자재", icon: "🥇" },
                  { key: "bond", label: "채권", icon: "📜" },
                  { key: "reit", label: "리츠", icon: "🏢" },
                ].map((filter) => (
                  <Button
                    key={filter.key}
                    variant={selectedAsset === filter.key ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setSelectedAsset(filter.key)}
                  >
                    {filter.icon} {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 신호 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSignals.map((signal, i) => (
                <ActionCard
                  key={i}
                  symbol={signal.symbol}
                  name={signal.name}
                  price={signal.price}
                  priceKRW={signal.price_krw}
                  score={signal.score}
                  action={signal.action}
                  highRisk={signal.highRisk}
                />
              ))}
            </div>

            {filteredSignals.length === 0 && (
              <div className="text-center py-20 text-gray-500">
                해당 자산 타입의 신호가 없습니다.
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
