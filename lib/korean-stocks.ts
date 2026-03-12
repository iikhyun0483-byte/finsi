/**
 * 한국 주식 종목 데이터
 * 네이버 금융 API 활용
 */

export interface KoreanStock {
  code: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ';
  category: string;
}

export interface KoreanStockPrice {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  per?: number;
  pbr?: number;
}

// 한국 주식 종목 리스트
export const KOREAN_STOCKS: KoreanStock[] = [
  // 코스피 대형주
  { code: '005930', name: '삼성전자', market: 'KOSPI', category: '대형주' },
  { code: '000660', name: 'SK하이닉스', market: 'KOSPI', category: '대형주' },
  { code: '373220', name: 'LG에너지솔루션', market: 'KOSPI', category: '대형주' },
  { code: '207940', name: '삼성바이오로직스', market: 'KOSPI', category: '대형주' },
  { code: '005380', name: '현대차', market: 'KOSPI', category: '대형주' },
  { code: '000270', name: '기아', market: 'KOSPI', category: '대형주' },
  { code: '005490', name: 'POSCO홀딩스', market: 'KOSPI', category: '대형주' },
  { code: '105560', name: 'KB금융', market: 'KOSPI', category: '대형주' },

  // 코스닥 성장주
  { code: '247540', name: '에코프로비엠', market: 'KOSDAQ', category: '성장주' },
  { code: '068270', name: '셀트리온', market: 'KOSPI', category: '성장주' },
  { code: '293490', name: '카카오게임즈', market: 'KOSDAQ', category: '성장주' },
  { code: '263750', name: '펄어비스', market: 'KOSDAQ', category: '성장주' },
  { code: '028300', name: 'HLB', market: 'KOSDAQ', category: '성장주' },
  { code: '141080', name: '리가켐바이오', market: 'KOSDAQ', category: '성장주' },

  // AI/반도체 테마
  { code: '042700', name: '한미반도체', market: 'KOSDAQ', category: 'AI/반도체' },
  { code: '058470', name: '리노공업', market: 'KOSDAQ', category: 'AI/반도체' },
  { code: '403870', name: 'HPSP', market: 'KOSDAQ', category: 'AI/반도체' },
  { code: '007660', name: '이수페타시스', market: 'KOSDAQ', category: 'AI/반도체' },
  { code: '394280', name: '오픈엣지테크놀로지', market: 'KOSDAQ', category: 'AI/반도체' },

  // 2차전지 테마
  { code: '086520', name: '에코프로', market: 'KOSDAQ', category: '2차전지' },
  { code: '003670', name: '포스코퓨처엠', market: 'KOSPI', category: '2차전지' },
  { code: '066970', name: '엘앤에프', market: 'KOSPI', category: '2차전지' },
  { code: '006400', name: '삼성SDI', market: 'KOSPI', category: '2차전지' },

  // 바이오 테마
  { code: '000100', name: '유한양행', market: 'KOSPI', category: '바이오' },
  { code: '128940', name: '한미약품', market: 'KOSPI', category: '바이오' },
  { code: '196170', name: '알테오젠', market: 'KOSDAQ', category: '바이오' },

  // 방산 테마
  { code: '012450', name: '한화에어로스페이스', market: 'KOSPI', category: '방산' },
  { code: '079550', name: 'LIG넥스원', market: 'KOSPI', category: '방산' },
  { code: '064350', name: '현대로템', market: 'KOSPI', category: '방산' },

  // 국내 ETF
  { code: '069500', name: 'KODEX200', market: 'KOSPI', category: 'ETF' },
  { code: '091160', name: 'KODEX반도체', market: 'KOSPI', category: 'ETF' },
  { code: '133690', name: 'TIGER나스닥100', market: 'KOSPI', category: 'ETF' },
  { code: '305720', name: 'KODEX2차전지산업', market: 'KOSPI', category: 'ETF' },
  { code: '227830', name: 'TIGER방산', market: 'KOSPI', category: 'ETF' },
];

// 카테고리별 종목 가져오기
export function getStocksByCategory(category: string): KoreanStock[] {
  return KOREAN_STOCKS.filter(stock => stock.category === category);
}

// 카테고리 목록
export const CATEGORIES = [
  '대형주',
  '성장주',
  'AI/반도체',
  '2차전지',
  '바이오',
  '방산',
  'ETF',
];

