/**
 * 암호화폐 고급 신호 (거래량 급증 감지)
 */

import { getCryptoQuote } from "./crypto";

export interface CryptoSignalBoost {
  volumeSpike: boolean;      // 거래량 200% 이상
  volumeMultiple: number;    // 평균 대비 배수
  boostScore: number;        // 추가 점수 (0-20)
}

/**
 * 암호화폐 거래량 급증 감지
 */
export async function detectCryptoVolumeSpike(symbol: string): Promise<CryptoSignalBoost> {
  try {
    // Binance 24시간 거래량 데이터
    const binanceSymbol = `${symbol.toUpperCase()}USDT`;
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`;

    const response = await fetch(url);
    if (!response.ok) {
      return { volumeSpike: false, volumeMultiple: 1, boostScore: 0 };
    }

    const data = await response.json();
    const currentVolume = parseFloat(data.volume || "0");
    const priceChange = parseFloat(data.priceChangePercent || "0");

    // 30일 평균 거래량 추정 (실제로는 historical 필요, 여기서는 간단히)
    // Binance Klines로 30일 평균 계산
    const klinesUrl = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=1d&limit=30`;
    const klinesRes = await fetch(klinesUrl);

    if (!klinesRes.ok) {
      return { volumeSpike: false, volumeMultiple: 1, boostScore: 0 };
    }

    const klines = await klinesRes.json();
    const volumes = klines.map((k: any) => parseFloat(k[5])); // volume
    const avgVolume = volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length;

    const volumeMultiple = avgVolume > 0 ? currentVolume / avgVolume : 1;
    const volumeSpike = volumeMultiple >= 2.0; // 200% 이상

    let boostScore = 0;

    if (volumeSpike) {
      // 거래량 급증 + 가격 상승 = 강한 매수 신호
      if (priceChange > 5) {
        boostScore = 20; // 강한 상승 모멘텀
      } else if (priceChange > 0) {
        boostScore = 15; // 상승 모멘텀
      } else if (priceChange > -5) {
        boostScore = 10; // 중립적 급등
      } else {
        boostScore = 5; // 하락 중 급등 (반등 가능성)
      }
    } else if (volumeMultiple >= 1.5) {
      // 150% 이상도 약간 가중
      boostScore = Math.min(10, Math.round((volumeMultiple - 1) * 10));
    }

    console.log(`📊 ${symbol} 거래량: ${volumeMultiple.toFixed(1)}x (부스트: +${boostScore})`);

    return {
      volumeSpike,
      volumeMultiple,
      boostScore,
    };
  } catch (error) {
    console.error(`❌ ${symbol} 거래량 분석 실패:`, error);
    return { volumeSpike: false, volumeMultiple: 1, boostScore: 0 };
  }
}

/**
 * 암호화폐 전용 신호 개선 함수 (VIX, 공포탐욕지수 필터 적용)
 */
export async function improveCryptoSignal(
  symbol: string,
  baseScore: number,
  vix?: number,
  fearGreed?: number
): Promise<{ improvedScore: number; boost: CryptoSignalBoost; reliability: string }> {
  const boost = await detectCryptoVolumeSpike(symbol);

  let improvedScore = baseScore + boost.boostScore;
  let reliability = 'normal';

  // VIX 30 이상이면 암호화폐 신호 신뢰도 낮춤
  if (vix !== undefined && vix >= 30) {
    improvedScore = improvedScore * 0.7; // 30% 감소
    reliability = 'low';
    console.log(`⚠️ ${symbol}: VIX ${vix} → 신뢰도 낮춤 (${reliability})`);
  }

  // 공포탐욕지수 20 이하일 때만 매수 신호 강화
  if (fearGreed !== undefined && fearGreed <= 20 && improvedScore >= 60) {
    improvedScore = Math.min(100, improvedScore + 10); // +10점 보너스
    reliability = 'high';
    console.log(`✅ ${symbol}: 공포탐욕 ${fearGreed} → 매수 신호 강화`);
  }

  // 중기 신호만 사용 (단기 제거) - 1주 이상 데이터만 신뢰
  // 이미 Klines에서 30일 데이터 사용 중이므로 추가 필터 불필요

  improvedScore = Math.min(100, Math.max(0, Math.round(improvedScore)));

  return {
    improvedScore,
    boost,
    reliability,
  };
}
