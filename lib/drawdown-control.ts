// lib/drawdown-control.ts

export interface DrawdownInput {
  currentEquity: number
  peakEquity: number
  maxAllowedDD: number
  scaleOutLevels: number[]
}

export interface DrawdownResult {
  currentDD: number
  positionMultiplier: number
  action: 'FULL' | 'SCALE_DOWN' | 'CASH'
  message: string
  nextWarningLevel: number
  recoveryNeeded: number     // 회복에 필요한 수익률 %
}

export function calcDrawdownControl(input: DrawdownInput): DrawdownResult {
  const { currentEquity, peakEquity, maxAllowedDD, scaleOutLevels } = input
  const dd = peakEquity > 0 ? (peakEquity - currentEquity) / peakEquity * 100 : 0
  // 회복 필요 수익률: -x% 손실 → +x/(1-x)*100% 필요
  const recoveryNeeded = dd > 0 ? dd / (1 - dd/100) : 0

  if (dd >= maxAllowedDD) {
    return {
      currentDD: dd, positionMultiplier: 0, action: 'CASH',
      message: `낙폭 ${dd.toFixed(1)}% — 최대 허용치 초과. 전량 현금화`,
      nextWarningLevel: maxAllowedDD,
      recoveryNeeded,
    }
  }

  const triggered = [...scaleOutLevels].sort((a,b) => b-a).find(l => dd >= l)

  if (triggered !== undefined) {
    const ratio = triggered / maxAllowedDD
    const mult  = Math.max(1 - ratio * 0.7, 0.1)
    const next  = scaleOutLevels.find(l => l > triggered) ?? maxAllowedDD
    return {
      currentDD: dd, positionMultiplier: mult, action: 'SCALE_DOWN',
      message: `낙폭 ${dd.toFixed(1)}% — 포지션 ${(mult*100).toFixed(0)}%로 축소`,
      nextWarningLevel: next,
      recoveryNeeded,
    }
  }

  return {
    currentDD: dd, positionMultiplier: 1, action: 'FULL',
    message: `낙폭 ${dd.toFixed(1)}% — 정상 범위`,
    nextWarningLevel: scaleOutLevels[0] ?? maxAllowedDD/3,
    recoveryNeeded,
  }
}
