// components/ScenarioSave.tsx
'use client'
import { useState } from 'react'

export interface SavedScenario {
  id: string
  type: string
  label: string
  input_data: unknown
  result_data: unknown
  created_at: string
}

interface ScenarioSaveProps {
  type: 'montecarlo' | 'lifecycle' | 'loan' | 'buyvsrent' | 'business' | 'compare'
  inputData: unknown
  resultData: unknown
  defaultLabel?: string
  // 불러오기 시 호출 — 입력값 복원 후 자동 재계산 트리거
  onLoad?: (input: unknown, result: unknown) => void
}

const SESSION_KEY = (type: string) => `finsi_scenarios_${type}`

function sessionSave(type: string, item: SavedScenario) {
  try {
    const all: SavedScenario[] = JSON.parse(sessionStorage.getItem(SESSION_KEY(type)) ?? '[]')
    all.unshift(item)
    sessionStorage.setItem(SESSION_KEY(type), JSON.stringify(all.slice(0, 10)))
  } catch {}
}

function sessionLoad(type: string): SavedScenario[] {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY(type)) ?? '[]') } catch { return [] }
}

function sessionDelete(type: string, id: string) {
  try {
    const all = sessionLoad(type).filter(s => s.id !== id)
    sessionStorage.setItem(SESSION_KEY(type), JSON.stringify(all))
  } catch {}
}

const TYPE_KR: Record<string, string> = {
  montecarlo: '몬테카를로', lifecycle: '인생설계', loan: '대출계산',
  buyvsrent: '매수vs전세', business: '사업계산', compare: '비교',
}

export function ScenarioSave({ type, inputData, resultData, defaultLabel = '', onLoad }: ScenarioSaveProps) {
  const [label, setLabel]       = useState(defaultLabel)
  const [status, setStatus]     = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showList, setShowList] = useState(false)
  const [list, setList]         = useState<SavedScenario[]>([])
  const [dbAvail, setDbAvail]   = useState(true)

  function refreshList() {
    setList(sessionLoad(type))
  }

  async function handleSave() {
    if (!resultData) return
    setStatus('saving')

    const item: SavedScenario = {
      id: Date.now().toString(),
      type,
      label: label.trim() || `${TYPE_KR[type]} ${new Date().toLocaleTimeString('ko-KR')}`,
      input_data: inputData,
      result_data: resultData,
      created_at: new Date().toISOString(),
    }

    // Supabase 먼저 시도
    if (dbAvail) {
      try {
        const res = await fetch('/api/scenarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: item.type, label: item.label,
            inputData: item.input_data, resultData: item.result_data,
          }),
        })
        if (!res.ok) throw new Error()
        const saved = await res.json()
        item.id = saved.id  // DB ID로 교체
      } catch {
        setDbAvail(false)  // DB 실패 시 sessionStorage만 사용
      }
    }

    // sessionStorage 항상 백업
    sessionSave(type, item)
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 2500)
  }

  async function handleShowList() {
    refreshList()
    // DB에서도 가져오기 시도
    if (dbAvail) {
      try {
        const res = await fetch(`/api/scenarios?type=${type}`)
        if (res.ok) {
          const dbList: SavedScenario[] = await res.json()
          // sessionStorage + DB 합치기 (중복 제거)
          const merged = [...dbList]
          const dbIds = new Set(dbList.map(s => s.id))
          sessionLoad(type).forEach(s => { if (!dbIds.has(s.id)) merged.push(s) })
          merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          setList(merged.slice(0, 15))
        }
      } catch {}
    }
    setShowList(true)
  }

  async function handleDelete(id: string) {
    sessionDelete(type, id)
    if (dbAvail) {
      try { await fetch(`/api/scenarios?id=${id}`, { method: 'DELETE' }) } catch {}
    }
    refreshList()
    setList(prev => prev.filter(s => s.id !== id))
  }

  function handleLoad(scenario: SavedScenario) {
    // 입력값 복원 → onLoad 콜백 → useEffect debounce가 자동 재계산 트리거
    onLoad?.(scenario.input_data, scenario.result_data)
    setShowList(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          placeholder={`시나리오 이름 (예: 적극투자 플랜)`}
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="flex-1 bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-sm focus:border-orange-500 focus:outline-none"
        />
        <button
          onClick={handleSave}
          disabled={!resultData || status === 'saving'}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
            status === 'saved'   ? 'bg-green-600 text-white' :
            status === 'saving'  ? 'bg-gray-700 text-gray-400' :
            !resultData          ? 'bg-gray-800 text-gray-600 cursor-not-allowed' :
                                   'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          {status === 'saved' ? '✅ 저장됨' : status === 'saving' ? '저장 중...' : '💾 저장'}
        </button>
        <button
          onClick={handleShowList}
          className="px-4 py-2 bg-[#0a0e1a] border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg text-sm transition-colors whitespace-nowrap"
        >
          📂 불러오기
        </button>
      </div>

      {showList && (
        <div className="bg-[#0a0e1a] border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white text-sm font-semibold">저장된 {TYPE_KR[type]} 시나리오</h4>
            <button onClick={() => setShowList(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
          </div>
          {list.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-6">저장된 시나리오 없음</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {list.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-[#1a2035] rounded-lg px-3 py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{s.label}</p>
                    <p className="text-gray-500 text-xs">{new Date(s.created_at).toLocaleString('ko-KR')}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {onLoad && (
                      <button onClick={() => handleLoad(s)}
                        className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 hover:bg-orange-500/40 rounded transition-colors">
                        불러오기
                      </button>
                    )}
                    <button onClick={() => handleDelete(s.id)}
                      className="text-xs px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/30 rounded transition-colors">
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
