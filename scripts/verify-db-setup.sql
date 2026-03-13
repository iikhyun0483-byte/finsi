-- Supabase 테이블 생성 확인 쿼리
-- 이 쿼리들을 하나씩 실행해서 확인하세요

-- 1. symbol_config 테이블 확인 (22개 심볼 있어야 함)
SELECT
  asset_type,
  COUNT(*) as count,
  STRING_AGG(symbol, ', ') as symbols
FROM symbol_config
WHERE enabled = true
GROUP BY asset_type
ORDER BY asset_type;

-- 예상 결과:
-- bond        4개  (TLT, IEF, SHY, AGG)
-- commodity   4개  (GLD, SLV, USO, XLE)
-- crypto      8개  (BTC, ETH, SOL, XRP, ADA, DOGE, DOT, AVAX)
-- reit        2개  (VNQ, IYR)
-- stock       4개  (SPY, QQQ, DIA, IWM)

-- 2. system_config 테이블 확인 (11개 설정 있어야 함)
SELECT key, value, description
FROM system_config
ORDER BY key;

-- 예상 결과: 11개 설정값
-- API_CALL_DELAY_MS, API_RETRY_COUNT, CACHE_CRYPTO_MINUTES 등

-- 3. 전체 심볼 목록 (우선순위 순)
SELECT symbol, name, asset_type, priority, enabled
FROM symbol_config
ORDER BY priority DESC, symbol;

-- 4. 특정 타입만 조회 (예: 암호화폐)
SELECT symbol, name, priority
FROM symbol_config
WHERE asset_type = 'crypto' AND enabled = true
ORDER BY priority DESC;
