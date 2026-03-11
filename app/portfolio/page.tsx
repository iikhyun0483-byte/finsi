"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { formatKRW, formatPercent } from "@/lib/utils";
import type { RealtimePrice } from "@/lib/realtime-price";

interface PortfolioItem {
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  assetType: "stock" | "crypto";
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [prices, setPrices] = useState<Map<string, RealtimePrice>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // 추가 폼 상태
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newBuyPrice, setNewBuyPrice] = useState("");
  const [newAssetType, setNewAssetType] = useState<"stock" | "crypto">("stock");

  // localStorage에서 포트폴리오 불러오기
  useEffect(() => {
    const saved = localStorage.getItem("finsi_portfolio");
    if (saved) {
      try {
        setPortfolio(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to load portfolio:", error);
      }
    }
    // 샘플 데이터 제거 - 사용자가 직접 추가
    setLoading(false);
  }, []);

  // 실시간 가격 불러오기
  const fetchPrices = useCallback(async () => {
    if (portfolio.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const symbols = portfolio.map((item) => item.symbol);

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
  }, [portfolio]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // 포트폴리오 저장
  const savePortfolio = (newPortfolio: PortfolioItem[]) => {
    setPortfolio(newPortfolio);
    localStorage.setItem("finsi_portfolio", JSON.stringify(newPortfolio));
  };

  // 종목 추가
  const handleAddStock = () => {
    if (!newSymbol || !newName || !newQuantity || !newBuyPrice) {
      alert("모든 필드를 입력해주세요");
      return;
    }

    const newItem: PortfolioItem = {
      symbol: newSymbol.toUpperCase(),
      name: newName,
      quantity: parseFloat(newQuantity),
      avgBuyPrice: parseFloat(newBuyPrice),
      assetType: newAssetType,
    };

    savePortfolio([...portfolio, newItem]);

    // 폼 초기화
    setNewSymbol("");
    setNewName("");
    setNewQuantity("");
    setNewBuyPrice("");
    setNewAssetType("stock");
    setShowAddModal(false);
  };

  // 종목 삭제
  const handleDeleteStock = (index: number) => {
    if (confirm(`${portfolio[index].symbol}을(를) 삭제하시겠습니까?`)) {
      const newPortfolio = portfolio.filter((_, i) => i !== index);
      savePortfolio(newPortfolio);
    }
  };

  // 종목 편집 시작
  const startEdit = (index: number) => {
    const item = portfolio[index];
    setEditingIndex(index);
    setNewSymbol(item.symbol);
    setNewName(item.name);
    setNewQuantity(item.quantity.toString());
    setNewBuyPrice(item.avgBuyPrice.toString());
    setNewAssetType(item.assetType);
    setShowAddModal(true);
  };

  // 종목 편집 저장
  const handleEditStock = () => {
    if (editingIndex === null) return;
    if (!newSymbol || !newName || !newQuantity || !newBuyPrice) {
      alert("모든 필드를 입력해주세요");
      return;
    }

    const updatedItem: PortfolioItem = {
      symbol: newSymbol.toUpperCase(),
      name: newName,
      quantity: parseFloat(newQuantity),
      avgBuyPrice: parseFloat(newBuyPrice),
      assetType: newAssetType,
    };

    const newPortfolio = [...portfolio];
    newPortfolio[editingIndex] = updatedItem;
    savePortfolio(newPortfolio);

    // 폼 초기화
    setNewSymbol("");
    setNewName("");
    setNewQuantity("");
    setNewBuyPrice("");
    setNewAssetType("stock");
    setShowAddModal(false);
    setEditingIndex(null);
  };

  // 모달 닫기
  const closeModal = () => {
    setShowAddModal(false);
    setEditingIndex(null);
    setNewSymbol("");
    setNewName("");
    setNewQuantity("");
    setNewBuyPrice("");
    setNewAssetType("stock");
  };

  // 총 계산
  const totalInvested = portfolio.reduce(
    (sum, item) => sum + item.quantity * item.avgBuyPrice,
    0
  );

  const totalCurrent = portfolio.reduce((sum, item) => {
    const price = prices.get(item.symbol);
    const currentPrice = price?.price || item.avgBuyPrice;
    return sum + item.quantity * currentPrice;
  }, 0);

  const totalProfit = totalCurrent - totalInvested;
  const totalReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <header className="border-b border-gray-800 bg-gradient-to-r from-[#0d1321] to-[#0f1e35]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="text-xs tracking-[4px] text-blue-400 mb-1">MY PORTFOLIO</div>
          <h1 className="text-2xl font-bold">💼 내 포트폴리오</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* 전체 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent>
              <div className="text-xs text-gray-400 mb-2">총 투자금액</div>
              <div className="text-2xl font-bold">${totalInvested.toFixed(0)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="text-xs text-gray-400 mb-2">현재 평가액</div>
              <div className="text-2xl font-bold">${totalCurrent.toFixed(0)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="text-xs text-gray-400 mb-2">총 손익</div>
              <div
                className={`text-2xl font-bold ${
                  totalProfit >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                ${totalProfit.toFixed(0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="text-xs text-gray-400 mb-2">수익률</div>
              <div
                className={`text-2xl font-bold ${
                  totalReturn >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {formatPercent(totalReturn, 1)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 보유 종목 */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>📊 보유 종목 (실시간 가격)</CardTitle>
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
            {loading && portfolio.length > 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-4">⚙️</div>
                <div>실시간 가격 조회 중...</div>
              </div>
            ) : portfolio.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📭</div>
                <div>보유 중인 종목이 없습니다</div>
                <div className="text-sm mt-2 text-gray-600">
                  💡 localStorage를 사용하여 데이터가 저장됩니다
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-400">
                      <th className="text-left py-3 px-2">종목</th>
                      <th className="text-right py-3 px-2">수량</th>
                      <th className="text-right py-3 px-2">평균 단가</th>
                      <th className="text-right py-3 px-2">현재가</th>
                      <th className="text-right py-3 px-2">평가액</th>
                      <th className="text-right py-3 px-2">손익</th>
                      <th className="text-right py-3 px-2">수익률</th>
                      <th className="text-right py-3 px-2">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((item, i) => {
                      const priceData = prices.get(item.symbol);
                      const currentPrice = priceData?.price || item.avgBuyPrice;
                      const currentValue = item.quantity * currentPrice;
                      const investedValue = item.quantity * item.avgBuyPrice;
                      const profit = currentValue - investedValue;
                      const profitPercent = investedValue > 0 ? ((profit / investedValue) * 100) : 0;

                      return (
                        <tr key={i} className="border-b border-gray-800/50">
                          <td className="py-4 px-2">
                            <div className="font-bold">{item.symbol}</div>
                            <div className="text-xs text-gray-400">{item.name}</div>
                            {priceData && (
                              <div className={`text-xs ${priceData.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {priceData.changePercent >= 0 ? '▲' : '▼'} {Math.abs(priceData.changePercent).toFixed(2)}%
                              </div>
                            )}
                          </td>
                          <td className="text-right py-4 px-2">{item.quantity}</td>
                          <td className="text-right py-4 px-2">
                            ${item.avgBuyPrice.toFixed(item.assetType === 'crypto' ? 0 : 2)}
                          </td>
                          <td className="text-right py-4 px-2">
                            <div className="font-semibold">
                              ${currentPrice.toFixed(item.assetType === 'crypto' ? 0 : 2)}
                            </div>
                            {priceData && (
                              <div className="text-xs text-gray-500">
                                {new Date(priceData.timestamp).toLocaleTimeString('ko-KR')}
                              </div>
                            )}
                          </td>
                          <td className="text-right py-4 px-2 font-bold">
                            ${currentValue.toFixed(0)}
                          </td>
                          <td
                            className={`text-right py-4 px-2 font-bold ${
                              profit >= 0 ? "text-green-500" : "text-red-500"
                            }`}
                          >
                            {profit >= 0 ? '+' : ''}${profit.toFixed(0)}
                          </td>
                          <td
                            className={`text-right py-4 px-2 font-bold ${
                              profitPercent >= 0 ? "text-green-500" : "text-red-500"
                            }`}
                          >
                            {formatPercent(profitPercent, 2)}
                          </td>
                          <td className="text-right py-4 px-2">
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => startEdit(i)}
                                className="px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteStock(i)}
                                className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 종목 추가/편집 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>{editingIndex !== null ? "✏️ 종목 편집" : "➕ 종목 추가"}</CardTitle>
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
                    <label className="text-xs text-gray-400 mb-2 block">수량 *</label>
                    <input
                      type="number"
                      step="0.001"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      placeholder="10"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">평균 매수가 (USD) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newBuyPrice}
                      onChange={(e) => setNewBuyPrice(e.target.value)}
                      placeholder="450.00"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">자산 타입 *</label>
                    <select
                      value={newAssetType}
                      onChange={(e) => setNewAssetType(e.target.value as "stock" | "crypto")}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    >
                      <option value="stock">주식/ETF</option>
                      <option value="crypto">암호화폐</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={editingIndex !== null ? handleEditStock : handleAddStock}
                    >
                      {editingIndex !== null ? "💾 수정" : "➕ 추가"}
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

        {/* 안내 */}
        <div className="text-center">
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
