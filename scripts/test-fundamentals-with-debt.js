/**
 * Test Alpha Vantage fundamentals with debt-to-equity ratio
 */

const symbol = 'AAPL';
const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'PERKKL50YDGWS87F';

async function getFundamentals(symbol) {
  try {
    console.log(`📊 ${symbol} 재무 데이터 조회 중... (Alpha Vantage)\n`);

    // 1. OVERVIEW API - PER, PBR, ROE 등
    const overviewResponse = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`
    );

    if (!overviewResponse.ok) {
      throw new Error(`Alpha Vantage OVERVIEW error: ${overviewResponse.status}`);
    }

    const overview = await overviewResponse.json();

    // Rate limit 체크
    if (overview.Note) {
      console.warn(`⚠️ Alpha Vantage Rate Limit: ${overview.Note}`);
      return null;
    }

    // 데이터 없음
    if (!overview.Symbol) {
      console.warn(`⚠️ ${symbol}: Alpha Vantage에서 데이터 없음`);
      return null;
    }

    // 2. BALANCE_SHEET API - 부채비율 계산
    let debtToEquity = null;

    try {
      console.log('📄 BALANCE_SHEET API 호출 중 (1초 대기...)...\n');

      // Rate limit 방지를 위한 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000));

      const balanceSheetResponse = await fetch(
        `https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol=${symbol}&apikey=${apiKey}`
      );

      if (balanceSheetResponse.ok) {
        const balanceSheet = await balanceSheetResponse.json();

        if (balanceSheet.annualReports && balanceSheet.annualReports.length > 0) {
          const latestReport = balanceSheet.annualReports[0];
          const totalLiabilities = parseFloat(latestReport.totalLiabilities);
          const totalEquity = parseFloat(latestReport.totalShareholderEquity);

          if (!isNaN(totalLiabilities) && !isNaN(totalEquity) && totalEquity > 0) {
            debtToEquity = (totalLiabilities / totalEquity) * 100;
            console.log(`✅ 부채비율 계산 성공:`);
            console.log(`   총 부채: $${(totalLiabilities / 1e9).toFixed(2)}B`);
            console.log(`   총 자본: $${(totalEquity / 1e9).toFixed(2)}B`);
            console.log(`   비율: ${debtToEquity.toFixed(1)}%\n`);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ ${symbol} BALANCE_SHEET 조회 실패:`, error.message);
    }

    // 데이터 추출 및 변환
    const data = {
      symbol,
      per: overview.PERatio ? parseFloat(overview.PERatio) : null,
      pbr: overview.PriceToBookRatio ? parseFloat(overview.PriceToBookRatio) : null,
      roe: overview.ReturnOnEquityTTM ? parseFloat(overview.ReturnOnEquityTTM) * 100 : null,
      debtToEquity, // 계산된 부채비율
      revenueGrowth: overview.QuarterlyRevenueGrowthYOY ? parseFloat(overview.QuarterlyRevenueGrowthYOY) * 100 : null,
      grossMargin: overview.ProfitMargin ? parseFloat(overview.ProfitMargin) * 100 : null,
      operatingMargin: overview.OperatingMarginTTM ? parseFloat(overview.OperatingMarginTTM) * 100 : null,
    };

    return data;
  } catch (error) {
    console.error(`❌ ${symbol} Alpha Vantage 조회 실패:`, error);
    return null;
  }
}

async function test() {
  console.log(`\n🔍 Testing Alpha Vantage Fundamentals (with Debt-to-Equity)\n`);
  console.log('─────────────────────────────────────────────────────────\n');

  const data = await getFundamentals(symbol);

  if (!data) {
    console.error('❌ Failed to get fundamentals\n');
    process.exit(1);
  }

  console.log('📊 Complete Fundamental Data:');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`Symbol:           ${data.symbol}`);
  console.log(`PER:              ${data.per !== null ? data.per.toFixed(2) : 'N/A'}`);
  console.log(`PBR:              ${data.pbr !== null ? data.pbr.toFixed(2) : 'N/A'}`);
  console.log(`ROE:              ${data.roe !== null ? data.roe.toFixed(2) + '%' : 'N/A'}`);
  console.log(`Debt/Equity:      ${data.debtToEquity !== null ? data.debtToEquity.toFixed(1) + '%' : 'N/A'}`);
  console.log(`Revenue Growth:   ${data.revenueGrowth !== null ? data.revenueGrowth.toFixed(2) + '%' : 'N/A'}`);
  console.log(`Gross Margin:     ${data.grossMargin !== null ? data.grossMargin.toFixed(2) + '%' : 'N/A'}`);
  console.log(`Operating Margin: ${data.operatingMargin !== null ? data.operatingMargin.toFixed(2) + '%' : 'N/A'}`);
  console.log('─────────────────────────────────────────────────────────\n');

  // 검증
  const criticalFields = ['per', 'pbr', 'roe', 'debtToEquity'];
  const missingFields = criticalFields.filter(field => data[field] === null);

  if (missingFields.length > 0) {
    console.warn(`⚠️ Missing critical fields: ${missingFields.join(', ')}\n`);
  } else {
    console.log('✅ All critical fields have data!\n');
  }

  // 예상 범위 검증
  console.log('Expected vs Actual Ranges:');
  console.log(`  PER:  ~30-35     → ${data.per?.toFixed(2)} ${data.per && data.per > 20 && data.per < 50 ? '✅' : '⚠️'}`);
  console.log(`  PBR:  ~40-50     → ${data.pbr?.toFixed(2)} ${data.pbr && data.pbr > 30 && data.pbr < 60 ? '✅' : '⚠️'}`);
  console.log(`  ROE:  ~140-160%  → ${data.roe?.toFixed(2)}% ${data.roe && data.roe > 100 && data.roe < 200 ? '✅' : '⚠️'}`);
  console.log(`  Debt: ~350-400%  → ${data.debtToEquity?.toFixed(1)}% ${data.debtToEquity && data.debtToEquity > 300 && data.debtToEquity < 450 ? '✅' : '⚠️'}\n`);

  console.log('✅ Fundamentals test complete!\n');
}

test().catch(err => {
  console.error('\n❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
