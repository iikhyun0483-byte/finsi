import { NextResponse } from "next/server";
import { getUSDToKRW, getExchangeRates } from "@/lib/exchange";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const usdToKrw = await getUSDToKRW();
    const allRates = await getExchangeRates("USD");

    return NextResponse.json({
      success: true,
      usdToKrw,
      rates: allRates,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Exchange rate error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}
