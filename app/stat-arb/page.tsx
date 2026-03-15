'use client'
import { useState } from 'react'
import { KNOWN_PAIRS, extractCloseprices } from '@/lib/stat-arb'
import type { PairAnalysis, PairSignal } from '@/lib/stat-arb'

interface PairResult { analysis: PairAnalysis; signal: PairSignal }

const SIG_STYLE = {
  LONG_SPREAD:  { bg:'bg-green-900/20', border:'border-green-700/40', text:'text-green-400',  label:'매수 스프레드' },
  SHORT_SPREAD: { bg:'bg-red-900/20',   border:'border-red-700/40',   text:'text-red-400',    label:'매도 스프레드' },
  EXIT:         { bg:'bg-yellow-900/20',border:'border-yellow-700/40',text:'text-yellow-400', label:'청산' },
  NEUTRAL:      { bg:'bg-gray-900/20',  border:'border-gray-700/40',  text:'text-gray-400',   label:'관망' },
}

// Z-스코어 게이지 — 한도 처리 버그 수정
function ZGauge({ z, entry }: { z: number; entry: number }) {
  // 최대 ±entry*1.5 범위 표시. 50%가 중심(0)
  const maxRange = entry * 1.5
  // pct: 0~50 (절반 너비)
  const pct = Math.min(Math.abs(z) / maxRange * 50, 50)
  const isPositive = z >= 0
  const exceeded = Math.abs(z) >= entry
  const barColor = exceeded
    ? (isPositive ? 'bg-red-500' : 'bg-green-500')
    : 'bg-gray-500'
  // left: 양수면 50%서 오른쪽, 음수면 50-pct%서 시작
  const left  = isPositive ? 50 : 50 - pct
  const width = pct

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>-{entry.toFixed(1)}σ</span>
        <span className="text-gray-500">0</span>
        <span>+{entry.toFixed(1)}σ</span>
      </div>
      <div className="relative w-full h-2 bg-gray-800 rounded-full">
        {/* 중앙선 */}
        <div className="absolute top-0 left-1/2 w-px h-2 bg-gray-600 z-10" />
        {/* 진입 임계값 표시선 */}
        <div className="absolute top-0 h-2 w-px bg-gray-600 opacity-50"
          style={{ left: `${50 - 50/1.5}%` }} />
        <div className="absolute top-0 h-2 w-px bg-gray-600 opacity-50"
          style={{ left: `${50 + 50/1.5}%` }} />
        {/* Z 바 */}
        <div className={`absolute top-0 h-2 rounded-full transition-all ${barColor}`}
          style={{ left: `${left}%`, width: `${width}%` }} />
      </div>
      <div className="flex justify-center mt-1">
        <span className={`text-xs font-bold ${exceeded ? (isPositive ? 'text-red-400' : 'text-green-400') : 'text-gray-400'}`}>
          Z = {z > 0 ? '+' : ''}{z.toFixed(3)}
        </span>
      </div>
    </div>
  )
}

