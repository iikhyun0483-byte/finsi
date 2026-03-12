E:\dev\finsi 경로에 FINSI(핀시) 퀀트 투자 자동화 시스템을 개발해줘.

기술스택: Next.js 15 App Router + TypeScript + Tailwind CSS + Supabase + Recharts + Zustand + next-pwa + Vercel

절대원칙:
- 모든 영어 약자/외래어 옆에 한글 풀이 병기 (RSI → 상대강도지수, 볼린저밴드 → 가격 변동 범위 띠)
- 달러 금액 옆에 원화 자동 병기
- 다크모드 기본 (배경 #080810)
- 모바일 퍼스트
- 암호화폐 신호 옆 HIGH RISK 배지 필수

커버 자산: 미국주식ETF(SPY/QQQ) + 금/은(GLD/SLV) + 원유(USO/XLE) + 채권(TLT/IEF) + 리츠(VNQ) + 암호화폐(BTC/ETH/SOL/XRP) + 한국주식(코스피/코스닥)

점수체계: 3레이어 0~100점
- Layer1(30%): RSI + MACD + 볼린저밴드 + 골든/데드크로스
- Layer2(40%): 모멘텀 + 가치 + 퀄리티 + 저변동성 팩터
- Layer3(30%): 공포탐욕지수 + 기준금리(FRED API) + VIX + 버핏지수
- 75~100 → 지금 사기 좋음 / 55~74 → 조금씩 사도 됨 / 40~54 → 관망 / 0~39 → 사지 마세요

백테스팅 6대 전략: 장기보유전략 / 골든데드크로스 / RSI역추세 / MACD교차 / 볼린저밴드반등 / 듀얼모멘텀

화면 12개: / (대시보드) + /signal (오늘의신호) + /analyze + /market + /backtest + /plan + /portfolio + /watchlist + /learn + /knowledge + /auto-trade + /settings

초보자 컴포넌트(components/beginner/): ScoreMeter + RSIGauge + ActionCard + SplitBuyCalc + SellRules + PnLCalc + LearnCard

외부API(전부무료): Yahoo Finance + CoinGecko + Alternative.me(공포탐욕지수) + FRED + ExchangeRate-API

자동매매 화면은 UI 전체 완성, API 키 입력란만 비워둠 (계좌 생기면 즉시 활성화)

Step 01부터 순서대로 전부 개발해줘.
Step 01: 프로젝트 생성 + 패키지 설치 + 폴더 구조
Step 02: PWA 설정
Step 03: 디자인 시스템
Step 04: Supabase 연결 + 전체 테이블 생성
Step 05: lib/exchange.ts (환율)
Step 06: lib/yahoo.ts (미국주식/ETF/금/채권/원유)
Step 07: lib/crypto.ts (BTC/ETH/SOL/XRP)
Step 08: lib/indicators.ts (RSI/MACD/볼린저밴드/골든크로스)
Step 09: lib/macro.ts (공포탐욕지수/금리/VIX/버핏지수)
Step 10: lib/signals.ts (0~100점 신호 엔진)
Step 11: components/beginner/ 전체
Step 12: API Routes 전체
Step 13: 대시보드 + 오늘의신호 화면
Step 14: Vercel 배포C