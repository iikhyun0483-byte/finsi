"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/common/Card";
import { CATEGORIES } from "@/lib/korean-stocks";
import { getAssetDisplayName, getIndicatorLabel } from "@/lib/design-system";
import { Activity, ChevronRight, DollarSign } from "lucide-react";
import { ParticleBackground } from "@/components/effects/ParticleBackground";
import { ScoreMeter } from "@/components/beginner/ScoreMeter";
import { RSIGauge } from "@/components/beginner/RSIGauge";
import { CountUp } from "@/components/effects/CountUp";
import { TypingEffect } from "@/components/effects/TypingEffect";
import { calcIntegratedScore } from "@/lib/score-engine";
import { calcKellyPosition } from "@/lib/kelly";
import { applyVixFilter } from "@/lib/vix-filter";
import { ScoreGauge } from "@/components/ScoreGauge";
import { KellyCard } from "@/components/KellyCard";
import {
  safeNum,
  rsiToScore,
  macdToScore,
  bbToScore,
  buffettToScore,
  rateToScore,
} from "@/lib/score-helpers";
import { runEnsemble } from "@/lib/ensemble-engine";
import { AnalyzeHeader } from "@/components/analyze/AnalyzeHeader";
import { MarketTypeTabs } from "@/components/analyze/MarketTypeTabs";
import { SearchInput } from "@/components/analyze/SearchInput";
import { ErrorDisplay } from "@/components/analyze/ErrorDisplay";
import { KoreanResult } from "@/components/analyze/KoreanResult";
import { GlobalCryptoResult } from "@/components/analyze/GlobalCryptoResult";
import { AICommentCard } from "@/components/analyze/AICommentCard";

type MarketType = 'global' | 'crypto' | 'korean';

