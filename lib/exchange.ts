// 환율 API (ExchangeRate-API 무료 사용)
// https://www.exchangerate-api.com/

const EXCHANGE_API_URL = "https://api.exchangerate-api.com/v4/latest/USD";
const BACKUP_EXCHANGE_API = "https://open.er-api.com/v6/latest/USD";

let cachedRate: { rate: number; timestamp: number } | null = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1시간 캐시

// 재시도 로직
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("Max retries reached");
}

export async function getUSDToKRW(): Promise<number> {
  // 캐시 확인
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_DURATION) {
    console.log("💰 환율 캐시 사용:", cachedRate.rate);
    return cachedRate.rate;
  }

  try {
    console.log("💰 실시간 환율 조회 중...");

    // 메인 API 시도
    let response = await fetchWithRetry(EXCHANGE_API_URL, 2);
    let data = await response.json();
    let rate = data.rates?.KRW;

    // 메인 API 실패 시 백업 API 시도
    if (!rate) {
      console.warn("⚠️ 메인 환율 API 실패, 백업 API 시도...");
      response = await fetchWithRetry(BACKUP_EXCHANGE_API, 2);
      data = await response.json();
      rate = data.rates?.KRW;
    }

    if (!rate || rate <= 0) {
      throw new Error("유효한 환율 데이터를 가져올 수 없습니다");
    }

    // 캐시 업데이트
    cachedRate = { rate, timestamp: Date.now() };
    console.log("✅ 환율 조회 완료:", rate);

    return rate;
  } catch (error) {
    console.error("❌ 환율 조회 최종 실패:", error);

    // 캐시가 있으면 만료되었어도 사용
    if (cachedRate) {
      console.warn("⚠️ 만료된 캐시 사용:", cachedRate.rate);
      return cachedRate.rate;
    }

    throw new Error("환율 데이터를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.");
  }
}

export async function convertUSDToKRW(usd: number): Promise<number> {
  const rate = await getUSDToKRW();
  return Math.round(usd * rate);
}

export async function convertKRWToUSD(krw: number): Promise<number> {
  const rate = await getUSDToKRW();
  return krw / rate;
}

// 실시간 환율 정보 (여러 통화)
export async function getExchangeRates(baseCurrency: string = "USD") {
  try {
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
    );

    if (!response.ok) {
      throw new Error(`Exchange API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      base: data.base,
      date: data.date,
      rates: data.rates,
    };
  } catch (error) {
    console.error("환율 정보 조회 실패:", error);
    return null;
  }
}
