// 암호화폐 API 테스트 스크립트

async function testCryptoAPI() {
  console.log("🧪 암호화폐 API 테스트 시작...\n");

  const cryptos = [
    { id: "bitcoin", symbol: "BTC" },
    { id: "ethereum", symbol: "ETH" },
    { id: "solana", symbol: "SOL" },
    { id: "ripple", symbol: "XRP" },
  ];

  for (const crypto of cryptos) {
    console.log(`\n📊 ${crypto.symbol} (${crypto.id}) 테스트 중...`);

    // 1. 실시간 가격 테스트
    try {
      const priceUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${crypto.id}&order=market_cap_desc&per_page=1&page=1`;
      console.log(`   🔗 URL: ${priceUrl}`);

      const priceRes = await fetch(priceUrl);
      console.log(`   📡 Status: ${priceRes.status}`);

      if (!priceRes.ok) {
        const errorText = await priceRes.text();
        console.error(`   ❌ Error: ${errorText}`);
        continue;
      }

      const priceData = await priceRes.json();
      if (priceData && priceData.length > 0) {
        console.log(`   ✅ 현재가: $${priceData[0].current_price.toLocaleString()}`);
        console.log(`   📈 24h 변화: ${priceData[0].price_change_percentage_24h.toFixed(2)}%`);
      } else {
        console.log(`   ⚠️  데이터 없음`);
      }
    } catch (error) {
      console.error(`   ❌ 실시간 가격 조회 실패:`, error.message);
    }

    // 딜레이 (Rate limit 방지)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 2. 과거 데이터 테스트
    try {
      const histUrl = `https://api.coingecko.com/api/v3/coins/${crypto.id}/market_chart?vs_currency=usd&days=365&interval=daily`;
      console.log(`   🔗 Historical URL: ${histUrl}`);

      const histRes = await fetch(histUrl);
      console.log(`   📡 Status: ${histRes.status}`);

      if (!histRes.ok) {
        const errorText = await histRes.text();
        console.error(`   ❌ Error: ${errorText}`);
        continue;
      }

      const histData = await histRes.json();
      if (histData && histData.prices) {
        console.log(`   ✅ 과거 데이터: ${histData.prices.length}일`);
      } else {
        console.log(`   ⚠️  과거 데이터 없음`);
      }
    } catch (error) {
      console.error(`   ❌ 과거 데이터 조회 실패:`, error.message);
    }

    // 다음 종목 전 1초 대기
    if (cryptos.indexOf(crypto) < cryptos.length - 1) {
      console.log(`   ⏳ 1초 대기 중...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log("\n\n✅ 테스트 완료!");
}

testCryptoAPI().catch((err) => {
  console.error("❌ 테스트 실패:", err);
  process.exit(1);
});
