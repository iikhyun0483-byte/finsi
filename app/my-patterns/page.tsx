'use client'
import { useState, useEffect } from 'react'
import { analyzePatterns, type PatternInsights } from '@/lib/pattern-analyzer'

export default function MyPatternsPage() {
  const [insights, setInsights] = useState<PatternInsights | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPatterns()
  }, [])

  async function loadPatterns() {
    setLoading(true)
    try {
      const data = await analyzePatterns()
      setInsights(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-orange-400 mb-6">내 매매 패턴 분석</h1>
          <div className="bg-gray-900 rounded-xl p-8 text-center">
            <div className="text-gray-500 animate-pulse">분석 중...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!insights || insights.totalTrades === 0) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-orange-400 mb-6">내 매매 패턴 분석</h1>
          <div className="bg-gray-900 rounded-xl p-8 text-center">
            <p className="text-gray-500 mb-2">거래 데이터가 부족합니다</p>
            <p className="text-gray-600 text-sm">투자 일지에서 최소 1건 이상의 매수/매도 쌍이 필요합니다</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">내 매매 패턴 분석</h1>
          <p className="text-gray-500 text-sm mt-1">거래 일지 기반 행동 패턴 학습</p>
        </div>

        {/* 기본 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">총 거래</p>
            <p className="text-2xl font-bold text-white">{insights.totalTrades}회</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">승률</p>
            <p className={`text-2xl font-bold ${insights.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
              {insights.winRate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">평균 수익</p>
            <p className="text-2xl font-bold text-green-400">+{insights.avgWinPercent.toFixed(1)}%</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">평균 손실</p>
            <p className="text-2xl font-bold text-red-400">-{insights.avgLossPercent.toFixed(1)}%</p>
          </div>
        </div>

        {/* 최고/최악 거래 */}
        {(insights.bestTrade || insights.worstTrade) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {insights.bestTrade && (
              <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4">
                <p className="text-green-400 text-xs font-semibold mb-2">🏆 최고의 거래</p>
                <p className="text-white font-bold text-lg">{insights.bestTrade.ticker}</p>
                <p className="text-green-400 text-2xl font-bold">+{insights.bestTrade.return.toFixed(2)}%</p>
                <p className="text-gray-500 text-xs mt-1">{insights.bestTrade.date}</p>
              </div>
            )}
            {insights.worstTrade && (
              <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4">
                <p className="text-red-400 text-xs font-semibold mb-2">📉 최악의 거래</p>
                <p className="text-white font-bold text-lg">{insights.worstTrade.ticker}</p>
                <p className="text-red-400 text-2xl font-bold">{insights.worstTrade.return.toFixed(2)}%</p>
                <p className="text-gray-500 text-xs mt-1">{insights.worstTrade.date}</p>
              </div>
            )}
          </div>
        )}

        {/* 신호 추종 패턴 */}
        {(insights.signalFollowedTrades > 0 || insights.signalNotFollowedTrades > 0) && (
          <div className="bg-gray-900 rounded-xl p-5 mb-6">
            <p className="text-orange-400 font-semibold text-sm mb-4">🎯 신호 추종 패턴</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/30 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-2">신호 추종 거래</p>
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">{insights.signalFollowedTrades}회</span>
                  <span className={`text-lg font-bold ${insights.signalFollowedWinRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    승률 {insights.signalFollowedWinRate.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="bg-black/30 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-2">신호 무시 거래</p>
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">{insights.signalNotFollowedTrades}회</span>
                  <span className={`text-lg font-bold ${insights.signalNotFollowedWinRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    승률 {insights.signalNotFollowedWinRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            {insights.signalFollowedTrades > 0 && insights.signalNotFollowedTrades > 0 && (
              <div className="mt-3 bg-orange-900/20 rounded p-3">
                <p className="text-xs text-orange-400">
                  {insights.signalFollowedWinRate > insights.signalNotFollowedWinRate
                    ? '✅ 신호를 따를 때 성과가 더 좋습니다'
                    : '⚠️ 신호를 따르지 않을 때 성과가 더 좋습니다 — 신호 검증 필요'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 손절 준수 패턴 */}
        {(insights.stopLossFollowedTrades > 0 || insights.stopLossNotFollowedTrades > 0) && (
          <div className="bg-gray-900 rounded-xl p-5 mb-6">
            <p className="text-orange-400 font-semibold text-sm mb-4">🛡️ 손절 준수 패턴 (손실 거래만)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/30 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-2">손절 준수</p>
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">{insights.stopLossFollowedTrades}회</span>
                  <span className="text-lg font-bold text-red-400">
                    평균 -{insights.stopLossFollowedAvgLoss.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="bg-black/30 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-2">손절 미준수</p>
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">{insights.stopLossNotFollowedTrades}회</span>
                  <span className="text-lg font-bold text-red-400">
                    평균 -{insights.stopLossNotFollowedAvgLoss.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            {insights.stopLossFollowedAvgLoss > 0 && insights.stopLossNotFollowedAvgLoss > 0 && (
              <div className="mt-3 bg-orange-900/20 rounded p-3">
                <p className="text-xs text-orange-400">
                  {insights.stopLossFollowedAvgLoss < insights.stopLossNotFollowedAvgLoss
                    ? '✅ 손절을 준수하면 손실이 작습니다'
                    : '⚠️ 손절을 준수해도 손실이 큽니다 — 손절가 재조정 필요'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 퇴출 이유 분석 */}
        {Object.keys(insights.exitReasons).length > 0 && (
          <div className="bg-gray-900 rounded-xl p-5 mb-6">
            <p className="text-orange-400 font-semibold text-sm mb-4">📤 퇴출 이유별 성과</p>
            <div className="space-y-2">
              {Object.entries(insights.exitReasons)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([reason, data]) => (
                  <div key={reason} className="bg-black/30 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-white font-medium text-sm">{reason}</span>
                        <span className="text-gray-500 text-xs ml-2">{data.count}회</span>
                      </div>
                      <span className={`font-bold ${data.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                        승률 {data.winRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 감정 패턴 */}
        {Object.keys(insights.emotionPatterns).length > 0 && (
          <div className="bg-gray-900 rounded-xl p-5 mb-6">
            <p className="text-orange-400 font-semibold text-sm mb-4">😊 진입 시 감정별 성과</p>
            <div className="space-y-2">
              {Object.entries(insights.emotionPatterns)
                .sort((a, b) => b[1].avgReturn - a[1].avgReturn)
                .map(([emotion, data]) => (
                  <div key={emotion} className="bg-black/30 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <span className="text-white font-medium text-sm">{emotion}</span>
                        <span className="text-gray-500 text-xs ml-2">{data.count}회</span>
                      </div>
                      <span className={`font-bold ${data.avgReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        평균 {data.avgReturn >= 0 ? '+' : ''}{data.avgReturn.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">승률</span>
                      <span className={data.winRate >= 50 ? 'text-green-400' : 'text-red-400'}>
                        {data.winRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
            <div className="mt-3 bg-blue-900/20 rounded p-3">
              <p className="text-xs text-blue-400">
                💡 감정 패턴을 파악하여 최고 성과를 내는 심리 상태를 유지하세요
              </p>
            </div>
          </div>
        )}

        {/* 학습 포인트 */}
        <div className="bg-gradient-to-r from-orange-900/20 to-red-900/20 border border-orange-700/40 rounded-xl p-5">
          <p className="text-orange-400 font-semibold text-sm mb-3">💡 학습 포인트</p>
          <div className="space-y-2 text-xs text-gray-300">
            <p>• 승률 {insights.winRate >= 50 ? '50% 이상' : '50% 미만'} — {insights.winRate >= 50 ? '현재 전략 유지' : '전략 재검토 필요'}</p>
            <p>• 평균 수익/손실 비율: {(insights.avgWinPercent / insights.avgLossPercent).toFixed(2)} — {insights.avgWinPercent >= insights.avgLossPercent * 2 ? '양호' : '개선 필요'}</p>
            {insights.signalFollowedTrades > 0 && (
              <p>• 신호 추종 거래 {insights.signalFollowedTrades}회 중 {Math.round(insights.signalFollowedWinRate)}% 성공</p>
            )}
            {insights.stopLossFollowedTrades > 0 && (
              <p>• 손절 준수 시 평균 손실 {insights.stopLossFollowedAvgLoss.toFixed(1)}% — 목표는 5% 이하</p>
            )}
          </div>
        </div>

        {/* 새로고침 버튼 */}
        <div className="mt-6 text-center">
          <button onClick={loadPatterns}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-semibold text-sm transition-colors">
            새로고침
          </button>
        </div>
      </div>
    </div>
  )
}
