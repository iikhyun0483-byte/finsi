'use client'
import { useState, useEffect } from 'react'
import { SUPPLY_THRESHOLDS, UNIT_億 } from '@/lib/supply-demand'

interface SupplyData {
  symbol: string
  trade_date: string
  foreign_net: number
  inst_net: number
  retail_net: number
  program_net: number
  supply_score: number
}

interface SignalResponse {
  success?: boolean
  signal: string
  reason: string
  score: number
  consecutiveDays?: number
  data: SupplyData[]
  error?: string
  hint?: string
}

const SCORE_COLOR = (s: number) =>
  s >= SUPPLY_THRESHOLDS.STRONG_BUY  ? 'text-green-400' :
  s >= SUPPLY_THRESHOLDS.NEUTRAL_HIGH ? 'text-green-300' :
  s <= SUPPLY_THRESHOLDS.STRONG_SELL ? 'text-red-400'   :
  s <= SUPPLY_THRESHOLDS.NEUTRAL_LOW ? 'text-red-300'   : 'text-gray-400'

const DEFAULT_WATCHLIST = ['005930', '000660', 'SPY', 'QQQ', 'NVDA', 'AAPL']

export default function SupplyPage() {
  const [data,      setData]      = useState<SupplyData[]>([])
  const [symbol,    setSymbol]    = useState('005930')
  const [signal,    setSignal]    = useState<SignalResponse | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST)
  const [toast,     setToast]     = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // 토스트 표시
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  // LocalStorage에서 워치리스트 로드
  useEffect(() => {
    const saved = localStorage.getItem('supply_watchlist')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setWatchlist(parsed)
        }
      } catch (e) {
        console.error('워치리스트 로드 실패:', e)
      }
    }
  }, [])

  // 페이지 마운트 시 기본 종목(005930) 자동 조회
  useEffect(() => {
    loadSignal('005930')
  }, [])

  const loadSignal = async (sym: string) => {
    if (!sym || sym.trim() === '') {
      showToast('종목코드를 입력하세요', 'error')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/supply?action=signal&symbol=${sym.trim().toUpperCase()}`)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const json: SignalResponse = await res.json()

      if (json.error) {
        showToast(json.error + (json.hint ? ` (${json.hint})` : ''), 'error')
        setSignal(null)
      } else {
        setSignal(json)
      }
    } catch (error) {
      console.error('수급 신호 조회 실패:', error)
      showToast(`조회 실패: ${(error as Error).message}`, 'error')
      setSignal(null)
    } finally {
      setLoading(false)
    }
  }

  // 종목 워치리스트에 추가
  const addToWatchlist = () => {
    if (!symbol || symbol.trim() === '') {
      showToast('종목코드를 입력하세요', 'error')
      return
    }

    const upperSymbol = symbol.trim().toUpperCase()
    if (watchlist.includes(upperSymbol)) {
      showToast('이미 워치리스트에 있습니다', 'info')
      return
    }

    const newWatchlist = [...watchlist, upperSymbol]
    setWatchlist(newWatchlist)
    localStorage.setItem('supply_watchlist', JSON.stringify(newWatchlist))
    showToast(`${upperSymbol} 추가됨`, 'success')
  }

  // 워치리스트에서 제거
  const removeFromWatchlist = (sym: string) => {
    const newWatchlist = watchlist.filter(s => s !== sym)
    setWatchlist(newWatchlist)
    localStorage.setItem('supply_watchlist', JSON.stringify(newWatchlist))
    showToast(`${sym} 제거됨`, 'info')
  }

  useEffect(() => {
    const loadList = async () => {
      try {
        const res = await fetch('/api/supply?action=list')
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const json = await res.json()

        if (json.error) {
          console.error('목록 조회 에러:', json.error)
          showToast(json.error, 'error')
        } else {
          setData(json.data ?? [])
        }
      } catch (error) {
        console.error('목록 조회 실패:', error)
        showToast('목록 조회 실패', 'error')
      }
    }
    loadList()
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* 토스트 알림 */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-opacity ${
            toast.type === 'success' ? 'bg-green-600' :
            toast.type === 'error' ? 'bg-red-600' :
            'bg-blue-600'
          }`}>
            <p className="text-sm font-medium text-white">{toast.message}</p>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-orange-400">수급 추적</h1>
            <span className="px-2 py-0.5 bg-gray-700/50 border border-gray-600/40 rounded text-xs text-gray-400">
              🔗 KIS 연동 예정
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">외국인/기관 순매수 — 개인보다 먼저 아는 수급</p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {watchlist.map(s => (
            <div key={s} className="relative group">
              <button onClick={() => { setSymbol(s); loadSignal(s) }}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors
                  ${symbol===s ? 'text-orange-400 border-orange-500 bg-orange-900/20' : 'text-gray-500 border-gray-700 hover:border-gray-600'}`}>
                {s}
              </button>
              {!DEFAULT_WATCHLIST.includes(s) && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFromWatchlist(s) }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  title="제거"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="종목코드 입력 (예: 005930)"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && !loading && symbol && loadSignal(symbol)}
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-white text-sm"
          />
          <button onClick={() => loadSignal(symbol)} disabled={!symbol || loading}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold">
            {loading ? '조회 중...' : '조회'}
          </button>
          <button onClick={addToWatchlist} disabled={!symbol || loading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold">
            ★ 추가
          </button>
        </div>

        {signal && (
          <div className="bg-gray-900 rounded-xl p-5 mb-6">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-orange-400 font-bold">{symbol} 수급 신호</p>
                {signal.consecutiveDays && signal.consecutiveDays > 0 && (
                  <p className="text-xs text-green-400 mt-1">
                    🔥 외국인 {signal.consecutiveDays}일 연속 순매수
                  </p>
                )}
              </div>
              <span className={`text-lg font-bold ${SCORE_COLOR(signal.score)}`}>
                {signal.score > 0 ? '+' : ''}{signal.score}점
              </span>
            </div>
            <p className={`text-sm font-medium mb-2 ${SCORE_COLOR(signal.score)}`}>
              {signal.signal} — {signal.reason}
            </p>
            {Array.isArray(signal.data) && signal.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-left pb-1 font-normal">날짜</th>
                      <th className="text-right pb-1 font-normal">외국인</th>
                      <th className="text-right pb-1 font-normal">기관</th>
                      <th className="text-right pb-1 font-normal">개인</th>
                      <th className="text-right pb-1 font-normal">프로그램</th>
                      <th className="text-right pb-1 font-normal">점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signal.data.map(d => (
                      <tr key={d.trade_date} className="border-b border-gray-800/40">
                        <td className="py-1 text-gray-400">{d.trade_date}</td>
                        <td className={`py-1 text-right ${d.foreign_net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(d.foreign_net / UNIT_億).toFixed(1)}억
                        </td>
                        <td className={`py-1 text-right ${d.inst_net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(d.inst_net / UNIT_億).toFixed(1)}억
                        </td>
                        <td className={`py-1 text-right ${d.retail_net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(d.retail_net / UNIT_億).toFixed(1)}억
                        </td>
                        <td className={`py-1 text-right ${d.program_net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(d.program_net / UNIT_億).toFixed(1)}억
                        </td>
                        <td className={`py-1 text-right font-bold ${SCORE_COLOR(d.supply_score)}`}>
                          {d.supply_score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                KIS API 연동 후 외국인/기관 순매수 데이터가 표시됩니다
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-900/50 rounded-xl p-4">
          <p className="text-orange-400 text-xs font-semibold mb-2">수급 점수 계산 기준</p>
          <div className="grid grid-cols-3 gap-3 text-xs text-gray-400">
            <div><span className="text-white">외국인 40%</span><p className="mt-0.5">스마트머니 대표 지표</p></div>
            <div><span className="text-white">기관 40%</span><p className="mt-0.5">연기금/자산운용 동향</p></div>
            <div><span className="text-white">프로그램 20%</span><p className="mt-0.5">차익/비차익 프로그램</p></div>
          </div>
          <p className="text-gray-600 text-xs mt-2">
            ※ KIS API 연동 전: 수동 입력 또는 증권사 HTS에서 복사 붙여넣기
          </p>
        </div>
      </div>
    </div>
  )
}
