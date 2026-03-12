"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import type { RealtimePrice } from "@/lib/realtime-price";
import { formatPercent } from "@/lib/utils";

interface WatchlistItem {
  symbol: string;
  name: string;
  assetType: "stock" | "crypto" | "commodity" | "bond" | "reit";
  targetPrice?: number; // 목표가
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [prices, setPrices] = useState<Map<string, RealtimePrice>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // 추가 폼 상태
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [newAssetType, setNewAssetType] = useState<"stock" | "crypto" | "commodity" | "bond" | "reit">("stock");

  // localStorage에서 관심 종목 불러오기
  useEffect(() => {
    const saved = localStorage.getItem("finsi_watchlist");
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to load watchlist:", error);
      }
    }
    // 샘플 데이터 제거 - 사용자가 직접 추가
    setLoading(false);
  }, []);

  // 실시간 가격 불러오기
  const fetchPrices = useCallback(async () => {
    if (watchlist.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const symbols = watchlist.map((item) => item.symbol);

      // API 호출 (CORS 문제 해결)
      const response = await fetch("/api/realtime-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      });

      const data = await response.json();

      if (data.success && data.prices) {
        const priceMap = new Map<string, RealtimePrice>();
        Object.entries(data.prices).forEach(([symbol, price]) => {
          priceMap.set(symbol, price as RealtimePrice);
        });
        setPrices(priceMap);
      }
    } catch (error) {
      console.error("Failed to fetch prices:", error);
    } finally {
      setLoading(false);
    }
  }, [watchlist]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // 목표가 알림 체크
  useEffect(() => {
    if (prices.size === 0) return;

    watchlist.forEach((item) => {
      if (!item.targetPrice) return;

      const price = prices.get(item.symbol);
      if (!price) return;

      const currentPrice = price.price;

      // 목표가 도달 시 알림
      if (currentPrice >= item.targetPrice) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`🎯 목표가 도달: ${item.symbol}`, {
            body: `현재가 $${currentPrice.toFixed(2)} → 목표가 $${item.targetPrice.toFixed(2)} 도달!`,
            icon: '/icon-192x192.png',
          });
        }
      }
    });
  }, [prices, watchlist]);

  // 관심 종목 저장
  const saveWatchlist = (newWatchlist: WatchlistItem[]) => {
    setWatchlist(newWatchlist);
    localStorage.setItem("finsi_watchlist", JSON.stringify(newWatchlist));
  };

  // 종목 추가
  const handleAddStock = () => {
    if (!newSymbol || !newName) {
      alert("종목 코드와 이름을 입력해주세요");
      return;
    }

    // 중복 체크
    if (watchlist.some((item) => item.symbol === newSymbol.toUpperCase())) {
      alert("이미 추가된 종목입니다");
      return;
    }

    const newItem: WatchlistItem = {
      symbol: newSymbol.toUpperCase(),
      name: newName,
      assetType: newAssetType,
    };

    saveWatchlist([...watchlist, newItem]);

    // 폼 초기화
    setNewSymbol("");
    setNewName("");
    setNewAssetType("stock");
    setShowAddModal(false);
  };

  // 종목 삭제
  const handleDeleteStock = (symbol: string) => {
    if (confirm(`${symbol}을(를) 관심 종목에서 삭제하시겠습니까?`)) {
      const newWatchlist = watchlist.filter((item) => item.symbol !== symbol);
      saveWatchlist(newWatchlist);
    }
  };

  // 모달 닫기
  const closeModal = () => {
    setShowAddModal(false);
    setNewSymbol("");
    setNewName("");
    setNewAssetType("stock");
  };

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <header className="border-b border-gray-800 bg-gradient-to-r from-[#0d1321] to-[#0f1e35]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="text-xs tracking-[4px] text-blue-400 mb-1">MY WATCHLIST</div>
          <h1 className="text-2xl font-bold">⭐ 관심 종목</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>📋 관심 종목 목록 (실시간 가격)</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowAddModal(true)}>
                  ➕ 종목 추가
                </Button>
                <Button size="sm" onClick={fetchPrices} disabled={loading}>
                  {loading ? "⚙️ 갱신 중..." : "🔄 가격 갱신"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && watchlist.length > 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-4">⚙️</div>
                <div>실시간 가격 조회 중...</div>
              </div>
            ) : watchlist.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">⭐</div>
                <div>관심 종목을 추가해보세요</div>
                <div className="text-sm mt-2 text-gray-600">
                  💡 localStorage를 사용하여 데이터가 저장됩니다
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {watchlist.map((item, i) => {
                  const priceData = prices.get(item.symbol);

                  return (
                    <Card key={i}>
                      <CardContent>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-lg font-bold">{item.symbol}</div>
                              <button
                                onClick={() => handleDeleteStock(item.symbol)}
                                className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
                                title="삭제"
                              >
                                🗑️
                              </button>
                            </div>
                            <div className="text-xs text-gray-400 mb-2">{item.name}</div>
                            {priceData ? (
                              <>
                                <div className="text-xl font-bold text-white mb-1">
                                  ${priceData.price.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </div>
                                <div className={`text-sm font-semibold ${
                                  priceData.changePercent >= 0 ? 'text-green-500' : 'text-red-500'
                                }`}>
                                  {priceData.changePercent >= 0 ? '▲' : '▼'}
                                  {formatPercent(priceData.changePercent, 2)}
                                  <span className="text-xs ml-1">
                                    ({priceData.changePercent >= 0 ? '+' : ''}${priceData.change.toFixed(2)})
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(priceData.timestamp).toLocaleTimeString('ko-KR')}
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-gray-500">가격 조회 중...</div>
                            )}
                          </div>
                          <Badge variant="info">{item.assetType}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 종목 추가 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>➕ 관심 종목 추가</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">종목 코드 *</label>
                    <input
                      type="text"
                      value={newSymbol}
                      onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                      placeholder="SPY, QQQ, BTC 등"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">종목명 *</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="S&P 500 ETF"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">자산 타입 *</label>
                    <select
                      value={newAssetType}
                      onChange={(e) => setNewAssetType(e.target.value as any)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    >
                      <option value="stock">주식/ETF</option>
                      <option value="crypto">암호화폐</option>
                      <option value="commodity">원자재</option>
                      <option value="bond">채권</option>
                      <option value="reit">리츠</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="primary" className="flex-1" onClick={handleAddStock}>
                      ➕ 추가
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={closeModal}>
                      ❌ 취소
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">
            <span className="text-sm text-green-400">
              ✅ 실시간 가격 연동 완료 (Yahoo Finance, CoinGecko)
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
