// components/TimeRangeInput.tsx
// 재사용 가능한 시간 범위 입력 컴포넌트

import { useState } from 'react'
import { TimeRange, TimeUnit, parseTimeInput, formatTimeRemaining, toDays } from '@/lib/time-utils'

interface TimeRangeInputProps {
  value: TimeRange | null
  onChange: (range: TimeRange) => void
  label?: string
}

const UNIT_LABELS: Record<TimeUnit, string> = {
  hour: '시간', day: '일', week: '주', month: '개월', year: '년',
}

export function TimeRangeInput({ value, onChange, label }: TimeRangeInputProps) {
  const [mode, setMode] = useState<'unit' | 'date'>('unit')
  const [inputText, setInputText] = useState('')

  function handleTextInput(text: string) {
    setInputText(text)
    if (!text) return
    const parsed = parseTimeInput(text)
    onChange(parsed)
  }

  function handleUnitChange(unit: TimeUnit) {
    const current = value ?? { value: 1, unit: 'year' }
    onChange({ ...current, unit, targetDate: undefined })
  }

  function handleValueChange(v: string) {
    const num = parseFloat(v)
    if (isNaN(num) || num <= 0) return
    const current = value ?? { value: 1, unit: 'year' }
    onChange({ ...current, value: num, targetDate: undefined })
  }

  function handleDateChange(date: string) {
    onChange({ value: 0, unit: 'day', targetDate: date })
  }

  const days = value ? toDays(value) : null
  const remaining = days != null ? formatTimeRemaining(days) : null

  return (
    <div>
      {label && <label className="text-gray-400 text-xs mb-2 block">{label}</label>}

      {/* 모드 전환 */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={() => setMode('unit')}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${
            mode === 'unit' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >기간 입력</button>
        <button
          onClick={() => setMode('date')}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${
            mode === 'date' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >날짜 지정</button>
        <button
          onClick={() => setMode('unit')}
          className="text-xs px-3 py-1 rounded-full bg-gray-800 text-gray-400"
          title="자연어 입력 예: '18개월', '3년', '2027-06-30'"
        >
          자연어 💬
        </button>
      </div>

      {mode === 'unit' ? (
        <div className="flex gap-2">
          <input
            type="number"
            min="0.1"
            step="0.5"
            placeholder="숫자"
            value={value?.targetDate ? '' : (value?.value ?? '')}
            onChange={e => handleValueChange(e.target.value)}
            className="w-24 bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white"
          />
          <select
            value={value?.unit ?? 'year'}
            onChange={e => handleUnitChange(e.target.value as TimeUnit)}
            className="bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            {(Object.entries(UNIT_LABELS) as [TimeUnit, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {/* 자연어 입력 */}
          <input
            placeholder="또는 '18개월' 직접 입력"
            value={inputText}
            onChange={e => handleTextInput(e.target.value)}
            className="flex-1 bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-sm"
          />
        </div>
      ) : (
        <input
          type="date"
          value={value?.targetDate ?? ''}
          min={new Date().toISOString().split('T')[0]}
          onChange={e => handleDateChange(e.target.value)}
          className="w-full bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-white"
        />
      )}

      {remaining && (
        <p className="text-orange-400 text-xs mt-1">
          → 약 {remaining} ({days != null ? Math.round(days) : 0}일)
        </p>
      )}
    </div>
  )
}
