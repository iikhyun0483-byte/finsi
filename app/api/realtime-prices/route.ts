import { NextRequest, NextResponse } from "next/server";
import { getRealtimePrices } from "@/lib/realtime-price";
import { getYahooHistorical } from "@/lib/yahoo";
import { getCryptoHistorical } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: "symbol 파라미터가 필요합니다" },
        { status: 400 }
      );
    }

    // 현재가 조회
    const priceMap = await getRealtimePrices([symbol]);
    const price = priceMap.get(symbol);

    if (!price) {
      return NextResponse.json(
        { success: false, error: "가격 정보 없음" },
        { status: 404 }
      );
    }

    // 과거 데이터 조회 (factor 계산용 - 1년치)
    let historicalPrices: Array<{close: number; volume?: number; date?: string}> = [];

    try {
      // 암호화폐 여부 확인
      const isCrypto = symbol.includes('-USD') || ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE'].includes(symbol.toUpperCase());

      if (isCrypto) {
        // 암호화폐: CoinGecko API 사용
        const coinId = symbol.toLowerCase().replace('-usd', '');
        const cryptoData = await getCryptoHistorical(coinId, 365);
        historicalPrices = cryptoData.map(d => ({
          close: d.price,
          volume: d.volume ?? 0,
          date: d.date,
        }));
      } else {
        // 주식/ETF: Yahoo Finance API 사용
        const yahooData = await getYahooHistorical(symbol, '1y');
        historicalPrices = yahooData.map(d => ({
          close: d.close,
          volume: d.volume,
          date: d.date,
        }));
      }
    } catch (err) {
      console.warn(`Historical data fetch failed for ${symbol}, using current price only:`, err);
      // 실패 시 현재가만 사용
      historicalPrices = [{close: price.price}];
    }

    return NextResponse.json({
      success: true,
      symbol,
      price,
      prices: historicalPrices, // factors 페이지용 과거 데이터 배열
      history: historicalPrices, // 호환성
      data: historicalPrices, // 호환성
    });
  } catch (error) {
    console.error("Realtime price GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "가격 조회 실패",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbols } = body;

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { success: false, error: "symbols 배열이 필요합니다" },
        { status: 400 }
      );
    }

    console.log(`💰 실시간 가격 조회: ${symbols.join(", ")}`);

    const priceMap = await getRealtimePrices(symbols);

    // Map을 객체로 변환
    const prices: Record<string, any> = {};
    priceMap.forEach((price, symbol) => {
      prices[symbol] = price;
    });

    return NextResponse.json({
      success: true,
      prices,
    });
  } catch (error) {
    console.error("Realtime prices error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "가격 조회 실패",
      },
      { status: 500 }
    );
  }
}
