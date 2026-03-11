"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { ScoreMeter } from "@/components/beginner/ScoreMeter";
import { RSIGauge } from "@/components/beginner/RSIGauge";

export default function AnalyzePage() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!symbol) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/analyze?symbol=${symbol.toUpperCase()}`);
      const data = await response.json();

      if (data.success) {
        setResult(data.signal);
      } else {
        setError(data.error || "분석에 실패했습니다");
      }
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("서버 연결에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <header className="border-b border-gray-800 bg-gradient-to-r from-[#0d1321] to-[#0f1e35]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="text-xs tracking-[4px] text-blue-400 mb-1">ASSET ANALYSIS</div>
          <h1 className="text-2xl font-bold">📊 종목 분석</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* 검색 */}
        <Card className="mb-8">
          <CardContent>
            <div className="flex gap-3">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                onFocus={(e) => e.target.select()}
                placeholder="종목 코드 입력 (예: SPY, QQQ, BTC, ETH)"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
              />
              <Button onClick={handleAnalyze} disabled={loading || !symbol}>
                {loading ? "⚙️ 분석 중..." : "🔍 분석하기"}
              </Button>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              💡 지원 종목: SPY, QQQ, GLD, SLV, USO, TLT, VNQ / BTC, ETH, SOL, XRP (실시간 데이터)
            </div>
          </CardContent>
        </Card>

        {/* 에러 */}
        {error && (
          <Card className="mb-8 border-red-500/30 bg-red-500/10">
            <CardContent>
              <div className="text-center py-6">
                <div className="text-4xl mb-3">⚠️</div>
                <div className="text-red-400 font-semibold">{error}</div>
                <div className="text-sm text-gray-400 mt-2">
                  종목 코드를 확인하거나 다른 종목을 시도해보세요
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 결과 */}
        {result && (
          <>
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-4">
                📈 {result.symbol} 실시간 분석 결과
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ScoreMeter score={result.score} label={result.name} />
                <RSIGauge rsi={result.rsi} />
                <Card>
                  <CardContent>
                    <div className="text-xs text-gray-400 mb-4">레이어별 점수</div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Layer 1 (기술)</span>
                        <span className="text-lg font-bold text-blue-400">
                          {result.layer1Score}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Layer 2 (팩터)</span>
                        <span className="text-lg font-bold text-green-400">
                          {result.layer2Score}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Layer 3 (매크로)</span>
                        <span className="text-lg font-bold text-yellow-400">
                          {result.layer3Score}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>💰 현재 가격 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">현재가 (USD)</div>
                    <div className="text-2xl font-bold">
                      ${result.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">현재가 (KRW)</div>
                    <div className="text-2xl font-bold text-blue-400">
                      ₩{result.price_krw.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">RSI</div>
                    <div className="text-2xl font-bold text-purple-400">
                      {result.rsi}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">MACD</div>
                    <div className={`text-2xl font-bold ${result.macd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {result.macd.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 펀더멘털 데이터 (주식만) */}
            {result.fundamentals && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>📊 펀더멘털 분석</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">PER (주가수익비율)</div>
                      <div className={`text-2xl font-bold ${
                        result.fundamentals.per !== null && result.fundamentals.per < 15 ? 'text-green-400' :
                        result.fundamentals.per !== null && result.fundamentals.per > 25 ? 'text-red-400' :
                        'text-gray-300'
                      }`}>
                        {result.fundamentals.per !== null ? result.fundamentals.per.toFixed(1) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">PBR (주가순자산비율)</div>
                      <div className={`text-2xl font-bold ${
                        result.fundamentals.pbr !== null && result.fundamentals.pbr < 1 ? 'text-green-400' :
                        result.fundamentals.pbr !== null && result.fundamentals.pbr > 3 ? 'text-red-400' :
                        'text-gray-300'
                      }`}>
                        {result.fundamentals.pbr !== null ? result.fundamentals.pbr.toFixed(1) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">ROE (자기자본이익률)</div>
                      <div className={`text-2xl font-bold ${
                        result.fundamentals.roe !== null && result.fundamentals.roe > 15 ? 'text-green-400' :
                        result.fundamentals.roe !== null && result.fundamentals.roe < 5 ? 'text-red-400' :
                        'text-gray-300'
                      }`}>
                        {result.fundamentals.roe !== null ? `${result.fundamentals.roe.toFixed(1)}%` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">부채비율</div>
                      <div className={`text-2xl font-bold ${
                        result.fundamentals.debtToEquity !== null && result.fundamentals.debtToEquity < 50 ? 'text-green-400' :
                        result.fundamentals.debtToEquity !== null && result.fundamentals.debtToEquity > 150 ? 'text-red-400' :
                        'text-gray-300'
                      }`}>
                        {result.fundamentals.debtToEquity !== null ? `${result.fundamentals.debtToEquity.toFixed(0)}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                  {result.fundamentalScore && (
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="text-sm text-blue-400">
                        💎 펀더멘털 점수: <span className="font-bold text-lg">{result.fundamentalScore.toFixed(0)}</span> / 40점
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 뉴스 감성 분석 */}
            {result.news && result.news.articles && result.news.articles.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>📰 뉴스 감성 분석</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 grid grid-cols-3 gap-3">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="text-xs text-gray-400">긍정 뉴스</div>
                      <div className="text-2xl font-bold text-green-400">{result.news.positiveCount}</div>
                    </div>
                    <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-3">
                      <div className="text-xs text-gray-400">중립 뉴스</div>
                      <div className="text-2xl font-bold text-gray-400">{result.news.neutralCount}</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="text-xs text-gray-400">부정 뉴스</div>
                      <div className="text-2xl font-bold text-red-400">{result.news.negativeCount}</div>
                    </div>
                  </div>
                  <div className={`mb-4 p-3 rounded-lg ${
                    result.news.overallSentiment > 3 ? 'bg-green-500/10 border border-green-500/30' :
                    result.news.overallSentiment < -3 ? 'bg-red-500/10 border border-red-500/30' :
                    'bg-gray-500/10 border border-gray-500/30'
                  }`}>
                    <div className="text-sm text-gray-400 mb-1">전체 감성 점수</div>
                    <div className={`text-2xl font-bold ${
                      result.news.overallSentiment > 3 ? 'text-green-400' :
                      result.news.overallSentiment < -3 ? 'text-red-400' :
                      'text-gray-300'
                    }`}>
                      {result.news.overallSentiment > 0 ? '+' : ''}{result.news.overallSentiment.toFixed(1)} / 10
                    </div>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.news.articles.slice(0, 5).map((article: any, idx: number) => (
                      <a
                        key={idx}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`text-lg ${
                            article.sentiment === 'positive' ? 'text-green-400' :
                            article.sentiment === 'negative' ? 'text-red-400' :
                            'text-gray-400'
                          }`}>
                            {article.sentiment === 'positive' ? '📈' :
                             article.sentiment === 'negative' ? '📉' : '➡️'}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-white mb-1">{article.title}</div>
                            <div className="text-xs text-gray-500">{article.source} • {new Date(article.publishedAt).toLocaleDateString('ko-KR')}</div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 리스크 관리 */}
            {result.riskProfile && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>⚖️ 리스크 관리 가이드</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">권장 포지션</div>
                      <div className="text-2xl font-bold text-purple-400">
                        {result.riskProfile.recommendedPosition.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">포트폴리오 대비</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">손절가</div>
                      <div className="text-2xl font-bold text-red-400">
                        -{result.riskProfile.stopLoss.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">진입가 대비</div>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">익절가</div>
                      <div className="text-2xl font-bold text-green-400">
                        +{result.riskProfile.takeProfit.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">진입가 대비</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">예상 승률</div>
                      <div className="text-2xl font-bold text-blue-400">
                        {(result.riskProfile.winRate * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">신호 기반 추정</div>
                    </div>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="text-sm text-yellow-400 mb-2">
                      💡 Kelly Criterion 기반 포지션 사이징
                    </div>
                    <div className="text-xs text-gray-300">
                      • 포지션: 총 자산의 {result.riskProfile.recommendedPosition.toFixed(1)}% 투자 권장<br />
                      • 손절: 진입가 대비 -{result.riskProfile.stopLoss.toFixed(1)}% 도달 시 매도<br />
                      • 익절: 진입가 대비 +{result.riskProfile.takeProfit.toFixed(1)}% 도달 시 일부 매도 고려
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>💡 AI 투자 조언</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className={`rounded-lg p-4 ${
                    result.score >= 75 ? 'bg-green-500/10 border border-green-500/30' :
                    result.score >= 55 ? 'bg-blue-500/10 border border-blue-500/30' :
                    result.score >= 40 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                    'bg-red-500/10 border border-red-500/30'
                  }`}>
                    <div className={`font-bold mb-2 ${
                      result.score >= 75 ? 'text-green-400' :
                      result.score >= 55 ? 'text-blue-400' :
                      result.score >= 40 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      🎯 투자 신호
                    </div>
                    <div className="text-2xl font-bold mb-3">{result.action}</div>
                    <div className="text-sm text-gray-400">
                      최종 점수: {result.score}점 / 100점
                    </div>
                  </div>

                  <div className="text-sm text-gray-300 bg-gray-800/50 rounded-lg p-4">
                    <div className="font-bold mb-3">📋 분석 완료 항목 (Enhanced)</div>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✅</span>
                        <span>RSI, MACD, 볼린저밴드 기술적 분석</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✅</span>
                        <span>12개월/3개월 모멘텀 팩터</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✅</span>
                        <span>공포탐욕지수, VIX, 기준금리, 버핏지수</span>
                      </li>
                      {result.fundamentals && (
                        <li className="flex items-center gap-2">
                          <span className="text-blue-500">🆕</span>
                          <span>펀더멘털 분석 (PER, PBR, ROE, 부채비율)</span>
                        </li>
                      )}
                      {result.news && (
                        <li className="flex items-center gap-2">
                          <span className="text-blue-500">🆕</span>
                          <span>뉴스 감성 분석 (Gemini AI)</span>
                        </li>
                      )}
                      {result.cryptoBoost && (
                        <li className="flex items-center gap-2">
                          <span className="text-blue-500">🆕</span>
                          <span>암호화폐 거래량 급증 감지 ({result.cryptoBoost.volumeMultiple.toFixed(1)}배)</span>
                        </li>
                      )}
                      {result.riskProfile && (
                        <li className="flex items-center gap-2">
                          <span className="text-blue-500">🆕</span>
                          <span>Kelly Criterion 리스크 관리</span>
                        </li>
                      )}
                      {result.leadingIndicators && (
                        <li className="flex items-center gap-2">
                          <span className="text-blue-500">🆕</span>
                          <span>선행 지표 (Short Ratio, Put/Call, 섹터 흐름)</span>
                        </li>
                      )}
                      {result.correlationAdjustment !== undefined && result.correlationAdjustment !== 0 && (
                        <li className="flex items-center gap-2">
                          <span className="text-blue-500">🆕</span>
                          <span>상관관계 조정 ({result.correlationAdjustment > 0 ? '+' : ''}{result.correlationAdjustment}점)</span>
                        </li>
                      )}
                      <li className="flex items-center gap-2">
                        <span className="text-green-500">✅</span>
                        <span>실시간 시장 데이터 (Yahoo Finance / Binance)</span>
                      </li>
                    </ul>
                  </div>

                  {result.highRisk && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
                        ⚠️ HIGH RISK
                      </div>
                      <div className="text-sm text-gray-300">
                        이 자산은 변동성이 높습니다. 투자 시 주의하세요.
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!result && !loading && !error && (
          <div className="text-center py-20 text-gray-500">
            <div className="text-4xl mb-4">🔍</div>
            <div className="text-lg mb-2">종목 코드를 입력하고 분석을 시작하세요</div>
            <div className="text-sm text-gray-600">
              실제 API 데이터로 3레이어 분석을 수행합니다
            </div>
          </div>
        )}

        {result && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">
              <span className="text-sm text-green-400">
                ✅ 실시간 데이터 분석 완료 (Yahoo Finance, Binance)
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
