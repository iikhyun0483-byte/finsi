/**
 * 동적 설정 관리 (하드코딩 제거)
 * Supabase에서 실시간으로 설정 조회
 */

import { supabase } from "./supabase";

export interface SymbolConfig {
  symbol: string;
  name: string;
  asset_type: "stock" | "crypto" | "commodity" | "bond" | "reit";
  enabled: boolean;
  priority: number;
}

export interface SystemConfig {
  CACHE_CRYPTO_MINUTES: number;
  CACHE_EXCHANGE_MINUTES: number;
  CACHE_NEWS_MINUTES: number;
  API_RETRY_COUNT: number;
  API_RETRY_DELAY_MS: number;
  API_CALL_DELAY_MS: number;
  DEFAULT_VIX: number;
  DEFAULT_FED_RATE: number;
  DEFAULT_BUFFETT: number;
  DEFAULT_WIN_RATE: number;
  MAX_SIGNALS_COUNT: number;
}

// 설정 캐시 (1분)
let systemConfigCache: { data: SystemConfig; expiry: number } | null = null;
let symbolConfigCache: { data: SymbolConfig[]; expiry: number } | null = null;

/**
 * 시스템 설정 조회 (캐시 1분)
 */
export async function getSystemConfig(): Promise<SystemConfig> {
  // 캐시 확인
  if (systemConfigCache && Date.now() < systemConfigCache.expiry) {
    return systemConfigCache.data;
  }

  try {
    const { data, error } = await supabase
      .from("system_config")
      .select("key, value");

    if (error) throw error;

    const config: any = {};
    data?.forEach((row) => {
      const numValue = parseFloat(row.value);
      config[row.key] = isNaN(numValue) ? row.value : numValue;
    });

    const result: SystemConfig = {
      CACHE_CRYPTO_MINUTES: config.CACHE_CRYPTO_MINUTES ?? 5,
      CACHE_EXCHANGE_MINUTES: config.CACHE_EXCHANGE_MINUTES ?? 60,
      CACHE_NEWS_MINUTES: config.CACHE_NEWS_MINUTES ?? 60,
      API_RETRY_COUNT: config.API_RETRY_COUNT ?? 3,
      API_RETRY_DELAY_MS: config.API_RETRY_DELAY_MS ?? 500,
      API_CALL_DELAY_MS: config.API_CALL_DELAY_MS ?? 100,
      DEFAULT_VIX: config.DEFAULT_VIX ?? 15,
      DEFAULT_FED_RATE: config.DEFAULT_FED_RATE ?? 3.5,
      DEFAULT_BUFFETT: config.DEFAULT_BUFFETT ?? 100,
      DEFAULT_WIN_RATE: config.DEFAULT_WIN_RATE ?? 50,
      MAX_SIGNALS_COUNT: config.MAX_SIGNALS_COUNT ?? 20,
    };

    // 캐시 저장
    systemConfigCache = {
      data: result,
      expiry: Date.now() + 60 * 1000, // 1분
    };

    console.log("✅ 시스템 설정 로드 완료:", result);
    return result;
  } catch (error) {
    console.error("❌ 시스템 설정 로드 실패:", error);

    // 폴백 설정
    return {
      CACHE_CRYPTO_MINUTES: 5,
      CACHE_EXCHANGE_MINUTES: 60,
      CACHE_NEWS_MINUTES: 60,
      API_RETRY_COUNT: 3,
      API_RETRY_DELAY_MS: 500,
      API_CALL_DELAY_MS: 100,
      DEFAULT_VIX: 15,
      DEFAULT_FED_RATE: 3.5,
      DEFAULT_BUFFETT: 100,
      DEFAULT_WIN_RATE: 50,
      MAX_SIGNALS_COUNT: 20,
    };
  }
}

/**
 * 활성화된 심볼 목록 조회 (우선순위 순, 캐시 1분)
 */
export async function getEnabledSymbols(
  assetType?: "stock" | "crypto" | "commodity" | "bond" | "reit"
): Promise<SymbolConfig[]> {
  // 캐시 확인
  if (symbolConfigCache && Date.now() < symbolConfigCache.expiry) {
    const cached = symbolConfigCache.data;
    return assetType
      ? cached.filter((s) => s.asset_type === assetType)
      : cached;
  }

  try {
    let query = supabase
      .from("symbol_config")
      .select("symbol, name, asset_type, enabled, priority")
      .eq("enabled", true)
      .order("priority", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    const symbols = (data || []) as SymbolConfig[];

    // 캐시 저장
    symbolConfigCache = {
      data: symbols,
      expiry: Date.now() + 60 * 1000, // 1분
    };

    console.log(`✅ 심볼 설정 로드: ${symbols.length}개`);

    return assetType
      ? symbols.filter((s) => s.asset_type === assetType)
      : symbols;
  } catch (error) {
    console.error("❌ 심볼 설정 로드 실패:", error);

    // 폴백: 하드코딩된 기본값
    const fallback: SymbolConfig[] = [
      { symbol: "SPY", name: "S&P 500", asset_type: "stock", enabled: true, priority: 100 },
      { symbol: "QQQ", name: "NASDAQ 100", asset_type: "stock", enabled: true, priority: 90 },
      { symbol: "BTC", name: "비트코인", asset_type: "crypto", enabled: true, priority: 100 },
      { symbol: "ETH", name: "이더리움", asset_type: "crypto", enabled: true, priority: 90 },
    ];

    return assetType
      ? fallback.filter((s) => s.asset_type === assetType)
      : fallback;
  }
}

/**
 * 설정 캐시 무효화
 */
export function invalidateConfigCache() {
  systemConfigCache = null;
  symbolConfigCache = null;
  console.log("🔄 설정 캐시 무효화");
}

/**
 * 특정 설정값 조회 헬퍼
 */
export async function getConfigValue(key: keyof SystemConfig): Promise<number> {
  const config = await getSystemConfig();
  return config[key];
}
