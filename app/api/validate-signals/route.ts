import { NextResponse } from "next/server";
import { getYahooHistorical } from "@/lib/yahoo";
import { getCryptoHistorical } from "@/lib/crypto";
import { getAllMacroIndicators } from "@/lib/macro";
import { generateSignal } from "@/lib/signals";

export const dynamic = "force-dynamic";

interface SignalValidationResult {
  date: string;
  score: number;
  price: number;
  return1w: number; // 1주일 후 수익률
  return1m: number; // 1개월 후 수익률
  return3m: number; // 3개월 후 수익률
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, threshold = 75, assetType = "stock" } = body;

    console.log(`🔍 신호 검증 시작: ${symbol} (기준: ${threshold}점 이상)`);

    // 1. 과거 데이터 조회 (2년치 - 충분한 데이터 확보)
    let historicalData: any[] = [];

    if (assetType === "crypto") {
      historicalData = await getCryptoHistorical(symbol, 730); // 2년
    } else {
      historicalData = await getYahooHistorical(symbol, "2y"); // 2년
    }

    if (historicalData.length < 200) {
      return NextResponse.json({
        success: false,
        error: `${symbol}: 데이터 ${historicalData.length}일만 조회됨 (최소 200일 필요). 종목 코드를 확인하거나 상장 1년 이상 된 종목을 선택하세요.`,
      });
    }

    console.log(`📊 데이터 수집 완료: ${historicalData.length}일`);

    // 2. 매크로 지표 - 백테스트용 중립 값 사용
    // (과거 시점의 실제 매크로 데이터가 없으므로, 중립적인 평균값 사용)
    const macroIndicators = {
      fearGreed: 50,        // 중립 (0=공포, 100=탐욕)
      vix: 15,              // 정상 범위 (평균적인 변동성)
      fedRate: 2.5,         // 중립 금리
      buffett: 100,         // 적정 가치 (100=fair value)
    };

    // 3. 각 시점마다 신호 계산 (최근 90일 전부터, 미래 3개월 확인 필요)
    const signals: SignalValidationResult[] = [];
    const allScores: number[] = []; // 모든 점수 기록 (디버깅용)
    const startIndex = 250; // 충분한 과거 데이터 확보
    const endIndex = historicalData.length - 63; // 3개월 후 데이터 필요

    console.log(`📊 데이터 범위: startIndex=${startIndex}, endIndex=${endIndex}, total=${historicalData.length}`);

    if (startIndex >= endIndex) {
      return NextResponse.json({
        success: false,
        error: `데이터 부족: ${historicalData.length}일 (최소 ${startIndex + 63}일 필요)`,
      });
    }

    for (let i = startIndex; i < endIndex; i++) {
      // 해당 시점까지의 가격 데이터 (최근 300일)
      const prices = historicalData
        .slice(Math.max(0, i - 300), i + 1)
        .map((h) => (assetType === "crypto" ? h.price : h.close));

      if (prices.length < 200) continue;

      // 신호 생성
      const signal = generateSignal({
        symbol,
        name: symbol,
        assetType: assetType as any,
        prices,
        macroIndicators,
      });

      // 모든 점수 기록
      allScores.push(signal.score);

      // 기준 점수 이상인 경우만 기록
      if (signal.score >= threshold) {
        const currentPrice = prices[prices.length - 1];

        // 1주일 후 (5 거래일)
        const price1w = i + 5 < historicalData.length
          ? (assetType === "crypto" ? historicalData[i + 5].price : historicalData[i + 5].close)
          : currentPrice;
        const return1w = ((price1w - currentPrice) / currentPrice) * 100;

        // 1개월 후 (21 거래일)
        const price1m = i + 21 < historicalData.length
          ? (assetType === "crypto" ? historicalData[i + 21].price : historicalData[i + 21].close)
          : currentPrice;
        const return1m = ((price1m - currentPrice) / currentPrice) * 100;

        // 3개월 후 (63 거래일)
        const price3m = i + 63 < historicalData.length
          ? (assetType === "crypto" ? historicalData[i + 63].price : historicalData[i + 63].close)
          : currentPrice;
        const return3m = ((price3m - currentPrice) / currentPrice) * 100;

        signals.push({
          date: assetType === "crypto" ? historicalData[i].date : historicalData[i].date,
          score: signal.score,
          price: currentPrice,
          return1w,
          return1m,
          return3m,
        });
      }
    }

    console.log(`✅ 신호 발생 횟수: ${signals.length}개`);

    if (signals.length === 0) {
      // 디버깅 정보: 점수 통계
      const maxScore = Math.max(...allScores);
      const minScore = Math.min(...allScores);
      const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      const sortedScores = [...allScores].sort((a, b) => b - a);
      const top10 = sortedScores.slice(0, 10);

      console.log(`📊 점수 통계: 최고 ${maxScore.toFixed(1)}, 최저 ${minScore.toFixed(1)}, 평균 ${avgScore.toFixed(1)}`);
      console.log(`📊 상위 10개: ${top10.map(s => s.toFixed(1)).join(", ")}`);

      return NextResponse.json({
        success: false,
        error: `점수 ${threshold}점 이상인 신호가 발생하지 않았습니다. 기준을 낮춰보세요.`,
        debug: {
          totalChecked: allScores.length,
          maxScore: maxScore.toFixed(1),
          minScore: minScore.toFixed(1),
          avgScore: avgScore.toFixed(1),
          top10Scores: top10.map(s => s.toFixed(1)),
        }
      });
    }

    // 4. 승률 계산
    const wins1w = signals.filter((s) => s.return1w > 0).length;
    const wins1m = signals.filter((s) => s.return1m > 0).length;
    const wins3m = signals.filter((s) => s.return3m > 0).length;

    const winRate1w = (wins1w / signals.length) * 100;
    const winRate1m = (wins1m / signals.length) * 100;
    const winRate3m = (wins3m / signals.length) * 100;

    // 5. 평균 수익률 계산
    const avgReturn1w = signals.reduce((sum, s) => sum + s.return1w, 0) / signals.length;
    const avgReturn1m = signals.reduce((sum, s) => sum + s.return1m, 0) / signals.length;
    const avgReturn3m = signals.reduce((sum, s) => sum + s.return3m, 0) / signals.length;

    console.log(`📊 1주일 승률: ${winRate1w.toFixed(1)}% (평균: ${avgReturn1w.toFixed(2)}%)`);
    console.log(`📊 1개월 승률: ${winRate1m.toFixed(1)}% (평균: ${avgReturn1m.toFixed(2)}%)`);
    console.log(`📊 3개월 승률: ${winRate3m.toFixed(1)}% (평균: ${avgReturn3m.toFixed(2)}%)`);

    return NextResponse.json({
      success: true,
      result: {
        symbol,
        threshold,
        totalSignals: signals.length,
        winRate1w,
        winRate1m,
        winRate3m,
        avgReturn1w,
        avgReturn1m,
        avgReturn3m,
        signals: signals.reverse(), // 최신순 정렬
      },
    });
  } catch (error) {
    console.error("Signal validation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "신호 검증 실패",
      },
      { status: 500 }
    );
  }
}
