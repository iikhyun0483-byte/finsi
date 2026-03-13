"use client";

import { useState } from "react";
import { Button } from "@/components/common/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, BarChart, Bar } from "recharts";
import { formatKRW } from "@/lib/format";

const STRATEGIES = {
  buy_and_hold: {
    name: "장기보유 전략",
    engName: "Buy & Hold",
    desc: "처음 한 번 사고 끝까지 보유",
    icon: "🏦",
    color: "#94a3b8",
  },
  ma_golden: {
    name: "골든/데드크로스",
    engName: "Golden/Dead Cross",
    desc: "50일선과 200일선 교차 전략",
    icon: "📈",
    color: "#f59e0b",
  },
  rsi: {
    name: "RSI 역추세",
    engName: "RSI Reversal",
    desc: "과매도/과매수 구간 진입 전략",
    icon: "🔄",
    color: "#a78bfa",
  },
  macd: {
    name: "MACD 교차",
    engName: "MACD Crossover",
    desc: "MACD선과 시그널선 교차",
    icon: "⚡",
    color: "#22c55e",
  },
  bollinger: {
    name: "볼린저밴드 반등",
    engName: "Bollinger Band",
    desc: "밴드 하단 터치 후 반등",
    icon: "🎯",
    color: "#38bdf8",
  },
  dual_momentum: {
    name: "듀얼 모멘텀",
    engName: "Dual Momentum",
    desc: "12개월 모멘텀 기반 전략",
    icon: "🚀",
    color: "#f97316",
  },
};

