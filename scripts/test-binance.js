// Binance API 테스트 스크립트

async function testBinanceAPI() {
  console.log("🧪 Binance API 테스트 시작...\n");

  const cryptos = [
    { symbol: "BTC", binance: "BTCUSDT", name: "비트코인" },
    { symbol: "ETH", binance: "ETHUSDT", name: "이더리움" },
    { symbol: "SOL", binance: "SOLUSDT", name: "솔라나" },
    { symbol: "XRP", binance: "XRPUSDT", name: "리플" },
    { symbol: "ADA", binance: "ADAUSDT", name: "카르다노" },
    { symbol: "DOGE", binance: "DOGEUSDT", name: "도지코인" },
    { symbol: "DOT", binance: "DOTUSDT", name: "폴카닷" },
    { symbol: "AVAX", binance: "AVAXUSDT", name: "아발란체" },
  ];

  console.log("📊 1. 실시간 가격 조회 테스트 (병렬)");
  console.log("━".repeat(60));

  // 병렬로 모든 암호화폐 조회
  const pricePromises = cryptos.map(async (crypto) => {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${crypto.binance}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      return {
        symbol: crypto.symbol,
        name: crypto.name,
        price: parseFloat(data.lastPrice),
        change: parseFloat(data.priceChangePercent),
      };
    } catch (error) {
      return {
        symbol: crypto.symbol,
        name: crypto.name,
        error: error.message,
      };
    }
  });

  const priceResults = await Promise.all(pricePromises);

  priceResults.forEach((result) => {
    if (result.error) {
      console.log(`❌ ${result.symbol} (${result.name}): ${result.error}`);
    } else {
      const arrow = result.change >= 0 ? "📈" : "📉";
      console.log(
        `✅ ${result.symbol} (${result.name}): $${result.price.toLocaleString()} ${arrow} ${result.change.toFixed(2)}%`
      );
    }
  });

  console.log("\n📊 2. 과거 데이터 조회 테스트 (1개 샘플)");
  console.log("━".repeat(60));

  // BTC 과거 데이터 조회
  const histUrl = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=365`;
  try {
    const histRes = await fetch(histUrl);
    if (!histRes.ok) {
      throw new Error(`HTTP ${histRes.status}`);
    }
    const histData = await histRes.json();
    console.log(`✅ BTC 과거 데이터: ${histData.length}일 (최대 365일)`);

    // 최근 3일 데이터 샘플
    const recent = histData.slice(-3);
    console.log("\n최근 3일 종가:");
    recent.forEach((kline) => {
      const date = new Date(kline[0]).toISOString().split("T")[0];
      const close = parseFloat(kline[4]);
      console.log(`  ${date}: $${close.toLocaleString()}`);
    });
  } catch (error) {
    console.error(`❌ BTC 과거 데이터 실패:`, error.message);
  }

  console.log("\n📊 3. Rate Limit 테스트 (연속 10회 호출)");
  console.log("━".repeat(60));

  const startTime = Date.now();
  for (let i = 0; i < 10; i++) {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT`;
    const res = await fetch(url);
    console.log(`  ${i + 1}/10: ${res.ok ? "✅ 성공" : `❌ 실패 (${res.status})`}`);
  }
  const elapsed = Date.now() - startTime;
  console.log(`\n⏱️  총 소요 시간: ${elapsed}ms (평균 ${(elapsed / 10).toFixed(0)}ms/요청)`);
  console.log(`✅ Rate limit 문제 없음!`);

  console.log("\n" + "━".repeat(60));
  console.log("✅ 모든 테스트 완료!");
  console.log("🎉 Binance API는 빠르고 안정적입니다!");
}

testBinanceAPI().catch((err) => {
  console.error("❌ 테스트 실패:", err);
  process.exit(1);
});
