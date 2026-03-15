/**
 * 공통 상수 정의 (클라이언트/서버 공통 사용)
 */

/**
 * 암호화폐 심볼 목록 (DB 폴백용)
 * 실제로는 DB의 symbol_config 테이블에서 로드하지만,
 * 클라이언트에서는 이 상수를 사용
 */
export const CRYPTO_SYMBOLS = [
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "ADA",
  "DOGE",
  "DOT",
  "AVAX",
] as const;

/**
 * 암호화폐 여부 판단 (클라이언트용)
 */
export function isCryptoSymbol(symbol: string): boolean {
  return CRYPTO_SYMBOLS.includes(symbol.toUpperCase() as any);
}