// 네이버 금융 크롤링으로 현재가 가져오기
export async function getNaverStockPrice(code: string): Promise<KoreanStockPrice | null> {
  try {
    const url = `https://finance.naver.com/item/main.naver?code=${code}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Naver Finance error: ${response.status}`);
    }

    const html = await response.text();

    // HTML 파싱 (네이버 금융 구조 기반)
    // 예: <dd>현재가 188,100 전일대비 하락 1,900 마이너스 1.00 퍼센트</dd>
    const priceMatch = html.match(/현재가\s+([\d,]+)/);
    const changeMatch = html.match(/전일대비\s+(?:상승|하락)\s+([\d,]+)/);
    const changeDirectionMatch = html.match(/전일대비\s+(상승|하락)/);
    const changePercentMatch = html.match(/(?:플러스|마이너스)\s+([\d.]+)\s*퍼센트/);
    const volumeMatch = html.match(/거래량\s+([\d,]+)/);

    // PER, PBR은 테이블에서 추출
    const perMatch = html.match(/PER\(배\)<\/strong>[\s\S]*?<td[^>]*>\s*\n?\s*([\d,.]+)/);
    const pbrMatch = html.match(/PBR\(배\)<\/strong>[\s\S]*?<td[^>]*>\s*\n?\s*([\d,.]+)/);

    const stock = KOREAN_STOCKS.find(s => s.code === code);

    if (!priceMatch) {
      console.warn(`⚠️ ${code}: 네이버 금융에서 가격 파싱 실패`);
      return null;
    }

    const price = parseFloat(priceMatch[1].replace(/,/g, ''));
    const changeValue = changeMatch ? parseFloat(changeMatch[1].replace(/,/g, '')) : 0;
    const isDown = changeDirectionMatch && changeDirectionMatch[1] === '하락';
    const change = isDown ? -changeValue : changeValue;
    const changePercent = changePercentMatch ? (isDown ? -1 : 1) * parseFloat(changePercentMatch[1]) : 0;
    const volume = volumeMatch ? parseFloat(volumeMatch[1].replace(/,/g, '')) : 0;
    const per = perMatch ? parseFloat(perMatch[1].replace(/,/g, '')) : undefined;
    const pbr = pbrMatch ? parseFloat(pbrMatch[1].replace(/,/g, '')) : undefined;

    return {
      code,
      name: stock?.name || code,
      price,
      change,
      changePercent,
      volume,
      per,
      pbr,
    };
  } catch (error) {
    console.error(`❌ ${code} 네이버 금융 조회 실패:`, error);
    return null;
  }
}

// 한국투자증권 API로 현재가 가져오기 (KIS_APP_KEY 있을 때)
export async function getKISStockPrice(code: string): Promise<KoreanStockPrice | null> {
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) {
    console.warn('⚠️ KIS API 키 미설정 - 네이버 크롤링 사용');
    return getNaverStockPrice(code);
  }

  try {
    // TODO: KIS API 실시간 시세 구현
    // 현재는 네이버 크롤링으로 대체
    console.log('💡 KIS API 구현 예정 - 네이버 크롤링 사용');
    return getNaverStockPrice(code);
  } catch (error) {
    console.error(`❌ ${code} KIS API 조회 실패:`, error);
    return getNaverStockPrice(code);
  }
}

// 자동 전환: KIS API 우선, 실패 시 네이버
export async function getKoreanStockPrice(code: string): Promise<KoreanStockPrice | null> {
  const hasKISKey = process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET;

  if (hasKISKey) {
    return getKISStockPrice(code);
  } else {
    return getNaverStockPrice(code);
  }
}

// 캐시 (5분)
const priceCache = new Map<string, { data: KoreanStockPrice; expiry: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5분

export async function getKoreanStockPriceCached(code: string): Promise<KoreanStockPrice | null> {
  const cached = priceCache.get(code);
  if (cached && Date.now() < cached.expiry) {
    console.log(`💾 ${code} 가격 캐시 사용`);
    return cached.data;
  }

  const data = await getKoreanStockPrice(code);

  if (data) {
    priceCache.set(code, {
      data,
      expiry: Date.now() + CACHE_DURATION,
    });
  }

  return data;
}
