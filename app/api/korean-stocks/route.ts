import { NextRequest, NextResponse } from "next/server";
import { getKoreanStockPriceCached, KOREAN_STOCKS } from "@/lib/korean-stocks";

/**
 * GET /api/korean-stocks?code={종목코드}
 * 한국 주식 현재가 조회
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "종목코드를 입력하세요" },
      { status: 400 }
    );
  }

  // 종목 존재 여부 확인
  const stock = KOREAN_STOCKS.find(s => s.code === code);
  if (!stock) {
    return NextResponse.json(
      { error: `종목코드 ${code}를 찾을 수 없습니다` },
      { status: 404 }
    );
  }

  try {
    const priceData = await getKoreanStockPriceCached(code);

    if (!priceData) {
      return NextResponse.json(
        { error: "가격 데이터를 가져올 수 없습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...priceData,
      market: stock.market,
      category: stock.category,
    });
  } catch (error: any) {
    console.error(`한국 주식 조회 실패 (${code}):`, error);
    return NextResponse.json(
      { error: error.message || "서버 오류" },
      { status: 500 }
    );
  }
}
