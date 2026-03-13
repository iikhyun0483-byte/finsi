/**
 * 동적 설정 테스트 스크립트
 *
 * 사용법: node scripts/test-dynamic-config.js
 */

const API_BASE = 'http://localhost:3000';

async function testDynamicConfig() {
  console.log('🧪 FINSI 동적 설정 테스트 시작...\n');

  try {
    // 1. Signal API 호출 (동적 심볼 사용 확인)
    console.log('1️⃣  Signal API 테스트...');
    const signalRes = await fetch(`${API_BASE}/api/signal`);
    const signalData = await signalRes.json();

    if (signalData.success) {
      console.log(`   ✅ 신호 생성 성공: ${signalData.signals.length}개`);
      console.log(`   📊 종목 목록:`);

      const byType = {};
      signalData.signals.forEach(s => {
        if (!byType[s.assetType]) byType[s.assetType] = [];
        byType[s.assetType].push(s.symbol);
      });

      Object.entries(byType).forEach(([type, symbols]) => {
        console.log(`      ${type}: ${symbols.join(', ')}`);
      });
    } else {
      console.log(`   ❌ 실패: ${signalData.error}`);
    }

    console.log('');

    // 2. 개별 종목 분석 (AAPL)
    console.log('2️⃣  Analyze API 테스트 (AAPL)...');
    const analyzeRes = await fetch(`${API_BASE}/api/analyze?symbol=AAPL`);
    const analyzeData = await analyzeRes.json();

    if (analyzeData.success) {
      console.log(`   ✅ 분석 성공`);
      console.log(`      종목: ${analyzeData.signal.symbol}`);
      console.log(`      점수: ${analyzeData.signal.score}`);
      console.log(`      Layer1: ${analyzeData.signal.layer1Score}`);
      console.log(`      Layer2: ${analyzeData.signal.layer2Score}`);
      console.log(`      Layer3: ${analyzeData.signal.layer3Score}`);
      console.log(`      뉴스: ${analyzeData.signal.news?.articles?.length || 0}개`);
    } else {
      console.log(`   ❌ 실패: ${analyzeData.error}`);
    }

    console.log('');

    // 3. 마켓 데이터
    console.log('3️⃣  Market API 테스트...');
    const marketRes = await fetch(`${API_BASE}/api/market`);
    const marketData = await marketRes.json();

    if (marketData.success) {
      console.log(`   ✅ 마켓 데이터 로드 성공`);
      console.log(`      주식/ETF: ${marketData.stocks?.length || 0}개`);
      console.log(`      암호화폐: ${marketData.crypto?.length || 0}개`);
      console.log(`      VIX: ${marketData.macroIndicators?.vix}`);
      console.log(`      Fear & Greed: ${marketData.macroIndicators?.fearGreed}`);
    } else {
      console.log(`   ❌ 실패: ${marketData.error}`);
    }

    console.log('\n✅ 모든 테스트 완료!');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 확인사항:');
    console.log('   1. Signal API가 DB에서 심볼을 가져오는가?');
    console.log('   2. 22개 심볼이 모두 표시되는가?');
    console.log('   3. 에러 없이 정상 작동하는가?');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('\n❌ 테스트 중 오류 발생:', error.message);
    console.log('\n💡 해결방법:');
    console.log('   1. 서버가 실행 중인지 확인 (localhost:3000)');
    console.log('   2. Supabase 스키마가 적용되었는지 확인');
    console.log('   3. .env.local에 Supabase 키가 있는지 확인');
  }
}

// 실행
testDynamicConfig();
