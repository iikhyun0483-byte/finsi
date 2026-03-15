// lib/stat-arb.ts

import { supabase } from "./supabase";

export interface PairAnalysis {
  symbol1: string
  symbol2: string
  correlation: number
  hedgeRatio: number
  currentZScore: number
  spreadMean: number
  spreadStd: number
  halfLife: number | string  // 숫자 또는 "발산"
  isPaired: boolean
  dataPoints: number     // 실제 사용된 데이터 포인트 수
}

export interface PairSignal {
  pair: string
  signal: 'LONG_SPREAD' | 'SHORT_SPREAD' | 'NEUTRAL' | 'EXIT'
  currentZScore: number
  halfLife: number | string
  confidence: number
  action: string
}

export interface PricePoint {
  date: string
  close: number
}

// 날짜 기준 가격 정렬 (두 종목 교집합)
export function alignPricesByDate(
  prices1: PricePoint[],
  prices2: PricePoint[]
): { aligned1: number[], aligned2: number[] } {
  // 날짜를 키로 하는 Map 생성
  const map1 = new Map(prices1.map(p => [p.date, p.close]))
  const map2 = new Map(prices2.map(p => [p.date, p.close]))

  // 교집합 날짜 추출 및 정렬
  const commonDates = Array.from(map1.keys())
    .filter(date => map2.has(date))
    .sort()

  // 정렬된 가격 배열 생성
  const aligned1 = commonDates.map(date => map1.get(date)!)
  const aligned2 = commonDates.map(date => map2.get(date)!)

  return { aligned1, aligned2 }
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

// 가격 배열을 PricePoint 배열로 변환
export function toPricePoints(raw: unknown[]): PricePoint[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, idx) => {
      if (typeof item === 'object' && item !== null) {
        const r = item as Record<string, unknown>
        const close = Number(r.close ?? r.price ?? r.c ?? r.value ?? 0)
        const date = String(r.date ?? r.datetime ?? r.time ?? `day-${idx}`)
        return isFinite(close) && close > 0 ? { date, close } : null
      }
      return null
    })
    .filter((p): p is PricePoint => p !== null)
}

function ols(y: number[], x: number[]) {
  const n = Math.min(y.length, x.length)
  if (n < 30) return { beta: 1, alpha: 0, residuals: [] as number[] }
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
  if (n < 30) return 0
  const xm=x.slice(0,n).reduce((s,v)=>s+v,0)/n
  const ym=y.slice(0,n).reduce((s,v)=>s+v,0)/n
  let cov=0,sx=0,sy=0
  for (let i=0;i<n;i++) { cov+=(x[i]-xm)*(y[i]-ym); sx+=(x[i]-xm)**2; sy+=(y[i]-ym)**2 }
  return Math.sqrt(sx*sy)>0 ? cov/Math.sqrt(sx*sy) : 0
}

function calcHalfLife(spread: number[]): number | string {
  const n = spread.length-1
  if (n < 30) return "발산"
  const lag   = spread.slice(0,n)
  const delta = spread.slice(1).map((s,i) => s-spread[i])
  const { beta } = ols(delta, lag)
  const hl = beta < 0 ? -Math.log(2)/beta : Infinity
  return hl > 100 ? "발산" : hl
}

