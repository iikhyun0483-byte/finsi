'use client'
import { useState } from 'react'
import { optimizePortfolio, type PortfolioOptResult } from '@/lib/correlation-portfolio'

export default function CorrelationPage() {
  const [symbols, setSymbols] = useState('SPY,QQQ,IWM,EFA,AGG')
  const [returnsInput, setReturnsInput] = useState(
    `SPY:0.5,-0.2,0.8,0.3,-0.1,0.6,0.4,0.2,0.7,0.1
QQQ:0.7,-0.3,1.0,0.4,-0.2,0.8,0.5,0.3,0.9,0.2
IWM:0.4,-0.1,0.6,0.2,0.0,0.5,0.3,0.1,0.5,0.1
EFA:0.3,0.0,0.5,0.1,0.1,0.4,0.2,0.0,0.4,0.0
AGG:0.1,0.2,0.0,0.1,0.3,0.1,0.1,0.2,0.0,0.1`
  )
  const [result, setResult] = useState<PortfolioOptResult | null>(null)

  const handleOptimize = () => {
    const returns: Record<string, number[]> = {}

    returnsInput.split('\n').forEach(line => {
      const [sym, ...vals] = line.trim().split(/[:,]/)
      if (sym && vals.length > 0) {
        returns[sym.trim()] = vals.map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
      }
    })

    const opt = optimizePortfolio(returns, 0.15)
    setResult(opt)
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">상관관계 포트폴리오</h1>
          <p className="text-gray-500 text-sm mt-1">상관관계 최소화 → 분산 극대화</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 mb-4">
          <h2 className="text-orange-400 text-sm font-semibold mb-4">수익률 데이터 입력</h2>
          <div className="mb-4">
            <label className="text-gray-400 text-xs">종목 목록 (쉼표 구분)</label>
            <input
              type="text"
              value={symbols}
              onChange={(e) => setSymbols(e.target.value)}
              className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mt-1"
              placeholder="SPY,QQQ,IWM,..."
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs">일별 수익률 (종목:값,값,값 형식)</label>
            <textarea
              value={returnsInput}
              onChange={(e) => setReturnsInput(e.target.value)}
              className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mt-1 h-40 font-mono"
              placeholder="SPY:0.5,-0.2,0.8,0.3..."
            />
            <p className="text-gray-600 text-xs mt-1">각 줄: 종목:수익률1,수익률2,...</p>
          </div>
          <button
            onClick={handleOptimize}
            className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition"
          >
            최적화 실행
          </button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-xl p-5">
              <h2 className="text-orange-400 text-sm font-semibold mb-4">포트폴리오 지표</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0a0e1a] rounded-lg p-4">
                  <p className="text-gray-500 text-xs">기대 수익</p>
                  <p className="text-green-400 font-bold text-lg">
                    {(result.expectedReturn * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-[#0a0e1a] rounded-lg p-4">
                  <p className="text-gray-500 text-xs">변동성</p>
                  <p className="text-white font-bold text-lg">
                    {(result.portfolioVol * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-[#0a0e1a] rounded-lg p-4">
                  <p className="text-gray-500 text-xs">샤프 비율</p>
                  <p className="text-orange-400 font-bold text-lg">
                    {result.sharpeRatio.toFixed(2)}
                  </p>
                </div>
                <div className="bg-[#0a0e1a] rounded-lg p-4">
                  <p className="text-gray-500 text-xs">분산화 점수</p>
                  <p className="text-green-400 font-bold text-lg">
                    {(result.diversification * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-5">
              <h2 className="text-orange-400 text-sm font-semibold mb-4">최적 비중</h2>
              <div className="space-y-2">
                {Object.entries(result.weights).map(([sym, weight]) => (
                  <div key={sym} className="flex items-center gap-3">
                    <div className="w-16 text-white font-mono text-sm">{sym}</div>
                    <div className="flex-1 bg-[#0a0e1a] rounded-full h-6 relative overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-orange-400"
                        style={{ width: `${weight * 100}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-semibold">
                        {(weight * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-5">
              <h2 className="text-orange-400 text-sm font-semibold mb-2">신규 포지션 추가</h2>
              <div className={`p-4 rounded-lg ${result.newPositionOk ? 'bg-green-900/20 border border-green-700' : 'bg-red-900/20 border border-red-700'}`}>
                <p className={`font-bold ${result.newPositionOk ? 'text-green-400' : 'text-red-400'}`}>
                  {result.newPositionOk ? '✅ 추가 가능' : '⚠️ 추가 위험'}
                </p>
                <p className="text-gray-400 text-sm mt-1">{result.reason}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
