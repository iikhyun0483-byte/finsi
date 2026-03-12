/**
 * Test Korean stock scraping from Naver Finance
 */

async function getNaverStockPrice(code) {
  try {
    const url = `https://finance.naver.com/item/main.naver?code=${code}`;
    console.log(`\n📡 Fetching: ${url}\n`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // HTML 파싱 (네이버 금융 구조)
    const priceMatch = html.match(/현재가\s+([\d,]+)/);
    const changeMatch = html.match(/전일대비\s+(?:상승|하락)\s+([\d,]+)/);
    const changeDirectionMatch = html.match(/전일대비\s+(상승|하락)/);
    const changePercentMatch = html.match(/(?:플러스|마이너스)\s+([\d.]+)\s*퍼센트/);
    const volumeMatch = html.match(/거래량\s+([\d,]+)/);
    const perMatch = html.match(/PER\(배\)<\/strong>[\s\S]*?<td[^>]*>\s*\n?\s*([\d,.]+)/);
    const pbrMatch = html.match(/PBR\(배\)<\/strong>[\s\S]*?<td[^>]*>\s*\n?\s*([\d,.]+)/);

    if (!priceMatch) {
      console.error('❌ 가격 파싱 실패');
      return null;
    }

    const price = parseFloat(priceMatch[1].replace(/,/g, ''));
    const changeValue = changeMatch ? parseFloat(changeMatch[1].replace(/,/g, '')) : 0;
    const isDown = changeDirectionMatch && changeDirectionMatch[1] === '하락';
    const change = isDown ? -changeValue : changeValue;
    const changePercent = changePercentMatch ? (isDown ? -1 : 1) * parseFloat(changePercentMatch[1]) : 0;
    const volume = volumeMatch ? parseFloat(volumeMatch[1].replace(/,/g, '')) : 0;
    const per = perMatch ? parseFloat(perMatch[1].replace(/,/g, '')) : null;
    const pbr = pbrMatch ? parseFloat(pbrMatch[1].replace(/,/g, '')) : null;

    return {
      code,
      price,
      change,
      changePercent,
      volume,
      per,
      pbr,
    };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function test() {
  console.log('\n🇰🇷 Testing Korean Stock Scraping...\n');

  const testCodes = [
    { code: '005930', name: '삼성전자' },
    { code: '000660', name: 'SK하이닉스' },
    { code: '069500', name: 'KODEX200' },
  ];

  for (const { code, name } of testCodes) {
    console.log(`\n─────────────────────────────────────`);
    console.log(`📊 ${name} (${code})`);
    console.log(`─────────────────────────────────────`);

    const data = await getNaverStockPrice(code);

    if (data) {
      console.log(`현재가:    ${data.price.toLocaleString()}원`);
      console.log(`전일대비:  ${data.change >= 0 ? '▲' : '▼'} ${Math.abs(data.change).toLocaleString()} (${Math.abs(data.changePercent).toFixed(2)}%)`);
      console.log(`거래량:    ${data.volume.toLocaleString()}`);
      console.log(`PER:       ${data.per !== null ? data.per.toFixed(2) : 'N/A'}`);
      console.log(`PBR:       ${data.pbr !== null ? data.pbr.toFixed(2) : 'N/A'}`);
    }

    // Rate limit 방지
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n─────────────────────────────────────`);
  console.log('✅ Korean stocks scraping test complete!\n');
}

test().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
