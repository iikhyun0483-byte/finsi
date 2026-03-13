// lib/factor-model.ts

export interface PriceData {
  date: string
  close: number
  volume: number
  high: number
  low: number
}

export interface Fundamentals {
  pbr: number
  per: number
  evEbitda: number
  roe: number
  debtRatio: number
  earningsStability: number
  marketCap: number
  dataAvailable: boolean   // 실제 데이터인지 폴백값인지 표시
}

// fundamentals API 응답 → 안전하게 파싱
// 데이터 없거나 0이면 섹터 중립값 사용
export function parseFundamentals(raw: Record<string, unknown>): Fundamentals {
  const safe = (v: unknown, fallback: number): number => {
    const n = Number(v)
    return isFinite(n) && n > 0 ? n : fallback
  }
  const hasData = raw && (raw.pbr || raw.per || raw.roe)
  return {
    pbr:               safe(raw?.pbr,               2.0),
    per:               safe(raw?.per,               20.0),
    evEbitda:          safe(raw?.evEbitda,           12.0),
    roe:               safe(raw?.roe,               10.0),
    debtRatio:         safe(raw?.debtRatio,         60.0),
    earningsStability: safe(raw?.earningsStability,  0.5),
    marketCap:         safe(raw?.marketCap,           0),
    dataAvailable:     !!hasData,
  }
}

export interface FactorWeights {
  momentum: number
  value: number
  quality: number
  lowVol: number
  volume: number
}

export interface FactorScore {
  symbol: string
  momentumScore: number
  valueScore: number
  qualityScore: number
  lowVolScore: number
  volumeScore: number
  compositeScore: number
  percentile: number
  fundamentalsAvailable: boolean
  detail: {
    momentum12m: number
    momentum6m: number
    momentum1m: number
    pbr: number
    per: number
    evEbitda: number
    roe: number
    debtRatio: number
    vol52w: number
    volumeTrend: number
  }
}

// 가격 데이터 안전 파싱 — 배열 원소가 객체든 숫자든 처리
export function parsePriceArray(raw: unknown[]): PriceData[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, i) => {
    if (typeof item === 'number') {
      return { date: String(i), close: item, volume: 0, high: item, low: item }
    }
    const r = item as Record<string, unknown>
    const close = Number(r.close ?? r.price ?? r.c ?? 0)
    return {
      date:   String(r.date ?? r.t ?? i),
      close,
      volume: Number(r.volume ?? r.v ?? 0),
      high:   Number(r.high  ?? r.h ?? close),
      low:    Number(r.low   ?? r.l ?? close),
    }
  }).filter(p => p.close > 0)
}

export function calcMomentumFactor(prices: PriceData[]) {
  if (prices.length < 21) return { momentum12m: 0, momentum6m: 0, momentum1m: 0, score: 0 }
  const cur  = prices[prices.length - 1].close
  const p1m  = prices[Math.max(prices.length - 21,  0)].close
  const p6m  = prices[Math.max(prices.length - 126, 0)].close
  const p12m = prices[Math.max(prices.length - 252, 0)].close
  const m12  = (cur - p12m) / p12m
  const m6   = (cur - p6m)  / p6m
  const m1   = (cur - p1m)  / p1m
  return { momentum12m: m12, momentum6m: m6, momentum1m: m1, score: m12 - m1 }
}

export function calcValueFactor(f: Fundamentals) {
  const pbrS = f.pbr    > 0               ? -Math.log(f.pbr)    : 0
  const perS = f.per    > 0 && f.per < 200 ? -Math.log(f.per)    : 0
  const evS  = f.evEbitda > 0              ? -Math.log(f.evEbitda): 0
  return { pbr: f.pbr, per: f.per, evEbitda: f.evEbitda, score: (pbrS + perS + evS) / 3 }
}

export function calcQualityFactor(f: Fundamentals) {
  const roeS  = Math.min(f.roe / 100, 1)
  const debtS = Math.max(1 - f.debtRatio / 200, 0)
  const stabS = Math.min(Math.max(f.earningsStability, 0), 1)
  return {
    roe: f.roe, debtRatio: f.debtRatio, earningsStability: f.earningsStability,
    score: roeS * 0.4 + debtS * 0.3 + stabS * 0.3,
  }
}

