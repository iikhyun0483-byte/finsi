'use client'
import { useState, useMemo, useEffect } from 'react'
import { calcBuyAction, calcSellAction, ASSET_LABELS, type AssetType } from '@/lib/trade-calculator'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

const BROKER_PRESETS = {
  '키움증권': { buy: 0.00015, sell: 0.00015, label: '키움 (0.015%)' },
  '삼성증권': { buy: 0.00014, sell: 0.00014, label: '삼성 (0.014%)' },
  'NH투자증권': { buy: 0.00020, sell: 0.00020, label: 'NH (0.020%)' },
  '업비트': { buy: 0.0005, sell: 0.0005, label: '업비트 (0.05%)' },
} as const

const RISK_PRESETS = {
  conservative: { stopLoss: 3, tp: [3, 6, 9], label: '보수적' },
  balanced: { stopLoss: 5, tp: [5, 10, 15], label: '균형' },
  aggressive: { stopLoss: 10, tp: [10, 20, 30], label: '공격적' },
} as const

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

  // UI 상태
  const [warnings, setWarnings] = useState<string[]>([])

  // localStorage 설정 로드
  useEffect(() => {
    const saved = localStorage.getItem('tradeCalcSettings')
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        if (settings.assetType) setAssetType(settings.assetType)
        if (settings.totalCapital) setTotalCapital(settings.totalCapital)
        if (settings.stopLossPct) setStopLossPct(settings.stopLossPct)
      } catch (err) {
        console.warn('설정 로드 실패:', err)
      }
    }
  }, [])

  // localStorage 설정 저장
  useEffect(() => {
    localStorage.setItem('tradeCalcSettings', JSON.stringify({
      assetType, totalCapital, stopLossPct
    }))
  }, [assetType, totalCapital, stopLossPct])

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
          setWarnings(prev => prev.filter(w => !w.includes('신호 데이터')))
        } else {
          setWarnings(prev => [...prev, `⚠️ ${signalSymbol} 신호 데이터 없음 - 수동 입력하세요`])
        }
      })
      .catch((err) => {
        console.error('신호 정확도 조회 실패:', err)
        setWarnings(prev => [...prev, `⚠️ 신호 정확도 조회 실패: ${err.message}`])
      })
  }, [signalSymbol])

  const applyRiskPreset = (key: keyof typeof RISK_PRESETS) => {
    const preset = RISK_PRESETS[key]
    setStopLossPct(preset.stopLoss)
    setTp1(preset.tp[0])
    setTp2(preset.tp[1])
    setTp3(preset.tp[2])
  }

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

        {/* 리스크 프리셋 */}
        {mode === 'BUY' && (
          <div className="bg-gray-900 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-orange-400 text-sm font-semibold">리스크/리워드 프리셋</p>
              <div className="flex gap-2">
                {Object.entries(RISK_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyRiskPreset(key as keyof typeof RISK_PRESETS)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 경고 */}
        {warnings.length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3 mb-6">
            {warnings.map((w, i) => (
              <p key={i} className="text-yellow-400 text-xs">{w}</p>
            ))}
          </div>
        )}

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
                  <input type="number" min={0} value={totalCapital}
                    onChange={e => {
                      const val = Number(e.target.value)
                      if (val >= 0) setTotalCapital(val)
                    }}
                    className="w-full bg-gray-800 rounded px-3 py-1.5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 mb-1">현재가</p>
                  <input type="number" min={0} value={currentPrice}
                    onChange={e => {
                      const val = Number(e.target.value)
                      if (val >= 0) setCurrentPrice(val)
                    }}
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
                    <input type="number" min={0} value={tp1} onChange={e => {
                      const val = Number(e.target.value)
                      if (val >= 0) setTp1(val)
                    }}
                      className="flex-1 bg-gray-800 rounded px-2 py-1 text-center text-white" />
                    <input type="number" min={0} value={tp2} onChange={e => {
                      const val = Number(e.target.value)
                      if (val >= 0) setTp2(val)
                    }}
                      className="flex-1 bg-gray-800 rounded px-2 py-1 text-center text-white" />
                    <input type="number" min={0} value={tp3} onChange={e => {
                      const val = Number(e.target.value)
                      if (val >= 0) setTp3(val)
                    }}
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
                    <span className="text-white font-bold">
                      {assetType === 'domesticStock' ? buyResult.shares.toFixed(0) : buyResult.shares.toFixed(4)}주
                    </span>
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

                {/* 시나리오 차트 */}
                <div className="mt-4">
                  <p className="text-gray-400 text-xs mb-2">시나리오 시각화</p>
                  <div className="bg-black/30 rounded-lg p-3">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={buyResult.scenarios}>
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#9ca3af', fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          labelStyle={{ color: '#f3f4f6' }}
                          itemStyle={{ color: '#10b981' }}
                        />
                        <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
                        <Bar
                          dataKey="netProfit"
                          fill="#22c55e"
                          radius={[4, 4, 0, 0]}
                        >
                          {buyResult.scenarios.map((s, index) => (
                            <Cell key={`cell-${index}`} fill={s.netProfit >= 0 ? '#22c55e' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
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
                  <input type="number" min={0} value={entryPrice}
                    onChange={e => {
                      const val = Number(e.target.value)
                      if (val >= 0) setEntryPrice(val)
                    }}
                    className="w-full bg-gray-800 rounded px-3 py-1.5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 mb-1">현재가</p>
                  <input type="number" min={0} value={sellCurrentPrice}
                    onChange={e => {
                      const val = Number(e.target.value)
                      if (val >= 0) setSellCurrentPrice(val)
                    }}
                    className="w-full bg-gray-800 rounded px-3 py-1.5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 mb-1">보유 수량</p>
                  <input type="number" min={0} value={shares}
                    onChange={e => {
                      const val = Number(e.target.value)
                      if (val >= 0) setShares(val)
                    }}
                    className="w-full bg-gray-800 rounded px-3 py-1.5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 mb-1">고점 가격</p>
                  <input type="number" min={0} value={peakPrice}
                    onChange={e => {
                      const val = Number(e.target.value)
                      if (val >= 0) setPeakPrice(val)
                    }}
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