export default function StatArbPage() {
  const [entryThreshold, setEntry] = useState(2.0)
  const [exitThreshold,  setExit]  = useState(0.5)
  const [results,  setResults]     = useState<PairResult[]>([])
  const [loading,  setLoading]     = useState(false)
  const [error,    setError]       = useState<string | null>(null)
  const [warnings, setWarnings]    = useState<string[]>([])
  const [customPairs, setCustomPairs] = useState<typeof KNOWN_PAIRS>([])
  const [newSymbol1, setNewSymbol1] = useState('')
  const [newSymbol2, setNewSymbol2] = useState('')
  const [newLabel, setNewLabel] = useState('')

  const allPairs = [...KNOWN_PAIRS, ...customPairs]

  const runAnalysis = async () => {
    setError(null); setWarnings([]); setLoading(true)
    try {
      // 3개씩 배치 처리 (500ms 간격)
      const BATCH_SIZE = 3
      const pairsRaw: any[] = []

      for (let i = 0; i < allPairs.length; i += BATCH_SIZE) {
        const batch = allPairs.slice(i, i + BATCH_SIZE)

        const batchResults = await Promise.all(
          batch.map(async p => {
            const [r1, r2] = await Promise.allSettled([
              fetch(`/api/realtime-prices?symbol=${encodeURIComponent(p.symbol1)}`).then(r=>r.json()),
              fetch(`/api/realtime-prices?symbol=${encodeURIComponent(p.symbol2)}`).then(r=>r.json()),
            ])
            const d1 = r1.status==='fulfilled' ? r1.value : {}
            const d2 = r2.status==='fulfilled' ? r2.value : {}
            // 다양한 응답 구조 대응
            const raw1 = d1.prices ?? d1.history ?? d1.data ?? []
            const raw2 = d2.prices ?? d2.history ?? d2.data ?? []
            return {
              symbol1: p.symbol1, symbol2: p.symbol2,
              prices1: raw1,  // 서버에서 extractCloseprices로 처리
              prices2: raw2,
            }
          })
        )

        pairsRaw.push(...batchResults)

        // 마지막 배치가 아니면 500ms 대기
        if (i + BATCH_SIZE < allPairs.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      // 데이터 경고 수집 (60일 기준)
      const warns: string[] = []
      pairsRaw.forEach(p => {
        const n1 = extractCloseprices(p.prices1).length
        const n2 = extractCloseprices(p.prices2).length
        if (n1 < 60) warns.push(`${p.symbol1}: 데이터 ${n1}개 (60개 이상 필요)`)
        if (n2 < 60) warns.push(`${p.symbol2}: 데이터 ${n2}개 (60개 이상 필요)`)
      })
      setWarnings(warns)

      const res = await fetch('/api/stat-arb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairs: pairsRaw, entryThreshold, exitThreshold }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResults(data.results ?? [])
    } catch(e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const actionSignals = results.filter(r =>
    r.signal.signal === 'LONG_SPREAD' || r.signal.signal === 'SHORT_SPREAD'
  )

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">통계적 차익거래</h1>
          <p className="text-gray-500 text-sm mt-1">
            페어 트레이딩 — 시장 방향 무관, 스프레드 수렴 수익 (Engle-Granger)
          </p>
        </div>

        {/* 설정 */}
        <div className="bg-gray-900 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-6 items-end">
            <div>
              <p className="text-orange-400 text-xs font-semibold mb-1">
                진입 임계값: ±{entryThreshold.toFixed(1)}σ
              </p>
              <input type="range" min={1.0} max={3.0} step={0.1}
                value={entryThreshold}
                onChange={e => setEntry(Number(e.target.value))}
                className="w-40 accent-orange-500"
              />
              <p className="text-gray-600 text-xs">높을수록 신호 드물지만 정확도↑</p>
            </div>
            <div>
              <p className="text-orange-400 text-xs font-semibold mb-1">
                청산 임계값: ±{exitThreshold.toFixed(1)}σ
              </p>
              <input type="range" min={0.1} max={1.0} step={0.1}
                value={exitThreshold}
                onChange={e => setExit(Number(e.target.value))}
                className="w-40 accent-orange-500"
              />
            </div>
            <button onClick={runAnalysis} disabled={loading}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-xl font-semibold text-sm transition-colors">
              {loading ? '분석 중...' : '페어 분석 실행'}
            </button>
          </div>
        </div>

        {/* 사용자 정의 페어 추가 */}
        <div className="bg-gray-900 rounded-xl p-4 mb-6">
          <p className="text-orange-400 text-xs font-semibold mb-3">사용자 정의 페어 추가</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <p className="text-gray-500 text-xs mb-1">종목 1</p>
              <input
                type="text"
                value={newSymbol1}
                onChange={e => setNewSymbol1(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm w-24 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">종목 2</p>
              <input
                type="text"
                value={newSymbol2}
                onChange={e => setNewSymbol2(e.target.value.toUpperCase())}
                placeholder="MSFT"
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm w-24 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">설명 (선택)</p>
              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="애플 vs 마이크로소프트"
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm w-48 focus:outline-none focus:border-orange-500"
              />
            </div>
            <button
              onClick={() => {
                if (newSymbol1 && newSymbol2) {
                  setCustomPairs([...customPairs, {
                    symbol1: newSymbol1,
                    symbol2: newSymbol2,
                    label: newLabel || `${newSymbol1} vs ${newSymbol2}`,
                  }])
                  setNewSymbol1('')
                  setNewSymbol2('')
                  setNewLabel('')
                }
              }}
              disabled={!newSymbol1 || !newSymbol2}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              추가
            </button>
          </div>
          {customPairs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-gray-500 text-xs mb-2">추가된 페어 ({customPairs.length}개)</p>
              <div className="flex flex-wrap gap-2">
                {customPairs.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-white">{p.symbol1}/{p.symbol2}</span>
                    <button
                      onClick={() => setCustomPairs(customPairs.filter((_, i) => i !== idx))}
                      className="text-gray-500 hover:text-red-400 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm mb-4">{error}</div>
        )}
        {warnings.length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3 text-yellow-400 text-xs mb-4">
            <p className="font-medium mb-1">⚠️ 데이터 경고</p>
            {warnings.map((w,i) => <p key={i}>{w}</p>)}
          </div>
        )}

        {/* 액션 신호 요약 */}
        {actionSignals.length > 0 && (
          <div className="bg-orange-900/20 border border-orange-700/40 rounded-xl p-4 mb-4">
            <p className="text-orange-400 font-semibold text-sm mb-2">
              🔴 진입 신호 {actionSignals.length}개
            </p>
            {actionSignals.map(r => (
              <div key={r.signal.pair} className="text-xs text-gray-300 mb-1">
                <span className="font-bold">{r.signal.pair}</span>
                <span className="text-gray-500 ml-2">{SIG_STYLE[r.signal.signal].label}</span>
                <span className="text-orange-400 ml-2">Z={r.signal.currentZScore.toFixed(2)}</span>
                <span className="text-gray-500 ml-2">신뢰도 {(r.signal.confidence*100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}

        {/* 페어 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map(({ analysis, signal }) => {
            const meta = allPairs.find(p =>
              p.symbol1===analysis.symbol1 && p.symbol2===analysis.symbol2
            )
            const col = SIG_STYLE[signal.signal]

            return (
              <div key={signal.pair}
                className={`rounded-xl p-4 border ${col.bg} ${col.border}`}>

                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-white font-bold">{signal.pair}</p>
                    <p className="text-gray-500 text-xs">{meta?.label}</p>
                    <p className="text-gray-600 text-xs">데이터 {analysis.dataPoints}개</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${col.text} bg-black/30`}>
                      {col.label}
                    </span>
                    {!analysis.isPaired && analysis.dataPoints >= 60 && (
                      <p className="text-gray-600 text-xs mt-1">공적분 약함</p>
                    )}
                  </div>
                </div>

                <ZGauge z={signal.currentZScore} entry={entryThreshold} />

                <div className="grid grid-cols-3 gap-2 text-xs mt-3 mb-3">
                  <div className="bg-black/20 rounded p-2">
                    <p className="text-gray-500">상관계수</p>
                    <p className={`font-bold ${Math.abs(analysis.correlation)>=0.8?'text-green-400':'text-red-400'}`}>
                      {analysis.correlation.toFixed(3)}
                    </p>
                  </div>
                  <div className="bg-black/20 rounded p-2">
                    <p className="text-gray-500">반감기</p>
                    <p className={`font-bold ${typeof analysis.halfLife === 'number' && analysis.halfLife<=60?'text-green-400':'text-gray-400'}`}>
                      {typeof analysis.halfLife === 'string' ? analysis.halfLife :
                       analysis.halfLife > 100 ? '발산' : `${analysis.halfLife.toFixed(0)}일`}
                    </p>
                  </div>
                  <div className="bg-black/20 rounded p-2">
                    <p className="text-gray-500">신뢰도</p>
                    <p className="text-orange-400 font-bold">
                      {(signal.confidence*100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div className="bg-black/20 rounded p-2">
                  <p className="text-gray-500 text-xs mb-0.5">행동 지침</p>
                  <p className={`text-xs font-medium whitespace-pre-line ${col.text}`}>
                    {signal.action}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {results.length === 0 && !loading && (
          <div className="bg-gray-900 rounded-xl p-16 text-center">
            <p className="text-gray-500">페어 분석 실행 버튼을 누르세요</p>
            <p className="text-gray-600 text-xs mt-2">
              {allPairs.length}개 페어 배치 분석 — Engle-Granger 공적분 검정
            </p>
          </div>
        )}

        <div className="mt-6 bg-gray-900 rounded-xl p-4">
          <p className="text-orange-400 text-xs font-semibold mb-2">페어 트레이딩 원리</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-400">
            <div>
              <span className="text-white font-medium">공적분</span>
              <p className="mt-0.5">상관계수 0.8+, 반감기 5~60일 동시 만족 시 유효한 페어</p>
            </div>
            <div>
              <span className="text-white font-medium">Z-스코어</span>
              <p className="mt-0.5">±{entryThreshold.toFixed(1)}σ 초과 시 진입. ±{exitThreshold.toFixed(1)}σ 이하 시 청산</p>
            </div>
            <div>
              <span className="text-white font-medium">반감기</span>
              <p className="mt-0.5">평균회귀 소요 시간. 5일 미만=노이즈, 60일 초과=회귀 너무 느림</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