export function analyzePair(
  symbol1: string, symbol2: string,
  prices1: number[], prices2: number[],
  lookback = 252
): PairAnalysis {
  const n  = Math.min(prices1.length, prices2.length, lookback)
  const p1 = prices1.slice(-n)
  const p2 = prices2.slice(-n)

  if (n < 60) {
    return {
      symbol1, symbol2, correlation: 0, hedgeRatio: 1,
      currentZScore: 0, spreadMean: 0, spreadStd: 0,
      halfLife: "발산", isPaired: false, dataPoints: n,
    }
  }

  const corr = pearson(p1, p2)
  const { beta, residuals } = ols(p1, p2)

  // residuals 길이 체크 추가 (NaN 전파 방지)
  if (residuals.length < 10) {
    return {
      symbol1, symbol2, correlation: corr, hedgeRatio: beta,
      currentZScore: 0, spreadMean: 0, spreadStd: 0,
      halfLife: "발산", isPaired: false, dataPoints: n,
    }
  }

  const mean  = residuals.reduce((s,r)=>s+r,0)/residuals.length
  const std   = Math.sqrt(residuals.reduce((s,r)=>s+(r-mean)**2,0)/residuals.length)
  const z     = std>0 && residuals.length > 0 ? (residuals[residuals.length-1]-mean)/std : 0
  const hl    = calcHalfLife(residuals)
  const hlNum = typeof hl === 'number' ? hl : Infinity
  const isPaired = Math.abs(corr)>=0.8 && hlNum>=5 && hlNum<=60

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
    action = analysis.dataPoints < 60
      ? '데이터 부족 (60일 이상 필요)'
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

// Supabase 캐싱 (10분 유효)
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10분

export async function analyzePairWithCache(
  symbol1: string,
  symbol2: string,
  prices1: number[],
  prices2: number[],
  lookback = 252
): Promise<PairAnalysis> {
  const cacheKey = `${symbol1}_${symbol2}_${lookback}`;

  // 1. Supabase 캐시 확인
  try {
    const tenMinutesAgo = new Date(Date.now() - CACHE_DURATION_MS).toISOString();
    const { data: cached, error } = await supabase
      .from('pair_analysis_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gte('updated_at', tenMinutesAgo)
      .single();

    if (!error && cached) {
      console.log(`💾 ${cacheKey} Supabase 캐시 사용`);
      return {
        symbol1,
        symbol2,
        correlation: cached.correlation,
        hedgeRatio: cached.hedge_ratio,
        currentZScore: cached.current_z_score,
        spreadMean: cached.spread_mean,
        spreadStd: cached.spread_std,
        halfLife: cached.half_life_num ?? cached.half_life_str ?? "발산",
        isPaired: cached.is_paired,
        dataPoints: cached.data_points,
      };
    }
  } catch (cacheError) {
    console.warn(`⚠️ ${cacheKey} 캐시 조회 실패:`, cacheError);
  }

  // 2. 실제 분석 수행
  const analysis = analyzePair(symbol1, symbol2, prices1, prices2, lookback);

  // 3. Supabase 캐시 저장
  try {
    await supabase.from('pair_analysis_cache').upsert({
      cache_key: cacheKey,
      symbol1,
      symbol2,
      lookback,
      correlation: analysis.correlation,
      hedge_ratio: analysis.hedgeRatio,
      current_z_score: analysis.currentZScore,
      spread_mean: analysis.spreadMean,
      spread_std: analysis.spreadStd,
      half_life_num: typeof analysis.halfLife === 'number' ? analysis.halfLife : null,
      half_life_str: typeof analysis.halfLife === 'string' ? analysis.halfLife : null,
      is_paired: analysis.isPaired,
      data_points: analysis.dataPoints,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'cache_key',
    });
    console.log(`💾 ${cacheKey} Supabase 캐시 저장`);
  } catch (saveError) {
    console.warn(`⚠️ ${cacheKey} 캐시 저장 실패:`, saveError);
  }

  return analysis;
}

export const KNOWN_PAIRS = [
  { symbol1: 'SPY',     symbol2: 'QQQ',     label: 'S&P500 vs 나스닥' },
  { symbol1: 'GLD',     symbol2: 'SLV',     label: '금 vs 은' },
  { symbol1: 'XLE',     symbol2: 'XOM',     label: '에너지ETF vs 엑슨모빌' },
  { symbol1: 'BTC-USD', symbol2: 'ETH-USD', label: '비트코인 vs 이더리움' },
  { symbol1: 'XLF',     symbol2: 'JPM',     label: '금융ETF vs JP모건' },
  { symbol1: 'QQQ',     symbol2: 'NVDA',    label: '나스닥 vs 엔비디아' },
]
