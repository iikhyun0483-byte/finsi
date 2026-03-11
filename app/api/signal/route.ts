import { NextResponse } from "next/server";
import { getYahooHistorical, MAJOR_ETFS } from "@/lib/yahoo";
import { getCryptoHistorical, MAJOR_CRYPTOS } from "@/lib/crypto";
import { getAllMacroIndicators } from "@/lib/macro";
import { generateSignalsEnhanced, SignalInput } from "@/lib/signals-enhanced";
import { getUSDToKRW } from "@/lib/exchange";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// API 재시도 함수
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fetchFn();
      return result;
    } catch (error) {
      if (i === retries - 1) {
        console.error(`최종 실패 (${retries}회 시도):`, error);
        return null;
      }
      console.warn(`재시도 ${i + 1}/${retries}...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return null;
}

// API 호출 딜레이 (rate limit 방지)
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET() {
  try {
    // 1. 매크로 지표 조회
    const macroIndicators = await getAllMacroIndicators();

    // 2. 환율 조회
    const exchangeRate = await getUSDToKRW();

    // 3. 자산별 실시간 데이터 수집 (재시도 로직 포함)
    const signals: SignalInput[] = [];

    // 자산 타입별로 균형있게 선택
    const selectedETFs = [
      // 주식 (4개)
      "SPY",  // S&P 500
      "QQQ",  // NASDAQ 100
      "DIA",  // 다우존스
      "IWM",  // 러셀 2000
      // 원자재 (4개)
      "GLD",  // 금
      "SLV",  // 은
      "USO",  // 원유
      "XLE",  // 에너지 섹터
      // 채권 (4개)
      "TLT",  // 장기 국채
      "IEF",  // 중기 국채
      "SHY",  // 단기 국채
      "AGG",  // 종합 채권
      // 리츠 (2개)
      "VNQ",  // 부동산 리츠
      "IYR",  // 미국 부동산
    ];

    console.log("📊 Yahoo Finance API 호출 시작...");
    // 미국 주식 ETF (재시도 + 딜레이)
    for (let i = 0; i < selectedETFs.length; i++) {
      const symbol = selectedETFs[i];
      const info = MAJOR_ETFS[symbol as keyof typeof MAJOR_ETFS];
      if (!info) continue;

      const historical = await fetchWithRetry(
        () => getYahooHistorical(symbol, "1y"),
        3,
        500
      );

      if (historical && historical.length >= 200) {
        const prices = historical.map((h) => h.close);
        signals.push({
          symbol,
          name: info.name,
          assetType: info.category as any,
          prices,
          macroIndicators,
        });
        console.log(`✅ ${symbol} 데이터 수집 완료 (${historical.length}일)`);
      } else {
        console.warn(`⚠️ ${symbol} 데이터 부족 또는 실패`);
      }

      // Rate limit 방지 (100ms 딜레이)
      if (i < selectedETFs.length - 1) {
        await sleep(100);
      }
    }

    console.log("🪙 Binance API 호출 시작 (모든 암호화폐 복원)...");
    // 암호화폐 (전체 8개 - Binance는 rate limit 관대)
    const cryptoEntries = Object.entries(MAJOR_CRYPTOS);

    // Binance는 병렬 조회 가능 (rate limit이 관대함)
    const cryptoPromises = cryptoEntries.map(async ([key, info]) => {
      console.log(`🪙 ${info.symbol} 데이터 요청 중...`);

      const historical = await fetchWithRetry(
        () => getCryptoHistorical(info.symbol, 365),
        3,
        500
      );

      if (historical && historical.length >= 200) {
        const prices = historical.map((h) => h.price);
        console.log(`✅ ${info.symbol} 데이터 수집 완료 (${historical.length}일)`);
        return {
          symbol: info.symbol,
          name: info.name,
          assetType: "crypto" as const,
          prices,
          macroIndicators,
        };
      } else {
        console.warn(`⚠️ ${info.symbol} 데이터 부족 또는 실패 (${historical?.length || 0}일)`);
        return null;
      }
    });

    const cryptoResults = await Promise.all(cryptoPromises);
    cryptoResults.forEach((result) => {
      if (result) {
        signals.push(result);
      }
    });

    console.log(`\n📊 최종 수집: ${signals.length}개 자산 (주식/ETF: ${signals.filter(s => s.assetType !== 'crypto').length}, 암호화폐: ${signals.filter(s => s.assetType === 'crypto').length})`);

    // 완전히 실패했을 때만 에러 반환 (더미 데이터 제거)
    if (signals.length === 0) {
      throw new Error("모든 API 호출 실패. 잠시 후 다시 시도해주세요.");
    }

    // 4. 신호 생성 (Enhanced - 펀더멘털 + 뉴스 + 선행지표 포함)
    console.log("🔬 Enhanced 신호 생성 시작...");
    const generatedSignals = await generateSignalsEnhanced(signals);

    // 5. 가격을 원화로 변환
    const signalsWithKRW = generatedSignals.map((signal) => ({
      ...signal,
      price_krw: Math.round(signal.price * exchangeRate),
    }));

    // 6. Supabase에 저장 (기본 필드만)
    for (const signal of signalsWithKRW) {
      await supabase.from("signals").insert({
        symbol: signal.symbol,
        name: signal.name,
        asset_type: signal.assetType,
        score: signal.score,
        action: signal.action,
        price: signal.price,
        price_krw: signal.price_krw,
        layer1_score: signal.layer1Score,
        layer2_score: signal.layer2Score,
        layer3_score: signal.layer3Score,
        rsi: signal.rsi,
        macd: signal.macd,
        fear_greed: macroIndicators.fearGreed,
        high_risk: signal.highRisk,
      });
    }

    console.log(`✅ Enhanced 신호 생성 완료 (펀더멘털: ${signalsWithKRW.filter(s => s.fundamentals).length}개, 뉴스: ${signalsWithKRW.filter(s => s.news).length}개)`);

    return NextResponse.json({
      success: true,
      signals: signalsWithKRW.sort((a, b) => b.score - a.score),
      macroIndicators,
      exchangeRate,
    });
  } catch (error) {
    console.error("Signal generation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate signals" },
      { status: 500 }
    );
  }
}
