import { NextRequest, NextResponse } from "next/server";
import { getFundamentals } from "@/lib/fundamentals";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: "Symbol is required" },
        { status: 400 }
      );
    }

    const fundamentals = await getFundamentals(symbol);

    return NextResponse.json({
      success: true,
      fundamentals,
      // factors 페이지 호환성 - 최상위에도 모든 필드 노출
      ...fundamentals,
    });
  } catch (error) {
    console.error("Fundamentals API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch fundamentals" },
      { status: 500 }
    );
  }
}
