// components/Tooltip.tsx
'use client'
import { useState, useRef } from 'react'
import { getTerm } from './TermGlossary'

interface TooltipProps {
  termKey: string
  children?: React.ReactNode
}

export function Tooltip({ termKey, children }: TooltipProps) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState<'top' | 'bottom'>('top')
  const ref = useRef<HTMLSpanElement>(null)
  const term = getTerm(termKey)
  if (!term) return <>{children}</>

  function handleEnter() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos(rect.top < 200 ? 'bottom' : 'top')
    }
    setShow(true)
  }

  const posClass = pos === 'top'
    ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
    : 'top-full left-1/2 -translate-x-1/2 mt-2'

  return (
    <span ref={ref} className="relative inline-flex items-center gap-1">
      {children}
      <button
        type="button"
        className="w-4 h-4 rounded-full bg-gray-700 text-gray-400 text-[10px] flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors flex-shrink-0 leading-none"
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(v => !v)}
        aria-label={`${term.kr} 설명`}
      >?</button>
      {show && (
        <div className={`absolute z-50 w-64 ${posClass} pointer-events-none`}>
          <div className="bg-[#0d1526] border border-gray-600 rounded-xl p-3 shadow-2xl">
            <p className="text-xs text-gray-500 mb-0.5">{termKey}</p>
            <p className="text-sm font-semibold text-white mb-1.5">{term.kr}</p>
            <p className="text-gray-300 text-xs leading-relaxed">{term.def}</p>
            {term.bench && <p className="text-orange-400 text-xs mt-1.5">📊 {term.bench}</p>}
            {term.good  && <p className="text-green-400  text-xs mt-0.5">✅ {term.good}</p>}
            {term.bad   && <p className="text-red-400    text-xs mt-0.5">⚠️ {term.bad}</p>}
          </div>
        </div>
      )}
    </span>
  )
}

// 라벨 + 툴팁 한 번에
export function TLabel({
  label, termKey, required = false
}: { label: string; termKey?: string; required?: boolean }) {
  return (
    <label className="text-gray-400 text-xs mb-1 flex items-center gap-1">
      {label}
      {required && <span className="text-orange-400 ml-0.5">*</span>}
      {termKey && <Tooltip termKey={termKey} />}
    </label>
  )
}

// 결과 행 + 툴팁
export function ResultRow({
  label, value, termKey, color = 'text-white'
}: { label: string; value: string; termKey?: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800">
      <span className="text-gray-400 text-sm flex items-center gap-1">
        {label}
        {termKey && <Tooltip termKey={termKey} />}
      </span>
      <span className={`font-semibold text-sm ${color}`}>{value}</span>
    </div>
  )
}
