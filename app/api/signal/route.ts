import { NextResponse } from "next/server";
import { getYahooHistorical, MAJOR_ETFS } from "@/lib/yahoo";
import { getCryptoHistorical, MAJOR_CRYPTOS } from "@/lib/crypto";
import { getAllMacroIndicators } from "@/lib/macro";
import { generateSignalsEnhanced, SignalInput } from "@/lib/signals-enhanced";
import { getUSDToKRW } from "@/lib/exchange";
import { supabase } from "@/lib/supabase";
import { getEnabledSymbols, getSystemConfig } from "@/lib/config";

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
    // 0. 동적 설정 로드 (하드코딩 제거)
    console.log("⚙️ 시스템 설정 로드 중...");
    const config = await getSystemConfig();
    const allSymbols = await getEnabledSymbols();

    console.log(`✅ 활성 심볼: ${allSymbols.length}개`);
    console.log(`⚙️ API 재시도: ${config.API_RETRY_COUNT}회, 딜레이: ${config.API_RETRY_DELAY_MS}ms`);

    // 1. 매크로 지표 조회
    const macroIndicators = await getAllMacroIndicators();

    // 2. 환율 조회
    const exchangeRate = await getUSDToKRW();

    // 3. 자산별 실시간 데이터 수집 (동적 심볼 사용)
    const signals: SignalInput[] = [];

    // 주식/ETF/채권/리츠 심볼 (crypto 제외)
    const stockSymbols = allSymbols
      .filter((s) => s.asset_type !== "crypto")
      .slice(0, config.MAX_SIGNALS_COUNT - 8); // 암호화폐 8개 제외한 나머지

    console.log("📊 Yahoo Finance API 호출 시작...");
    // 미국 주식 ETF (동적 심볼 사용)
    for (let i = 0; i < stockSymbols.length; i++) {
      const symbolConfig = stockSymbols[i];

      const historical = await fetchWithRetry(
        () => getYahooHistorical(symbolConfig.symbol, "1y"),
        config.API_RETRY_COUNT,
        config.API_RETRY_DELAY_MS
      );

      if (historical && historical.length >= 200) {
        const prices = historical.map((h) => h.close);
        const volumes = historical.map((h) => h.volume);
        signals.push({
          symbol: symbolConfig.symbol,
          name: symbolConfig.name,
          assetType: symbolConfig.asset_type as any,
          prices,
          volumes,
          macroIndicators,
        });
        console.log(`✅ ${symbolConfig.symbol} 데이터 수집 완료 (${historical.length}일)`);
      } else {
        console.warn(`⚠️ ${symbolConfig.symbol} 데이터 부족 또는 실패`);
      }

      // Rate limit 방지 (동적 딜레이)
      if (i < stockSymbols.length - 1) {
        await sleep(config.API_CALL_DELAY_MS);
      }
    }

    console.log("🪙 Binance API 호출 시작 (동적 심볼)...");
    // 암호화폐 (동적 설정에서 로드)
    const cryptoSymbols = allSymbols.filter((s) => s.asset_type === "crypto");

    // Binance는 병렬 조회 가능 (rate limit이 관대함)
    const cryptoPromises = cryptoSymbols.map(async (symbolConfig) => {
      console.log(`🪙 ${symbolConfig.symbol} 데이터 요청 중...`);

      const historical = await fetchWithRetry(
        () => getCryptoHistorical(symbolConfig.symbol, 365),
        config.API_RETRY_COUNT,
        config.API_RETRY_DELAY_MS
      );

      if (historical && historical.length >= 200) {
        const prices = historical.map((h) => h.price);
        // 암호화폐는 거래량 데이터가 없으므로 undefined
        console.log(`✅ ${symbolConfig.symbol} 데이터 수집 완료 (${historical.length}일)`);
        return {
          symbol: symbolConfig.symbol,
          name: symbolConfig.name,
          assetType: "crypto" as const,
          prices,
          volumes: undefined,
          macroIndicators,
        };
      } else {
        console.warn(`⚠️ ${symbolConfig.symbol} 데이터 부족 또는 실패 (${historical?.length || 0}일)`);
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

    // 6. Supabase에 일괄 저장 (upsert)
    const signalsToSave = signalsWithKRW.map((signal) => ({
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
    }));

    const { error: upsertError } = await supabase
      .from("signals")
      .upsert(signalsToSave, { onConflict: "symbol" });

    if (upsertError) {
      console.error("❌ Supabase upsert 실패:", upsertError);
      throw new Error(`DB 저장 실패: ${upsertError.message}`);
    }

    console.log(`✅ DB 저장 완료: ${signalsToSave.length}개 신호`);

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
