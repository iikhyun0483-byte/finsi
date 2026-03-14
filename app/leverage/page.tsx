'use client'
import { useState } from 'react'
import { optimizeLeverage, type LeverageInput, type LeverageResult } from '@/lib/leverage-optimizer'

export default function LeveragePage() {
  const [input, setInput] = useState<LeverageInput>({
    winRate: 0.6,
    avgWinReturn: 0.08,
    avgLossReturn: 0.05,
    currentVolatility: 0.2,
    maxLeverage: 3,
    regimeCode: 3,
  })
  const [result, setResult] = useState<LeverageResult | null>(null)

  const handleCalculate = () => {
    const res = optimizeLeverage(input)
    setResult(res)
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">레버리지 최적화</h1>
          <p className="text-gray-500 text-sm mt-1">켈리 공식 기반 최적 레버리지 배수 계산</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 mb-4">
          <h2 className="text-orange-400 text-sm font-semibold mb-4">입력 파라미터</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs">승률 (0-1)</label>
              <input
                type="number"
                step="0.01"
                value={input.winRate}
                onChange={(e) => setInput({ ...input, winRate: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs">평균 수익률</label>
              <input
                type="number"
                step="0.01"
                value={input.avgWinReturn}
                onChange={(e) => setInput({ ...input, avgWinReturn: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs">평균 손실률</label>
              <input
                type="number"
                step="0.01"
                value={input.avgLossReturn}
                onChange={(e) => setInput({ ...input, avgLossReturn: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs">연변동성</label>
              <input
                type="number"
                step="0.01"
                value={input.currentVolatility}
                onChange={(e) => setInput({ ...input, currentVolatility: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs">최대 레버리지</label>
              <input
                type="number"
                step="0.5"
                value={input.maxLeverage}
                onChange={(e) => setInput({ ...input, maxLeverage: parseFloat(e.target.value) || 1 })}
                className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs">시장 국면</label>
              <select
                value={input.regimeCode}
                onChange={(e) => setInput({ ...input, regimeCode: parseInt(e.target.value) })}
                className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mt-1"
              >
                <option value={0}>위기</option>
                <option value={1}>하락</option>
                <option value={2}>횡보</option>
                <option value={3}>상승</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleCalculate}
            className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition"
          >
            계산하기
          </button>
        </div>

        {result && (
          <div className="bg-gray-900 rounded-xl p-5">
            <h2 className="text-orange-400 text-sm font-semibold mb-4">최적화 결과</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-[#0a0e1a] rounded-lg p-4">
                <p className="text-gray-500 text-xs">최적 배수</p>
                <p className="text-white font-bold text-lg">{result.optimalLeverage.toFixed(2)}x</p>
              </div>
              <div className="bg-[#0a0e1a] rounded-lg p-4">
                <p className="text-gray-500 text-xs">조정 배수</p>
                <p className="text-orange-400 font-bold text-lg">{result.adjustedLeverage.toFixed(2)}x</p>
              </div>
              <div className="bg-[#0a0e1a] rounded-lg p-4">
                <p className="text-gray-500 text-xs">샤프 비율</p>
                <p className="text-green-400 font-bold text-lg">{result.sharpeRatio.toFixed(2)}</p>
              </div>
              <div className="bg-[#0a0e1a] rounded-lg p-4">
                <p className="text-gray-500 text-xs">기대 수익</p>
                <p className="text-white font-bold text-lg">{(result.expectedReturn * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-[#0a0e1a] rounded-lg p-4">
                <p className="text-gray-500 text-xs">기대 리스크</p>
                <p className="text-red-400 font-bold text-lg">{(result.expectedRisk * 100).toFixed(1)}%</p>
              </div>
            </div>
            <div className="bg-[#0a0e1a] rounded-lg p-4">
              <p className="text-gray-400 font-semibold mb-2">권장사항</p>
              <p className="text-orange-400 font-bold mb-3">{result.recommendation}</p>
              <div className="space-y-1">
                {result.reasoning.map((r, i) => (
                  <p key={i} className="text-gray-500 text-sm">• {r}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
