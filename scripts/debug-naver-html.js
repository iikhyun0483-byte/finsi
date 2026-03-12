/**
 * Debug Naver Finance HTML structure
 */

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

  // Save first 5000 chars for analysis
  console.log('First 5000 characters of HTML:\n');
  console.log(html.substring(0, 5000));
  console.log('\n...\n');

  // Search for price-related patterns
  console.log('\n=== Searching for price patterns ===\n');

  const patterns = [
    { name: 'no_today', regex: /no_today.*?>(.*?)<\/dd>/s },
    { name: 'blind spans', regex: /<span class="blind">([\d,]+)<\/span>/g },
    { name: 'price area', regex: /<div class="today">.*?<\/div>/s },
  ];

  patterns.forEach(({ name, regex }) => {
    const matches = html.match(regex);
    if (matches) {
      console.log(`${name}:`, matches[0].substring(0, 200));
    } else {
      console.log(`${name}: NOT FOUND`);
    }
  });

  // Get all blind spans (first 10)
  console.log('\n=== All "blind" spans (first 10) ===\n');
  const blindMatches = [...html.matchAll(/<span class="blind">(.*?)<\/span>/g)];
  blindMatches.slice(0, 10).forEach((match, i) => {
    console.log(`${i + 1}. ${match[1]}`);
  });
}

test().catch(err => {
  console.error('\n❌ Error:', err);
});
