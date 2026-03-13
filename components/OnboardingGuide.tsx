// components/OnboardingGuide.tsx
// app/layout.tsx 에 삽입 — 전체 앱 첫 진입 시 1회만 표시
'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const STEPS = [
  {
    icon: '👋',
    title: '처음 오셨나요?',
    desc: '이 앱은 돈에 관한 모든 의사결정을 수학적으로 계산합니다. 투자 전문 지식 없어도 됩니다.',
  },
  {
    icon: '💰',
    title: '재무 계산기',
    desc: '대출 이자 계산, 이 대출 받아도 되는지, 집 살지 전세 살지, 사업이 살아남을지 — 숫자 입력하면 즉시 나옵니다.',
    href: '/finance', cta: '바로 계산하기',
  },
  {
    icon: '🧬',
    title: '인생 시뮬레이션',
    desc: '현재 나이, 월소득, 월지출, 은퇴 목표 나이 4가지만 입력하면 사망까지 재무 흐름이 시각화됩니다.',
    href: '/lifecycle', cta: '시뮬레이션 시작',
  },
  {
    icon: '⚖️',
    title: 'A vs B 비교',
    desc: '"이 대출 vs 저 대출" "지금 투자 vs 1년 후 투자" 두 선택지를 수치로 비교합니다.',
    href: '/compare', cta: '비교하러 가기',
  },
]

export function OnboardingGuide() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)
  const pathname = usePathname()

  useEffect(() => {
    // 설정/API 페이지 제외
    if (pathname?.startsWith('/api') || pathname?.startsWith('/settings')) return
    try {
      if (!sessionStorage.getItem('finsi_guided')) setShow(true)
    } catch {}
  }, [pathname])

  function close() {
    try { sessionStorage.setItem('finsi_guided', '1') } catch {}
    setShow(false)
  }

  function goTo(href: string) {
    close()
    window.location.href = href
  }

  if (!show) return null
  const s = STEPS[step]

  return (
    <div
      className="fixed inset-0 bg-black/75 z-[100] flex items-end sm:items-center justify-center p-4"
      onClick={close}
    >
      <div
        className="bg-[#1a2035] border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 진행 바 */}
        <div className="flex gap-1 mb-5">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-orange-500' : 'bg-gray-700'}`} />
          ))}
        </div>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{s.icon}</div>
          <h2 className="text-lg font-bold text-white mb-2">{s.title}</h2>
          <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
        </div>

        <div className="space-y-2">
          {s.href && s.cta && (
            <button onClick={() => goTo(s.href!)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 font-semibold transition-colors text-sm">
              {s.cta} →
            </button>
          )}
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(v => v - 1)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-2.5 text-sm transition-colors">
                이전
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(v => v + 1)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-2.5 text-sm transition-colors">
                다음
              </button>
            ) : (
              <button onClick={close}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-2.5 text-sm transition-colors">
                시작하기
              </button>
            )}
          </div>
          <button onClick={close} className="w-full text-gray-600 hover:text-gray-400 text-xs py-1">건너뛰기</button>
        </div>
      </div>
    </div>
  )
}
