'use client'
import { useState, useEffect } from 'react'

interface SentimentData {
  fear_greed: number
  news_score: number
  composite: number
  signal: string
}

interface Contrarian {
  action: string
  strength: number
  reason: string
}

const SIGNAL_META: Record<string, { label: string; color: string; bg: string }> = {
  EXTREME_FEAR:  { label: '극단적 공포', color: 'text-green-400',  bg: 'bg-green-900/20 border-green-700/40' },
  FEAR:          { label: '공포',       color: 'text-green-300',  bg: 'bg-green-900/10 border-green-800/30' },
  NEUTRAL:       { label: '중립',       color: 'text-gray-400',   bg: 'bg-gray-900/20 border-gray-700/40' },
  GREED:         { label: '탐욕',       color: 'text-red-300',    bg: 'bg-red-900/10 border-red-800/30' },
  EXTREME_GREED: { label: '극단적 탐욕', color: 'text-red-400',   bg: 'bg-red-900/20 border-red-700/40' },
}

function GaugeBar({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 100)
  const color = pct <= 20 ? 'bg-green-500' : pct <= 40 ? 'bg-green-400' : pct <= 60 ? 'bg-yellow-400' : pct <= 80 ? 'bg-orange-400' : 'bg-red-500'
  return (
    <div className="relative w-full h-4 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-4 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
        {pct}
      </div>
    </div>
  )
}

export default function SentimentPage() {
  const [data,       setData]      = useState<SentimentData | null>(null)
  const [contrarian, setContrarian]= useState<Contrarian | null>(null)
  const [symbol,     setSymbol]    = useState('MARKET')
  const [loading,    setLoading]   = useState(false)
  const [toast,      setToast]     = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // 토스트 표시
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sentiment?action=get&symbol=${symbol}`)

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const json = await res.json()

      if (json.error) {
        showToast(json.error, 'error')
        setData(null)
        setContrarian(null)
      } else {
        setData(json.data)
        setContrarian(json.contrarian)
        if (!json.cached) {
          showToast('실시간 감정 분석 완료', 'success')
        }
      }
    } catch (error) {
      console.error('감정 분석 실패:', error)
      showToast(`분석 실패: ${(error as Error).message}`, 'error')
      setData(null)
      setContrarian(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const meta = data ? (SIGNAL_META[data.signal] ?? SIGNAL_META.NEUTRAL) : null

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
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
          <h1 className="text-2xl font-bold text-orange-400">시장 감정 지표</h1>
          <p className="text-gray-500 text-sm mt-1">공포/탐욕 → 역발상 매매 신호</p>
        </div>

        <div className="flex gap-2 mb-6">
          <input type="text" placeholder="종목 (비우면 시장 전체)"
            value={symbol === 'MARKET' ? '' : symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase() || 'MARKET')}
            onKeyDown={e => e.key === 'Enter' && !loading && load()}
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-white text-sm"
          />
          <button onClick={load} disabled={loading}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold">
            {loading ? '분석 중...' : '감정 분석'}
          </button>
        </div>

        {loading && !data && (
          <div className="space-y-4 animate-pulse">
            <div className="bg-gray-900 rounded-xl p-5 h-32"></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 rounded-xl p-4 h-24"></div>
              <div className="bg-gray-900 rounded-xl p-4 h-24"></div>
            </div>
          </div>
        )}

        {data && meta && (
          <div className="space-y-4">
            <div className={`rounded-xl p-5 border ${meta.bg}`}>
              <div className="flex justify-between items-center mb-4">
                <p className={`text-2xl font-bold ${meta.color}`}>{meta.label}</p>
                <p className={`text-4xl font-bold ${meta.color}`}>{data.composite}</p>
              </div>
              <GaugeBar value={data.composite} />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>극단적 공포 (0)</span>
                <span>중립 (50)</span>
                <span>극단적 탐욕 (100)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-2">Fear & Greed Index</p>
                <GaugeBar value={data.fear_greed} />
                <p className="text-white font-bold text-center mt-1">{data.fear_greed}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-2">뉴스 감정</p>
                <GaugeBar value={(data.news_score + 1) * 50} />
                <p className="text-white font-bold text-center mt-1">
                  {data.news_score >= 0 ? '+' : ''}{data.news_score.toFixed(2)}
                </p>
              </div>
            </div>

            {contrarian && (
              <div className={`rounded-xl p-4 border ${
                contrarian.action === 'BUY'  ? 'bg-green-900/20 border-green-700/40' :
                contrarian.action === 'SELL' ? 'bg-red-900/20 border-red-700/40' :
                'bg-gray-900/20 border-gray-700/40'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-orange-400 font-semibold text-sm">역발상 신호</p>
                  <span className={`text-lg font-bold ${
                    contrarian.action === 'BUY' ? 'text-green-400' :
                    contrarian.action === 'SELL' ? 'text-red-400' : 'text-gray-400'
                  }`}>{contrarian.action}</span>
                </div>
                <p className="text-gray-300 text-sm">{contrarian.reason}</p>
                <p className="text-gray-500 text-xs mt-1">
                  신호 강도: {(contrarian.strength * 100).toFixed(0)}%
                </p>
              </div>
            )}

            <div className="bg-gray-900/50 rounded-xl p-3 text-xs text-gray-500">
              <p>공포/탐욕: Alternative.me (무료) | 뉴스 감정: Finnhub + Gemini AI</p>
              <p>커뮤니티: Reddit r/wallstreetbets (무료) | 검색 트렌드: Google Trends 연동 예정</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
