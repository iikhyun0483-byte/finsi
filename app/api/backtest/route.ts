import { NextRequest, NextResponse } from "next/server";
import { getYahooHistorical, getYahooQuote } from "@/lib/yahoo";
import { getCryptoHistorical } from "@/lib/crypto";
import {
  calcSMA,
  calcRSI,
  calcMACD,
  calcBollinger,
  calcMDD,
  calcSharpe,
  calcCAGR,
  PriceData,
} from "@/lib/indicators";

export const dynamic = "force-dynamic";

// 실시간 무위험 수익률 조회 (미국 3개월물 국채)
async function getRiskFreeRate(): Promise<number> {
  try {
    const quote = await getYahooQuote("^IRX"); // 13-week Treasury Bill
    if (quote && quote.regularMarketPrice > 0) {
      return quote.regularMarketPrice / 100; // 퍼센트를 소수로 변환
    }
  } catch (error) {
    console.warn("무위험 수익률 조회 실패, 기본값 사용");
  }
  // API 실패 시 최근 평균치 사용 (2026년 Q1 기준 약 4.2%)
  return 0.042;
}

interface BacktestRequest {
  symbol: string;
  strategy: string;
  periodYears: number;
  initialCapital: number;
  assetType: "stock" | "crypto";
  enableTax?: boolean; // 22% 세금 적용 여부
  commission?: number; // 수수료율 (기본 0.1%)
  slippage?: number; // 슬리피지 (기본 0.05%)
}

