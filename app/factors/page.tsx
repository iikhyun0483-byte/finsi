'use client'
import { useState, useCallback } from 'react'
import type { FactorScore, FactorWeights } from '@/lib/factor-model'

const DEFAULT_WEIGHTS: FactorWeights = {
  momentum: 0.25, value: 0.20, quality: 0.25, lowVol: 0.15, volume: 0.15,
}

const FACTOR_META = {
  momentum: { label: '모멘텀',   ref: 'Jegadeesh & Titman 1993', desc: '12개월-1개월 수익률 (단기반전 제거)' },
  value:    { label: '밸류',     ref: 'Fama & French 1992',      desc: 'PBR/PER/EV·EBITDA 낮을수록' },
  quality:  { label: '퀄리티',   ref: 'Novy-Marx 2013',          desc: 'ROE 높고 부채 낮을수록' },
  lowVol:   { label: '저변동성', ref: 'Blitz & Van Vliet 2007',  desc: '52주 연환산 변동성 낮을수록' },
  volume:   { label: '거래량',   ref: 'Lee & Swaminathan 2000',  desc: '가격방향과 거래량방향 일치' },
}

const DEFAULT_UNIVERSE = [
  'SPY','QQQ','IWM','AAPL','MSFT','GOOGL','AMZN',
  'NVDA','META','TSLA','XLK','XLF','XLV','XLE','BTC-USD','ETH-USD',
]

