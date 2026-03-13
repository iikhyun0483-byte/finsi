// lib/stat-arb.ts

export interface PairAnalysis {
  symbol1: string
  symbol2: string
  correlation: number
  hedgeRatio: number
  currentZScore: number
  spreadMean: number
  spreadStd: number
  halfLife: number
  isPaired: boolean
  dataPoints: number     // 실제 사용된 데이터 포인트 수
}

export interface PairSignal {
  pair: string
  signal: 'LONG_SPREAD' | 'SHORT_SPREAD' | 'NEUTRAL' | 'EXIT'
  currentZScore: number
  halfLife: number
  confidence: number
  action: string
}

// 가격 배열 안전 추출 — 객체 배열 or 숫자 배열 모두 처리
export function extractCloseprices(raw: unknown[]): number[] {
  if (!Array.isArray(raw)) return []
  return raw.map(item => {
    if (typeof item === 'number' && isFinite(item)) return item
    if (typeof item === 'object' && item !== null) {
      const r = item as Record<string, unknown>
      const v = Number(r.close ?? r.price ?? r.c ?? r.value ?? 0)
      return isFinite(v) ? v : 0
    }
    return 0
  }).filter(v => v > 0)
}

function ols(y: number[], x: number[]) {
  const n = Math.min(y.length, x.length)
  if (n < 10) return { beta: 1, alpha: 0, residuals: [] as number[] }
  const xm = x.slice(0,n).reduce((s,v)=>s+v,0)/n
  const ym = y.slice(0,n).reduce((s,v)=>s+v,0)/n
  let cov=0, varx=0
  for (let i=0;i<n;i++) { cov+=(x[i]-xm)*(y[i]-ym); varx+=(x[i]-xm)**2 }
  const beta  = varx>0 ? cov/varx : 1
  const alpha = ym - beta*xm
  const residuals = y.slice(0,n).map((yi,i) => yi - alpha - beta*x[i])
  return { beta, alpha, residuals }
}

function pearson(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length)
  if (n < 10) return 0
  const xm=x.slice(0,n).reduce((s,v)=>s+v,0)/n
  const ym=y.slice(0,n).reduce((s,v)=>s+v,0)/n
  let cov=0,sx=0,sy=0
  for (let i=0;i<n;i++) { cov+=(x[i]-xm)*(y[i]-ym); sx+=(x[i]-xm)**2; sy+=(y[i]-ym)**2 }
  return Math.sqrt(sx*sy)>0 ? cov/Math.sqrt(sx*sy) : 0
}

function calcHalfLife(spread: number[]) {
  const n = spread.length-1
  if (n < 10) return 999
  const lag   = spread.slice(0,n)
  const delta = spread.slice(1).map((s,i) => s-spread[i])
  const { beta } = ols(delta, lag)
  return beta < 0 ? -Math.log(2)/beta : 999
}

export function analyzePair(
  symbol1: string, symbol2: string,
  prices1: number[], prices2: number[],
  lookback = 252
): PairAnalysis {
  const n  = Math.min(prices1.length, prices2.length, lookback)
  const p1 = prices1.slice(-n)
  const p2 = prices2.slice(-n)

  if (n < 20) {
    return {
      symbol1, symbol2, correlation: 0, hedgeRatio: 1,
      currentZScore: 0, spreadMean: 0, spreadStd: 0,
      halfLife: 999, isPaired: false, dataPoints: n,
    }
  }

  const corr = pearson(p1, p2)
  const { beta, residuals } = ols(p1, p2)
  if (residuals.length === 0) {
    return {
      symbol1, symbol2, correlation: corr, hedgeRatio: beta,
      currentZScore: 0, spreadMean: 0, spreadStd: 0,
      halfLife: 999, isPaired: false, dataPoints: n,
    }
  }

  const mean  = residuals.reduce((s,r)=>s+r,0)/residuals.length
  const std   = Math.sqrt(residuals.reduce((s,r)=>s+(r-mean)**2,0)/residuals.length)
  const z     = std>0 ? (residuals[residuals.length-1]-mean)/std : 0
  const hl    = calcHalfLife(residuals)
  const isPaired = Math.abs(corr)>=0.8 && hl>=5 && hl<=60

  return {
    symbol1, symbol2, correlation: corr, hedgeRatio: beta,
    currentZScore: z, spreadMean: mean, spreadStd: std,
    halfLife: hl, isPaired, dataPoints: n,
  }
}

export function generatePairSignal(
  analysis: PairAnalysis,
  entryThreshold = 2.0,
  exitThreshold  = 0.5
): PairSignal {
  const pair = `${analysis.symbol1}/${analysis.symbol2}`
  const z    = analysis.currentZScore
  let signal: PairSignal['signal'] = 'NEUTRAL'
  let action = '진입 조건 미충족'

  if (!analysis.isPaired) {
    action = analysis.dataPoints < 20
      ? '데이터 부족 (20일 이상 필요)'
      : '공적분 관계 불충분 — 거래 부적합'
  } else if (z > entryThreshold) {
    signal = 'SHORT_SPREAD'
    action = `${analysis.symbol1} 매도 + ${analysis.symbol2} 매수\n(스프레드 +${z.toFixed(2)}σ 과확대 → 수렴 예상)`
  } else if (z < -entryThreshold) {
    signal = 'LONG_SPREAD'
    action = `${analysis.symbol1} 매수 + ${analysis.symbol2} 매도\n(스프레드 ${z.toFixed(2)}σ 과축소 → 확대 예상)`
  } else if (Math.abs(z) < exitThreshold) {
    signal = 'EXIT'
    action = `스프레드 수렴 완료 (Z=${z.toFixed(2)}) — 포지션 청산 타이밍`
  } else {
    action = `Z=${z.toFixed(2)} — 진입 임계값(±${entryThreshold}) 미달`
  }

  const confidence = analysis.isPaired
    ? Math.min(Math.abs(z)/3 * Math.abs(analysis.correlation), 1)
    : 0

  return { pair, signal, currentZScore: z, halfLife: analysis.halfLife, confidence, action }
}

export const KNOWN_PAIRS = [
  { symbol1: 'SPY',     symbol2: 'QQQ',     label: 'S&P500 vs 나스닥' },
  { symbol1: 'GLD',     symbol2: 'SLV',     label: '금 vs 은' },
  { symbol1: 'XLE',     symbol2: 'XOM',     label: '에너지ETF vs 엑슨모빌' },
  { symbol1: 'BTC-USD', symbol2: 'ETH-USD', label: '비트코인 vs 이더리움' },
  { symbol1: 'XLF',     symbol2: 'JPM',     label: '금융ETF vs JP모건' },
  { symbol1: 'QQQ',     symbol2: 'NVDA',    label: '나스닥 vs 엔비디아' },
]
