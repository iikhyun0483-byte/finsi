import { NextResponse } from "next/server";
import { getRealtimePrices } from "@/lib/realtime-price";

export const dynamic = "force-dynamic";

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
