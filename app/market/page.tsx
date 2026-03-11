"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { formatUSD, formatKRW, formatPercent } from "@/lib/utils";

export default function MarketPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sectorFlows, setSectorFlows] = useState<any>(null);

  useEffect(() => {
    fetchMarketData();
    fetchSectorFlows();
  }, []);

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/market");
      const result = await response.json();
      if (result.success) {
        setData(result);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080810] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🌍</div>
          <div className="text-lg text-gray-400">시장 데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <header className="border-b border-gray-800 bg-gradient-to-r from-[#0d1321] to-[#0f1e35]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="text-xs tracking-[4px] text-blue-400 mb-1">GLOBAL MARKET OVERVIEW</div>
          <h1 className="text-2xl font-bold">🌍 시장 현황</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* 매크로 지표 */}
        {data?.macroIndicators && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">📊 매크로 경제 지표</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "공포탐욕지수 (시장 심리)",
                  eng: "Fear & Greed Index",
                  value: Math.round(data.macroIndicators.fearGreed),
                  color: "text-yellow-500",
                },
                {
                  label: "VIX (시장공포지수)",
                  eng: "Volatility Index",
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
                <Card key={i}>
                  <CardContent>
                    <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                    <div className="text-[10px] text-gray-600 mb-3">{item.eng}</div>
                    <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                  </CardContent>
                </Card>
              ))}
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
                    className={`${bgColor} border border-gray-700 rounded-lg p-4 transition-transform hover:scale-105 cursor-pointer`}
                  >
                    <div className="text-xs font-bold mb-1">{sector.symbol}</div>
                    <div className="text-[10px] text-gray-300 mb-2 truncate">{sector.sector}</div>
                    <div className={`text-lg font-bold ${textColor}`}>
                      {sector.momentum1m >= 0 ? "+" : ""}{sector.momentum1m.toFixed(1)}%
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
                <Card key={i}>
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
                <Card key={i}>
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
