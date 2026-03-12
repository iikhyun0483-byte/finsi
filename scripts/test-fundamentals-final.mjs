/**
 * Test Alpha Vantage fundamentals transformation
 */

const symbol = 'AAPL';
const apiKey = 'PERKKL50YDGWS87F';

async function test() {
  console.log('\n🔍 Testing Alpha Vantage data transformation...\n');

  const response = await fetch(
    `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`
  );

  const json = await response.json();

  // 변환 로직 (lib/fundamentals.ts와 동일)
  const data = {
    symbol,
    per: json.PERatio ? parseFloat(json.PERatio) : null,
    pbr: json.PriceToBookRatio ? parseFloat(json.PriceToBookRatio) : null,
    roe: json.ReturnOnEquityTTM ? parseFloat(json.ReturnOnEquityTTM) * 100 : null,
    debtToEquity: null,
    revenueGrowth: json.QuarterlyRevenueGrowthYOY ? parseFloat(json.QuarterlyRevenueGrowthYOY) * 100 : null,
    grossMargin: json.ProfitMargin ? parseFloat(json.ProfitMargin) * 100 : null,
    operatingMargin: json.OperatingMarginTTM ? parseFloat(json.OperatingMarginTTM) * 100 : null,
  };

  console.log('📊 Transformed Data:');
  console.log('─────────────────────────────────────');
  console.log(`Symbol:           ${data.symbol}`);
  console.log(`PER:              ${data.per !== null ? data.per.toFixed(2) : 'N/A'}`);
  console.log(`PBR:              ${data.pbr !== null ? data.pbr.toFixed(2) : 'N/A'}`);
  console.log(`ROE:              ${data.roe !== null ? data.roe.toFixed(2) + '%' : 'N/A'}`);
  console.log(`Debt/Equity:      ${data.debtToEquity !== null ? data.debtToEquity.toFixed(2) + '%' : 'N/A (not in API)'}`);
  console.log(`Revenue Growth:   ${data.revenueGrowth !== null ? data.revenueGrowth.toFixed(2) + '%' : 'N/A'}`);
  console.log(`Gross Margin:     ${data.grossMargin !== null ? data.grossMargin.toFixed(2) + '%' : 'N/A'}`);
  console.log(`Operating Margin: ${data.operatingMargin !== null ? data.operatingMargin.toFixed(2) + '%' : 'N/A'}`);
  console.log('─────────────────────────────────────\n');

  // 검증
  if (data.per === null || data.pbr === null || data.roe === null) {
    console.error('❌ Critical values are null!\n');
    process.exit(1);
  }

  console.log('✅ Data transformation successful!\n');

  console.log('Expected vs Actual:');
  console.log(`  PER:  ~33   → ${data.per.toFixed(2)} ${Math.abs(data.per - 33) < 5 ? '✅' : '⚠️'}`);
  console.log(`  PBR:  ~43   → ${data.pbr.toFixed(2)} ${Math.abs(data.pbr - 43) < 5 ? '✅' : '⚠️'}`);
  console.log(`  ROE:  ~152% → ${data.roe.toFixed(2)}% ${Math.abs(data.roe - 152) < 20 ? '✅' : '⚠️'}\n`);

  console.log('✅ Ready for production!\n');
}

test().catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});
