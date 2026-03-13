// lib/multi-timeframe.ts
// 주봉 방향 × 일봉 타이밍 × 시간봉 진입

export interface TimeframeSignal {
  weekly:    { trend: 'UP'|'DOWN'|'SIDEWAYS'; strength: number }
  daily:     { signal: 'BUY'|'SELL'|'NEUTRAL'; score: number }
  hourly:    { entry: 'NOW'|'WAIT'|'MISS'; timing: string }
  composite: { action: 'STRONG_BUY'|'BUY'|'NEUTRAL'|'SELL'|'STRONG_SELL'; confidence: number }
}

export function analyzeMultiTimeframe(input: {
  weeklyPrices: number[]   // 52주 주봉
  dailyPrices:  number[]   // 60일 일봉
  hourlyPrices: number[]   // 48시간 시간봉
}): TimeframeSignal {
  const { weeklyPrices, dailyPrices, hourlyPrices } = input

  // 주봉 추세 (20주 이동평균 대비)
  const w = weeklyPrices
  const wMA20 = w.slice(-20).reduce((s,v) => s+v, 0) / Math.min(w.length, 20)
  const wCur  = w[w.length-1] ?? 0
  const weekly = {
    trend: wCur > wMA20 * 1.02 ? 'UP' as const :
           wCur < wMA20 * 0.98 ? 'DOWN' as const : 'SIDEWAYS' as const,
    strength: Math.abs(wCur - wMA20) / wMA20,
  }

  // 일봉 신호 (RSI + 이동평균)
  const d = dailyPrices
  const dMA5  = d.slice(-5).reduce((s,v) => s+v, 0)  / Math.min(d.length, 5)
  const dMA20 = d.slice(-20).reduce((s,v) => s+v, 0) / Math.min(d.length, 20)
  const dCur  = d[d.length-1] ?? 0
  const dailyScore = dMA5 > dMA20 ? 60 : dMA5 < dMA20 ? 40 : 50
  const daily = {
    signal: dCur > dMA20 ? 'BUY' as const : dCur < dMA20 ? 'SELL' as const : 'NEUTRAL' as const,
    score: dailyScore,
  }

  // 시간봉 진입 타이밍 (최근 4시간 가격 방향)
  const h = hourlyPrices
  const hCur  = h[h.length-1] ?? 0
  const h4Ago = h[Math.max(h.length-4, 0)] ?? hCur
  const hTrend = hCur > h4Ago * 1.005 ? 'rising' : hCur < h4Ago * 0.995 ? 'falling' : 'flat'
  const hourly = {
    entry: (weekly.trend === 'UP'   && hTrend === 'rising') ? 'NOW'  as const :
           (weekly.trend === 'DOWN' && hTrend === 'falling') ? 'MISS' as const : 'WAIT' as const,
    timing: hTrend === 'rising' ? '상승 중 — 진입 가능' : hTrend === 'falling' ? '하락 중 — 대기' : '횡보',
  }

  // 복합 판단
  const bullCount = [
    weekly.trend === 'UP',
    daily.signal === 'BUY',
    hourly.entry === 'NOW',
  ].filter(Boolean).length

  const composite = {
    action: bullCount === 3 ? 'STRONG_BUY' as const :
            bullCount === 2 ? 'BUY' as const :
            bullCount === 1 ? 'NEUTRAL' as const : 'SELL' as const,
    confidence: bullCount / 3,
  }

  return { weekly, daily, hourly, composite }
}
