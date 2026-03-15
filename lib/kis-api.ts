// lib/kis-api.ts
// KIS Developers: https://apiportal.koreainvestment.com

const KIS_BASE    = process.env.KIS_BASE_URL    ?? 'https://openapivts.koreainvestment.com:29443'
const KIS_APP_KEY = process.env.KIS_APP_KEY     ?? ''
const KIS_APP_SECRET = process.env.KIS_APP_SECRET ?? ''

interface KisToken {
  access_token: string
  expires_at:   number
}

let _token: KisToken | null = null

// OAuth 토큰 발급 (24시간 유효)
export async function getToken(): Promise<string> {
  if (!KIS_APP_KEY || !KIS_APP_SECRET) {
    throw new Error('KIS_APP_KEY 및 KIS_APP_SECRET 환경변수가 설정되지 않았습니다. KIS 연동 예정입니다.')
  }

  if (_token && Date.now() < _token.expires_at - 60_000) {
    return _token.access_token
  }
  const res = await fetch(`${KIS_BASE}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type:   'client_credentials',
      appkey:       KIS_APP_KEY,
      appsecret:    KIS_APP_SECRET,
    }),
  })
  const data = await res.json()
  _token = {
    access_token: data.access_token,
    expires_at:   Date.now() + (data.expires_in ?? 86400) * 1000,
  }
  return _token.access_token
}

// 현재가 조회
export async function getCurrentPrice(symbol: string): Promise<number> {
  if (!KIS_APP_KEY || !KIS_APP_SECRET) {
    throw new Error('KIS_APP_KEY 및 KIS_APP_SECRET 환경변수가 설정되지 않았습니다. KIS 연동 예정입니다.')
  }

  const token = await getToken()
  const res = await fetch(
    `${KIS_BASE}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${symbol}`,
    {
      headers: {
        authorization: `Bearer ${token}`,
        appkey:        KIS_APP_KEY,
        appsecret:     KIS_APP_SECRET,
        tr_id:         'FHKST01010100',
      },
    }
  )
  const data = await res.json()
  return Number(data.output?.stck_prpr ?? 0)
}

// 잔고 조회
export async function getBalance(): Promise<{
  cash: number
  totalValue: number
  holdings: Array<{ symbol: string; quantity: number; currentPrice: number; value: number }>
}> {
  if (!KIS_APP_KEY || !KIS_APP_SECRET) {
    throw new Error('KIS_APP_KEY 및 KIS_APP_SECRET 환경변수가 설정되지 않았습니다. KIS 연동 예정입니다.')
  }

  const token = await getToken()
  const res = await fetch(
    `${KIS_BASE}/uapi/domestic-stock/v1/trading/inquire-balance?CANO=${process.env.KIS_ACCOUNT_NO}&ACNT_PRDT_CD=01&AFHR_FLPR_YN=N&OFL_YN=&INQR_DVSN=02&UNPR_DVSN=01&FUND_STTL_ICLD_YN=N&FNCG_AMT_AUTO_RDPT_YN=N&PRCS_DVSN=01&CTX_AREA_FK100=&CTX_AREA_NK100=`,
    {
      headers: {
        authorization: `Bearer ${token}`,
        appkey:        KIS_APP_KEY,
        appsecret:     KIS_APP_SECRET,
        tr_id:         'TTTC8434R',
      },
    }
  )
  const data = await res.json()
  const output1 = data.output1 ?? []
  const output2 = data.output2?.[0] ?? {}
  return {
    cash:       Number(output2.dnca_tot_amt ?? 0),
    totalValue: Number(output2.tot_evlu_amt ?? 0),
    holdings:   output1.map((h: Record<string, string>) => ({
      symbol:       h.pdno,
      quantity:     Number(h.hldg_qty),
      currentPrice: Number(h.prpr),
      value:        Number(h.evlu_amt),
    })),
  }
}

// 매수 주문
export async function placeBuyOrder(
  symbol:   string,
  quantity: number,
  price:    number = 0  // 0 = 시장가
): Promise<{ orderNo: string; success: boolean; message: string }> {
  if (!KIS_APP_KEY || !KIS_APP_SECRET) {
    return {
      orderNo: '',
      success: false,
      message: 'KIS_APP_KEY 및 KIS_APP_SECRET 환경변수가 설정되지 않았습니다. KIS 연동 예정입니다.'
    }
  }

  const token = await getToken()
  const res = await fetch(`${KIS_BASE}/uapi/domestic-stock/v1/trading/order-cash`, {
    method: 'POST',
    headers: {
      authorization:  `Bearer ${token}`,
      appkey:         KIS_APP_KEY,
      appsecret:      KIS_APP_SECRET,
      tr_id:          'TTTC0802U',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      CANO:        process.env.KIS_ACCOUNT_NO,
      ACNT_PRDT_CD: '01',
      PDNO:         symbol,
      ORD_DVSN:     price === 0 ? '01' : '00',  // 01=시장가, 00=지정가
      ORD_QTY:      String(quantity),
      ORD_UNPR:     String(price),
    }),
  })
  const data = await res.json()
  const success = data.rt_cd === '0'
  return {
    orderNo: data.output?.KRX_FWDG_ORD_ORGNO ?? '',
    success,
    message: success ? '주문 성공' : data.msg1 ?? '주문 실패',
  }
}

// 매도 주문
export async function placeSellOrder(
  symbol:   string,
  quantity: number,
  price:    number = 0
): Promise<{ orderNo: string; success: boolean; message: string }> {
  if (!KIS_APP_KEY || !KIS_APP_SECRET) {
    return {
      orderNo: '',
      success: false,
      message: 'KIS_APP_KEY 및 KIS_APP_SECRET 환경변수가 설정되지 않았습니다. KIS 연동 예정입니다.'
    }
  }

  const token = await getToken()
  const res = await fetch(`${KIS_BASE}/uapi/domestic-stock/v1/trading/order-cash`, {
    method: 'POST',
    headers: {
      authorization:  `Bearer ${token}`,
      appkey:         KIS_APP_KEY,
      appsecret:      KIS_APP_SECRET,
      tr_id:          'TTTC0801U',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      CANO:         process.env.KIS_ACCOUNT_NO,
      ACNT_PRDT_CD: '01',
      PDNO:         symbol,
      ORD_DVSN:     price === 0 ? '01' : '00',
      ORD_QTY:      String(quantity),
      ORD_UNPR:     String(price),
    }),
  })
  const data = await res.json()
  const success = data.rt_cd === '0'
  return {
    orderNo: data.output?.KRX_FWDG_ORD_ORGNO ?? '',
    success,
    message: success ? '주문 성공' : data.msg1 ?? '주문 실패',
  }
}
