/**
 * Alpha Vantage API 테스트
 * 무료 API 키: https://www.alphavantage.co/support/#api-key
 */

const symbol = 'AAPL';
const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'PERKKL50YDGWS87F';

async function test() {
  console.log(`\n🔍 Testing Alpha Vantage API for ${symbol}...\n`);

  // Company Overview (펀더멘털 데이터 포함)
  const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;

  console.log(`📡 Fetching: ${url}\n`);

  const response = await fetch(url);

  if (!response.ok) {
    console.error(`❌ Failed: ${response.status}\n`);
    process.exit(1);
  }

  const data = await response.json();

  if (data.Note) {
    console.error('⚠️  Rate limit reached:', data.Note);
    console.error('💡 Get free API key at: https://www.alphavantage.co/support/#api-key\n');
    process.exit(1);
  }

  console.log('📊 Fundamental Data:');
  console.log('─────────────────────────────────────');
  console.log(`Symbol:           ${data.Symbol || 'N/A'}`);
  console.log(`Name:             ${data.Name || 'N/A'}`);
  console.log(`PER:              ${data.PERatio || 'N/A'}`);
  console.log(`PBR:              ${data.PriceToBookRatio || 'N/A'}`);
  console.log(`ROE:              ${data.ReturnOnEquityTTM || 'N/A'}`);
  console.log(`Debt/Equity:      ${data.DebtToEquity || 'N/A'}`);
  console.log(`Revenue Growth:   ${data.QuarterlyRevenueGrowthYOY || 'N/A'}`);
  console.log(`Gross Margin:     ${data.GrossProfitTTM || 'N/A'}`);
  console.log(`Profit Margin:    ${data.ProfitMargin || 'N/A'}`);
  console.log('─────────────────────────────────────\n');

  if (data.Symbol) {
    console.log('✅ Alpha Vantage API is working!\n');
    console.log('💡 Get your free API key at: https://www.alphavantage.co/support/#api-key');
    console.log('   Add to .env.local: ALPHA_VANTAGE_API_KEY=your_key\n');
  } else {
    console.error('❌ No data returned\n');
    process.exit(1);
  }
}

test().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
