/**
 * Save Naver Finance HTML to file for inspection
 */

const fs = require('fs');

async function test() {
  const code = '005930';
  const url = `https://finance.naver.com/item/main.naver?code=${code}`;

  console.log(`\n📡 Fetching: ${url}\n`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const html = await response.text();

  const outputPath = 'E:\\dev\\finsi\\scripts\\naver-finance-sample.html';
  fs.writeFileSync(outputPath, html, 'utf-8');

  console.log(`✅ HTML saved to: ${outputPath}`);
  console.log(`File size: ${(html.length / 1024).toFixed(2)} KB\n`);

  // Search for specific keywords
  const keywords = ['현재가', '전일대비', '거래량', 'PER', 'PBR'];
  keywords.forEach(keyword => {
    const index = html.indexOf(keyword);
    if (index !== -1) {
      const snippet = html.substring(Math.max(0, index - 100), Math.min(html.length, index + 200));
      console.log(`\n=== "${keyword}" found at position ${index} ===`);
      console.log(snippet.substring(0, 300));
    }
  });
}

test().catch(err => {
  console.error('\n❌ Error:', err);
});
