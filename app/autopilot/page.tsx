'use client'
import { useState, useEffect } from 'react'
import { Bot, Power, Settings, AlertTriangle, Zap } from 'lucide-react'
import { AutopilotConfig, DEFAULT_CONFIG } from '@/lib/autopilot'

export default function AutopilotPage() {
  const [config, setConfig] = useState<AutopilotConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(false)
  const [universeInput, setUniverseInput] = useState('')

  const loadConfig = async () => {
    const res = await fetch('/api/autopilot?action=get')
    const data = await res.json()
    if (data.success) {
      setConfig(data.config)
      setUniverseInput(data.config.universe.join(','))
    }
  }

  useEffect(() => { loadConfig() }, [])

  const saveConfig = async () => {
    setLoading(true)
    try {
      const universe = universeInput.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)

      const res = await fetch('/api/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          config: { ...config, universe }
        })
      })

      const data = await res.json()
      if (data.success) {
        alert('✅ 설정 저장 완료')
        loadConfig()
      } else {
        alert(`❌ 저장 실패: ${data.error}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle'
        })
      })

      const data = await res.json()
      if (data.success) {
        setConfig({ ...config, is_active: data.is_active })
        alert(data.is_active ? '✅ Autopilot 활성화' : '⏸️ Autopilot 비활성화')
      }
    } finally {
      setLoading(false)
    }
  }

  const emergencyStop = async () => {
    if (!confirm('⚠️ 긴급 정지: 모든 포지션을 청산하고 자동매매를 중지합니다. 계속하시겠습니까?')) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'emergency_stop' })
      })

      const data = await res.json()
      if (data.success) {
        alert(`🛑 긴급 정지 완료: ${data.result.closedPositions}개 포지션 청산`)
        loadConfig()
      } else {
        alert(`❌ 긴급 정지 실패: ${data.error}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
            <Bot className="w-7 h-7" />
            Autopilot 제어판
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            자동매매 설정 · 유니버스 관리 · 긴급 정지
          </p>
        </div>

        {/* 활성화 상태 */}
        <div className={`rounded-xl p-5 mb-6 border ${
          config.is_active
            ? 'bg-green-900/20 border-green-700/40'
            : 'bg-gray-900 border-gray-800'
        }`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Power className={`w-5 h-5 ${config.is_active ? 'text-green-400' : 'text-gray-500'}`} />
                <p className="text-lg font-bold">
                  {config.is_active ? '🟢 활성화 중' : '⚫ 비활성화'}
                </p>
              </div>
              <p className="text-sm text-gray-400">
                {config.is_active
                  ? 'Autopilot이 시장을 모니터링하고 있습니다'
                  : '수동 모드 — 자동 거래가 중지되어 있습니다'}
              </p>
            </div>
            <button
              onClick={toggleActive}
              disabled={loading}
              className={`px-6 py-2.5 rounded-lg font-bold disabled:opacity-40 ${
                config.is_active
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {config.is_active ? '일시 정지' : '활성화'}
            </button>
          </div>
        </div>

        {/* 설정 패널 */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            설정
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">일일 손실 한도 (원)</label>
              <input
                type="number"
                value={config.max_daily_loss}
                onChange={e => setConfig({ ...config, max_daily_loss: Number(e.target.value) })}
                className="w-full bg-gray-800 rounded-lg px-4 py-2.5 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">예: -500000 (50만원 손실 시 거래 중지)</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">단일 종목 최대 비중 (%)</label>
              <input
                type="number"
                value={config.max_position_size}
                onChange={e => setConfig({ ...config, max_position_size: Number(e.target.value) })}
                className="w-full bg-gray-800 rounded-lg px-4 py-2.5 text-white"
              />
              <p className="text-xs text-gray-500 mt-1">예: 30 (총 자산의 30%까지만 투자)</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">전략</label>
              <select
                value={config.strategy}
                onChange={e => setConfig({ ...config, strategy: e.target.value as any })}
                className="w-full bg-gray-800 rounded-lg px-4 py-2.5 text-white"
              >
                <option value="MOMENTUM">모멘텀 (추세 추종)</option>
                <option value="MEAN_REVERSION">평균 회귀 (역발상)</option>
                <option value="SENTIMENT">감정 기반 (공포/탐욕)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">거래 유니버스 (종목 코드, 쉼표 구분)</label>
              <textarea
                value={universeInput}
                onChange={e => setUniverseInput(e.target.value)}
                placeholder="005930,000660,035420,051910"
                className="w-full bg-gray-800 rounded-lg px-4 py-2.5 text-white h-24"
              />
              <p className="text-xs text-gray-500 mt-1">
                한국: 6자리 숫자 (005930=삼성전자), 미국: 영문 (AAPL, NVDA)
              </p>
            </div>
          </div>

          <button
            onClick={saveConfig}
            disabled={loading}
            className="w-full mt-5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 rounded-lg py-3 font-bold"
          >
            {loading ? '저장 중...' : '설정 저장'}
          </button>
        </div>

        {/* 긴급 정지 */}
        <div className="bg-red-900/20 rounded-xl p-5 border border-red-700/40">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
            <div>
              <p className="text-lg font-bold text-red-400 mb-1">긴급 정지</p>
              <p className="text-sm text-gray-300">
                모든 포지션을 즉시 청산하고 자동매매를 중지합니다. 시장 급변 시에만 사용하세요.
              </p>
            </div>
          </div>
          <button
            onClick={emergencyStop}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-lg py-3 font-bold flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" />
            {loading ? '처리 중...' : '긴급 정지 실행'}
          </button>
        </div>

        <div className="mt-6 bg-gray-900/50 rounded-xl p-4 text-xs text-gray-500">
          <p className="font-semibold text-gray-400 mb-2">Autopilot 작동 원리</p>
          <ul className="list-disc list-inside space-y-1">
            <li>설정된 유니버스 종목을 주기적으로 모니터링</li>
            <li>선택한 전략에 따라 매매 신호 생성</li>
            <li>신호 발생 시 승인 큐에 요청 추가 (자동 실행 아님)</li>
            <li>승인 후에만 실제 주문 실행 (Risk Gate 통과 필요)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
