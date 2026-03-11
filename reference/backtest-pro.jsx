import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, AreaChart, Area,
  BarChart, Bar, ComposedChart
} from "recharts";

function calcSMA(data, period) {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

function calcEMA(data, period) {
  const k = 2 / (period + 1);
  const result = Array(data.length).fill(null);
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

function calcRSI(data, period = 14) {
  const changes = data.map((v, i) => (i === 0 ? 0 : v - data[i - 1]));
  const result = Array(data.length).fill(null);
  for (let i = period; i < data.length; i++) {
    const slice = changes.slice(i - period + 1, i + 1);
    const gains = slice.filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
    const losses = Math.abs(slice.filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;
    if (losses === 0) { result[i] = 100; continue; }
    result[i] = 100 - 100 / (1 + gains / losses);
  }
  return result;
}

function calcMACD(data) {
  const ema12 = calcEMA(data, 12);
  const ema26 = calcEMA(data, 26);
  const macdLine = data.map((_, i) =>
    ema12[i] !== null && ema26[i] !== null ? ema12[i] - ema26[i] : null
  );
  const validMacd = macdLine.map(v => v ?? 0);
  const signalLine = calcEMA(validMacd, 9);
  const histogram = macdLine.map((v, i) =>
    v !== null && signalLine[i] !== null ? v - signalLine[i] : null
  );
  return { macdLine, signalLine, histogram };
}

function calcBollinger(data, period = 20, stdDev = 2) {
  const sma = calcSMA(data, period);
  return data.map((_, i) => {
    if (sma[i] === null) return { upper: null, middle: null, lower: null };
    const slice = data.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    return {
      upper: mean + stdDev * std,
      middle: mean,
      lower: mean - stdDev * std,
    };
  });
}

function calcMDD(portfolio) {
  let peak = -Infinity;
  let mdd = 0;
  let mddStart = "";
  let mddEnd = "";
  let peakDate = "";
  for (const p of portfolio) {
    if (p.value > peak) { peak = p.value; peakDate = p.date; }
    const dd = (peak - p.value) / peak * 100;
    if (dd > mdd) { mdd = dd; mddStart = peakDate; mddEnd = p.date; }
  }
  return { mdd, mddStart, mddEnd };
}

const STRATEGIES = {
  buy_and_hold: {
    name: "장기보유 전략",
    engName: "Buy & Hold",
    desc: "처음 한 번 사고 끝까지 보유. 단순하지만 역사적으로 대부분의 전략을 이김.",
    color: "#94a3b8",
    icon: "🏦",
    difficulty: "쉬움",
  },
  ma_golden: {
    name: "골든/데드크로스",
    engName: "Golden Cross / Dead Cross",
    desc: "50일 이평선이 200일 이평선 위로 돌파(골든크로스) → 매수. 아래로 이탈(데드크로스) → 매도.",
    color: "#f59e0b",
    icon: "📈",
    difficulty: "보통",
  },
  rsi: {
    name: "RSI 역추세",
    engName: "RSI Reversal",
    desc: "RSI 30 이하(과매도) 후 반등 → 매수. RSI 70 이상(과매수) 후 하락 → 매도.",
    color: "#a78bfa",
    icon: "🔄",
    difficulty: "보통",
  },
  macd: {
    name: "MACD 교차",
    engName: "MACD Crossover",
    desc: "MACD선이 시그널선을 위로 돌파 → 매수. 아래로 이탈 → 매도. 추세 전환 포착.",
    color: "#22c55e",
    icon: "⚡",
    difficulty: "어려움",
  },
  bollinger: {
    name: "볼린저밴드 반등",
    engName: "Bollinger Band Bounce",
    desc: "주가가 하단 밴드 터치 후 반등 → 매수. 상단 밴드 터치 → 매도. 변동성 기반 전략.",
    color: "#38bdf8",
    icon: "🎯",
    difficulty: "어려움",
  },
  dual_momentum: {
    name: "듀얼 모멘텀",
    engName: "Dual Momentum",
    desc: "12개월 수익률이 플러스이고 무위험자산(채권)보다 높을 때만 보유. 게리 안토나치 전략.",
    color: "#f97316",
    icon: "🚀",
    difficulty: "어려움",
  },
};

function runBacktest(prices, dates, strategyKey, capital = 10000000) {
  let cash = capital;
  let shares = 0;
  const portfolio = [];
  const tradeLog = [];
  let lastBuyPrice = 0;
  let totalWins = 0;
  let totalTrades = 0;

  const closes = prices.map(p => p.close);
  const sma50 = calcSMA(closes, 50);
  const sma200 = calcSMA(closes, 200);
  const rsi14 = calcRSI(closes, 14);
  const { macdLine, signalLine, histogram } = calcMACD(closes);
  const boll = calcBollinger(closes, 20, 2);
  const startIdx = 210;

  for (let i = startIdx; i < prices.length; i++) {
    const price = closes[i];
    let signal = null;
    let signalReason = "";

    if (strategyKey === "buy_and_hold") {
      if (i === startIdx) { signal = "BUY"; signalReason = "최초 매수 (전략 시작)"; }
    }
    else if (strategyKey === "ma_golden") {
      const prev = sma50[i-1] !== null && sma200[i-1] !== null ? sma50[i-1] - sma200[i-1] : null;
      const curr = sma50[i] !== null && sma200[i] !== null ? sma50[i] - sma200[i] : null;
      if (prev !== null && curr !== null) {
        if (prev <= 0 && curr > 0) { signal = "BUY"; signalReason = "골든크로스 발생 (50일선이 200일선 위로 돌파)"; }
        else if (prev >= 0 && curr < 0) { signal = "SELL"; signalReason = "데드크로스 발생 (50일선이 200일선 아래로 이탈)"; }
      }
    }
    else if (strategyKey === "rsi") {
      const r = rsi14[i], rp = rsi14[i-1];
      if (r !== null && rp !== null) {
        if (rp <= 30 && r > 30 && shares === 0) { signal = "BUY"; signalReason = `RSI 과매도 탈출 (${r.toFixed(1)} → 30 돌파)`; }
        else if (rp >= 70 && r < 70 && shares > 0) { signal = "SELL"; signalReason = `RSI 과매수 이탈 (${r.toFixed(1)} → 70 하향)`; }
      }
    }
    else if (strategyKey === "macd") {
      const m = macdLine[i], mp = macdLine[i-1];
      const s = signalLine[i], sp = signalLine[i-1];
      if (m !== null && mp !== null && s !== null && sp !== null) {
        if (mp < sp && m > s && shares === 0) { signal = "BUY"; signalReason = "MACD선이 시그널선 위로 돌파 (상승 전환)"; }
        else if (mp > sp && m < s && shares > 0) { signal = "SELL"; signalReason = "MACD선이 시그널선 아래로 이탈 (하락 전환)"; }
      }
    }
    else if (strategyKey === "bollinger") {
      const b = boll[i], bp = boll[i-1];
      if (b.lower !== null && bp.lower !== null) {
        if (closes[i-1] <= bp.lower && price > b.lower && shares === 0) { signal = "BUY"; signalReason = "볼린저 하단 밴드 터치 후 반등"; }
        else if (closes[i-1] >= bp.upper && price < b.upper && shares > 0) { signal = "SELL"; signalReason = "볼린저 상단 밴드 터치 후 하락"; }
      }
    }
    else if (strategyKey === "dual_momentum") {
      if (i >= 252) {
        const momentum12 = (closes[i] - closes[i - 252]) / closes[i - 252];
        const riskFreeRate = 0.04 / 252;
        const riskFreeReturn = Math.pow(1 + riskFreeRate, 252) - 1;
        if (momentum12 > riskFreeReturn && shares === 0) { signal = "BUY"; signalReason = `12개월 모멘텀 양호 (+${(momentum12*100).toFixed(1)}%)`; }
        else if (momentum12 <= riskFreeReturn && shares > 0) { signal = "SELL"; signalReason = `모멘텀 약화 → 현금 전환`; }
      }
    }

    if (signal === "BUY" && cash > price) {
      shares = Math.floor(cash / price);
      lastBuyPrice = price;
      cash -= shares * price;
      totalTrades++;
      tradeLog.push({ date: dates[i], type: "매수", price: price.toFixed(2), reason: signalReason, shares });
    } else if (signal === "SELL" && shares > 0) {
      const proceeds = shares * price;
      if (price > lastBuyPrice) totalWins++;
      cash += proceeds;
      totalTrades++;
      tradeLog.push({ date: dates[i], type: "매도", price: price.toFixed(2), reason: signalReason, profit: ((price - lastBuyPrice) / lastBuyPrice * 100).toFixed(2) });
      shares = 0;
    }

    const totalValue = cash + shares * price;
    portfolio.push({
      date: dates[i],
      value: Math.round(totalValue),
      price: Math.round(price * 100) / 100,
      rsi: rsi14[i] ? Math.round(rsi14[i] * 10) / 10 : null,
      sma50: sma50[i] ? Math.round(sma50[i] * 100) / 100 : null,
      sma200: sma200[i] ? Math.round(sma200[i] * 100) / 100 : null,
      macd: macdLine[i] ? Math.round(macdLine[i] * 100) / 100 : null,
      macdSignal: signalLine[i] ? Math.round(signalLine[i] * 100) / 100 : null,
      macdHist: histogram[i] ? Math.round(histogram[i] * 100) / 100 : null,
      bollUpper: boll[i].upper ? Math.round(boll[i].upper * 100) / 100 : null,
      bollMid: boll[i].middle ? Math.round(boll[i].middle * 100) / 100 : null,
      bollLower: boll[i].lower ? Math.round(boll[i].lower * 100) / 100 : null,
      inMarket: shares > 0 ? 1 : 0,
    });
  }

  const finalValue = portfolio[portfolio.length - 1]?.value || capital;
  const totalReturn = ((finalValue - capital) / capital * 100).toFixed(2);
  const years = portfolio.length / 252;
  const cagr = ((Math.pow(finalValue / capital, 1 / years) - 1) * 100).toFixed(2);
  const { mdd, mddStart, mddEnd } = calcMDD(portfolio);

  const dailyReturns = portfolio.map((p, i) =>
    i === 0 ? 0 : (p.value - portfolio[i-1].value) / portfolio[i-1].value
  );
  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / dailyReturns.length;
  const sharpe = ((avgReturn / Math.sqrt(variance)) * Math.sqrt(252)).toFixed(2);

  const inMarketDays = portfolio.filter(p => p.inMarket).length;
  const inMarketPct = ((inMarketDays / portfolio.length) * 100).toFixed(1);

  const monthlyMap = {};
  portfolio.forEach(p => {
    const ym = p.date.slice(0, 7);
    monthlyMap[ym] = p.value;
  });
  const monthlyKeys = Object.keys(monthlyMap).sort();
  const monthlyReturns = monthlyKeys.map((ym, i) => ({
    month: ym,
    return: i === 0 ? 0 : ((monthlyMap[ym] - monthlyMap[monthlyKeys[i-1]]) / monthlyMap[monthlyKeys[i-1]] * 100),
  }));

  return {
    portfolio, tradeLog, monthlyReturns,
    stats: {
      finalValue, totalReturn, cagr,
      mdd: mdd.toFixed(2), mddStart, mddEnd,
      totalTrades,
      winRate: totalTrades > 0 ? ((totalWins / totalTrades) * 100).toFixed(1) : "N/A",
      sharpe, inMarketPct,
      years: years.toFixed(1),
    }
  };
}

function generateData(years = 10) {
  const yearlyData = [
    { ret: 0.1139, vol: 0.010 }, { ret: 0.0138, vol: 0.012 },
    { ret: 0.0954, vol: 0.011 }, { ret: 0.1942, vol: 0.008 },
    { ret: -0.0623, vol: 0.018 }, { ret: 0.2878, vol: 0.009 },
    { ret: 0.1540, vol: 0.010 }, { ret: -0.1944, vol: 0.022 },
    { ret: 0.2421, vol: 0.010 }, { ret: 0.2523, vol: 0.009 },
    { ret: 0.0251, vol: 0.012 },
  ];
  const prices = [];
  const dates = [];
  let price = 3200;
  const now = new Date();
  const start = new Date(now);
  start.setFullYear(now.getFullYear() - years);
  let yearIndex = 0;
  let dayInYear = 0;
  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const yr = yearlyData[Math.min(yearIndex, yearlyData.length - 1)];
    const dailyReturn = yr.ret / 252;
    const noise = (Math.random() - 0.48) * yr.vol;
    price = price * (1 + dailyReturn + noise);
    price = Math.max(price, 500);
    prices.push({ close: price, open: price * (1 + (Math.random() - 0.5) * 0.003) });
    dates.push(d.toISOString().split("T")[0]);
    dayInYear++;
    if (dayInYear >= 252) { dayInYear = 0; yearIndex++; }
  }
  return { prices, dates };
}

const fmt = n => new Intl.NumberFormat("ko-KR").format(Math.round(n));
const fmtPct = n => `${parseFloat(n) >= 0 ? "+" : ""}${n}%`;
const color = n => parseFloat(n) >= 0 ? "#22c55e" : "#ef4444";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0a0e1a", border: "1px solid #1e3a5f", borderRadius: 8, padding: "12px 16px", fontSize: 11 }}>
      <div style={{ color: "#4a9eff", marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {typeof p.value === "number" ? (p.value > 1000 ? `₩${fmt(p.value)}` : p.value.toFixed(2)) : p.value}
        </div>
      ))}
    </div>
  );
};

