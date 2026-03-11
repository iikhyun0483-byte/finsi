import { NextResponse } from "next/server";
import { getYahooQuotes, MAJOR_ETFS } from "@/lib/yahoo";
import { getCryptoQuotes, MAJOR_CRYPTOS } from "@/lib/crypto";
import { getAllMacroIndicators } from "@/lib/macro";
import { getUSDToKRW } from "@/lib/exchange";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. 환율 조회
    const exchangeRate = await getUSDToKRW();

    // 2. 매크로 지표 조회
    const macroIndicators = await getAllMacroIndicators();

    // 3. 미국 주식/ETF 시세
    const stockSymbols = Object.keys(MAJOR_ETFS);
    const stockQuotes = await getYahooQuotes(stockSymbols);

    const stocks = Array.from(stockQuotes.entries()).map(([symbol, quote]) => ({
      symbol,
      name: MAJOR_ETFS[symbol as keyof typeof MAJOR_ETFS].name,
      category: MAJOR_ETFS[symbol as keyof typeof MAJOR_ETFS].category,
      price: quote.regularMarketPrice,
      priceKRW: Math.round(quote.regularMarketPrice * exchangeRate),
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
    }));

    // 4. 암호화폐 시세
    const cryptoIds = Object.keys(MAJOR_CRYPTOS);
    const cryptoQuotes = await getCryptoQuotes(cryptoIds);

    const cryptos = Array.from(cryptoQuotes.entries()).map(([id, quote]) => ({
      symbol: quote.symbol.toUpperCase(),
      name: MAJOR_CRYPTOS[id as keyof typeof MAJOR_CRYPTOS].name,
      category: "crypto",
      price: quote.current_price,
      priceKRW: Math.round(quote.current_price * exchangeRate),
      change: quote.price_change_24h,
      changePercent: quote.price_change_percentage_24h,
      volume: quote.volume, // Binance provides volume
    }));

    return NextResponse.json({
      success: true,
      exchangeRate,
      macroIndicators,
      stocks,
      cryptos,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Market data error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
