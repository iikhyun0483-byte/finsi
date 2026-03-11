import { NextResponse } from "next/server";
import { getYahooHistorical } from "@/lib/yahoo";
import { getCryptoHistorical } from "@/lib/crypto";
import { getAllMacroIndicators } from "@/lib/macro";
import { generateSignal } from "@/lib/signals";
import { getRealtimePrices } from "@/lib/realtime-price";
import { getUSDToKRW } from "@/lib/exchange";

export const dynamic = "force-dynamic";

// 암호화폐 심볼 목록
const CRYPTO_SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "DOT", "AVAX"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: "종목 코드를 입력해주세요" },
        { status: 400 }
      );
    }

    console.log(`📊 종목 분석: ${symbol}`);

    // 암호화폐 여부 판단
    const isCrypto = CRYPTO_SYMBOLS.includes(symbol.toUpperCase());
    const assetType = isCrypto ? "crypto" : "stock";

    // 1. 과거 데이터 조회 (최소 300일)
    let historicalData: any[] = [];

    try {
      if (isCrypto) {
        historicalData = await getCryptoHistorical(symbol, 365);
      } else {
        historicalData = await getYahooHistorical(symbol, "1y");
      }
    } catch (error) {
      console.error(`❌ ${symbol} 데이터 조회 실패:`, error);
      return NextResponse.json({
        success: false,
        error: `${symbol} 데이터를 가져올 수 없습니다. 종목 코드를 확인해주세요.`,
      });
    }

    if (historicalData.length < 200) {
      return NextResponse.json({
        success: false,
        error: `${symbol}: 데이터 부족 (${historicalData.length}일). 최소 200일 필요.`,
      });
    }

    // 2. 매크로 지표 조회
    const macroIndicators = await getAllMacroIndicators();

    // 3. 가격 데이터 추출
    const prices = historicalData
      .map((h) => (isCrypto ? h.price : h.close))
      .filter((p) => p != null);

    if (prices.length < 200) {
      return NextResponse.json({
        success: false,
        error: `${symbol}: 유효한 가격 데이터 부족`,
      });
    }

    // 4. 신호 생성
    const signal = generateSignal({
      symbol,
      name: symbol,
      assetType: assetType as any,
      prices,
      macroIndicators,
    });

    // 5. 실시간 가격 조회
    const priceMap = await getRealtimePrices([symbol]);
    const realtimePrice = priceMap.get(symbol);

    if (!realtimePrice) {
      return NextResponse.json({
        success: false,
        error: `${symbol}: 실시간 가격 조회 실패`,
      });
    }

    // 6. 환율 적용 (USD -> KRW) - 실시간
    const USD_TO_KRW = await getUSDToKRW();
    const price_krw = Math.round(realtimePrice.price * USD_TO_KRW);

    // 7. 리스크 판단 (암호화폐 또는 점수가 낮은 경우)
    const highRisk = isCrypto || signal.score < 40;

    // 8. 응답 데이터 구성
    const response = {
      success: true,
      signal: {
        symbol: signal.symbol,
        name: signal.name,
        score: signal.score,
        action: signal.action,
        layer1Score: signal.layer1Score,
        layer2Score: signal.layer2Score,
        layer3Score: signal.layer3Score,
        price: realtimePrice.price,
        price_krw,
        rsi: signal.rsi || 50,
        macd: signal.macd || 0,
        highRisk,
      },
    };

    console.log(`✅ ${symbol} 분석 완료: 점수 ${signal.score}, ${signal.action}`);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "분석 중 오류 발생",
      },
      { status: 500 }
    );
  }
}
