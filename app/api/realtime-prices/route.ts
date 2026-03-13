import { NextRequest, NextResponse } from "next/server";
import { getRealtimePrices } from "@/lib/realtime-price";

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

    const priceMap = await getRealtimePrices([symbol]);
    const price = priceMap.get(symbol);

    if (!price) {
      return NextResponse.json(
        { success: false, error: "가격 정보 없음" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      symbol,
      price,
      prices: [price], // factors 페이지 호환성
      history: [price], // 호환성
      data: [price], // 호환성
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
