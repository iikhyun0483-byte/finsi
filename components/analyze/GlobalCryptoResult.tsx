import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/common/Card";
import { ScoreMeter } from "@/components/beginner/ScoreMeter";
import { RSIGauge } from "@/components/beginner/RSIGauge";
import { CountUp } from "@/components/effects/CountUp";
import { getAssetDisplayName, getIndicatorLabel } from "@/lib/design-system";
import { Activity, DollarSign, ChevronRight } from "lucide-react";

interface GlobalCryptoResultProps {
  result: any; // Full result object from API
}

export function GlobalCryptoResult({ result }: GlobalCryptoResultProps) {
  return (
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
          </div>
        </CardContent>
      </Card>
    </>
  );
}
