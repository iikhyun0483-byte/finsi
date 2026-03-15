import { NextResponse } from "next/server";
import { getLeadingIndicatorScore } from "@/lib/leading-indicators";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "SPY";

    const score = await getLeadingIndicatorScore(symbol);

    return NextResponse.json({
      success: true,
      leadingScore: score,
    });
  } catch (error) {
    console.error("Leading indicators API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch leading indicators",
      },
      { status: 500 }
    );
  }
}
