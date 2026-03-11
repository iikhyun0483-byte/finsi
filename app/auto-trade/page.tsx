"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";

interface TradeStrategy {
  enabled: boolean;
  signalThreshold: number;
  investmentAmount: number;
  stopLoss: number;
  takeProfit: number;
  notifications: boolean;
}

interface TradeHistory {
  timestamp: string;
  symbol: string;
  action: "BUY" | "SELL" | "ALERT";
  price: number;
  quantity: number;
  reason: string;
}

const DEFAULT_STRATEGY: TradeStrategy = {
  enabled: false,
  signalThreshold: 75,
  investmentAmount: 1000000,
  stopLoss: -7,
  takeProfit: 15,
  notifications: true,
};

export default function AutoTradePage() {
  const [strategy, setStrategy] = useState<TradeStrategy>(DEFAULT_STRATEGY);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [savedMessage, setSavedMessage] = useState("");

  // 설정 불러오기
  useEffect(() => {
    const savedStrategy = localStorage.getItem("finsi_auto_trade_strategy");
    if (savedStrategy) {
      try {
        setStrategy(JSON.parse(savedStrategy));
      } catch (error) {
        console.error("Failed to load strategy:", error);
      }
    }

    const savedHistory = localStorage.getItem("finsi_trade_history");
    if (savedHistory) {
      try {
        setTradeHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error("Failed to load history:", error);
      }
    }
  }, []);

  // 브라우저 알림 권한 요청
  useEffect(() => {
    if (strategy.notifications && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, [strategy.notifications]);

  // 설정 저장
  const saveStrategy = () => {
    localStorage.setItem("finsi_auto_trade_strategy", JSON.stringify(strategy));
    setSavedMessage("✅ 설정이 저장되었습니다");
    setTimeout(() => setSavedMessage(""), 3000);
  };

  // 전략 활성화/비활성화
  const toggleStrategy = () => {
    const newEnabled = !strategy.enabled;
    const newStrategy = { ...strategy, enabled: newEnabled };
    setStrategy(newStrategy);
    localStorage.setItem("finsi_auto_trade_strategy", JSON.stringify(newStrategy));

    if (newEnabled) {
      showNotification("🤖 모의 자동매매 시작", "신호 기반 알림이 활성화되었습니다");
    } else {
      showNotification("⏸️ 모의 자동매매 중지", "알림이 비활성화되었습니다");
    }
  };

  // 알림 표시
  const showNotification = (title: string, body: string) => {
    if (!strategy.notifications) return;

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/icon-192x192.png" });
    }
  };

  // 모의 매매 신호 체크
  const checkSignals = useCallback(async () => {
    if (!strategy.enabled) return;

    try {
      const response = await fetch("/api/signal");
      const data = await response.json();

      if (data.success && data.signals) {
        const strongSignals = data.signals.filter(
          (s: any) => s.score >= strategy.signalThreshold && s.action.includes("매수")
        );

        strongSignals.forEach((signal: any) => {
          const newTrade: TradeHistory = {
            timestamp: new Date().toISOString(),
            symbol: signal.symbol,
            action: "ALERT",
            price: signal.price,
            quantity: strategy.investmentAmount / signal.price,
            reason: `매수 신호 (점수: ${signal.score})`,
          };

          // 중복 알림 방지 (최근 1시간 이내 같은 종목)
          const recentAlert = tradeHistory.find(
            (t) =>
              t.symbol === signal.symbol &&
              Date.now() - new Date(t.timestamp).getTime() < 60 * 60 * 1000
          );

          if (!recentAlert) {
            const updatedHistory = [newTrade, ...tradeHistory].slice(0, 50); // 최대 50개 저장
            setTradeHistory(updatedHistory);
            localStorage.setItem("finsi_trade_history", JSON.stringify(updatedHistory));

            showNotification(
              `🎯 ${signal.symbol} 매수 신호`,
              `점수: ${signal.score}점 | 가격: $${signal.price.toFixed(2)}`
            );
          }
        });
      }
    } catch (error) {
      console.error("Failed to check signals:", error);
    }
  }, [strategy, tradeHistory]);

  // 5분마다 신호 체크
  useEffect(() => {
    if (!strategy.enabled) return;

    const interval = setInterval(() => {
      checkSignals();
    }, 5 * 60 * 1000); // 5분

    // 초기 실행
    checkSignals();

    return () => clearInterval(interval);
  }, [strategy.enabled, checkSignals]);

  // 히스토리 삭제
  const clearHistory = () => {
    if (confirm("모든 거래 내역을 삭제하시겠습니까?")) {
      setTradeHistory([]);
      localStorage.removeItem("finsi_trade_history");
    }
  };

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <header className="border-b border-gray-800 bg-gradient-to-r from-[#0d1321] to-[#0f1e35]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="text-xs tracking-[4px] text-blue-400 mb-1">
            MOCK TRADING SYSTEM
          </div>
          <h1 className="text-2xl font-bold">🤖 모의 자동매매</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* 안내 배너 */}
        <div className="mb-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">💡</div>
            <div>
              <div className="text-lg font-bold text-blue-400 mb-2">
                모의투자 모드 (실제 거래 없음)
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• 실제 돈이 들지 않는 안전한 모드입니다</li>
                <li>• 신호 점수가 기준을 넘으면 브라우저 알림을 보냅니다</li>
                <li>• 전략 설정을 테스트하고 투자 감각을 익히세요</li>
                <li>• 5분마다 자동으로 신호를 체크합니다</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 상태 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent>
              <div className="text-xs text-gray-400 mb-2">자동매매 상태</div>
              <div className="flex items-center gap-2">
                <Badge variant={strategy.enabled ? "success" : "default"}>
                  {strategy.enabled ? "활성화 ✅" : "비활성화"}
                </Badge>
                <button
                  onClick={toggleStrategy}
                  className={`ml-2 w-14 h-8 rounded-full transition-colors ${
                    strategy.enabled ? "bg-green-500" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`w-6 h-6 bg-white rounded-full transition-transform ${
                      strategy.enabled ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="text-xs text-gray-400 mb-2">알림 모드</div>
              <div className="text-lg font-bold text-blue-400">
                {strategy.notifications ? "🔔 활성화" : "🔕 비활성화"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="text-xs text-gray-400 mb-2">알림 기록</div>
              <div className="text-lg font-bold text-white">{tradeHistory.length}건</div>
            </CardContent>
          </Card>
        </div>

        {/* 전략 설정 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>⚙️ 모의매매 전략 설정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* 신호 점수 기준 */}
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  매수 신호 점수 기준 (현재: {strategy.signalThreshold}점 이상)
                </label>
                <input
                  type="range"
                  min="50"
                  max="90"
                  value={strategy.signalThreshold}
                  onChange={(e) =>
                    setStrategy({ ...strategy, signalThreshold: Number(e.target.value) })
                  }
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>50점 (공격적)</span>
                  <span>75점 (권장)</span>
                  <span>90점 (보수적)</span>
                </div>
              </div>

              {/* 투자 금액 */}
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  종목당 투자 금액 (KRW)
                </label>
                <input
                  type="number"
                  value={strategy.investmentAmount}
                  onChange={(e) =>
                    setStrategy({ ...strategy, investmentAmount: Number(e.target.value) })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
                <div className="text-xs text-gray-500 mt-1">
                  현재: ₩{strategy.investmentAmount.toLocaleString()}
                </div>
              </div>

              {/* 손절/익절 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">손절 기준 (%)</label>
                  <input
                    type="number"
                    value={strategy.stopLoss}
                    onChange={(e) =>
                      setStrategy({ ...strategy, stopLoss: Number(e.target.value) })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">익절 기준 (%)</label>
                  <input
                    type="number"
                    value={strategy.takeProfit}
                    onChange={(e) =>
                      setStrategy({ ...strategy, takeProfit: Number(e.target.value) })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                </div>
              </div>

              {/* 알림 설정 */}
              <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4">
                <div>
                  <div className="font-semibold mb-1">브라우저 알림</div>
                  <div className="text-xs text-gray-400">
                    신호 발생 시 데스크톱 알림 받기
                  </div>
                </div>
                <button
                  onClick={() =>
                    setStrategy({ ...strategy, notifications: !strategy.notifications })
                  }
                  className={`w-14 h-8 rounded-full transition-colors ${
                    strategy.notifications ? "bg-blue-500" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`w-6 h-6 bg-white rounded-full transition-transform ${
                      strategy.notifications ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <Button variant="primary" className="w-full" onClick={saveStrategy}>
                💾 설정 저장
              </Button>

              {savedMessage && (
                <div className="text-center text-sm text-green-400">{savedMessage}</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 알림 내역 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>📜 알림 내역</CardTitle>
              {tradeHistory.length > 0 && (
                <Button variant="secondary" size="sm" onClick={clearHistory}>
                  🗑️ 전체 삭제
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {tradeHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📭</div>
                <div>아직 알림 내역이 없습니다</div>
                <div className="text-sm mt-2">전략을 활성화하고 신호를 기다려보세요</div>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {tradeHistory.map((trade, i) => (
                  <div
                    key={i}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-lg mb-1">{trade.symbol}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(trade.timestamp).toLocaleString("ko-KR")}
                        </div>
                      </div>
                      <Badge variant="info">
                        {trade.action === "ALERT" ? "🔔 알림" : trade.action}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-gray-400">가격</div>
                        <div className="font-semibold">${trade.price.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">수량</div>
                        <div className="font-semibold">{trade.quantity.toFixed(4)}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-gray-300 bg-gray-900/50 rounded p-2">
                      💡 {trade.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 안내 메시지 */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">
            <span className="text-sm text-green-400">
              ✅ 모의투자 모드 완성 (실제 거래 없이 신호 알림만 받습니다)
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
