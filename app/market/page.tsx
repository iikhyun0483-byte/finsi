"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { formatUSD, formatKRW, formatPercent } from "@/lib/utils";
import { Globe, Activity, TrendingUp, BarChart3, Clock } from "lucide-react";
import { getIndicatorLabel } from "@/lib/design-system";
import { ParticleBackground } from "@/components/effects/ParticleBackground";
import { CountUp } from "@/components/effects/CountUp";
import { applyVixFilter } from "@/lib/vix-filter";
import { safeNum } from "@/lib/score-helpers";
import { MACRO_DEFAULTS } from "@/lib/macro";

export default function MarketPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sectorFlows, setSectorFlows] = useState<any>(null);
  const [selectedSector, setSelectedSector] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [leadingScore, setLeadingScore] = useState<any>(null);

  const handleSectorClick = (index: number, e: React.MouseEvent<HTMLDivElement>) => {
    setSelectedSector(index);

    // Create ripple effect
    const ripple = document.createElement("div");
    ripple.className = "absolute rounded-full bg-white/30 pointer-events-none";
    ripple.style.width = ripple.style.height = "100px";
    ripple.style.left = `${e.nativeEvent.offsetX - 50}px`;
    ripple.style.top = `${e.nativeEvent.offsetY - 50}px`;
    ripple.style.animation = "ripple 0.6s linear";

    e.currentTarget.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  useEffect(() => {
    fetchMarketData();
    fetchSectorFlows();
    fetchLeadingIndicators();
  }, []);

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/market");
      const result = await response.json();
      if (result.success) {
        setData(result);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch market data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSectorFlows = async () => {
    try {
      const response = await fetch("/api/sector-flows");
      const result = await response.json();
      if (result.success) {
        setSectorFlows(result.sectorFlows);
      }
    } catch (error) {
      console.error("Failed to fetch sector flows:", error);
    }
  };

  const fetchLeadingIndicators = async () => {
    try {
      const response = await fetch("/api/leading-indicators?symbol=SPY");
      const result = await response.json();
      if (result.success) {
        setLeadingScore(result.leadingScore);
      }
    } catch (error) {
      console.error("Failed to fetch leading indicators:", error);
    }
  };

  const getTimeSinceUpdate = () => {
    if (!lastUpdated) return "";
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000 / 60);
    if (diff < 1) return "방금 전";
    if (diff < 60) return `${diff}분 전`;
    const hours = Math.floor(diff / 60);
    return `${hours}시간 전`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000810] text-white flex items-center justify-center relative">
        <div className="stars-layer stars-small" />
        <div className="stars-layer stars-medium" />
        <div className="stars-layer stars-large" />
        <div className="text-center relative z-10">
          <Globe className="w-16 h-16 text-[#00d4ff] mx-auto mb-6 animate-pulse" />
          <div className="font-orbitron text-xl text-[#00d4ff]">LOADING MARKET DATA...</div>
          <div className="font-noto text-sm text-[rgba(255,255,255,0.5)] mt-2">시장 데이터 로딩 중</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000810] text-white relative">
      <ParticleBackground />
      <div className="stars-layer stars-small" />
      <div className="stars-layer stars-medium" />
      <div className="stars-layer stars-large" />

      <header className="border-b border-[rgba(0,212,255,0.12)] bg-[rgba(0,20,45,0.3)] backdrop-blur-xl relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-center gap-3">
            <Globe className="w-8 h-8 text-[#00d4ff]" />
            <div>
              <div className="font-mono text-xs tracking-[3px] text-[rgba(0,212,255,0.7)] mb-1">
                J.A.R.V.I.S MARKET OVERVIEW
              </div>
              <h1 className="font-orbitron text-2xl font-bold text-[#00d4ff] tracking-wide">
                시장 현황
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 relative z-10">
        {/* 매크로 지표 */}
        {data?.macroIndicators && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-6 h-6 text-[#00d4ff]" />
              <h2 className="font-orbitron text-xl font-bold text-[#00d4ff]">
                MACRO INDICATORS (매크로 경제 지표)
              </h2>
              {lastUpdated && (
                <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-4 h-4" />
                  마지막 업데이트: {getTimeSinceUpdate()}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                {
                  label: getIndicatorLabel("Fear & Greed"),
                  value: Math.round(data.macroIndicators.fearGreed),
                  color: "status-warning",
                },
                {
                  label: getIndicatorLabel("VIX"),
                  value: data.macroIndicators.vix.toFixed(1).replace(/\.0$/, ""),
                  color: "text-green-500",
                },
                {
                  label: "미국 기준금리",
                  eng: "Federal Funds Rate",
                  value: data.macroIndicators.fedRate >= 0 ? `${data.macroIndicators.fedRate.toFixed(2).replace(/\.?0+$/, "")}%` : "API 키 미설정",
                  color: data.macroIndicators.fedRate >= 0 ? "text-blue-500" : "text-gray-500",
                },
                {
                  label: "버핏지수",
                  eng: "Buffett Indicator",
                  value: Math.round(data.macroIndicators.buffett),
                  color: "text-orange-500",
                },
              ].map((item, i) => (
                <Card key={i} className="pulse-glow depth-3d">
                  <CardContent>
                    <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                    <div className="text-[10px] text-gray-600 mb-3">{item.eng}</div>
                    <div className={`text-2xl font-bold ${item.color} number-glow`}>
                      {typeof item.value === 'number' ? (
                        <CountUp end={item.value} duration={1200} decimals={0} />
                      ) : typeof item.value === 'string' && !item.value.includes('API') && !item.value.includes('%') ? (
                        <CountUp end={parseFloat(item.value)} duration={1200} decimals={1} />
                      ) : (
                        item.value
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 시장 리스크 레벨 */}
            {(() => {
              const marketRisk = applyVixFilter({
                vix: safeNum(data?.macroIndicators?.vix, 20),
                cryptoFearGreed: safeNum(data?.macroIndicators?.fearGreed, 50),
                originalScore: 50,
                assetType: 'stock',
              });

              const riskColor = {
                LOW: '#00FF41',
                MEDIUM: '#00FFD1',
                HIGH: '#FFA500',
                EXTREME: '#FF4466',
              }[marketRisk.riskLevel];

              const riskKr = {
                LOW: '안전',
                MEDIUM: '보통',
                HIGH: '높음',
                EXTREME: '극단적',
              }[marketRisk.riskLevel];

              return (
                <div style={{
                  padding: '12px 16px',
                  background: `${riskColor}10`,
                  border: `1px solid ${riskColor}40`,
                  borderRadius: 8,
                  marginTop: 12,
                  marginBottom: 12,
                }}>
                  <div style={{ fontSize: 11, color: '#888', fontFamily: 'IBM Plex Mono', marginBottom: 4 }}>
                    시장 리스크 레벨
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: riskColor, fontFamily: 'Orbitron' }}>
                    {riskKr}
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                    신호 신뢰도 감쇠 계수: ×{marketRisk.dampingFactor.toFixed(2)}
                    &nbsp;|&nbsp;
                    현재 모든 신호에 {Math.round(marketRisk.dampingFactor * 100)}% 신뢰도 적용 중
                  </div>
                </div>
              );
            })()}

            {/* 신규 경제 지표 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  label: "소비자물가지수 (CPI)",
                  eng: "Consumer Price Index",
                  value: data.macroIndicators.cpi ? `${data.macroIndicators.cpi.toFixed(1)}%` : `${MACRO_DEFAULTS.cpi}%`,
                  isEstimate: !data.macroIndicators.cpi || data.macroIndicators.cpi === MACRO_DEFAULTS.cpi,
                  color: "text-yellow-500",
                },
                {
                  label: "실업률",
                  eng: "Unemployment Rate",
                  value: data.macroIndicators.unemploymentRate ? `${data.macroIndicators.unemploymentRate.toFixed(1)}%` : `${MACRO_DEFAULTS.unemploymentRate}%`,
                  isEstimate: !data.macroIndicators.unemploymentRate || data.macroIndicators.unemploymentRate === MACRO_DEFAULTS.unemploymentRate,
                  color: "text-cyan-500",
                },
                {
                  label: "GDP 성장률",
                  eng: "GDP Growth Rate",
                  value: data.macroIndicators.gdpGrowth ? `${data.macroIndicators.gdpGrowth.toFixed(1)}%` : `${MACRO_DEFAULTS.gdpGrowth}%`,
                  isEstimate: !data.macroIndicators.gdpGrowth || data.macroIndicators.gdpGrowth === MACRO_DEFAULTS.gdpGrowth,
                  color: "text-purple-500",
                },
              ].map((item, i) => (
                <Card key={i} className="pulse-glow depth-3d">
                  <CardContent>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-xs text-gray-400">{item.label}</div>
                      {item.isEstimate && (
                        <Badge variant="warning" className="text-[9px] px-1 py-0">추정치</Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-600 mb-3">{item.eng}</div>
                    <div className={`text-2xl font-bold ${item.color} number-glow`}>
                      {typeof item.value === 'number' ? (
                        <CountUp end={item.value} duration={1200} decimals={1} suffix="%" />
                      ) : typeof item.value === 'string' && !item.value.includes('API') ? (
                        <CountUp end={parseFloat(item.value)} duration={1200} decimals={1} suffix="%" />
                      ) : (
                        item.value
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 선행 지표 점수 */}
        {leadingScore && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-[#00d4ff]" />
              <h2 className="font-orbitron text-xl font-bold text-[#00d4ff]">
                LEADING INDICATORS (선행 지표 점수)
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="pulse-glow depth-3d">
                <CardContent>
                  <div className="text-xs text-gray-400 mb-1">종합 점수</div>
                  <div className="text-[10px] text-gray-600 mb-3">Total Score (-20 ~ +20)</div>
                  <div className={`text-3xl font-bold number-glow ${
                    leadingScore.totalScore > 10 ? 'text-green-500' :
                    leadingScore.totalScore > 0 ? 'text-blue-500' :
                    leadingScore.totalScore > -10 ? 'text-orange-500' : 'text-red-500'
                  }`}>
                    <CountUp end={leadingScore.totalScore} duration={1200} decimals={0} prefix={leadingScore.totalScore > 0 ? "+" : ""} />
                  </div>
                </CardContent>
              </Card>

              {leadingScore.putCallRatio && (
                <Card className="pulse-glow depth-3d">
                  <CardContent>
                    <div className="text-xs text-gray-400 mb-1">Put/Call 비율 (추정)</div>
                    <div className="text-[10px] text-gray-600 mb-3">Estimated Put/Call Ratio</div>
                    <div className="text-2xl font-bold text-white number-glow">
                      <CountUp end={leadingScore.putCallRatio.ratio} duration={1200} decimals={2} />
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      {leadingScore.putCallRatio.interpretation === 'extreme_greed' && '🟢 극단적 탐욕'}
                      {leadingScore.putCallRatio.interpretation === 'greed' && '🟢 탐욕'}
                      {leadingScore.putCallRatio.interpretation === 'neutral' && '⚪ 중립'}
                      {leadingScore.putCallRatio.interpretation === 'fear' && '🟡 공포'}
                      {leadingScore.putCallRatio.interpretation === 'extreme_fear' && '🔴 극단적 공포'}
                    </div>
                  </CardContent>
                </Card>
              )}

              {leadingScore.shortRatio && leadingScore.shortRatio.shortPercentFloat !== null && (
                <Card className="pulse-glow depth-3d">
                  <CardContent>
                    <div className="text-xs text-gray-400 mb-1">공매도 비율 (SPY)</div>
                    <div className="text-[10px] text-gray-600 mb-3">Short % of Float</div>
                    <div className="text-2xl font-bold text-white number-glow">
                      <CountUp end={leadingScore.shortRatio.shortPercentFloat} duration={1200} decimals={1} suffix="%" />
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      {leadingScore.shortRatio.interpretation === 'bullish' && '🟢 숏스퀴즈 가능'}
                      {leadingScore.shortRatio.interpretation === 'neutral' && '⚪ 중립'}
                      {leadingScore.shortRatio.interpretation === 'bearish' && '🔴 하락 신호'}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* 섹터별 자금 흐름 히트맵 */}
        {sectorFlows && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">🔥 섹터별 자금 흐름 (Sector Heatmap)</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {sectorFlows.map((sector: any, i: number) => {
                // 색상 결정 (모멘텀 기반)
                let bgColor = "bg-gray-800";
                let textColor = "text-gray-400";
                if (sector.momentum1m > 5) {
                  bgColor = "bg-green-600/80";
                  textColor = "text-white";
                } else if (sector.momentum1m > 3) {
                  bgColor = "bg-green-500/60";
                  textColor = "text-white";
                } else if (sector.momentum1m > 0) {
                  bgColor = "bg-green-400/40";
                  textColor = "text-gray-200";
                } else if (sector.momentum1m > -3) {
                  bgColor = "bg-red-400/40";
                  textColor = "text-gray-200";
                } else if (sector.momentum1m > -5) {
                  bgColor = "bg-red-500/60";
                  textColor = "text-white";
                } else {
                  bgColor = "bg-red-600/80";
                  textColor = "text-white";
                }

                return (
                  <div
                    key={i}
                    onClick={(e) => handleSectorClick(i, e)}
                    className={`${bgColor} border border-gray-700 rounded-lg p-4 transition-all hover:scale-105 cursor-pointer hover-glow-enhanced depth-3d relative overflow-hidden ${
                      selectedSector === i ? "pulse-glow animate-pulse" : ""
                    }`}
                  >
                    <div className="text-xs font-bold mb-1">{sector.symbol}</div>
                    <div className="text-[10px] text-gray-300 mb-2 truncate">{sector.sector}</div>
                    <div className={`text-lg font-bold ${textColor}`}>
                      <CountUp
                        end={sector.momentum1m}
                        duration={1000}
                        decimals={1}
                        suffix="%"
                      />
                    </div>
                    <div className="text-[9px] text-gray-400 mt-1">
                      1M 모멘텀
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-gray-400 text-center">
              💡 초록색: 자금 유입 | 빨간색: 자금 유출 | 1개월 수익률 기준
            </div>
          </div>
        )}

        {/* 미국 주식/ETF */}
        {data?.stocks && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">📈 미국 주식 ETF (상장지수펀드)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.stocks.map((stock: any, i: number) => (
                <Card key={i} className="hover-glow-enhanced depth-3d card-fade-in">
                  <CardContent>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-lg font-bold mb-1">{stock.symbol}</div>
                        <div className="text-xs text-gray-400">{stock.name}</div>
                      </div>
                      <Badge variant="info">{stock.category}</Badge>
                    </div>
                    <div className="mb-2">
                      <div className="text-xl font-bold text-white">
                        {formatUSD(stock.price)}
                      </div>
                      <div className="text-sm text-gray-400">
                        약 {formatKRW(stock.priceKRW)}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-semibold ${
                        stock.changePercent >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {formatPercent(stock.changePercent, 2)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 암호화폐 */}
        {data?.cryptos && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">₿ 암호화폐</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.cryptos.map((crypto: any, i: number) => (
                <Card key={i} className="hover-glow-enhanced depth-3d card-fade-in">
                  <CardContent>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-bold">{crypto.symbol}</div>
                          <Badge variant="danger">HIGH RISK</Badge>
                        </div>
                        <div className="text-xs text-gray-400">{crypto.name}</div>
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="text-xl font-bold text-white">
                        {formatUSD(crypto.price)}
                      </div>
                      <div className="text-sm text-gray-400">
                        약 {formatKRW(crypto.priceKRW)}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-semibold ${
                        crypto.changePercent >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {formatPercent(crypto.changePercent, 2)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 환율 정보 */}
        {data?.exchangeRate && (
          <div className="text-center mt-8">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2">
              <span className="text-sm text-blue-400">
                💱 현재 환율: 1 USD = {formatKRW(data.exchangeRate)}
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
