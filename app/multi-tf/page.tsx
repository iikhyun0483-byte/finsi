'use client'
import { useState } from 'react'
import { analyzeMultiTimeframe, type TimeframeSignal } from '@/lib/multi-timeframe'

export default function MultiTimeframePage() {
  const [weeklyPrices, setWeeklyPrices] = useState('100,102,105,103,108,110,112,115,113,118,120,122,125,123,128,130,132,135,138,140')
  const [dailyPrices, setDailyPrices] = useState('130,131,133,132,135,138,137,140,142,141,143,145,148,147,150,152,151,154,156,158')
  const [hourlyPrices, setHourlyPrices] = useState('156,157,158,159,157,158,159,160,161,160,162,163,164,163,165,166,167,168,169,170')
  const [result, setResult] = useState<TimeframeSignal | null>(null)

  const handleAnalyze = () => {
    const weekly = weeklyPrices.split(',').map(p => parseFloat(p.trim())).filter(p => !isNaN(p))
    const daily = dailyPrices.split(',').map(p => parseFloat(p.trim())).filter(p => !isNaN(p))
    const hourly = hourlyPrices.split(',').map(p => parseFloat(p.trim())).filter(p => !isNaN(p))

    const signal = analyzeMultiTimeframe({
      weeklyPrices: weekly,
      dailyPrices: daily,
      hourlyPrices: hourly,
    })
    setResult(signal)
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">멀티 타임프레임 분석</h1>
          <p className="text-gray-500 text-sm mt-1">주봉 방향 × 일봉 타이밍 × 시간봉 진입</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 mb-4">
          <h2 className="text-orange-400 text-sm font-semibold mb-4">가격 데이터 입력</h2>
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs">주봉 가격 (쉼표 구분)</label>
              <textarea
                value={weeklyPrices}
                onChange={(e) => setWeeklyPrices(e.target.value)}
                className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mt-1 h-20"
                placeholder="100,102,105,..."
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs">일봉 가격 (쉼표 구분)</label>
              <textarea
                value={dailyPrices}
                onChange={(e) => setDailyPrices(e.target.value)}
                className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mt-1 h-20"
                placeholder="130,131,133,..."
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs">시간봉 가격 (쉼표 구분)</label>
              <textarea
                value={hourlyPrices}
                onChange={(e) => setHourlyPrices(e.target.value)}
                className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mt-1 h-20"
                placeholder="156,157,158,..."
              />
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition"
          >
            분석하기
          </button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-xl p-5">
              <h2 className="text-orange-400 text-sm font-semibold mb-4">타임프레임별 신호</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#0a0e1a] rounded-lg p-4">
                  <p className="text-gray-500 text-xs mb-2">주봉 추세</p>
                  <p className={`font-bold text-lg ${
                    result.weekly.trend === 'UP' ? 'text-green-400' :
                    result.weekly.trend === 'DOWN' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {result.weekly.trend === 'UP' ? '↗️ 상승' :
                     result.weekly.trend === 'DOWN' ? '↘️ 하락' : '→ 횡보'}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    강도: {(result.weekly.strength * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-[#0a0e1a] rounded-lg p-4">
                  <p className="text-gray-500 text-xs mb-2">일봉 신호</p>
                  <p className={`font-bold text-lg ${
                    result.daily.signal === 'BUY' ? 'text-green-400' :
                    result.daily.signal === 'SELL' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {result.daily.signal === 'BUY' ? '📈 매수' :
                     result.daily.signal === 'SELL' ? '📉 매도' : '⏸️ 중립'}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    점수: {result.daily.score}
                  </p>
                </div>
                <div className="bg-[#0a0e1a] rounded-lg p-4">
                  <p className="text-gray-500 text-xs mb-2">시간봉 타이밍</p>
                  <p className={`font-bold text-lg ${
                    result.hourly.entry === 'NOW' ? 'text-green-400' :
                    result.hourly.entry === 'MISS' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {result.hourly.entry === 'NOW' ? '✅ 진입' :
                     result.hourly.entry === 'MISS' ? '❌ 패스' : '⏰ 대기'}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {result.hourly.timing}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-5">
              <h2 className="text-orange-400 text-sm font-semibold mb-4">종합 판단</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0a0e1a] rounded-lg p-4">
                  <p className="text-gray-500 text-xs">최종 액션</p>
                  <p className={`font-bold text-xl ${
                    result.composite.action === 'STRONG_BUY' ? 'text-green-400' :
                    result.composite.action === 'BUY' ? 'text-green-300' :
                    result.composite.action === 'SELL' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {result.composite.action.replace('_', ' ')}
                  </p>
                </div>
                <div className="bg-[#0a0e1a] rounded-lg p-4">
                  <p className="text-gray-500 text-xs">신뢰도</p>
                  <p className="text-orange-400 font-bold text-xl">
                    {(result.composite.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
