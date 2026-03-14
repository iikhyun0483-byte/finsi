// 기술적 지표 계산 라이브러리
// backtest-pro.jsx의 로직을 TypeScript로 변환

export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// SMA (단순 이동평균) 계산
export function calcSMA(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

// EMA (지수 이동평균) 계산
export function calcEMA(data: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = Array(data.length).fill(null);
  let started = false;
  let prev = 0;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;

    if (!started) {
      prev = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
      result[i] = prev;
      started = true;
    } else {
      prev = data[i] * k + prev * (1 - k);
      result[i] = prev;
    }
  }

  return result;
}

// RSI (상대강도지수) 계산
export function calcRSI(data: number[], period: number = 14): (number | null)[] {
  const changes = data.map((v, i) => (i === 0 ? 0 : v - data[i - 1]));
  const result: (number | null)[] = Array(data.length).fill(null);

  for (let i = period; i < data.length; i++) {
    const slice = changes.slice(i - period + 1, i + 1);
    const gains = slice.filter((c) => c > 0).reduce((a, b) => a + b, 0) / period;
    const losses = Math.abs(slice.filter((c) => c < 0).reduce((a, b) => a + b, 0)) / period;

    if (losses === 0) {
      result[i] = 100;
      continue;
    }

    result[i] = 100 - 100 / (1 + gains / losses);
  }

  return result;
}

// MACD (이동평균수렴확산) 계산
export interface MACDResult {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
}

export function calcMACD(data: number[]): MACDResult {
  const ema12 = calcEMA(data, 12);
  const ema26 = calcEMA(data, 26);

  const macdLine = data.map((_, i) =>
    ema12[i] !== null && ema26[i] !== null ? ema12[i]! - ema26[i]! : null
  );

  // Signal line은 MACD 값이 실제로 존재하는 위치부터만 계산
  const signalLine: (number | null)[] = Array(macdLine.length).fill(null);
  const validMacdIndices: number[] = [];
  const validMacdValues: number[] = [];

  macdLine.forEach((v, i) => {
    if (v !== null) {
      validMacdIndices.push(i);
      validMacdValues.push(v);
    }
  });

  if (validMacdValues.length >= 9) {
    const signalEma = calcEMA(validMacdValues, 9);
    signalEma.forEach((val, i) => {
      if (val !== null && validMacdIndices[i] !== undefined) {
        signalLine[validMacdIndices[i]] = val;
      }
    });
  }

  const histogram = macdLine.map((v, i) =>
    v !== null && signalLine[i] !== null ? v - signalLine[i]! : null
  );

  return { macdLine, signalLine, histogram };
}

// 볼린저밴드 계산
export interface BollingerBand {
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export function calcBollinger(
  data: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerBand[] {
  const sma = calcSMA(data, period);

  return data.map((_, i) => {
    if (sma[i] === null) return { upper: null, middle: null, lower: null };

    const slice = data.slice(i - period + 1, i + 1);
    const mean = sma[i]!;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const std = Math.sqrt(variance);

    return {
      upper: mean + stdDev * std,
      middle: mean,
      lower: mean - stdDev * std,
    };
  });
}

// 골든크로스 / 데드크로스 감지
export interface CrossSignal {
  type: "golden" | "dead" | null;
  date: string;
}

export function detectGoldenDeadCross(
  prices: PriceData[],
  shortPeriod: number = 50,
  longPeriod: number = 200
): CrossSignal[] {
  const closes = prices.map((p) => p.close);
  const shortMA = calcSMA(closes, shortPeriod);
  const longMA = calcSMA(closes, longPeriod);

  return prices.map((p, i) => {
    if (i === 0) return { type: null, date: p.date };

    const prevShort = shortMA[i - 1];
    const prevLong = longMA[i - 1];
    const currShort = shortMA[i];
    const currLong = longMA[i];

    if (
      prevShort !== null &&
      prevLong !== null &&
      currShort !== null &&
      currLong !== null
    ) {
      const prevDiff = prevShort - prevLong;
      const currDiff = currShort - currLong;

      if (prevDiff <= 0 && currDiff > 0) {
        return { type: "golden", date: p.date };
      } else if (prevDiff >= 0 && currDiff < 0) {
        return { type: "dead", date: p.date };
      }
    }

    return { type: null, date: p.date };
  });
}

// 최대 낙폭 (MDD) 계산
export interface MDDResult {
  mdd: number;
  mddStart: string;
  mddEnd: string;
}

export function calcMDD(portfolio: { date: string; value: number }[]): MDDResult {
  let peak = -Infinity;
  let mdd = 0;
  let mddStart = "";
  let mddEnd = "";
  let peakDate = "";

  for (const p of portfolio) {
    if (p.value > peak) {
      peak = p.value;
      peakDate = p.date;
    }

    const dd = ((peak - p.value) / peak) * 100;
    if (dd > mdd) {
      mdd = dd;
      mddStart = peakDate;
      mddEnd = p.date;
    }
  }

  return { mdd, mddStart, mddEnd };
}

// 샤프지수 계산
export function calcSharpe(
  portfolio: { date: string; value: number }[],
  riskFreeRate: number = 0.02 // 2% 무위험 수익률
): number {
  const dailyReturns = portfolio.map((p, i) =>
    i === 0 ? 0 : (p.value - portfolio[i - 1].value) / portfolio[i - 1].value
  );

  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / dailyReturns.length;

  const annualizedReturn = avgReturn * 252; // 연간 거래일
  const annualizedVol = Math.sqrt(variance) * Math.sqrt(252);

  return (annualizedReturn - riskFreeRate) / annualizedVol;
}

// CAGR (연평균 복리 수익률) 계산
export function calcCAGR(
  initialValue: number,
  finalValue: number,
  years: number
): number {
  return (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
}

// 변동성 계산 (표준편차)
export function calcVolatility(data: number[], period: number = 20): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;

    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;

    return Math.sqrt(variance);
  });
}
