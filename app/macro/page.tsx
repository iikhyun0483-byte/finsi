'use client'
import { useState, useEffect, useCallback } from 'react'

interface MacroSignal {
  indicator: string
  value: number
  signal: string
  impact: string
}

interface MacroData {
  score: number
  signals: MacroSignal[]
  regime: 'CRISIS' | 'BEAR' | 'NEUTRAL' | 'BULL'
}

const REGIME_META = {
  CRISIS:  { label: '위기',   color: 'text-red-400',    bg: 'bg-red-900/20 border-red-700/40',       bar: 'bg-red-500' },
  BEAR:    { label: '약세장', color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-700/40', bar: 'bg-orange-500' },
  NEUTRAL: { label: '중립',   color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-700/40', bar: 'bg-yellow-500' },
  BULL:    { label: '강세장', color: 'text-green-400',  bg: 'bg-green-900/20 border-green-700/40',   bar: 'bg-green-500' },
}

const INDICATOR_LABEL: Record<string, string> = {
  VIX:      '공포지수 (VIX)',
  DXY:      '달러 인덱스 (DXY)',
  FEDFUNDS: '미국 기준금리',
  UNRATE:   '실업률',
  CPIAUCSL: 'CPI (소비자물가)',
  T10Y2Y:   '장단기 금리차 (경기침체 선행)',
}

const SIGNAL_COLOR: Record<string, string> = {
  RISK_OFF: 'text-red-400',
  RISK_ON:  'text-green-400',
  NEUTRAL:  'text-yellow-400',
}

const SIGNAL_BG: Record<string, string> = {
  RISK_OFF: 'bg-red-900/10 border-red-800/30',
  RISK_ON:  'bg-green-900/10 border-green-800/30',
  NEUTRAL:  'bg-gray-900 border-gray-800',
}

export default function MacroPage() {
  const [data,    setData]    = useState<MacroData | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  const load = useCallback(async () => {
    try {
      console.log('📊 Loading macro score...')
      const res = await fetch('/api/macro?action=score')
      const json = await res.json()
      console.log('📊 Score response:', json)

      if (!res.ok) {
        console.error('❌ Failed to load score:', json)
        showToast(`데이터 로드 실패: ${json.error || '알 수 없는 오류'}`, 'error')
        return
      }

      if (json.score !== undefined) {
        console.log('✅ Setting data:', json)
        setData(json)
      } else {
        console.warn('⚠️ No score in response:', json)
        showToast('데이터 없음 - 상단 버튼으로 수집하세요', 'info')
      }
    } catch (e) {
      console.error('❌ Load error:', e)
      showToast(`오류: ${(e as Error).message}`, 'error')
    }
    setLoading(false)
  }, [])

  const sync = async () => {
    setSyncing(true)
    try {
      console.log('🔄 Macro data sync started...')
      const res = await fetch('/api/macro?action=sync')
      const json = await res.json()

      if (!res.ok) {
        console.error('❌ Sync failed:', json)
        showToast(`데이터 수집 실패: ${json.error || '알 수 없는 오류'}`, 'error')
        setSyncing(false)
        return
      }

      console.log('✅ Sync completed:', json)
      setLastSync(new Date().toLocaleTimeString('ko-KR'))

      // Fallback 사용 여부에 따라 Toast 메시지 변경
      if (json.usedFallback && json.fallbackIndicators?.length > 0) {
        showToast(
          `데이터 수집 완료 (FRED API 키 없음 - ${json.fallbackIndicators.join(', ')} 기본값 사용)`,
          'warning'
        )
      } else {
        showToast(`데이터 수집 완료 (${json.signals?.length || 0}개 지표)`, 'success')
      }

      // DB 저장 완료 후 즉시 재로드
      await load()
    } catch (e) {
      console.error('❌ Sync error:', e)
      showToast(`데이터 수집 오류: ${e instanceof Error ? e.message : '네트워크 오류'}`, 'error')
    }
    setSyncing(false)
  }

  useEffect(() => { load() }, [load])

  const meta = data ? REGIME_META[data.regime] : null

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        {/* 토스트 알림 */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-opacity ${
            toast.type === 'success' ? 'bg-green-600' :
            toast.type === 'error' ? 'bg-red-600' :
            toast.type === 'warning' ? 'bg-yellow-600' :
            'bg-blue-600'
          }`}>
            <p className="text-sm font-medium text-white">{toast.message}</p>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-orange-400">매크로 지표</h1>
            <p className="text-gray-500 text-sm mt-1">
              VIX · 달러 · 금리 · 고용 · 물가 — 실시간 리스크 점수
            </p>
          </div>
          <div className="text-right">
            <button
              onClick={sync}
              disabled={syncing}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm font-semibold"
            >
              {syncing ? '수집 중...' : '🔄 데이터 수집'}
            </button>
            {lastSync && (
              <p className="text-gray-600 text-xs mt-1">마지막: {lastSync}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-16">로딩 중...</div>
        ) : !data || data.signals.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-lg mb-2">데이터 없음</p>
            <p className="text-gray-600 text-sm mb-4">
              상단 버튼으로 매크로 데이터를 수집하세요
            </p>
            <button
              onClick={sync}
              disabled={syncing}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-xl text-sm font-semibold"
            >
              {syncing ? '수집 중...' : '지금 수집'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 종합 리스크 점수 */}
            <div className={`rounded-xl p-5 border ${meta?.bg}`}>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-gray-400 text-xs mb-1">매크로 리스크 점수</p>
                  <p className={`text-3xl font-bold ${meta?.color}`}>{meta?.label}</p>
                </div>
                <p className={`text-5xl font-bold ${meta?.color}`}>{data.score}</p>
              </div>
              <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${meta?.bar}`}
                  style={{ width: `${data.score}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>강세 (0)</span>
                <span>중립 (50)</span>
                <span>위기 (100)</span>
              </div>
            </div>

            {/* 개별 지표 */}
            <div className="space-y-2">
              {data.signals.map((s) => (
                <div
                  key={s.indicator}
                  className={`rounded-xl p-4 border ${SIGNAL_BG[s.signal] ?? 'bg-gray-900 border-gray-800'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">
                        {INDICATOR_LABEL[s.indicator] ?? s.indicator}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">{s.impact}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className={`font-bold text-lg ${SIGNAL_COLOR[s.signal] ?? 'text-gray-400'}`}>
                        {s.value.toFixed(2)}
                      </p>
                      <p className={`text-xs ${SIGNAL_COLOR[s.signal] ?? 'text-gray-500'}`}>
                        {s.signal === 'RISK_OFF' ? '위험' : s.signal === 'RISK_ON' ? '안전' : '중립'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 전략 가이드 */}
            <div className="bg-gray-900/50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
              <p className="text-orange-400 font-medium mb-2">매크로 → 전략 자동 연동</p>
              <p>VIX 30+ → 포지션 자동 50% 축소 권장</p>
              <p>장단기 금리차 역전 → 방어섹터 비중 증가</p>
              <p>강달러(105+) → 신흥국 ETF 제외</p>
              <p>극단 위기(80+) → 현금 비중 최대화</p>
              <p className="text-gray-700 mt-1">출처: FRED, Yahoo Finance (무료 API)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