export function calcLowVolFactor(prices: PriceData[]) {
  const n = Math.min(prices.length, 252)
  if (n < 20) return { vol52w: 0, score: 0 }
  const rets = []
  for (let i = prices.length - n + 1; i < prices.length; i++) {
    rets.push((prices[i].close - prices[i-1].close) / prices[i-1].close)
  }
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length
  const var_ = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length
  const vol  = Math.sqrt(var_ * 252)
  return { vol52w: vol, score: -vol }
}

export function calcVolumeFactor(prices: PriceData[]) {
  if (prices.length < 40) return { volumeTrend: 0, score: 0 }
  const recent = prices.slice(-20)
  const past   = prices.slice(-60, -20)
  if (past.length === 0) return { volumeTrend: 0, score: 0 }
  const avgR = recent.reduce((s, p) => s + p.volume, 0) / recent.length
  const avgP = past.reduce((s, p) => s + p.volume, 0) / past.length
  const trend = avgP > 0 ? (avgR - avgP) / avgP : 0
  const priceDir = prices[prices.length-1].close > prices[prices.length-20].close ? 1 : -1
  const volDir   = trend > 0 ? 1 : -1
  return { volumeTrend: trend, score: trend * priceDir * volDir }
}

export function zScore(values: number[]): number[] {
  if (values.length === 0) return []
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const std  = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length)
  if (std === 0) return values.map(() => 0)
  return values.map(v => (v - mean) / std)
}

export function screenUniverse(
  universe: Array<{ symbol: string; prices: PriceData[]; fundamentals: Fundamentals }>,
  weights: FactorWeights
): FactorScore[] {
  if (universe.length === 0) return []

  const mRaw   = universe.map(u => calcMomentumFactor(u.prices).score)
  const vRaw   = universe.map(u => calcValueFactor(u.fundamentals).score)
  const qRaw   = universe.map(u => calcQualityFactor(u.fundamentals).score)
  const lRaw   = universe.map(u => calcLowVolFactor(u.prices).score)
  const volRaw = universe.map(u => calcVolumeFactor(u.prices).score)

  const mZ = zScore(mRaw); const vZ = zScore(vRaw); const qZ = zScore(qRaw)
  const lZ = zScore(lRaw); const volZ = zScore(volRaw)

  const total = weights.momentum + weights.value + weights.quality + weights.lowVol + weights.volume || 1

  const scores: FactorScore[] = universe.map((u, i) => {
    const m   = calcMomentumFactor(u.prices)
    const v   = calcValueFactor(u.fundamentals)
    const q   = calcQualityFactor(u.fundamentals)
    const l   = calcLowVolFactor(u.prices)
    const vol = calcVolumeFactor(u.prices)
    const composite = (
      mZ[i]   * weights.momentum +
      vZ[i]   * weights.value    +
      qZ[i]   * weights.quality  +
      lZ[i]   * weights.lowVol   +
      volZ[i] * weights.volume
    ) / total
    return {
      symbol: u.symbol,
      momentumScore: mZ[i],
      valueScore:    vZ[i],
      qualityScore:  qZ[i],
      lowVolScore:   lZ[i],
      volumeScore:   volZ[i],
      compositeScore: composite,
      percentile: 0,
      fundamentalsAvailable: u.fundamentals.dataAvailable,
      detail: {
        momentum12m: m.momentum12m, momentum6m: m.momentum6m, momentum1m: m.momentum1m,
        pbr: v.pbr, per: v.per, evEbitda: v.evEbitda,
        roe: q.roe, debtRatio: q.debtRatio,
        vol52w: l.vol52w, volumeTrend: vol.volumeTrend,
      },
    }
  })

  const sorted = [...scores].sort((a, b) => a.compositeScore - b.compositeScore)
  scores.forEach(s => {
    const rank = sorted.findIndex(x => x.symbol === s.symbol)
    s.percentile = Math.round((rank / Math.max(scores.length - 1, 1)) * 100)
  })

  return scores.sort((a, b) => b.compositeScore - a.compositeScore)
}
