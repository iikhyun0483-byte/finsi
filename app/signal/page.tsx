"use client";

import { useEffect, useState, useCallback } from "react";
import { ScoreMeter } from "@/components/beginner/ScoreMeter";
import { RSIGauge } from "@/components/beginner/RSIGauge";
import { ActionCard } from "@/components/beginner/ActionCard";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { formatUSD, formatKRW } from "@/lib/utils";
import { Activity, RefreshCw, TrendingUp, Globe, AlertCircle } from "lucide-react";
import { getAssetDisplayName, getIndicatorLabel } from "@/lib/design-system";
import { ParticleBackground } from "@/components/effects/ParticleBackground";
import { CountUp } from "@/components/effects/CountUp";
import { calcIntegratedScore } from "@/lib/score-engine";
import { applyVixFilter } from "@/lib/vix-filter";
import { ScoreGauge } from "@/components/ScoreGauge";
import {
  safeNum,
  rsiToScore,
  macdToScore,
  bbToScore,
  buffettToScore,
  rateToScore,
} from "@/lib/score-helpers";

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

  // 신규 신호
  goldenCross?: boolean;
  deadCross?: boolean;
  volumeSpike?: boolean;
  week52High?: boolean;
  week52Low?: boolean;
  bollingerRSI?: 'oversold' | 'overbought' | 'neutral';
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-[#00d4ff]" />
              <div>
                <div className="font-mono text-xs tracking-[3px] text-[rgba(0,212,255,0.7)] mb-1">
                  J.A.R.V.I.S DAILY SIGNALS
                </div>
                <h1 className="font-orbitron text-2xl font-bold text-[#00d4ff] tracking-wide">
                  오늘의 투자 신호
                </h1>
              </div>
            </div>
            <Button onClick={fetchSignals} disabled={loading} variant="primary">
              {loading ? (
                <>
                  <Activity className="w-4 h-4 inline mr-2 animate-spin" />
                  <span>ANALYZING...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  <span>REFRESH</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 relative z-10">
        {loading ? (
          <div className="text-center py-20">
            <Activity className="w-16 h-16 text-[#00d4ff] mx-auto mb-6 animate-pulse" />
            <div className="font-orbitron text-xl text-[#00d4ff] mb-2">ANALYZING MARKET...</div>
            <div className="font-noto text-sm text-[rgba(255,255,255,0.5)]">AI가 시장을 분석하는 중</div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <AlertCircle className="w-16 h-16 text-[#FF4466] mx-auto mb-6" />
            <div className="font-orbitron text-xl status-loss mb-4">{error}</div>
            <Button onClick={fetchSignals} variant="danger">
              <RefreshCw className="w-4 h-4 inline mr-2" />
              RETRY (다시 시도)
            </Button>
          </div>
        ) : (
          <>
            {/* 최고 점수 신호 */}
            {topSignal && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-[#00d4ff]" />
                  <h2 className="font-orbitron text-xl font-bold text-[#00d4ff]">
                    TOP SIGNAL (오늘의 베스트)
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ScoreMeter score={topSignal.score} label={getAssetDisplayName(topSignal.symbol)} />
                  <RSIGauge rsi={topSignal.rsi} />
                  <div className="jarvis-card p-6">
                    <div className="label-display mb-4">LAYER SCORES</div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-noto text-sm text-[rgba(255,255,255,0.7)]">
                          {getIndicatorLabel('Layer 1')}
                        </span>
                        <span className="number-display text-lg">
                          {topSignal.layer1Score}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-noto text-sm text-[rgba(255,255,255,0.7)]">
                          {getIndicatorLabel('Layer 2')}
                        </span>
                        <span className="number-display text-lg status-profit">
                          {topSignal.layer2Score}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-noto text-sm text-[rgba(255,255,255,0.7)]">
                          {getIndicatorLabel('Layer 3')}
                        </span>
                        <span className="number-display text-lg status-warning">
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
                <div className="flex items-center gap-3 mb-4">
                  <Globe className="w-6 h-6 text-[#00d4ff]" />
                  <h2 className="font-orbitron text-xl font-bold text-[#00d4ff]">
                    MACRO INDICATORS (시장 환경 지표)
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      label: getIndicatorLabel("Fear & Greed"),
                      value: Math.round(macro.fearGreed),
                      suffix: "",
                      color: "status-warning",
                    },
                    {
                      label: getIndicatorLabel("VIX"),
                      value: macro.vix.toFixed(1).replace(/\.0$/, ""),
                      suffix: "",
                      color: "status-profit",
                    },
                    {
                      label: "미국 기준금리 (Fed Rate)",
                      value: macro.fedRate >= 0 ? macro.fedRate.toFixed(2).replace(/\.?0+$/, "") : "N/A",
                      suffix: macro.fedRate >= 0 ? "%" : "",
                      color: macro.fedRate >= 0 ? "status-cyan" : "text-[rgba(255,255,255,0.3)]",
                    },
                    {
                      label: getIndicatorLabel("Buffett Indicator"),
                      value: Math.round(macro.buffett),
                      suffix: "",
                      color: "status-warning",
                    },
                  ].map((item, i) => (
                    <div key={i} className="jarvis-card p-5 card-fade-in">
                      <div className="label-display mb-3">{item.label}</div>
                      <div className={`number-display text-3xl ${item.color} number-glow`}>
                        {typeof item.value === 'number' ? (
                          <CountUp end={item.value} duration={1200} decimals={0} />
                        ) : item.value.includes('.') ? (
                          <CountUp end={parseFloat(item.value)} duration={1200} decimals={2} />
                        ) : (
                          item.value
                        )}
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
              {filteredSignals.map((signal, i) => {
                // 통합 점수 계산
                const scoreInput = {
                  rsiScore: rsiToScore(signal.rsi),
                  macdScore: macdToScore(signal.macd),
                  bbScore: bbToScore(0.5), // BB position 데이터 없으면 중간값
                  vix: safeNum(macro?.vix, 20),
                  buffettScore: buffettToScore(macro?.buffett),
                  rateScore: rateToScore(macro?.fedRate),
                  newsFactorScore: safeNum(signal.layer3Score, 50),
                };
                const scoreOutput = calcIntegratedScore(scoreInput);
                const filtered = applyVixFilter({
                  vix: safeNum(macro?.vix, 20),
                  cryptoFearGreed: safeNum(macro?.fearGreed, 50),
                  originalScore: scoreOutput.totalScore,
                  assetType: (signal.assetType === 'crypto' ? 'crypto' : signal.assetType === 'etf' ? 'etf' : 'stock') as 'stock' | 'crypto' | 'etf',
                });

                return (
                  <div key={i} className={`stagger-${(i % 4) + 1}`}>
                    <div className="space-y-4">
                      <ActionCard
                        symbol={signal.symbol}
                        name={signal.name}
                        price={signal.price}
                        priceKRW={signal.price_krw}
                        score={signal.score}
                        action={signal.action}
                        highRisk={signal.highRisk}
                        goldenCross={signal.goldenCross}
                        deadCross={signal.deadCross}
                        volumeSpike={signal.volumeSpike}
                        week52High={signal.week52High}
                        week52Low={signal.week52Low}
                        bollingerRSI={signal.bollingerRSI}
                      />

                      {/* 통합 신호 점수 */}
                      <ScoreGauge
                        score={filtered.adjustedScore}
                        signal={scoreOutput.signal}
                        confidence={scoreOutput.confidence}
                        layer1={scoreOutput.layer1Score}
                        layer2={scoreOutput.layer2Score}
                        layer3={scoreOutput.layer3Score}
                        vixPenalty={scoreOutput.vixPenalty}
                      />
                    </div>
                  </div>
                );
              })}
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
