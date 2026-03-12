/**
 * Yahoo Finance Fundamentals API 테스트
 */

const symbol = 'AAPL';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://finance.yahoo.com/',
  'Origin': 'https://finance.yahoo.com',
};

const modules = 'defaultKeyStatistics,financialData';

async function test() {
  console.log(`\n🔍 Testing Yahoo Finance API for ${symbol}...\n`);

  // query1 시도
  console.log('📡 Trying query1.finance.yahoo.com...');
  let response = await fetch(
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}`,
    { headers }
  );

  if (!response.ok) {
    console.log(`❌ query1 failed: ${response.status}`);
    console.log('📡 Trying query2.finance.yahoo.com...');

    response = await fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}`,
      { headers }
    );
  }

  if (!response.ok) {
    console.error(`\n❌ Both endpoints failed: ${response.status}\n`);
    process.exit(1);
  }

  console.log(`✅ Success! Status: ${response.status}\n`);

  const json = await response.json();
  const result = json.quoteSummary?.result?.[0];

  if (!result) {
    console.error('❌ No data in response\n');
    process.exit(1);
  }

  const keyStats = result.defaultKeyStatistics || {};
  const financials = result.financialData || {};

  // 데이터 추출
  const per = keyStats.forwardPE?.raw || keyStats.trailingPE?.raw || null;
  const pbr = keyStats.priceToBook?.raw || null;
  const roe = financials.returnOnEquity?.raw ? financials.returnOnEquity.raw * 100 : null;
  const debtToEquity = financials.debtToEquity?.raw ? financials.debtToEquity.raw * 100 : null;
  const revenueGrowth = financials.revenueGrowth?.raw ? financials.revenueGrowth.raw * 100 : null;
  const grossMargin = financials.grossMargins?.raw ? financials.grossMargins.raw * 100 : null;
  const operatingMargin = financials.operatingMargins?.raw ? financials.operatingMargins.raw * 100 : null;

  console.log('📊 Fundamental Data:');
  console.log('─────────────────────────────────────');
  console.log(`Symbol:           ${symbol}`);
  console.log(`PER:              ${per !== null ? per.toFixed(2) : 'N/A'}`);
  console.log(`PBR:              ${pbr !== null ? pbr.toFixed(2) : 'N/A'}`);
  console.log(`ROE:              ${roe !== null ? roe.toFixed(2) + '%' : 'N/A'}`);
  console.log(`Debt/Equity:      ${debtToEquity !== null ? debtToEquity.toFixed(2) + '%' : 'N/A'}`);
  console.log(`Revenue Growth:   ${revenueGrowth !== null ? revenueGrowth.toFixed(2) + '%' : 'N/A'}`);
  console.log(`Gross Margin:     ${grossMargin !== null ? grossMargin.toFixed(2) + '%' : 'N/A'}`);
  console.log(`Operating Margin: ${operatingMargin !== null ? operatingMargin.toFixed(2) + '%' : 'N/A'}`);
  console.log('─────────────────────────────────────\n');

  // 데이터 검증
  if (per === null && pbr === null && roe === null) {
    console.error('⚠️  Warning: All values are null! API may have changed.\n');
    process.exit(1);
  }

  console.log('✅ Test passed! Yahoo Finance API is working.\n');
}

test().catch(err => {
  console.error('\n❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
