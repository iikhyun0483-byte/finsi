import { NextResponse } from "next/server";
import { getSectorFlows } from "@/lib/leading-indicators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sectorFlows = await getSectorFlows();

    return NextResponse.json({
      success: true,
      sectorFlows,
    });
  } catch (error) {
    console.error("Sector flows API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sector flows" },
      { status: 500 }
    );
  }
}