export default function FactorsPage() {
  const [weights, setWeights]   = useState<FactorWeights>(DEFAULT_WEIGHTS)
  const [topPct, setTopPct]     = useState(20)
  const [scores, setScores]     = useState<FactorScore[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [selected, setSelected] = useState<FactorScore | null>(null)
  const [dataWarnings, setDataWarnings] = useState<string[]>([])

  const totalW   = Object.values(weights).reduce((s, w) => s + w, 0)
  const weightOk = Math.abs(totalW - 1) < 0.05

  const runScreen = useCallback(async () => {
    setError(null)
    setDataWarnings([])
    setLoading(true)
    try {
      const universeData = await Promise.all(
        DEFAULT_UNIVERSE.map(async symbol => {
          const [pr, fr] = await Promise.allSettled([
            fetch(`/api/realtime-prices?symbol=${encodeURIComponent(symbol)}`).then(r => r.json()),
            fetch(`/api/fundamentals?symbol=${encodeURIComponent(symbol)}`).then(r => r.json()),
          ])
          const priceRaw = pr.status === 'fulfilled' ? pr.value : {}
          const fundRaw  = fr.status === 'fulfilled' ? fr.value : {}
          return {
            symbol,
            // 다양한 응답 구조 대응
            prices:       priceRaw.prices ?? priceRaw.history ?? priceRaw.data ?? [],
            fundamentals: fundRaw,
          }
        })
      )

      // 데이터 경고 수집
      const warnings = universeData
        .filter(u => !u.prices || u.prices.length < 20)
        .map(u => `${u.symbol}: 가격 데이터 부족`)
      setDataWarnings(warnings)

      const res = await fetch('/api/factor-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weights, universeData }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setScores(data.scores ?? [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [weights])

  const topN     = Math.ceil(scores.length * topPct / 100)
  const buyList  = scores.slice(0, topN)
  const avoidList= scores.slice(scores.length - topN)

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">멀티팩터 알파 스크리너</h1>
          <p className="text-gray-500 text-sm mt-1">5개 학술 검증 팩터 — 감 0%, 수학 100%</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── 설정 */}
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-orange-400 text-xs font-semibold">팩터 가중치</p>
                <span className={`text-xs font-bold ${weightOk ? 'text-green-400' : 'text-red-400'}`}>
                  합계 {(totalW * 100).toFixed(0)}% {weightOk ? '✅' : '❌'}
                </span>
              </div>
              {(Object.keys(weights) as (keyof FactorWeights)[]).map(k => (
                <div key={k} className="mb-3">
                  <div className="flex justify-between mb-0.5">
                    <div>
                      <span className="text-white text-xs font-medium">{FACTOR_META[k].label}</span>
                      <p className="text-gray-600 text-xs">{FACTOR_META[k].ref}</p>
                    </div>
                    <span className="text-orange-400 text-xs font-bold">{(weights[k]*100).toFixed(0)}%</span>
                  </div>
                  <input type="range" min={0} max={100} step={5}
                    value={weights[k] * 100}
                    onChange={e => setWeights(p => ({ ...p, [k]: Number(e.target.value) / 100 }))}
                    className="w-full accent-orange-500"
                  />
                  <p className="text-gray-600 text-xs">{FACTOR_META[k].desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-orange-400 text-xs font-semibold mb-1">매수 후보: 상위 {topPct}%</p>
              <input type="range" min={5} max={30} step={5}
                value={topPct}
                onChange={e => setTopPct(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
              {scores.length > 0 && (
                <p className="text-gray-500 text-xs mt-1">{topN}개 종목</p>
              )}
            </div>

            <div className="bg-gray-900/50 rounded-xl p-3">
              <p className="text-gray-500 text-xs leading-relaxed">
                ※ 팩터 프리미엄은 장기(5년+) 관점에서 통계적으로 유효합니다.
                과거 수익률이 미래를 보장하지 않습니다.
                펀더멘털 데이터 미제공 종목은 중립값을 사용합니다.
              </p>
            </div>

            <button onClick={runScreen} disabled={loading || !weightOk}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-xl font-semibold text-sm transition-colors">
              {loading ? '스크리닝 중...' : '팩터 스크리닝 실행'}
            </button>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-xs">{error}</div>
            )}
            {dataWarnings.length > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3 text-yellow-400 text-xs">
                <p className="font-medium mb-1">⚠️ 데이터 경고</p>
                {dataWarnings.map((w, i) => <p key={i}>{w}</p>)}
              </div>
            )}
          </div>

          {/* ── 결과 */}
          <div className="xl:col-span-2 space-y-4">
            {scores.length > 0 && (
              <>
                <div className="bg-gray-900 rounded-xl p-4">
                  <p className="text-green-400 text-xs font-semibold mb-3">
                    ✅ 매수 후보 — 상위 {topPct}% ({buyList.length}개)
                  </p>
                  <div className="space-y-2">
                    {buyList.map((s, i) => (
                      <div key={s.symbol} onClick={() => setSelected(s)}
                        className="flex items-center justify-between p-2 bg-green-900/10 border border-green-800/30 rounded-lg cursor-pointer hover:border-green-500/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500 text-xs w-4">{i+1}</span>
                          <span className="text-white font-bold text-sm">{s.symbol}</span>
                          {!s.fundamentalsAvailable && (
                            <span className="text-yellow-600 text-xs">펀더멘털↓</span>
                          )}
                        </div>
                        <div className="flex gap-2 text-xs items-center">
                          {[s.momentumScore,s.valueScore,s.qualityScore,s.lowVolScore,s.volumeScore].map((v,fi) => (
                            <span key={fi} className={v >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {v>0?'+':''}{v.toFixed(1)}
                            </span>
                          ))}
                          <span className="text-orange-400 font-bold ml-1">
                            {s.compositeScore.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900 rounded-xl p-4">
                  <p className="text-red-400 text-xs font-semibold mb-2">
                    ❌ 제외 — 하위 {topPct}%
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {avoidList.map(s => (
                      <span key={s.symbol} onClick={() => setSelected(s)}
                        className="px-2 py-1 bg-red-900/20 border border-red-800/30 rounded text-red-400 text-xs cursor-pointer hover:border-red-500/60">
                        {s.symbol} ({s.compositeScore.toFixed(1)})
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                  <p className="text-orange-400 text-xs font-semibold mb-3">전체 팩터 랭킹</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-800">
                        <th className="text-left pb-2 font-normal">#</th>
                        <th className="text-left pb-2 font-normal">종목</th>
                        <th className="text-center pb-2 font-normal">모멘텀</th>
                        <th className="text-center pb-2 font-normal">밸류</th>
                        <th className="text-center pb-2 font-normal">퀄리티</th>
                        <th className="text-center pb-2 font-normal">저변동성</th>
                        <th className="text-center pb-2 font-normal">거래량</th>
                        <th className="text-right pb-2 font-normal">종합</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scores.map((s, i) => (
                        <tr key={s.symbol} onClick={() => setSelected(s)}
                          className={`border-b border-gray-800/40 cursor-pointer hover:bg-gray-800/40
                            ${i < topN ? 'bg-green-900/5' : i >= scores.length - topN ? 'bg-red-900/5' : ''}`}>
                          <td className="py-1.5 text-gray-500">{i+1}</td>
                          <td className="py-1.5 font-bold">
                            {s.symbol}
                            {!s.fundamentalsAvailable && <span className="text-yellow-700 text-xs ml-1">*</span>}
                          </td>
                          {[s.momentumScore,s.valueScore,s.qualityScore,s.lowVolScore,s.volumeScore].map((v,fi) => (
                            <td key={fi} className={`py-1.5 text-center ${v>=0?'text-green-400':'text-red-400'}`}>
                              {v>0?'+':''}{v.toFixed(2)}
                            </td>
                          ))}
                          <td className={`py-1.5 text-right font-bold ${s.compositeScore>=0?'text-orange-400':'text-red-400'}`}>
                            {s.compositeScore>0?'+':''}{s.compositeScore.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-gray-700 text-xs mt-2">* 펀더멘털 데이터 미제공 — 중립값 사용</p>
                </div>
              </>
            )}

            {selected && (
              <div className="bg-gray-900 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-orange-400 font-bold">{selected.symbol} 상세</p>
                  <button onClick={() => setSelected(null)} className="text-gray-500 text-xs">✕ 닫기</button>
                </div>
                {!selected.fundamentalsAvailable && (
                  <div className="bg-yellow-900/20 border border-yellow-700/40 rounded p-2 text-yellow-500 text-xs mb-3">
                    ⚠️ 펀더멘털 데이터 없음 — 밸류/퀄리티 점수는 중립값(PBR=2, PER=20) 기반입니다
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <p className="text-gray-400 font-medium mb-1">모멘텀</p>
                    <p>12M: {(selected.detail.momentum12m*100).toFixed(1)}%</p>
                    <p>6M:  {(selected.detail.momentum6m*100).toFixed(1)}%</p>
                    <p>1M:  {(selected.detail.momentum1m*100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium mb-1">밸류</p>
                    <p>PBR: {selected.detail.pbr.toFixed(2)}</p>
                    <p>PER: {selected.detail.per.toFixed(1)}</p>
                    <p>EV/EBITDA: {selected.detail.evEbitda.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium mb-1">퀄리티</p>
                    <p>ROE: {selected.detail.roe.toFixed(1)}%</p>
                    <p>부채: {selected.detail.debtRatio.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium mb-1">리스크</p>
                    <p>변동성: {(selected.detail.vol52w*100).toFixed(1)}%</p>
                    <p>거래량추세: {(selected.detail.volumeTrend*100).toFixed(1)}%</p>
                    <p>백분위: {selected.percentile}%</p>
                  </div>
                </div>
              </div>
            )}

            {scores.length === 0 && !loading && (
              <div className="bg-gray-900 rounded-xl p-16 text-center">
                <p className="text-gray-500">가중치 설정 후 스크리닝 실행</p>
                <p className="text-gray-600 text-xs mt-2">모멘텀 × 밸류 × 퀄리티 × 저변동성 × 거래량</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
