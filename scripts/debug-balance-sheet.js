/**
 * Debug Alpha Vantage BALANCE_SHEET API
 */

const symbol = 'AAPL';
const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'PERKKL50YDGWS87F';

async function test() {
  console.log(`\n🔍 Testing BALANCE_SHEET API for ${symbol}...\n`);

  const url = `https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol=${symbol}&apikey=${apiKey}`;

  console.log(`📡 URL: ${url}\n`);

  const response = await fetch(url);

  console.log(`Status: ${response.status} ${response.statusText}\n`);

  if (!response.ok) {
    console.error(`❌ HTTP Error: ${response.status}`);
    const text = await response.text();
    console.error(text);
    process.exit(1);
  }

  const data = await response.json();

  console.log('📄 Full Response:');
  console.log(JSON.stringify(data, null, 2));
  console.log('\n');

  if (data.Note) {
    console.error('⚠️ Rate Limit:', data.Note);
  }

  if (data.annualReports && data.annualReports.length > 0) {
    const latest = data.annualReports[0];

    console.log('📊 Latest Annual Report:');
    console.log(`  Fiscal Date Ending: ${latest.fiscalDateEnding}`);
    console.log(`  Total Liabilities: ${latest.totalLiabilities}`);
    console.log(`  Total Shareholder Equity: ${latest.totalShareholderEquity}`);

    const totalLiabilities = parseFloat(latest.totalLiabilities);
    const totalEquity = parseFloat(latest.totalShareholderEquity);

    console.log(`\n  Parsed:`);
    console.log(`  Total Liabilities: ${totalLiabilities}`);
    console.log(`  Total Equity: ${totalEquity}`);

    if (!isNaN(totalLiabilities) && !isNaN(totalEquity) && totalEquity > 0) {
      const debtToEquity = (totalLiabilities / totalEquity) * 100;
      console.log(`\n  ✅ Debt-to-Equity Ratio: ${debtToEquity.toFixed(2)}%`);
    } else {
      console.log(`\n  ❌ Cannot calculate ratio (invalid numbers)`);
    }
  } else {
    console.error('❌ No annual reports found in response');
  }
}

test().catch(err => {
  console.error('\n❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