export default function BacktestPro() {
  const [strategy, setStrategy] = useState("ma_golden");
  const [years, setYears] = useState(10);
  const [capital, setCapital] = useState(10000000);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("portfolio");
  const [compareMode, setCompareMode] = useState(false);
  const [compareResults, setCompareResults] = useState(null);

  const run = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const { prices, dates } = generateData(years);
      const res = runBacktest(prices, dates, strategy, capital);
      setResult(res);
      if (compareMode) {
        const bhRes = runBacktest(prices, dates, "buy_and_hold", capital);
        setCompareResults(bhRes);
      } else {
        setCompareResults(null);
      }
      setLoading(false);
    }, 400);
  }, [strategy, years, capital, compareMode]);

  useEffect(() => { run(); }, [run]);

  const thin = (arr, step = 5) => arr.filter((_, i) => i % step === 0);
  const chartData = result ? thin(result.portfolio, Math.max(1, Math.floor(result.portfolio.length / 300))) : [];
  const mergedChart = compareResults
    ? chartData.map((d, i) => {
        const c = compareResults.portfolio[Math.min(i * Math.max(1, Math.floor(result.portfolio.length / 300)), compareResults.portfolio.length - 1)];
        return { ...d, compareValue: c?.value };
      })
    : chartData;

  const s = result?.stats;
  const strat = STRATEGIES[strategy];

  const TABS = [
    { key: "portfolio", label: "💰 수익 곡선" },
    { key: "price", label: "📊 주가+이평선" },
    { key: "rsi", label: "📉 RSI 지표" },
    { key: "macd", label: "⚡ MACD" },
    { key: "bollinger", label: "🎯 볼린저밴드" },
    { key: "monthly", label: "📅 월별 수익률" },
    { key: "trades", label: "🔔 매매 기록" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#060910", color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ background: "linear-gradient(135deg, #0d1321 0%, #0f1e35 100%)", borderBottom: "1px solid #1e3a5f", padding: "20px 28px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "#4a9eff", letterSpacing: 4, marginBottom: 4 }}>QUANTITATIVE BACKTESTING SYSTEM v2.0</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>S&P 500 퀀트 전략 백테스터 (과거 전략 검증 시스템)</div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ background: "#0d1b2a", border: "1px solid #1e3a5f", borderRadius: 8, padding: "10px 18px" }}>
              <div style={{ fontSize: 10, color: "#4a9eff", marginBottom: 2 }}>초기 자본금 (원)</div>
              <input type="number" value={capital} onChange={e => setCapital(Number(e.target.value))}
                style={{ background: "transparent", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: "inherit", width: 130, outline: "none" }} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: compareMode ? "#4a9eff" : "#64748b" }}>
              <div onClick={() => setCompareMode(p => !p)}
                style={{ width: 36, height: 20, borderRadius: 10, background: compareMode ? "#4a9eff" : "#1e3a5f", position: "relative", transition: "all 0.2s", cursor: "pointer" }}>
                <div style={{ position: "absolute", top: 2, left: compareMode ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
              장기보유 전략과 비교
            </label>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 28px" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: "#4a9eff", letterSpacing: 3, marginBottom: 10 }}>▶ 전략 선택</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {Object.entries(STRATEGIES).map(([key, s]) => (
              <button key={key} onClick={() => setStrategy(key)} style={{
                background: strategy === key ? "#0f2044" : "#0a1020",
                border: `1px solid ${strategy === key ? s.color : "#1e3a5f"}`,
                borderRadius: 10, padding: "14px 16px", cursor: "pointer", textAlign: "left", transition: "all 0.15s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{s.icon}</span>
                  <span style={{ fontSize: 10, color: s.color, background: `${s.color}22`, padding: "2px 8px", borderRadius: 4 }}>{s.difficulty}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: strategy === key ? s.color : "#cbd5e1", marginBottom: 2 }}>{s.name}</div>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{s.engName}</div>
                <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.5 }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 10, color: "#4a9eff", letterSpacing: 3 }}>▶ 백테스팅 기간 (과거 전략 검증 기간)</div>
          {[3, 5, 7, 10, 15].map(y => (
            <button key={y} onClick={() => setYears(y)} style={{
              background: years === y ? strat.color : "#0a1020",
              border: `1px solid ${years === y ? strat.color : "#1e3a5f"}`,
              borderRadius: 6, padding: "7px 18px", cursor: "pointer",
              color: years === y ? "#000" : "#64748b", fontSize: 12, fontWeight: 700, transition: "all 0.15s",
            }}>{y}년</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: "#4a9eff", fontSize: 13 }}>⚙️ 백테스팅 계산 중...</div>
        ) : result && s && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 24 }}>
              {[
                { label: "최종 자산", eng: "Final Value", value: `₩${fmt(s.finalValue)}`, c: color(s.totalReturn) },
                { label: "총 수익률", eng: "Total Return", value: fmtPct(s.totalReturn), c: color(s.totalReturn) },
                { label: "연평균 복리 수익률", eng: "CAGR", value: fmtPct(s.cagr), c: color(s.cagr) },
                { label: "최대 낙폭", eng: "MDD", value: `-${s.mdd}%`, c: "#f59e0b" },
                { label: "위험 대비 수익률", eng: "Sharpe Ratio", value: s.sharpe, c: parseFloat(s.sharpe) >= 1 ? "#22c55e" : "#f59e0b" },
                { label: "총 매매 횟수", eng: "Total Trades", value: `${s.totalTrades}회`, c: "#4a9eff" },
                { label: "시장 노출 비율", eng: "Time in Market", value: `${s.inMarketPct}%`, c: "#a78bfa" },
                { label: "검증 기간", eng: "Period", value: `${s.years}년`, c: "#64748b" },
              ].map((item, i) => (
                <div key={i} style={{ background: "#0a1020", border: "1px solid #1e3a5f", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 9, color: "#334155", marginBottom: 6 }}>{item.eng}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: item.c }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                  background: activeTab === t.key ? "#0f2044" : "transparent",
                  border: `1px solid ${activeTab === t.key ? "#4a9eff" : "#1e3a5f"}`,
                  borderRadius: 6, padding: "7px 14px", cursor: "pointer",
                  color: activeTab === t.key ? "#4a9eff" : "#475569", fontSize: 11, fontWeight: 600,
                }}>{t.label}</button>
              ))}
            </div>

            <div style={{ background: "#0a1020", border: "1px solid #1e3a5f", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
              {activeTab === "portfolio" && (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={mergedChart}>
                    <defs>
                      <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={strat.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={strat.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0f1e35" />
                    <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} tickFormatter={v => v?.slice(2, 7)} interval={Math.floor(mergedChart.length / 7)} />
                    <YAxis tick={{ fill: "#475569", fontSize: 9 }} tickLine={false} tickFormatter={v => `${(v / 10000).toFixed(0)}만`} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={capital} stroke="#334155" strokeDasharray="4 4" />
                    {compareMode && <Line type="monotone" dataKey="compareValue" stroke="#475569" strokeWidth={1.5} dot={false} name="장기보유 전략" strokeDasharray="4 2" />}
                    <Area type="monotone" dataKey="value" stroke={strat.color} strokeWidth={2} fill="url(#grad1)" dot={false} name={strat.name} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {activeTab === "trades" && (
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  {result.tradeLog.length === 0 ? (
                    <div style={{ color: "#475569", fontSize: 12, padding: 20, textAlign: "center" }}>이 기간에 발생한 매매 신호 없음</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #1e3a5f" }}>
                          {["날짜", "구분", "가격", "이유", "수익률"].map(h => (
                            <th key={h} style={{ padding: "6px 10px", color: "#4a9eff", textAlign: "left", fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...result.tradeLog].reverse().map((t, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #0f1e35" }}>
                            <td style={{ padding: "6px 10px", color: "#94a3b8" }}>{t.date}</td>
                            <td style={{ padding: "6px 10px", color: t.type === "매수" ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{t.type}</td>
                            <td style={{ padding: "6px 10px", color: "#cbd5e1" }}>${t.price}</td>
                            <td style={{ padding: "6px 10px", color: "#64748b", fontSize: 10 }}>{t.reason}</td>
                            <td style={{ padding: "6px 10px", color: t.profit ? color(t.profit) : "#475569" }}>{t.profit ? `${t.profit}%` : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}