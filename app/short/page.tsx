'use client'
import { useState } from 'react'
import { calcShortScore, generateShortSignal, type ShortSignal } from '@/lib/short-strategy'

export default function ShortPage() {
  const [symbol, setSymbol] = useState('AAPL')
  const [input, setInput] = useState({
    factorPercentile: 15,
    supplyScore: -70,
    sentimentScore: 85,
    momentumScore: -2.5,
    currentDrawdown: 8,
  })
  const [result, setResult] = useState<ShortSignal | null>(null)

  const handleCalculate = () => {
    const score = calcShortScore(input)
    const conditions: string[] = []

    if (input.factorPercentile <= 20) conditions.push(`팩터 하위 ${input.factorPercentile}%`)
    if (input.supplyScore <= -60) conditions.push('수급 매도 우세')
    if (input.sentimentScore >= 80) conditions.push('극단 탐욕')
    if (input.momentumScore <= -2) conditions.push('모멘텀 하락')

    const signal = generateShortSignal(symbol, score, conditions)
    setResult(signal)
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">숏 전략</h1>
          <p className="text-gray-500 text-sm mt-1">팩터 최하위 + 수급 최악 + 감정 극단 탐욕 포착</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 mb-4">
          <h2 className="text-orange-400 text-sm font-semibold mb-4">종목 및 조건</h2>
          <div className="mb-4">
            <label className="text-gray-400 text-xs">종목 심볼</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mt-1"
              placeholder="예: AAPL, TSLA"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs">팩터 백분위 (%)</label>
              <input
                type="number"
                value={input.factorPercentile}
                onChange={(e) => setInput({ ...input, factorPercentile: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs">수급 점수 (-100~100)</label>
              <input
                type="number"
                value={input.supplyScore}
                onChange={(e) => setInput({ ...input, supplyScore: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs">감정 점수 (0~100)</label>
              <input
                type="number"
                value={input.sentimentScore}
                onChange={(e) => setInput({ ...input, sentimentScore: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs">모멘텀 Z-스코어</label>
              <input
                type="number"
                step="0.1"
                value={input.momentumScore}
                onChange={(e) => setInput({ ...input, momentumScore: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm mt-1"
              />
            </div>
          </div>
          <button
            onClick={handleCalculate}
            className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition"
          >
            숏 점수 계산
          </button>
        </div>

        {result && (
          <div className="bg-gray-900 rounded-xl p-5">
            <h2 className="text-orange-400 text-sm font-semibold mb-4">숏 신호</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-[#0a0e1a] rounded-lg p-4">
                <p className="text-gray-500 text-xs">종목</p>
                <p className="text-white font-bold text-lg">{result.symbol}</p>
              </div>
              <div className="bg-[#0a0e1a] rounded-lg p-4">
                <p className="text-gray-500 text-xs">숏 점수</p>
                <p className={`font-bold text-lg ${result.shortScore >= 70 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {result.shortScore}
                </p>
              </div>
              <div className="bg-[#0a0e1a] rounded-lg p-4">
                <p className="text-gray-500 text-xs">진입 여부</p>
                <p className={`font-bold text-lg ${result.entryTrigger ? 'text-red-400' : 'text-gray-500'}`}>
                  {result.entryTrigger ? '✅ 진입' : '⏸️ 대기'}
                </p>
              </div>
              <div className="bg-[#0a0e1a] rounded-lg p-4">
                <p className="text-gray-500 text-xs">손절 / 목표</p>
                <p className="text-white font-bold text-lg">
                  {result.stopLossPct}% / {result.targetPct}%
                </p>
              </div>
            </div>
            {result.conditions.length > 0 && (
              <div className="bg-[#0a0e1a] rounded-lg p-4">
                <p className="text-gray-400 font-semibold mb-2">충족 조건</p>
                <div className="space-y-1">
                  {result.conditions.map((c, i) => (
                    <p key={i} className="text-gray-500 text-sm">• {c}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