export default function BacktestPage() {
  const [activeTab, setActiveTab] = useState<"strategy" | "signal">("signal");

  // 전략 백테스트 상태
  const [strategy, setStrategy] = useState("buy_and_hold");
  const [symbol, setSymbol] = useState("SPY");
  const [years, setYears] = useState(1); // 10년 → 1년으로 변경
  const [capital, setCapital] = useState(10000000);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 현실적 백테스팅 옵션
  const [enableTax, setEnableTax] = useState(false);
  const [commission, setCommission] = useState(0.001); // 0.1%
  const [slippage, setSlippage] = useState(0.0005); // 0.05%

  // 신호 검증 상태
  const [signalSymbol, setSignalSymbol] = useState("SPY");
  const [signalThreshold, setSignalThreshold] = useState(55);
  const [signalResult, setSignalResult] = useState<any>(null);
  const [signalLoading, setSignalLoading] = useState(false);

  const runBacktest = async () => {
    setLoading(true);
    try {
      // 암호화폐 심볼 목록
      const cryptoSymbols = ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "DOT", "AVAX"];
      const isCrypto = cryptoSymbols.includes(symbol.toUpperCase());

      const requestBody = {
        symbol,
        strategy,
        periodYears: years,
        initialCapital: capital,
        assetType: isCrypto ? "crypto" : "stock",
        enableTax,
        commission,
        slippage,
      };

      console.log("백테스트 요청:", requestBody);

      const response = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.result);
      } else {
        console.error("Backtest failed:", data.error);
        alert(`백테스트 실패: ${data.error || "알 수 없는 오류"}`);
      }
    } catch (error) {
      console.error("Backtest failed:", error);
      alert("백테스트 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const runSignalValidation = async () => {
    setSignalLoading(true);
    setSignalResult(null);
    try {
      // 암호화폐 심볼 목록
      const cryptoSymbols = ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "DOT", "AVAX"];
      const isCrypto = cryptoSymbols.includes(signalSymbol);

      const response = await fetch("/api/validate-signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: signalSymbol,
          threshold: signalThreshold,
          assetType: isCrypto ? "crypto" : "stock",
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSignalResult(data.result);
      } else {
        // 디버그 정보가 있으면 표시
        let errorMsg = data.error || "신호 검증 실패";
        if (data.debug && data.debug.maxScore) {
          errorMsg += `\n\n📊 점수 분석:\n`;
          errorMsg += `• 최고 점수: ${data.debug.maxScore}점\n`;
          errorMsg += `• 평균 점수: ${data.debug.avgScore}점\n`;
          errorMsg += `• 확인한 시점: ${data.debug.totalChecked}개\n\n`;
          errorMsg += `💡 권장: Threshold를 ${Math.floor(parseFloat(data.debug.maxScore)) - 5}점 이하로 낮춰보세요.`;
        }
        alert(errorMsg);
      }
    } catch (error) {
      console.error("Signal validation failed:", error);
      alert("서버 오류가 발생했습니다");
    } finally {
      setSignalLoading(false);
    }
  };

  const selectedStrategy = STRATEGIES[strategy as keyof typeof STRATEGIES];

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <header className="border-b border-gray-800 bg-gradient-to-r from-[#0d1321] to-[#0f1e35]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="text-xs tracking-[4px] text-blue-400 mb-1">
            QUANTITATIVE BACKTESTING SYSTEM
          </div>
          <h1 className="text-2xl font-bold">⚡ 백테스팅 & 신호 검증</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* 탭 */}
        <div className="mb-8 flex gap-2">
          <button
            onClick={() => setActiveTab("signal")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === "signal"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            🎯 신호 검증 (승률 확인)
          </button>
          <button
            onClick={() => setActiveTab("strategy")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === "strategy"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            📊 전략 백테스트
          </button>
        </div>

        {/* 신호 검증 탭 */}
        {activeTab === "signal" && (
          <div>
            {/* 설명 */}
            <Card className="mb-6 bg-blue-500/10 border-blue-500/30">
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💡</div>
                  <div>
                    <div className="font-bold text-blue-400 mb-2">신호 검증이란?</div>
                    <div className="text-sm text-gray-300">
                      과거 2년 데이터에서 점수가 {signalThreshold}점 이상인 신호가 발생했을 때,
                      실제로 1주일/1개월/3개월 후 수익이 났는지 검증합니다.
                      <br />
                      <strong className="text-white">승률</strong>이 높을수록 신뢰할 수 있는 신호입니다.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 설정 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent>
                  <label className="text-xs text-gray-400 mb-2 block">종목</label>
                  <select
                    value={signalSymbol}
                    onChange={(e) => setSignalSymbol(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <optgroup label="주식/ETF">
                      <option value="SPY">SPY (S&P 500)</option>
                      <option value="QQQ">QQQ (NASDAQ)</option>
                      <option value="GLD">GLD (금)</option>
                      <option value="TLT">TLT (장기 국채)</option>
                    </optgroup>
                    <optgroup label="암호화폐">
                      <option value="BTC">BTC (비트코인)</option>
                      <option value="ETH">ETH (이더리움)</option>
                      <option value="SOL">SOL (솔라나)</option>
                    </optgroup>
                  </select>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <label className="text-xs text-gray-400 mb-2 block">
                    신호 점수 기준 (현재: {signalThreshold}점)
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="90"
                    value={signalThreshold}
                    onChange={(e) => setSignalThreshold(Number(e.target.value))}
                    className="w-full accent-blue-500 mt-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>50점</span>
                    <span>75점</span>
                    <span>90점</span>
                  </div>
                  <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
                    💡 백테스트는 중립 매크로 사용 → 최고 점수 ~68점. 권장: 50~65점
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Button
                    onClick={runSignalValidation}
                    disabled={signalLoading}
                    className="w-full mt-5"
                  >
                    {signalLoading ? "⚙️ 검증 중..." : "🔍 신호 검증 시작"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* 결과 */}
            {signalResult && (
              <>
                {/* 요약 통계 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent>
                      <div className="text-xs text-blue-400 mb-1">발생 신호 수</div>
                      <div className="text-3xl font-bold">{signalResult.totalSignals}개</div>
                    </CardContent>
                  </Card>

                  <Card className={signalResult.winRate1w >= 50 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}>
                    <CardContent>
                      <div className="text-xs text-gray-400 mb-1">1주일 승률</div>
                      <div className={`text-3xl font-bold ${signalResult.winRate1w >= 50 ? "text-green-400" : "text-red-400"}`}>
                        {signalResult.winRate1w.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={signalResult.winRate1m >= 50 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}>
                    <CardContent>
                      <div className="text-xs text-gray-400 mb-1">1개월 승률</div>
                      <div className={`text-3xl font-bold ${signalResult.winRate1m >= 50 ? "text-green-400" : "text-red-400"}`}>
                        {signalResult.winRate1m.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={signalResult.winRate3m >= 50 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}>
                    <CardContent>
                      <div className="text-xs text-gray-400 mb-1">3개월 승률</div>
                      <div className={`text-3xl font-bold ${signalResult.winRate3m >= 50 ? "text-green-400" : "text-red-400"}`}>
                        {signalResult.winRate3m.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 평균 수익률 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent>
                      <div className="text-xs text-gray-400 mb-1">1주일 평균 수익률</div>
                      <div className={`text-2xl font-bold ${signalResult.avgReturn1w >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {signalResult.avgReturn1w >= 0 ? "+" : ""}{signalResult.avgReturn1w.toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent>
                      <div className="text-xs text-gray-400 mb-1">1개월 평균 수익률</div>
                      <div className={`text-2xl font-bold ${signalResult.avgReturn1m >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {signalResult.avgReturn1m >= 0 ? "+" : ""}{signalResult.avgReturn1m.toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent>
                      <div className="text-xs text-gray-400 mb-1">3개월 평균 수익률</div>
                      <div className={`text-2xl font-bold ${signalResult.avgReturn3m >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {signalResult.avgReturn3m >= 0 ? "+" : ""}{signalResult.avgReturn3m.toFixed(2)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 승률 차트 */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>📊 기간별 승률 비교</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[
                          {
                            period: "1주일",
                            승률: signalResult.winRate1w,
                            평균수익률: signalResult.avgReturn1w,
                          },
                          {
                            period: "1개월",
                            승률: signalResult.winRate1m,
                            평균수익률: signalResult.avgReturn1m,
                          },
                          {
                            period: "3개월",
                            승률: signalResult.winRate3m,
                            평균수익률: signalResult.avgReturn3m,
                          },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                        <XAxis dataKey="period" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip
                          contentStyle={{
                            background: "#0a1020",
                            border: "1px solid #1e3a5f",
                            borderRadius: 8,
                          }}
                        />
                        <Legend />
                        <Bar dataKey="승률" fill="#22c55e" />
                        <Bar dataKey="평균수익률" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* 신호 내역 */}
                <Card>
                  <CardHeader>
                    <CardTitle>📋 신호 발생 내역 (최근 10개)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800 text-xs text-gray-400">
                            <th className="text-left py-3 px-2">날짜</th>
                            <th className="text-right py-3 px-2">점수</th>
                            <th className="text-right py-3 px-2">가격</th>
                            <th className="text-right py-3 px-2">1주일</th>
                            <th className="text-right py-3 px-2">1개월</th>
                            <th className="text-right py-3 px-2">3개월</th>
                          </tr>
                        </thead>
                        <tbody>
                          {signalResult.signals.slice(0, 10).map((signal: any, i: number) => (
                            <tr key={i} className="border-b border-gray-800/50">
                              <td className="py-3 px-2">{signal.date}</td>
                              <td className="text-right py-3 px-2 font-bold text-blue-400">
                                {signal.score}
                              </td>
                              <td className="text-right py-3 px-2">
                                ${signal.price.toFixed(2)}
                              </td>
                              <td className={`text-right py-3 px-2 font-semibold ${signal.return1w >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {signal.return1w >= 0 ? "+" : ""}{signal.return1w.toFixed(2)}%
                              </td>
                              <td className={`text-right py-3 px-2 font-semibold ${signal.return1m >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {signal.return1m >= 0 ? "+" : ""}{signal.return1m.toFixed(2)}%
                              </td>
                              <td className={`text-right py-3 px-2 font-semibold ${signal.return3m >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {signal.return3m >= 0 ? "+" : ""}{signal.return3m.toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* 빈 상태 */}
            {!signalResult && !signalLoading && (
              <Card className="text-center py-20">
                <CardContent>
                  <div className="text-6xl mb-4">🎯</div>
                  <div className="text-xl font-bold mb-2">신호 검증을 시작하세요</div>
                  <div className="text-gray-400">
                    종목을 선택하고 "신호 검증 시작" 버튼을 클릭하세요
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 전략 백테스트 탭 */}
        {activeTab === "strategy" && (
          <div>
            {/* 전략 선택 */}
            <div className="mb-6">
              <h2 className="text-sm text-gray-400 mb-3">전략 선택</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(STRATEGIES).map(([key, s]) => (
                  <button
                    key={key}
                    onClick={() => setStrategy(key)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      strategy === key
                        ? `border-[${s.color}] bg-[${s.color}]/10`
                        : "border-gray-800 bg-[#0a1020]"
                    }`}
                  >
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <div className="text-xs font-bold">{s.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 설정 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent>
                  <label className="text-xs text-gray-400 mb-2 block">종목</label>
                  <select
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <optgroup label="주식/ETF">
                      <option value="SPY">SPY (S&P 500)</option>
                      <option value="QQQ">QQQ (NASDAQ)</option>
                      <option value="GLD">GLD (금)</option>
                    </optgroup>
                    <optgroup label="암호화폐">
                      <option value="BTC">BTC (비트코인)</option>
                      <option value="ETH">ETH (이더리움)</option>
                      <option value="SOL">SOL (솔라나)</option>
                    </optgroup>
                  </select>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <label className="text-xs text-gray-400 mb-2 block">기간 (현재: {years}년)</label>
                  <select
                    value={years}
                    onChange={(e) => setYears(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value={1}>1년 (권장)</option>
                    <option value={2}>2년</option>
                    <option value={3}>3년</option>
                    <option value={5}>5년</option>
                  </select>
                  <div className="mt-2 text-xs text-yellow-400">
                    💡 암호화폐는 최대 2-3년 권장 (데이터 제한)
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <label className="text-xs text-gray-400 mb-2 block">초기 자본</label>
                  <input
                    type="text"
                    value={capital}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/\D/g, '');
                      setCapital(parseInt(numericValue, 10) || 0);
                    }}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Button onClick={runBacktest} disabled={loading} className="w-full mt-5">
                    {loading ? "⚙️ 계산 중..." : "🚀 백테스트 실행"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* 현실적 백테스팅 옵션 */}
            <Card className="mb-6 bg-purple-500/10 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-sm text-purple-400">⚙️ 현실적 백테스팅 옵션</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableTax}
                        onChange={(e) => setEnableTax(e.target.checked)}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <span className="text-sm text-white">양도소득세 22% 적용</span>
                    </label>
                    <p className="text-xs text-gray-400 mt-1 ml-6">
                      매도 시 양도차익에 대해 22% 과세
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">수수료율 (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={(commission * 100).toFixed(2)}
                      onChange={(e) => setCommission(parseFloat(e.target.value) / 100 || 0)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">기본: 0.1%</p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">슬리피지 (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={(slippage * 100).toFixed(2)}
                      onChange={(e) => setSlippage(parseFloat(e.target.value) / 100 || 0)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    />
                    <p className="text-xs text-gray-400 mt-1">기본: 0.05%</p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  💡 현실적인 거래 비용을 반영하여 실제 수익률에 가깝게 백테스트합니다.
                </div>
              </CardContent>
            </Card>

            {/* 결과 */}
            {result && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "최종 자산", value: formatKRW(result.stats.finalValue) },
                    { label: "총 수익률 (%)", value: `${parseFloat(result.stats.totalReturn).toFixed(1).replace(/\.0$/, "")}%` },
                    { label: "CAGR (연평균복리수익률)", value: `${parseFloat(result.stats.cagr).toFixed(1).replace(/\.0$/, "")}%` },
                    { label: "MDD (최대낙폭)", value: `-${parseFloat(result.stats.mdd).toFixed(1).replace(/\.0$/, "")}%` },
                    { label: "샤프지수 (위험대비수익)", value: parseFloat(result.stats.sharpe).toFixed(2).replace(/\.?0+$/, "") },
                    { label: "총 매매 횟수", value: `${result.stats.totalTrades}회` },
                    { label: "승률 (%)", value: `${parseFloat(result.stats.winRate).toFixed(1).replace(/\.0$/, "")}%` },
                    { label: "검증 기간", value: `${parseFloat(result.stats.years).toFixed(1).replace(/\.0$/, "")}년` },
                  ].map((stat, i) => (
                    <Card key={i}>
                      <CardContent>
                        <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
                        <div className="text-xl font-bold">{stat.value}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* 거래 비용 상세 */}
                {result.stats.totalCommission && (
                  <Card className="mb-6 bg-orange-500/10 border-orange-500/30">
                    <CardHeader>
                      <CardTitle className="text-sm text-orange-400">💰 거래 비용 분석</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">총 수수료</div>
                          <div className="text-xl font-bold text-red-400">
                            -{formatKRW(parseFloat(result.stats.totalCommission))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">총 세금</div>
                          <div className="text-xl font-bold text-red-400">
                            -{formatKRW(parseFloat(result.stats.totalTax))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">순수익 (비용 제외)</div>
                          <div className={`text-xl font-bold ${parseFloat(result.stats.netProfit) >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {parseFloat(result.stats.netProfit) >= 0 ? "+" : ""}{formatKRW(Math.abs(parseFloat(result.stats.netProfit)))}
                          </div>
                        </div>
                      </div>
                      {result.stats.actualReturn !== undefined && (
                        <div className="pt-4 border-t border-orange-500/20">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">실제 수익률 (수수료·세금 차감)</span>
                            <span className={`text-lg font-bold ${parseFloat(result.stats.actualReturn) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {parseFloat(result.stats.actualReturn) >= 0 ? '+' : ''}{parseFloat(result.stats.actualReturn).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>📊 수익 곡선</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={result.portfolio.filter((_: any, i: number) => i % 5 === 0)}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={selectedStrategy.color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={selectedStrategy.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                        <YAxis stroke="#64748b" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            background: "#0a1020",
                            border: "1px solid #1e3a5f",
                            borderRadius: 8,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={selectedStrategy.color}
                          fillOpacity={1}
                          fill="url(#colorValue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
