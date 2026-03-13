'use client'
import { useState, useMemo, useEffect } from 'react'
import { calcBuyAction, calcSellAction, ASSET_LABELS, type AssetType } from '@/lib/trade-calculator'

export default function TradeCalcPage() {
  const [mode, setMode] = useState<'BUY' | 'SELL'>('BUY')

  // BUY 입력
  const [assetType, setAssetType] = useState<AssetType>('usStock')
  const [totalCapital, setTotalCapital] = useState(10000000)
  const [currentPrice, setCurrentPrice] = useState(100)
  const [recommendedPct, setRecommendedPct] = useState(10)
  const [stopLossPct, setStopLossPct] = useState(5)
  const [tp1, setTp1] = useState(5)
  const [tp2, setTp2] = useState(10)
  const [tp3, setTp3] = useState(15)
  const [winRate, setWinRate] = useState(60)
  const [signalSymbol, setSignalSymbol] = useState('')

  // SELL 입력
  const [entryPrice, setEntryPrice] = useState(100)
  const [sellCurrentPrice, setSellCurrentPrice] = useState(110)
  const [shares, setShares] = useState(100)
  const [peakPrice, setPeakPrice] = useState(115)
  const [sellStopLossPct, setSellStopLossPct] = useState(5)

  // 신호 정확도 자동 주입
  useEffect(() => {
    if (!signalSymbol) return
    fetch('/api/signal-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accuracy', symbol: signalSymbol }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setWinRate(Math.round(d.data.accuracy7d * 100))
        }
      })
      .catch(() => {})
  }, [signalSymbol])

  const buyResult = useMemo(() => {
    if (mode !== 'BUY') return null
    return calcBuyAction({
      totalCapital,
      currentPrice,
      assetType,
      recommendedAmount: totalCapital * recommendedPct / 100,
      stopLossPercent: stopLossPct,
      takeProfitLevels: [tp1, tp2, tp3],
    }, winRate / 100)
  }, [mode, totalCapital, currentPrice, assetType, recommendedPct, stopLossPct, tp1, tp2, tp3, winRate])

  const sellResult = useMemo(() => {
    if (mode !== 'SELL') return null
    return calcSellAction({
      entryPrice,
      currentPrice: sellCurrentPrice,
      shares,
      assetType,
      peakPrice,
      stopLossPercent: sellStopLossPct,
    })
  }, [mode, entryPrice, sellCurrentPrice, shares, assetType, peakPrice, sellStopLossPct])

  const actionColor = sellResult?.action === 'FULL_SELL' ? 'text-red-400'
    : sellResult?.action === 'PARTIAL_SELL' ? 'text-yellow-400'
    : 'text-green-400'

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">양방향 행동 계산기</h1>
          <p className="text-gray-500 text-sm mt-1">매수/매도 시나리오 분석 — 수수료·세금·슬리피지 포함</p>
        </div>

        {/* 모드 선택 */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setMode('BUY')}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors
              ${mode==='BUY' ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            매수 계산
          </button>
          <button onClick={() => setMode('SELL')}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors
              ${mode==='SELL' ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            매도 계산
          </button>
        </div>

        {/* 자산 유형 선택 */}
        <div className="bg-gray-900 rounded-xl p-4 mb-6">
          <p className="text-orange-400 text-xs font-semibold mb-2">자산 유형</p>
          <div className="flex gap-2">
            {(Object.keys(ASSET_LABELS) as AssetType[]).map(type => (
              <button key={type} onClick={() => setAssetType(type)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors
                  ${assetType===type ? 'text-orange-400 border-orange-500 bg-orange-900/20' : 'text-gray-400 border-gray-700'}`}>
                {ASSET_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {mode === 'BUY' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 입력 */}
            <div className="bg-gray-900 rounded-xl p-5">
              <p className="text-orange-400 font-semibold text-sm mb-4">매수 조건</p>

              {/* 신호 자동 주입 */}
              <div className="mb-4">
                <p className="text-gray-400 text-xs mb-1">종목 입력 시 승률 자동 적용</p>
                <input type="text" placeholder="예: BTC-USD, SPY" value={signalSymbol}
                  onChange={e => setSignalSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-gray-800 rounded px-3 py-1.5 text-white text-xs" />
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-gray-400 mb-1">총 자본</p>
                  <input type="number" value={totalCapital}
                    onChange={e => setTotalCapital(Number(e.target.value))}
                    className="w-full bg-gray-800 rounded px-3 py-1.5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 mb-1">현재가</p>
                  <input type="number" value={currentPrice}
                    onChange={e => setCurrentPrice(Number(e.target.value))}
                    className="w-full bg-gray-800 rounded px-3 py-1.5 text-white" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">투자 비중</span>
                    <span className="text-white font-bold">{recommendedPct}%</span>
                  </div>
                  <input type="range" min={1} max={50} value={recommendedPct}
                    onChange={e => setRecommendedPct(Number(e.target.value))}
                    className="w-full accent-orange-500" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">손절 기준</span>
                    <span className="text-red-400 font-bold">-{stopLossPct}%</span>
                  </div>
                  <input type="range" min={2} max={20} value={stopLossPct}
                    onChange={e => setStopLossPct(Number(e.target.value))}
                    className="w-full accent-red-500" />
                </div>
                <div>
                  <p className="text-gray-400 mb-1">익절 목표 (3단계)</p>
                  <div className="flex gap-2">
                    <input type="number" value={tp1} onChange={e => setTp1(Number(e.target.value))}
                      className="flex-1 bg-gray-800 rounded px-2 py-1 text-center text-white" />
                    <input type="number" value={tp2} onChange={e => setTp2(Number(e.target.value))}
                      className="flex-1 bg-gray-800 rounded px-2 py-1 text-center text-white" />
                    <input type="number" value={tp3} onChange={e => setTp3(Number(e.target.value))}
                      className="flex-1 bg-gray-800 rounded px-2 py-1 text-center text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">예상 승률</span>
                    <span className="text-white font-bold">{winRate}%</span>
                  </div>
                  <input type="range" min={30} max={80} value={winRate}
                    onChange={e => setWinRate(Number(e.target.value))}
                    className="w-full accent-orange-500" />
                </div>
              </div>
            </div>

            {/* 결과 */}
            {buyResult && (
              <div className="bg-gray-900 rounded-xl p-5">
                <p className="text-orange-400 font-semibold text-sm mb-4">매수 계획</p>

                <div className="space-y-2 text-xs mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">투자 금액</span>
                    <span className="text-white font-bold">{buyResult.investAmount.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">매수 수량</span>
                    <span className="text-white font-bold">{buyResult.shares.toFixed(4)}주</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">수수료</span>
                    <span className="text-red-400">{buyResult.buyFee.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">총 비용</span>
                    <span className="text-white font-bold">{buyResult.totalCost.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-800">
                    <span className="text-gray-400">손절가</span>
                    <span className="text-red-400 font-bold">{buyResult.stopLossPrice.toLocaleString()}</span>
                  </div>
                  {buyResult.takeProfitPrices.map((tp, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-gray-400">익절 {i+1}단계</span>
                      <span className="text-green-400 font-bold">{tp.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-gray-800">
                    <span className="text-gray-400">손익분기 수익률</span>
                    <span className="text-yellow-400 font-bold">+{buyResult.breakEvenReturn.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">기대값 (EV)</span>
                    <span className={`font-bold ${buyResult.expectedValue>=0 ? 'text-green-400' : 'text-red-400'}`}>
                      {buyResult.expectedValue>=0?'+':''}{(buyResult.expectedValue*100).toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* 시나리오 테이블 */}
                <div className="mt-4">
                  <p className="text-gray-400 text-xs mb-2">시나리오 분석</p>
                  <div className="bg-black/30 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-800/50">
                        <tr>
                          <th className="text-left p-2 text-gray-400">상황</th>
                          <th className="text-right p-2 text-gray-400">순수익</th>
                          <th className="text-right p-2 text-gray-400">수익률</th>
                        </tr>
                      </thead>
                      <tbody>
                        {buyResult.scenarios.map((s, i) => (
                          <tr key={i} className="border-t border-gray-800/50">
                            <td className="p-2 text-gray-300">{s.label}</td>
                            <td className={`text-right p-2 font-bold ${s.netProfit>=0?'text-green-400':'text-red-400'}`}>
                              {s.netProfit>=0?'+':''}{s.netProfit.toLocaleString()}원
                            </td>
                            <td className={`text-right p-2 font-bold ${s.netReturnPct>=0?'text-green-400':'text-red-400'}`}>
                              {s.netReturnPct>=0?'+':''}{s.netReturnPct.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 입력 */}
            <div className="bg-gray-900 rounded-xl p-5">
              <p className="text-orange-400 font-semibold text-sm mb-4">매도 조건</p>

              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-gray-400 mb-1">진입가</p>
                  <input type="number" value={entryPrice}
                    onChange={e => setEntryPrice(Number(e.target.value))}
                    className="w-full bg-gray-800 rounded px-3 py-1.5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 mb-1">현재가</p>
                  <input type="number" value={sellCurrentPrice}
                    onChange={e => setSellCurrentPrice(Number(e.target.value))}
                    className="w-full bg-gray-800 rounded px-3 py-1.5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 mb-1">보유 수량</p>
                  <input type="number" value={shares}
                    onChange={e => setShares(Number(e.target.value))}
                    className="w-full bg-gray-800 rounded px-3 py-1.5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 mb-1">고점 가격</p>
                  <input type="number" value={peakPrice}
                    onChange={e => setPeakPrice(Number(e.target.value))}
                    className="w-full bg-gray-800 rounded px-3 py-1.5 text-white" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">손절 기준</span>
                    <span className="text-red-400 font-bold">-{sellStopLossPct}%</span>
                  </div>
                  <input type="range" min={2} max={20} value={sellStopLossPct}
                    onChange={e => setSellStopLossPct(Number(e.target.value))}
                    className="w-full accent-red-500" />
                </div>
              </div>
            </div>

            {/* 결과 */}
            {sellResult && (
              <div className="bg-gray-900 rounded-xl p-5">
                <p className="text-orange-400 font-semibold text-sm mb-4">매도 판단</p>

                <div className="space-y-2 text-xs mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">현재 수익률</span>
                    <span className={`font-bold ${sellResult.currentReturn>=0?'text-green-400':'text-red-400'}`}>
                      {sellResult.currentReturn>=0?'+':''}{sellResult.currentReturn.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">순수익 (세후)</span>
                    <span className={`font-bold ${sellResult.currentProfit>=0?'text-green-400':'text-red-400'}`}>
                      {sellResult.currentProfit>=0?'+':''}{sellResult.currentProfit.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-800">
                    <span className="text-gray-400">손절가까지 거리</span>
                    <span className="text-yellow-400 font-bold">{sellResult.stopLossDistance.toFixed(1)}%</span>
                  </div>
                </div>

                <div className={`bg-black/30 rounded-xl p-4 mb-3`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-bold ${actionColor}`}>
                      {sellResult.action === 'FULL_SELL' ? '🔴 전량 매도' :
                       sellResult.action === 'PARTIAL_SELL' ? '🟡 분할 매도' :
                       '🟢 보유 유지'}
                    </span>
                  </div>
                  <p className={`text-xs ${actionColor}`}>{sellResult.reasoning}</p>
                </div>

                <div className="bg-black/20 rounded-lg p-3 text-xs text-gray-500">
                  <p className="text-gray-400 font-medium mb-1">매도 원칙</p>
                  <p>• 손절가 도달 시 즉시 전량 매도</p>
                  <p>• 고점 대비 큰 하락 시 분할 매도</p>
                  <p>• 큰 수익 시 일부 이익 실현 고려</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
