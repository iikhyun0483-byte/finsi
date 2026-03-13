'use client'
import { useState, useMemo, useEffect } from 'react'
import { calcAdvancedKelly }     from '@/lib/advanced-kelly'
import { calcDrawdownControl }   from '@/lib/drawdown-control'
import { createClient }          from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const REGIME_OPTIONS = [
  { label: '상승장', value: 1.00, color: 'text-green-400' },
  { label: '횡보장', value: 0.50, color: 'text-yellow-400' },
  { label: '하락장', value: 0.25, color: 'text-orange-400' },
  { label: '위기',   value: 0.00, color: 'text-red-400' },
]

const KELLY_OPTIONS = [
  { label: '보수 ¼켈리', value: 0.25 },
  { label: '표준 ½켈리', value: 0.50 },
  { label: '공격 풀켈리', value: 1.00 },
]

export default function RiskControlPage() {
  // 켈리
  const [winRate,      setWinRate]     = useState(60)
  const [avgWin,       setAvgWin]      = useState(8)
  const [avgLoss,      setAvgLoss]     = useState(4)
  const [capital,      setCapital]     = useState(10000000)
  const [regime,       setRegime]      = useState(1.0)
  const [correlation,  setCorrelation] = useState(0)
  const [kellyFrac,    setKellyFrac]   = useState(0.5)
  const [maxPos,       setMaxPos]      = useState(10)
  const [signalSymbol, setSignalSymbol]= useState('')

  // 드로우다운 — 포트폴리오 자동 로드
  const [currentEq, setCurrentEq] = useState(10000000)
  const [peakEq,    setPeakEq]    = useState(10000000)
  const [maxDD,     setMaxDD]     = useState(20)
  const [scaleOut,  setScaleOut]  = useState([5, 10, 15])
  const [portfolioLoaded, setPortfolioLoaded] = useState(false)

  // 포트폴리오에서 현재 자산 자동 로드
  useEffect(() => {
    async function loadPortfolio() {
      try {
        const { data } = await supabase
          .from('portfolio')
          .select('current_value, purchase_price, quantity')
        if (data && data.length > 0) {
          const total = data.reduce((s, p) => {
            const value = p.current_value ?? ((p.purchase_price ?? 0) * (p.quantity ?? 0))
            return s + value
          }, 0)
          const cost = data.reduce((s, p) => s + ((p.purchase_price ?? 0) * (p.quantity ?? 1)), 0)
          if (total > 0) {
            setCurrentEq(Math.round(total))
            setPeakEq(Math.round(Math.max(total, cost)))
            setCapital(Math.round(total))
            setPortfolioLoaded(true)
          }
        }
      } catch { /* 폴백: 수동 입력 */ }
    }
    loadPortfolio()
  }, [])

  // 신호 정확도 자동 주입 (PHASE13 연동)
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
          setAvgWin(Math.round(d.data.avgWin7d * 100))
          setAvgLoss(Math.round(d.data.avgLoss7d * 100))
        }
      })
      .catch(() => {})
  }, [signalSymbol])

  const kelly = useMemo(() => calcAdvancedKelly({
    winRate: winRate / 100,
    avgWinReturn: avgWin / 100,
    avgLossReturn: avgLoss / 100,
    totalCapital: capital,
    regimeMultiplier: regime,
    portfolioCorrelation: correlation,
    kellyFraction: kellyFrac,
    maxPositionPercent: maxPos,
  }), [winRate, avgWin, avgLoss, capital, regime, correlation, kellyFrac, maxPos])

  const dd = useMemo(() => calcDrawdownControl({
    currentEquity: currentEq,
    peakEquity: peakEq,
    maxAllowedDD: maxDD,
    scaleOutLevels: scaleOut,
  }), [currentEq, peakEq, maxDD, scaleOut])

  const ddColor = dd.action==='CASH' ? 'text-red-400' : dd.action==='SCALE_DOWN' ? 'text-yellow-400' : 'text-green-400'

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">리스크 제어 센터</h1>
          <p className="text-gray-500 text-sm mt-1">완전 켈리 자금 배분 + 드로우다운 제어</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 켈리 */}
          <div className="bg-gray-900 rounded-xl p-5">
            <p className="text-orange-400 font-semibold text-sm mb-4">완전 켈리 포지션 사이징</p>

            {/* 신호 자동 주입 */}
            <div className="mb-4">
              <p className="text-gray-400 text-xs mb-1">종목 입력 시 신호 정확도 자동 적용</p>
              <input
                type="text"
                placeholder="예: BTC-USD, SPY (PHASE13 데이터 자동 주입)"
                value={signalSymbol}
                onChange={e => setSignalSymbol(e.target.value.toUpperCase())}
                className="w-full bg-gray-800 rounded px-3 py-1.5 text-white text-xs"
              />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">승률</span>
                  <span className="text-white font-bold">{winRate}%</span>
                </div>
                <input type="range" min={30} max={80} value={winRate}
                  onChange={e => setWinRate(Number(e.target.value))}
                  className="w-full accent-orange-500" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">평균 수익률</span>
                  <span className="text-green-400 font-bold">+{avgWin}%</span>
                </div>
                <input type="range" min={1} max={30} value={avgWin}
                  onChange={e => setAvgWin(Number(e.target.value))}
                  className="w-full accent-green-500" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">평균 손실률</span>
                  <span className="text-red-400 font-bold">-{avgLoss}%</span>
                </div>
                <input type="range" min={1} max={20} value={avgLoss}
                  onChange={e => setAvgLoss(Number(e.target.value))}
                  className="w-full accent-red-500" />
              </div>
              <div>
                <p className="text-gray-400 mb-1">
                  총 자본 {portfolioLoaded && <span className="text-green-600">(포트폴리오 자동 로드)</span>}
                </p>
                <input type="number" value={capital}
                  onChange={e => setCapital(Number(e.target.value))}
                  className="w-full bg-gray-800 rounded px-3 py-1.5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 mb-1">시장 국면</p>
                <div className="flex gap-2 flex-wrap">
                  {REGIME_OPTIONS.map(r => (
                    <button key={r.value} onClick={() => setRegime(r.value)}
                      className={`px-3 py-1 rounded text-xs font-medium border transition-colors
                        ${regime===r.value ? `${r.color} border-current bg-white/5` : 'text-gray-500 border-gray-700'}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">기존 포트 상관계수</span>
                  <span className="text-white font-bold">{correlation.toFixed(2)}</span>
                </div>
                <input type="range" min={-100} max={100} value={correlation*100}
                  onChange={e => setCorrelation(Number(e.target.value)/100)}
                  className="w-full accent-orange-500" />
              </div>
              <div>
                <p className="text-gray-400 mb-1">켈리 분수</p>
                <div className="flex gap-2">
                  {KELLY_OPTIONS.map(k => (
                    <button key={k.value} onClick={() => setKellyFrac(k.value)}
                      className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors
                        ${kellyFrac===k.value ? 'text-orange-400 border-orange-500 bg-orange-900/20' : 'text-gray-500 border-gray-700'}`}>
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">최대 포지션 비중</span>
                  <span className="text-white font-bold">{maxPos}%</span>
                </div>
                <input type="range" min={2} max={30} value={maxPos}
                  onChange={e => setMaxPos(Number(e.target.value))}
                  className="w-full accent-orange-500" />
              </div>
            </div>

            <div className="mt-4 bg-black/30 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-400 text-xs">권장 투자금액</span>
                <span className="text-orange-400 text-xl font-bold">
                  {kelly.recommendedAmount.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mb-3">
                <span>한도: {kelly.maxAmount.toLocaleString()}원</span>
                <span>비중: {(kelly.adjustedKelly*100).toFixed(1)}%</span>
              </div>
              {kelly.reasoning.map((r,i) => (
                <p key={i} className="text-xs text-gray-500">→ {r}</p>
              ))}
            </div>
          </div>

          {/* 드로우다운 */}
          <div className="bg-gray-900 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <p className="text-orange-400 font-semibold text-sm">드로우다운 제어</p>
              {portfolioLoaded && (
                <span className="text-green-600 text-xs">포트폴리오 자동 로드 ✅</span>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-gray-400 mb-1">현재 자산</p>
                <input type="number" value={currentEq}
                  onChange={e => setCurrentEq(Number(e.target.value))}
                  className="w-full bg-gray-800 rounded px-3 py-1.5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 mb-1">고점 자산</p>
                <input type="number" value={peakEq}
                  onChange={e => setPeakEq(Number(e.target.value))}
                  className="w-full bg-gray-800 rounded px-3 py-1.5 text-white" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">최대 허용 낙폭</span>
                  <span className="text-red-400 font-bold">-{maxDD}%</span>
                </div>
                <input type="range" min={5} max={40} value={maxDD}
                  onChange={e => setMaxDD(Number(e.target.value))}
                  className="w-full accent-red-500" />
              </div>
              <div>
                <p className="text-gray-400 mb-1">단계별 축소 기준 (%)</p>
                <div className="flex gap-2">
                  {scaleOut.map((v,i) => (
                    <div key={i} className="flex-1">
                      <input type="number" value={v}
                        onChange={e => {
                          const next = [...scaleOut]
                          next[i] = Number(e.target.value)
                          setScaleOut(next)
                        }}
                        className="w-full bg-gray-800 rounded px-2 py-1 text-center text-white text-xs" />
                      <p className="text-gray-600 text-xs text-center mt-0.5">-{v}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 bg-black/30 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-xs">현재 낙폭</span>
                <span className={`text-xl font-bold ${ddColor}`}>
                  -{dd.currentDD.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-xs">포지션 배수</span>
                <span className={`text-lg font-bold ${ddColor}`}>
                  {(dd.positionMultiplier*100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-400 text-xs">회복 필요 수익률</span>
                <span className="text-yellow-400 text-sm font-bold">
                  +{dd.recoveryNeeded.toFixed(1)}%
                </span>
              </div>
              <div className={`text-xs font-medium ${ddColor} bg-black/20 rounded p-2`}>
                {dd.message}
              </div>
            </div>

            <div className="mt-4 bg-black/20 rounded-lg p-3 text-xs text-gray-500">
              <p className="text-gray-400 font-medium mb-1">복리 극대화 원리</p>
              <p>-50% 손실 → 회복에 +100% 필요</p>
              <p>-20% 손실 → 회복에 +25% 필요</p>
              <p className="text-orange-400 mt-1">손실을 작게 유지하는 게 장기 복리 극대화</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