export default function AnalyzePage() {
  const [marketType, setMarketType] = useState<MarketType>('global');
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiComment, setAiComment] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [macro, setMacro] = useState<any>(null);

  // 한국주식 전용
  const [koreanCategory, setKoreanCategory] = useState(CATEGORIES[0]);
  const [koreanCode, setKoreanCode] = useState("");

  const handleMarketChange = (type: MarketType) => {
    setMarketType(type);
    setSymbol("");
    setKoreanCode("");
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    const targetSymbol = marketType === 'korean' ? koreanCode : symbol;

    if (!targetSymbol) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (marketType === 'korean') {
        // 한국 주식은 /api/korean-stocks 사용
        const response = await fetch(`/api/korean-stocks?code=${koreanCode}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          // 한국 주식용 간단한 결과 표시
          setResult({
            symbol: koreanCode,
            name: data.name,
            price: data.price,
            change: data.change,
            changePercent: data.changePercent,
            volume: data.volume,
            per: data.per,
            pbr: data.pbr,
            market: data.market,
            category: data.category,
            isKorean: true,
          });
        }
      } else {
        // 해외주식/암호화폐는 기존 /api/analyze 사용
        const response = await fetch(`/api/analyze?symbol=${symbol.toUpperCase()}`);
        const data = await response.json();

        if (data.success) {
          setResult(data.signal);
          setMacro(data.macroIndicators || null);

          // AI 코멘트 생성 (비동기)
          generateAIComment(data.signal, data.macroIndicators);
        } else {
          setError(data.error || "분석에 실패했습니다");
        }
      }
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("서버 연결에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  // AI 코멘트 생성 함수
  const generateAIComment = async (signal: any, macro: any) => {
    setLoadingAI(true);
    setAiComment(null);

    try {
      console.log('🤖 AI 코멘트 요청 중...', signal.symbol);

      const response = await fetch('/api/ai-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: signal.symbol,
          score: signal.score,
          rsi: signal.rsi,
          macd: signal.macd,
          price: signal.price,
          fearGreed: macro?.fearGreed || 50,
          vix: macro?.vix || 15,
          fedRate: macro?.fedRate || 3,
          goldenCross: signal.goldenCross,
          deadCross: signal.deadCross,
          week52High: signal.week52High,
          week52Low: signal.week52Low,
        }),
      });

      console.log('📡 AI 코멘트 응답 상태:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ AI 코멘트 API 에러:', errorText);
        throw new Error(`AI 코멘트 API 에러 (${response.status})`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ JSON이 아닌 응답:', text.substring(0, 200));
        throw new Error('서버가 JSON이 아닌 응답을 반환했습니다');
      }

      const data = await response.json();
      console.log('✅ AI 코멘트 응답:', data);

      if (data.success) {
        setAiComment(data.comment);
        console.log('✅ AI 코멘트 설정 완료');
      } else {
        console.error('❌ AI 코멘트 생성 실패:', data.error);
        setAiComment(`AI 코멘트 생성 실패: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (err: any) {
      console.error('❌ AI comment failed:', err);
      console.error('에러 메시지:', err.message);
      setAiComment(`AI 코멘트 오류: ${err.message}`);
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000810] text-white relative">
      {/* Particle Background */}
      <ParticleBackground />

      {/* Starfield Background */}
      <div className="stars-layer stars-small" />
      <div className="stars-layer stars-medium" />
      <div className="stars-layer stars-large" />

      <AnalyzeHeader />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <MarketTypeTabs
          marketType={marketType}
          onMarketChange={handleMarketChange}
        />

        <SearchInput
          marketType={marketType}
          symbol={symbol}
          onSymbolChange={setSymbol}
          koreanCategory={koreanCategory}
          koreanCode={koreanCode}
          onKoreanCategoryChange={setKoreanCategory}
          onKoreanCodeChange={setKoreanCode}
          loading={loading}
          onAnalyze={handleAnalyze}
        />

        {error && <ErrorDisplay error={error} />}

        {/* 결과 */}
        {result && (
          <>
            {result.isKorean ? (
              <KoreanResult result={result} />
            ) : (
              // 해외주식/암호화폐 결과
              <>
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <Activity className="w-6 h-6 text-[#00d4ff]" />
                  <h2 className="font-orbitron text-xl font-bold text-[#00d4ff]">
                    {getAssetDisplayName(result.symbol)}
                  </h2>
                  <span className="font-mono text-sm text-[rgba(255,255,255,0.4)]">
                    REAL-TIME ANALYSIS
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ScoreMeter score={result.score} label={result.name} />
                  <RSIGauge rsi={result.rsi} />
                  <Card>
                    <CardContent>
                      <div className="label-display mb-4">LAYER SCORES</div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-noto text-sm text-[rgba(255,255,255,0.7)]">
                          {getIndicatorLabel('Layer 1')}
                        </span>
                        <span className="number-display text-lg number-glow">
                          <CountUp end={result.layer1Score} duration={1200} decimals={0} />
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-noto text-sm text-[rgba(255,255,255,0.7)]">
                          {getIndicatorLabel('Layer 2')}
                        </span>
                        <span className="number-display text-lg status-profit number-glow">
                          <CountUp end={result.layer2Score} duration={1200} decimals={0} />
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-noto text-sm text-[rgba(255,255,255,0.7)]">
                          {getIndicatorLabel('Layer 3')}
                        </span>
                        <span className="number-display text-lg status-warning number-glow">
                          <CountUp end={result.layer3Score} duration={1200} decimals={0} />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>
                  <DollarSign className="w-5 h-5 inline mr-2" />
                  PRICE INFORMATION
                </CardTitle>
                <CardDescription>Real-time market data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="label-display mb-2">PRICE (USD)</div>
                    <div className="number-display text-2xl">
                      ${result.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="label-display mb-2">PRICE (KRW)</div>
                    <div className="font-orbitron text-2xl font-bold text-white">
                      ₩{result.price_krw.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="label-display mb-2">{getIndicatorLabel('RSI')}</div>
                    <div className="number-display text-2xl number-glow">
                      <CountUp end={result.rsi} duration={1200} decimals={0} />
                    </div>
                  </div>
                  <div>
                    <div className="label-display mb-2">{getIndicatorLabel('MACD')}</div>
                    <div className={`font-orbitron text-2xl font-bold number-glow ${result.macd >= 0 ? 'status-profit' : 'status-loss'}`}>
                      <CountUp end={result.macd} duration={1200} decimals={2} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 펀더멘털 데이터 (주식만) */}
            {result.fundamentals && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>
                    <Activity className="w-5 h-5 inline mr-2" />
                    FUNDAMENTAL ANALYSIS
                  </CardTitle>
                  <CardDescription>Financial metrics & ratios</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* ETF 안내 */}
                  {result.fundamentals.isETF && (
                    <div className="mb-4 p-4 bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.3)] rounded">
                      <div className="flex items-start gap-3">
                        <Activity className="w-6 h-6 text-[#00d4ff] flex-shrink-0" />
                        <div>
                          <div className="font-orbitron font-bold text-[#00d4ff] mb-2">
                            ETF (Exchange Traded Fund)
                          </div>
                          <div className="font-noto text-sm text-[rgba(255,255,255,0.7)]">
                            {result.fundamentals.etfMessage}
                          </div>
                          <div className="font-mono text-xs text-[rgba(0,212,255,0.5)] mt-2 tracking-wide">
                            <ChevronRight className="w-3 h-3 inline mr-1" />
                            EVALUATED BY TECHNICAL & MACRO INDICATORS
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 펀더멘털 지표 */}
                  {!result.fundamentals.isETF && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="label-display mb-2">{getIndicatorLabel('PER')}</div>
                          <div className={`number-display text-2xl ${
                            result.fundamentals.per !== null && result.fundamentals.per < 15 ? 'status-profit' :
                            result.fundamentals.per !== null && result.fundamentals.per > 25 ? 'status-loss' :
                            ''
                          }`}>
                            {result.fundamentals.per !== null ? result.fundamentals.per.toFixed(1) : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="label-display mb-2">{getIndicatorLabel('PBR')}</div>
                          <div className={`number-display text-2xl ${
                            result.fundamentals.pbr !== null && result.fundamentals.pbr < 1 ? 'status-profit' :
                            result.fundamentals.pbr !== null && result.fundamentals.pbr > 3 ? 'status-loss' :
                            ''
                          }`}>
                            {result.fundamentals.pbr !== null ? result.fundamentals.pbr.toFixed(1) : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="label-display mb-2">{getIndicatorLabel('ROE')}</div>
                          <div className={`number-display text-2xl ${
                            result.fundamentals.roe !== null && result.fundamentals.roe > 15 ? 'status-profit' :
                            result.fundamentals.roe !== null && result.fundamentals.roe < 5 ? 'status-loss' :
                            ''
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
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 뉴스 분석 */}
            {result.news && result.news.articles && result.news.articles.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>
                    <Activity className="w-5 h-5 inline mr-2" />
                    NEWS SENTIMENT ANALYSIS
                  </CardTitle>
                  <CardDescription>AI-powered market sentiment (Gemini)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 grid grid-cols-3 gap-3">
                    <div className="bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.3)] rounded p-3">
                      <div className="label-display mb-2">POSITIVE</div>
                      <div className="number-display text-2xl status-profit">{result.news.positiveCount}</div>
                    </div>
                    <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded p-3">
                      <div className="label-display mb-2">NEUTRAL</div>
                      <div className="number-display text-2xl">{result.news.neutralCount}</div>
                    </div>
                    <div className="bg-[rgba(255,68,102,0.1)] border border-[rgba(255,68,102,0.3)] rounded p-3">
                      <div className="label-display mb-2">NEGATIVE</div>
                      <div className="number-display text-2xl status-loss">{result.news.negativeCount}</div>
                    </div>
                  </div>
                  <div className={`mb-4 p-4 rounded ${
                    result.news.overallSentiment > 3 ? 'bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.3)]' :
                    result.news.overallSentiment < -3 ? 'bg-[rgba(255,68,102,0.1)] border border-[rgba(255,68,102,0.3)]' :
                    'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]'
                  }`}>
                    <div className="label-display mb-2">MARKET SENTIMENT SCORE</div>
                    <div className={`font-orbitron text-3xl font-bold ${
                      result.news.overallSentiment > 3 ? 'status-profit' :
                      result.news.overallSentiment < -3 ? 'status-loss' :
                      'status-cyan'
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
                  <CardTitle>
                    <Activity className="w-5 h-5 inline mr-2" />
                    RISK MANAGEMENT
                  </CardTitle>
                  <CardDescription>Kelly Criterion position sizing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.3)] rounded p-3">
                      <div className="label-display mb-2">POSITION</div>
                      <div className="number-display text-2xl">
                        {result.riskProfile.recommendedPosition.toFixed(1)}%
                      </div>
                      <div className="font-mono text-xs text-[rgba(255,255,255,0.4)] mt-1">OF PORTFOLIO</div>
                    </div>
                    <div className="bg-[rgba(255,68,102,0.1)] border border-[rgba(255,68,102,0.3)] rounded p-3">
                      <div className="label-display mb-2">STOP LOSS</div>
                      <div className="number-display text-2xl status-loss">
                        -{result.riskProfile.stopLoss.toFixed(1)}%
                      </div>
                      <div className="font-mono text-xs text-[rgba(255,255,255,0.4)] mt-1">FROM ENTRY</div>
                    </div>
                    <div className="bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.3)] rounded p-3">
                      <div className="label-display mb-2">TAKE PROFIT</div>
                      <div className="number-display text-2xl status-profit">
                        +{result.riskProfile.takeProfit.toFixed(1)}%
                      </div>
                      <div className="font-mono text-xs text-[rgba(255,255,255,0.4)] mt-1">FROM ENTRY</div>
                    </div>
                    <div className="bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.3)] rounded p-3">
                      <div className="label-display mb-2">WIN RATE</div>
                      <div className="number-display text-2xl">
                        {(result.riskProfile.winRate * 100).toFixed(0)}%
                      </div>
                      <div className="font-mono text-xs text-[rgba(255,255,255,0.4)] mt-1">ESTIMATED</div>
                    </div>
                  </div>
                  <div className="bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.3)] rounded p-4">
                    <div className="font-orbitron text-sm status-warning mb-3 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4" />
                      KELLY CRITERION STRATEGY
                    </div>
                    <div className="font-noto text-sm text-[rgba(255,255,255,0.7)] space-y-1">
                      <div>• 포지션: 총 자산의 {result.riskProfile.recommendedPosition.toFixed(1)}% 투자 권장</div>
                      <div>• 손절: 진입가 대비 -{result.riskProfile.stopLoss.toFixed(1)}% 도달 시 매도</div>
                      <div>• 익절: 진입가 대비 +{result.riskProfile.takeProfit.toFixed(1)}% 도달 시 일부 매도 고려</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>
                  <Activity className="w-5 h-5 inline mr-2" />
                  AI RECOMMENDATION
                </CardTitle>
                <CardDescription>J.A.R.V.I.S enhanced signal analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className={`rounded p-5 ${
                    result.score >= 75 ? 'bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.3)]' :
                    result.score >= 55 ? 'bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.3)]' :
                    result.score >= 40 ? 'bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.3)]' :
                    'bg-[rgba(255,68,102,0.1)] border border-[rgba(255,68,102,0.3)]'
                  }`}>
                    <div className="label-display mb-3">SIGNAL</div>
                    <div className={`font-orbitron text-3xl font-bold mb-4 ${
                      result.score >= 75 ? 'status-profit' :
                      result.score >= 55 ? 'status-cyan' :
                      result.score >= 40 ? 'status-warning' :
                      'status-loss'
                    }`}>
                      {result.action}
                    </div>
                    <div className="font-mono text-sm text-[rgba(255,255,255,0.5)]">
                      SCORE: <span className="number-display number-glow"><CountUp end={result.score} duration={1500} decimals={0} /></span> / 100
                    </div>
                  </div>

                  <div className="font-noto text-sm text-[rgba(255,255,255,0.7)] bg-[rgba(0,20,45,0.5)] rounded p-4">
                    <div className="label-display mb-3">ANALYSIS COMPLETED</div>
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
                          <span>뉴스 분석 (Gemini AI)</span>
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

                  {/* AI 투자 코멘트 */}
                  <div className="mt-6 jarvis-card p-5">
                    <div className="label-display mb-3 flex items-center gap-2">
                      <span className="text-[#00FFD1]">🤖</span>
                      AI 투자 코멘트 (Gemini)
                    </div>
                    {loadingAI ? (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Activity className="w-4 h-4 animate-spin" />
                        <span className="font-mono text-sm">AI 분석 중...</span>
                      </div>
                    ) : aiComment ? (
                      <div className="font-noto text-sm leading-relaxed text-gray-300 bg-[rgba(0,255,180,0.05)] border border-[rgba(0,255,180,0.1)] rounded p-4">
                        <TypingEffect text={aiComment} speed={20} />
                      </div>
                    ) : (
                      <div className="font-mono text-sm text-gray-500">
                        AI 코멘트를 생성하려면 Gemini API 키를 설정하세요.
                      </div>
                    )}
                  </div>

                  {/* ── 통합 신호 점수 ── */}
                  {!result.isKorean && macro && (
                    <>
                      <div style={{ marginTop: 24 }}>
                        {(() => {
                          const analyzeScore = calcIntegratedScore({
                            rsiScore: rsiToScore(result?.rsi),
                            macdScore: macdToScore(result?.macd),
                            bbScore: bbToScore(0.5),
                            vix: safeNum(macro?.vix, 20),
                            buffettScore: buffettToScore(macro?.buffett ?? macro?.buffettIndicator),
                            rateScore: rateToScore(macro?.fedRate),
                            newsFactorScore: safeNum(result?.layer3Score, 50),
                          });

                          const vixFiltered = applyVixFilter({
                            vix: safeNum(macro?.vix, 20),
                            cryptoFearGreed: safeNum(macro?.fearGreed, 50),
                            originalScore: analyzeScore.totalScore,
                            assetType: 'stock',
                          });

                          return (
                            <>
                              <ScoreGauge
                                score={vixFiltered.adjustedScore}
                                signal={analyzeScore.signal}
                                confidence={analyzeScore.confidence}
                                layer1={analyzeScore.layer1Score}
                                layer2={analyzeScore.layer2Score}
                                layer3={analyzeScore.layer3Score}
                                vixPenalty={analyzeScore.vixPenalty}
                              />

                              {/* ── Kelly 포지션 ── */}
                              {analyzeScore.signal !== 'HOLD' ? (
                                <div style={{ marginTop: 16 }}>
                                  <KellyCard
                                    kellyOutput={calcKellyPosition({
                                      signalScore: analyzeScore.totalScore,
                                      currentPrice: safeNum(result?.price, 100),
                                      maxAllocation: 0.25,
                                    })}
                                    ticker={result?.symbol ?? 'TICKER'}
                                    currentPrice={safeNum(result?.price, 100)}
                                    priceInKRW={result?.price_krw}
                                  />
                                </div>
                              ) : (
                                <div style={{
                                  marginTop: 16,
                                  padding: '12px 16px',
                                  background: 'rgba(0,170,255,0.08)',
                                  border: '1px solid rgba(0,170,255,0.2)',
                                  borderRadius: 8,
                                  color: '#00AAFF',
                                  fontSize: 13,
                                  fontFamily: 'IBM Plex Mono',
                                }}>
                                  ⏸ 관망 구간 — 포지션 산출 보류
                                </div>
                              )}

                              {/* CAUTION 경고 배너 */}
                              {vixFiltered.riskLevel === 'HIGH' || vixFiltered.riskLevel === 'EXTREME' ? (
                                <div style={{
                                  marginTop: 12,
                                  padding: '10px 16px',
                                  background: 'rgba(255,140,0,0.12)',
                                  border: '1px solid rgba(255,140,0,0.4)',
                                  borderRadius: 8,
                                  color: '#FFA500',
                                  fontSize: 13,
                                }}>
                                  ⚠ {vixFiltered.warningMessage}
                                </div>
                              ) : null}

                              {/* 앙상블 최종 판단 */}
                              {(() => {
                                const vixLevel = safeNum(macro?.vix, 20);
                                const regime = vixLevel > 30 ? 'crisis' : vixLevel > 20 ? 'neutral' : vixLevel < 15 ? 'bull' : 'neutral';
                                const rsi = safeNum(result?.rsi, 50);
                                const macd = safeNum(result?.macd, 0);
                                const maSignal = macd > 0 ? 'buy' : macd < 0 ? 'sell' : 'neutral';
                                const volumeSignal = 'normal';
                                const kellyFraction = vixFiltered.adjustedScore > 80 ? 0.2 : vixFiltered.adjustedScore > 60 ? 0.15 : 0.1;

                                const ensemble = runEnsemble({
                                  score: vixFiltered.adjustedScore,
                                  kellyFraction,
                                  vixLevel,
                                  regime: regime as 'bull' | 'bear' | 'neutral' | 'crisis',
                                  rsi,
                                  maSignal: maSignal as 'buy' | 'sell' | 'neutral',
                                  volumeSignal: volumeSignal as 'surge' | 'dry' | 'normal',
                                });

                                return (
                                  <div className="bg-[#1a2035] rounded-xl p-5 mt-4">
                                    <h3 className="text-sm font-semibold text-gray-300 mb-3">🤖 앙상블 최종 판단</h3>
                                    <div className="flex items-center justify-between mb-3">
                                      <span className={`text-2xl font-bold ${
                                        ensemble.verdict.includes('매수') ? 'text-green-400' :
                                        ensemble.verdict.includes('매도') ? 'text-red-400' : 'text-yellow-400'
                                      }`}>{ensemble.verdict}</span>
                                      <span className="text-gray-400 text-sm">확신도 {ensemble.confidence}%</span>
                                    </div>
                                    <div className="space-y-1 mb-3">
                                      {ensemble.reasoning.map((r, idx) => (
                                        <p key={idx} className="text-gray-400 text-xs">• {r}</p>
                                      ))}
                                    </div>
                                    <div className="flex justify-between text-sm border-t border-gray-700 pt-3">
                                      <span className="text-gray-400">
                                        조정 Kelly: <span className="text-orange-400 font-medium">
                                          {(ensemble.finalKelly * 100).toFixed(1)}%
                                        </span>
                                      </span>
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        ensemble.riskLevel === 'extreme' ? 'bg-red-900 text-red-400' :
                                        ensemble.riskLevel === 'high' ? 'bg-orange-900 text-orange-400' :
                                        ensemble.riskLevel === 'medium' ? 'bg-yellow-900 text-yellow-400' :
                                        'bg-green-900 text-green-400'
                                      }`}>
                                        {ensemble.riskLevel === 'extreme' ? '극단 위험' :
                                         ensemble.riskLevel === 'high' ? '높은 위험' :
                                         ensemble.riskLevel === 'medium' ? '중간 위험' : '낮은 위험'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </>
                          );
                        })()}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            </>
            )}
          </>
        )}

        {!result && !loading && !error && (
          <div className="text-center py-20">
            <Activity className="w-16 h-16 text-[#00d4ff] mx-auto mb-6 animate-pulse" />
            <div className="font-orbitron text-xl font-bold text-[#00d4ff] mb-3">
              AWAITING INPUT
            </div>
            <div className="font-noto text-sm text-[rgba(255,255,255,0.5)]">
              종목 코드를 입력하여 3-Layer 분석을 시작하세요
            </div>
          </div>
        )}

        {result && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.3)] rounded px-5 py-3">
              <Activity className="w-4 h-4 text-[#00FF88]" />
              <span className="font-mono text-sm status-profit tracking-wide">
                ANALYSIS COMPLETE - REAL-TIME DATA
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
