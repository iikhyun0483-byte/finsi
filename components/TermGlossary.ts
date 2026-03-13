// components/TermGlossary.ts

export interface Term {
  kr: string        // 한글 명칭
  def: string       // 한 줄 정의
  bench?: string    // 기준값
  good?: string     // 좋은 상태
  bad?: string      // 나쁜 상태
}

export const TERMS: Record<string, Term> = {
  DTI:          { kr: '총부채상환비율',    def: '월 소득 중 부채 상환에 쓰는 비율',                          bench: '40% 이하 권장',        good: '25% 이하 — 여유',      bad: '50% 이상 — 위험' },
  DSR:          { kr: '총부채원리금비율',  def: '모든 대출 원금+이자 합산 상환액 ÷ 월소득. 금융규제 핵심',   bench: '40% 이하 (규제 기준)',  good: '30% 이하',             bad: '40% 초과 시 대출 불가' },
  LTV:          { kr: '담보인정비율',      def: '집값 대비 대출 비율. 10억 집에 LTV 70%면 대출 7억',         bench: '60~70% 이하 권장',     good: '50% 이하',             bad: '80% 이상 — 위험' },
  MDD:          { kr: '최대 낙폭',         def: '고점 대비 가장 많이 떨어진 하락폭. 1000→700이면 MDD 30%',   bench: '20% 이하 권장',        good: '10% 이하',             bad: '30% 이상' },
  VaR:          { kr: '최대 예상 손실',    def: '95% 확률로 이 이상 잃지 않는 한도. 1일 기준',                bench: '자산의 2~5% 이내',     good: '2% 이내',              bad: '10% 초과' },
  CVaR:         { kr: '꼬리 손실 기대값',  def: 'VaR 초과 최악 5% 상황에서 평균 손실. VaR보다 보수적',        bench: 'VaR의 1.2~1.5배가 정상' },
  Sharpe:       { kr: '샤프 비율',         def: '위험 1단위당 수익률. 높을수록 효율적 투자',                   bench: '1.0 이상 권장',        good: '2.0 이상 — 우수',     bad: '0.5 미만 — 비효율' },
  Sortino:      { kr: '소르티노 비율',     def: '하락 위험만 고려한 샤프 비율. 수익 변동성은 패널티 없음',     bench: '1.0 이상 권장',        good: '2.0 이상',             bad: '0.5 미만' },
  Calmar:       { kr: '칼마 비율',         def: '연간 수익률 ÷ 최대 낙폭. 낙폭 대비 수익 효율',               bench: '0.5 이상 권장',        good: '1.0 이상',             bad: '0.2 미만' },
  Kelly:        { kr: '켈리 비율',         def: '수학적으로 최적인 투자 비율. 실전에선 계산값의 25~50%만 사용', bench: '실전: 10~20%',         good: '10~20%',               bad: '50% 초과 — 파산 위험' },
  MonteCarlo:   { kr: '몬테카를로',        def: '무작위 시나리오를 수만 번 돌려 확률 분포를 구하는 방법',       bench: '1만회 이상 권장' },
  GBM:          { kr: '기하 브라운 운동',  def: '자산 가격 움직임을 수학적으로 모델링. 몬테카를로의 기반' },
  GARCH:        { kr: '변동성 군집 모델',  def: '변동성이 높을 때 더 높아지는 패턴 모델링. 폭락 후 예측에 사용' },
  Regime:       { kr: '시장 레짐',         def: '현재 시장이 강세/약세/횡보/위기 중 어디인지 판단' },
  WalkForward:  { kr: '워크포워드 검증',   def: '과거로 전략 학습, 미래로 검증. 과적합 여부 판단' },
  Runway:       { kr: '런웨이',            def: '현금이 소진되는 시점까지 남은 개월 수. 사업 핵심 지표',       bench: '12개월 이상 유지',     good: '18개월 이상',          bad: '6개월 미만 — 즉시 행동' },
  Percentile:   { kr: '퍼센타일',          def: 'P5=100번 중 5번째 나쁜 결과, P95=95번째 좋은 결과' },
  SurvivalRate: { kr: '원금 생존 확률',    def: '시뮬레이션 중 원금 이상을 유지한 비율',                       bench: '70% 이상 권장',        good: '90% 이상',             bad: '50% 미만' },
  Volatility:   { kr: '변동성',            def: '수익률이 얼마나 들쭉날쭉한지. 분산투자 주식: 12~15%, 개별주: 20~40%', bench: '분산투자: 10~15%' },
  AnnualReturn: { kr: '연 기대수익률',     def: '1년 동안 예상되는 수익률. 국내 주식 장기 평균 약 8~10%',      bench: '분산투자 장기: 6~9%' },
  BreakEven:    { kr: '손익분기점',        def: '총 수익이 총 비용을 넘어서는 시점. 이 매출 이상이면 흑자' },
}

export function getTerm(key: string): Term | null {
  return TERMS[key] ?? null
}