// 백테스팅 전략 실행 (Realistic Version)
function runBacktest(
  prices: PriceData[],
  strategy: string,
  capital: number,
  riskFreeRate: number = 0.04,
  options: {
    enableTax?: boolean;
    commission?: number;
    slippage?: number;
  } = {}
) {
  const {
    enableTax = false,
    commission = 0.001, // 0.1%
    slippage = 0.0005, // 0.05%
  } = options;

  let cash = capital;
  let shares = 0;
  const portfolio: { date: string; value: number }[] = [];
  const tradeLog: any[] = [];
  let lastBuyPrice = 0;
  let totalWins = 0;
  let totalTrades = 0;
  let totalCommissionPaid = 0;
  let totalTaxPaid = 0;

  const closes = prices.map((p) => p.close);
  const sma50 = calcSMA(closes, 50);
  const sma200 = calcSMA(closes, 200);
  const rsi14 = calcRSI(closes, 14);
  const macdData = calcMACD(closes);
  const bollinger = calcBollinger(closes, 20, 2);

  const startIdx = 210;

  for (let i = startIdx; i < prices.length; i++) {
    const price = closes[i];
    let signal: "BUY" | "SELL" | null = null;
    let reason = "";

    // 전략별 신호 생성
    if (strategy === "buy_and_hold") {
      if (i === startIdx) {
        signal = "BUY";
        reason = "최초 매수 (전략 시작)";
      }
    } else if (strategy === "ma_golden") {
      const prev = sma50[i - 1] && sma200[i - 1] ? sma50[i - 1]! - sma200[i - 1]! : null;
      const curr = sma50[i] && sma200[i] ? sma50[i]! - sma200[i]! : null;

      if (prev !== null && curr !== null) {
        if (prev <= 0 && curr > 0) {
          signal = "BUY";
          reason = "골든크로스";
        } else if (prev >= 0 && curr < 0) {
          signal = "SELL";
          reason = "데드크로스";
        }
      }
    } else if (strategy === "rsi") {
      const r = rsi14[i];
      const rp = rsi14[i - 1];

      if (r !== null && rp !== null) {
        if (rp <= 30 && r > 30 && shares === 0) {
          signal = "BUY";
          reason = `RSI 과매도 탈출 (${r.toFixed(1)})`;
        } else if (rp >= 70 && r < 70 && shares > 0) {
          signal = "SELL";
          reason = `RSI 과매수 이탈 (${r.toFixed(1)})`;
        }
      }
    } else if (strategy === "macd") {
      const m = macdData.macdLine[i];
      const mp = macdData.macdLine[i - 1];
      const s = macdData.signalLine[i];
      const sp = macdData.signalLine[i - 1];

      if (m !== null && mp !== null && s !== null && sp !== null) {
        if (mp < sp && m > s && shares === 0) {
          signal = "BUY";
          reason = "MACD 골든크로스";
        } else if (mp > sp && m < s && shares > 0) {
          signal = "SELL";
          reason = "MACD 데드크로스";
        }
      }
    } else if (strategy === "bollinger") {
      const b = bollinger[i];
      const bp = bollinger[i - 1];

      if (b.lower !== null && bp.lower !== null) {
        if (closes[i - 1] <= bp.lower && price > b.lower && shares === 0) {
          signal = "BUY";
          reason = "볼린저 하단 반등";
        } else if (closes[i - 1] >= bp.upper! && price < b.upper! && shares > 0) {
          signal = "SELL";
          reason = "볼린저 상단 터치";
        }
      }
    } else if (strategy === "dual_momentum") {
      if (i >= 252) {
        const momentum12 = (closes[i] - closes[i - 252]) / closes[i - 252];

        if (momentum12 > riskFreeRate && shares === 0) {
          signal = "BUY";
          reason = `모멘텀 양호 (+${(momentum12 * 100).toFixed(1)}%)`;
        } else if (momentum12 <= riskFreeRate && shares > 0) {
          signal = "SELL";
          reason = "모멘텀 약화";
        }
      }
    }

    // 매수/매도 실행 (수수료 + 슬리피지 + 세금 적용)
    if (signal === "BUY" && cash > price) {
      // 슬리피지 적용 (매수 시 불리하게)
      const buyPrice = price * (1 + slippage);

      // 수수료 고려한 최대 매수 가능 주식 수
      const maxShares = Math.floor(cash / (buyPrice * (1 + commission)));
      shares = maxShares;

      if (shares > 0) {
        const totalCost = shares * buyPrice * (1 + commission);
        const commissionFee = shares * buyPrice * commission;

        lastBuyPrice = buyPrice;
        cash -= totalCost;
        totalCommissionPaid += commissionFee;
        totalTrades++;

        tradeLog.push({
          date: prices[i].date,
          type: "매수",
          price: buyPrice.toFixed(2),
          reason,
          shares,
          commission: commissionFee.toFixed(2),
        });
      }
    } else if (signal === "SELL" && shares > 0) {
      // 슬리피지 적용 (매도 시 불리하게)
      const sellPrice = price * (1 - slippage);

      const proceeds = shares * sellPrice;
      const commissionFee = proceeds * commission;
      let taxAmount = 0;

      // 세금 계산 (양도소득세 22%)
      if (enableTax && sellPrice > lastBuyPrice) {
        const capitalGain = (sellPrice - lastBuyPrice) * shares;
        taxAmount = capitalGain * 0.22;
        totalTaxPaid += taxAmount;
      }

      if (sellPrice > lastBuyPrice) totalWins++;

      cash += proceeds - commissionFee - taxAmount;
      totalCommissionPaid += commissionFee;
      totalTrades++;

      tradeLog.push({
        date: prices[i].date,
        type: "매도",
        price: sellPrice.toFixed(2),
        reason,
        profit: (((sellPrice - lastBuyPrice) / lastBuyPrice) * 100).toFixed(2),
        commission: commissionFee.toFixed(2),
        tax: enableTax ? taxAmount.toFixed(2) : "0.00",
      });
      shares = 0;
    }

    const totalValue = cash + shares * price;
    portfolio.push({
      date: prices[i].date,
      value: Math.round(totalValue),
    });
  }

  // 성과 지표 계산
  const finalValue = portfolio[portfolio.length - 1]?.value || capital;
  const totalReturn = ((finalValue - capital) / capital) * 100;
  const years = portfolio.length / 252;
  const cagr = calcCAGR(capital, finalValue, years);
  const mddResult = calcMDD(portfolio);
  const sharpe = calcSharpe(portfolio);

  return {
    portfolio,
    tradeLog,
    stats: {
      finalValue,
      totalReturn: totalReturn.toFixed(2),
      cagr: cagr.toFixed(2),
      mdd: mddResult.mdd.toFixed(2),
      mddStart: mddResult.mddStart,
      mddEnd: mddResult.mddEnd,
      totalTrades,
      winRate: totalTrades > 0 ? ((totalWins / totalTrades) * 100).toFixed(1) : "0.0",
      sharpe: sharpe.toFixed(2),
      years: years.toFixed(1),
      totalCommission: totalCommissionPaid.toFixed(2),
      totalTax: totalTaxPaid.toFixed(2),
      netProfit: (finalValue - capital - totalCommissionPaid - totalTaxPaid).toFixed(2),
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: BacktestRequest = await request.json();
    const {
      symbol,
      strategy,
      periodYears,
      initialCapital,
      assetType,
      enableTax = false,
      commission = 0.001,
      slippage = 0.0005,
    } = body;

    console.log(`🔍 백테스트 요청: ${symbol} (${assetType}), ${periodYears}년, 전략: ${strategy}`);

    // 실시간 무위험 수익률 조회 (dual_momentum 전략용)
    const riskFreeRate = await getRiskFreeRate();
    console.log(`📊 무위험 수익률: ${(riskFreeRate * 100).toFixed(2)}%`);

    // 과거 데이터 조회
    let prices: PriceData[] = [];

    if (assetType === "crypto") {
      const coinId = symbol.toLowerCase();
      const historical = await getCryptoHistorical(coinId, periodYears * 365);
      prices = historical.map((h) => ({
        date: h.date,
        open: h.price,
        high: h.price,
        low: h.price,
        close: h.price,
        volume: 0,
      }));
    } else {
      const period = `${periodYears}y`;
      prices = await getYahooHistorical(symbol, period);
    }

    console.log(`📊 데이터 조회 완료: ${prices.length}일`);

    if (prices.length < 200) {
      const errorMsg = `${symbol}: 데이터 ${prices.length}일만 조회됨 (최소 200일 필요). ${assetType === "crypto" ? "암호화폐는 1-2년 권장" : "주식/ETF는 1-3년 권장"}`;
      console.error(`❌ ${errorMsg}`);
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 }
      );
    }

    // 백테스팅 실행 (실시간 무위험 수익률 + 현실적 비용 사용)
    const result = runBacktest(prices, strategy, initialCapital, riskFreeRate, {
      enableTax,
      commission,
      slippage,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Backtest error:", error);
    return NextResponse.json(
      { success: false, error: "Backtest failed" },
      { status: 500 }
    );
  }
}
