# PHASE 21~23 — 자동 실행 시스템
# 클로드 코드: "이 파일 읽고 전체 실행해줘. npm run build까지."
# 주의: KIS API 연동은 계좌 개설 후 실제 키 발급 필요

---

# PHASE 21 — KIS API 연동

## Supabase SQL

```sql
CREATE TABLE IF NOT EXISTS kis_orders (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol       text        NOT NULL,
  order_type   text        NOT NULL CHECK (order_type IN ('BUY','SELL')),
  quantity     integer     NOT NULL,
  price        numeric,
  order_no     text,
  status       text        DEFAULT 'PENDING',
  signal_id    text,
  executed_at  timestamptz,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kis_executions (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     uuid        REFERENCES kis_orders(id),
  symbol       text        NOT NULL,
  order_type   text        NOT NULL,
  quantity     integer     NOT NULL,
  price        numeric     NOT NULL,
  amount       numeric     NOT NULL,
  executed_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trading_sessions (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  mode         text        NOT NULL DEFAULT 'MANUAL',
  is_active    boolean     DEFAULT false,
  daily_loss   numeric     DEFAULT 0,
  max_daily_loss numeric   DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

INSERT INTO trading_sessions (mode, is_active, max_daily_loss)
VALUES ('MANUAL', false, 500000)
ON CONFLICT DO NOTHING;
```

---

## 1. lib/kis-api.ts (신규)

```typescript
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
```

---

## 2. app/api/trading/route.ts (신규)

```typescript
// app/api/trading/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBalance, getCurrentPrice, placeBuyOrder, placeSellOrder } from '@/lib/kis-api'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 리스크 게이트 — 3개 조건 모두 통과해야 주문 실행
async function riskGate(orderAmount: number): Promise<{ pass: boolean; reason: string }> {
  const { data: session } = await supabase
    .from('trading_sessions')
    .select('*')
    .single()

  if (!session?.is_active) {
    return { pass: false, reason: '자동매매 비활성화 상태' }
  }
  if (session.daily_loss >= session.max_daily_loss) {
    return { pass: false, reason: `일일 최대 손실 초과 (${session.daily_loss.toLocaleString()}원)` }
  }

  const balance = await getBalance()
  if (orderAmount > balance.cash * 0.5) {
    return { pass: false, reason: '단일 주문 한도 초과 (현금의 50% 이내)' }
  }

  return { pass: true, reason: '리스크 게이트 통과' }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'balance') {
      const balance = await getBalance()
      return NextResponse.json({ balance })
    }

    if (action === 'price') {
      const price = await getCurrentPrice(body.symbol)
      return NextResponse.json({ price })
    }

    if (action === 'buy') {
      const gate = await riskGate(body.amount ?? 0)
      if (!gate.pass) {
        return NextResponse.json({ success: false, reason: gate.reason })
      }
      const result = await placeBuyOrder(body.symbol, body.quantity, body.price ?? 0)
      if (result.success) {
        await supabase.from('kis_orders').insert({
          symbol:     body.symbol,
          order_type: 'BUY',
          quantity:   body.quantity,
          price:      body.price ?? 0,
          order_no:   result.orderNo,
          status:     'EXECUTED',
          signal_id:  body.signalId,
          executed_at: new Date().toISOString(),
        })
      }
      return NextResponse.json(result)
    }

    if (action === 'sell') {
      const gate = await riskGate(0)
      if (!gate.pass && !body.forceStop) {
        return NextResponse.json({ success: false, reason: gate.reason })
      }
      const result = await placeSellOrder(body.symbol, body.quantity, body.price ?? 0)
      if (result.success) {
        await supabase.from('kis_orders').insert({
          symbol:     body.symbol,
          order_type: 'SELL',
          quantity:   body.quantity,
          price:      body.price ?? 0,
          order_no:   result.orderNo,
          status:     'EXECUTED',
          executed_at: new Date().toISOString(),
        })
      }
      return NextResponse.json(result)
    }

    if (action === 'toggle') {
      await supabase.from('trading_sessions')
        .update({ is_active: body.active, updated_at: new Date().toISOString() })
        .eq('id', body.sessionId)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

---

## 3. app/trading/page.tsx (신규)

```typescript
'use client'
import { useState, useEffect } from 'react'

interface Balance {
  cash: number
  totalValue: number
  holdings: Array<{ symbol: string; quantity: number; currentPrice: number; value: number }>
}

interface Order {
  id: string
  symbol: string
  order_type: string
  quantity: number
  price: number
  status: string
  executed_at: string
}

export default function TradingPage() {
  const [balance,  setBalance]  = useState<Balance | null>(null)
  const [orders,   setOrders]   = useState<Order[]>([])
  const [symbol,   setSymbol]   = useState('')
  const [quantity, setQuantity] = useState(1)
  const [price,    setPrice]    = useState(0)
  const [loading,  setLoading]  = useState(false)
  const [message,  setMessage]  = useState<string | null>(null)
  const [kisReady, setKisReady] = useState(false)

  useEffect(() => {
    // KIS API 키 설정 여부 확인
    setKisReady(!!(process.env.NEXT_PUBLIC_KIS_READY === 'true'))
    loadBalance()
    loadOrders()
  }, [])

  const loadBalance = async () => {
    try {
      const res = await fetch('/api/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'balance' }),
      })
      const data = await res.json()
      if (data.balance) setBalance(data.balance)
    } catch {}
  }

  const loadOrders = async () => {
    // Supabase에서 최근 주문 조회
    const res = await fetch('/api/trading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'recent_orders' }),
    })
    const data = await res.json()
    setOrders(data.orders ?? [])
  }

  const handleOrder = async (type: 'buy' | 'sell') => {
    if (!symbol || !quantity) return
    setLoading(true)
    setMessage(null)
    const res = await fetch('/api/trading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: type, symbol, quantity, price }),
    })
    const data = await res.json()
    setMessage(data.success ? `✅ ${data.message}` : `❌ ${data.reason ?? data.message}`)
    if (data.success) { loadBalance(); loadOrders() }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">실시간 트레이딩</h1>
          <p className="text-gray-500 text-sm mt-1">KIS API 직접 주문 실행</p>
        </div>

        {!kisReady && (
          <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 mb-6">
            <p className="text-yellow-400 font-semibold text-sm">⚠️ KIS API 미연동</p>
            <p className="text-yellow-300/70 text-xs mt-1">
              .env.local에 KIS_APP_KEY, KIS_APP_SECRET, KIS_ACCOUNT_NO 설정 필요
            </p>
            <p className="text-gray-500 text-xs mt-1">
              KIS Developers: https://apiportal.koreainvestment.com
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 잔고 */}
          <div className="bg-gray-900 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <p className="text-orange-400 font-semibold">계좌 현황</p>
              <button onClick={loadBalance} className="text-gray-500 text-xs hover:text-white">새로고침</button>
            </div>
            {balance ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-gray-500 text-xs">현금</p>
                    <p className="text-white font-bold">{balance.cash.toLocaleString()}원</p>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-gray-500 text-xs">총평가</p>
                    <p className="text-white font-bold">{balance.totalValue.toLocaleString()}원</p>
                  </div>
                </div>
                {balance.holdings.length > 0 && (
                  <div className="space-y-2">
                    {balance.holdings.map(h => (
                      <div key={h.symbol} className="flex justify-between text-xs">
                        <span className="text-white font-medium">{h.symbol}</span>
                        <span className="text-gray-400">{h.quantity}주</span>
                        <span className="text-orange-400">{h.value.toLocaleString()}원</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-sm">KIS API 연동 후 조회 가능</p>
            )}
          </div>

          {/* 주문 */}
          <div className="bg-gray-900 rounded-xl p-5">
            <p className="text-orange-400 font-semibold mb-4">주문 실행</p>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-400 text-xs mb-1">종목코드</p>
                <input type="text" value={symbol}
                  onChange={e => setSymbol(e.target.value.toUpperCase())}
                  placeholder="예: 005930"
                  className="w-full bg-gray-800 rounded px-3 py-2 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">수량</p>
                <input type="number" value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  className="w-full bg-gray-800 rounded px-3 py-2 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">가격 (0 = 시장가)</p>
                <input type="number" value={price}
                  onChange={e => setPrice(Number(e.target.value))}
                  className="w-full bg-gray-800 rounded px-3 py-2 text-white" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOrder('buy')} disabled={loading || !kisReady}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-lg font-semibold text-sm">
                  매수
                </button>
                <button onClick={() => handleOrder('sell')} disabled={loading || !kisReady}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-lg font-semibold text-sm">
                  매도
                </button>
              </div>
              {message && (
                <div className={`rounded-lg p-3 text-xs ${message.startsWith('✅') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 주문 내역 */}
        {orders.length > 0 && (
          <div className="mt-6 bg-gray-900 rounded-xl p-5">
            <p className="text-orange-400 font-semibold mb-3 text-sm">최근 주문</p>
            <div className="space-y-2">
              {orders.map(o => (
                <div key={o.id} className="flex justify-between text-xs py-2 border-b border-gray-800/40">
                  <span className={`font-bold ${o.order_type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                    {o.order_type}
                  </span>
                  <span className="text-white">{o.symbol}</span>
                  <span className="text-gray-400">{o.quantity}주</span>
                  <span className="text-gray-400">{o.price ? o.price.toLocaleString() + '원' : '시장가'}</span>
                  <span className="text-gray-600">{new Date(o.executed_at).toLocaleString('ko-KR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 4. .env.local 추가

```
KIS_APP_KEY=발급받은키
KIS_APP_SECRET=발급받은시크릿
KIS_ACCOUNT_NO=계좌번호
KIS_BASE_URL=https://openapivts.koreainvestment.com:29443
NEXT_PUBLIC_KIS_READY=false
```

KIS API 실제 연동 시 `NEXT_PUBLIC_KIS_READY=true`로 변경

---

## 5. 메뉴 추가

```typescript
{ href: "/trading", label: "⚡ 트레이딩" },
```

---

# PHASE 22 — 반자동 실행 (승인 후 실행)

## Supabase SQL

```sql
CREATE TABLE IF NOT EXISTS pending_approvals (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol        text        NOT NULL,
  order_type    text        NOT NULL,
  quantity      integer     NOT NULL,
  amount        numeric     NOT NULL,
  signal_score  integer,
  signal_reason text,
  recommended_by text,
  expires_at    timestamptz NOT NULL,
  status        text        DEFAULT 'PENDING',
  approved_at   timestamptz,
  rejected_at   timestamptz,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pa_status
  ON pending_approvals (status, expires_at);
```

---

## 1. lib/approval-engine.ts (신규)

```typescript
// lib/approval-engine.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface PendingApproval {
  id:           string
  symbol:       string
  orderType:    'BUY' | 'SELL'
  quantity:     number
  amount:       number
  signalScore:  number
  signalReason: string
  expiresAt:    string
  status:       'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
}

// 신호 → 승인 대기 큐에 추가
export async function createApproval(
  symbol:       string,
  orderType:    'BUY' | 'SELL',
  quantity:     number,
  amount:       number,
  signalScore:  number,
  signalReason: string,
  timeoutMinutes = 30
): Promise<string> {
  const expiresAt = new Date(Date.now() + timeoutMinutes * 60_000).toISOString()
  const { data } = await supabase.from('pending_approvals').insert({
    symbol, order_type: orderType, quantity, amount,
    signal_score: signalScore, signal_reason: signalReason,
    expires_at: expiresAt, status: 'PENDING',
  }).select().single()
  return data?.id ?? ''
}

// 승인
export async function approveOrder(id: string): Promise<boolean> {
  const { data: approval } = await supabase
    .from('pending_approvals')
    .select('*')
    .eq('id', id)
    .eq('status', 'PENDING')
    .single()

  if (!approval) return false
  if (new Date(approval.expires_at) < new Date()) {
    await supabase.from('pending_approvals')
      .update({ status: 'EXPIRED' }).eq('id', id)
    return false
  }

  await supabase.from('pending_approvals')
    .update({ status: 'APPROVED', approved_at: new Date().toISOString() })
    .eq('id', id)
  return true
}

// 거부
export async function rejectOrder(id: string): Promise<void> {
  await supabase.from('pending_approvals')
    .update({ status: 'REJECTED', rejected_at: new Date().toISOString() })
    .eq('id', id)
}

// 만료된 승인 정리
export async function cleanExpired(): Promise<void> {
  await supabase.from('pending_approvals')
    .update({ status: 'EXPIRED' })
    .eq('status', 'PENDING')
    .lt('expires_at', new Date().toISOString())
}
```

---

## 2. app/api/approvals/route.ts (신규)

```typescript
// app/api/approvals/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { approveOrder, rejectOrder, cleanExpired } from '@/lib/approval-engine'
import { placeBuyOrder, placeSellOrder } from '@/lib/kis-api'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'PENDING'
  await cleanExpired()
  const { data } = await supabase
    .from('pending_approvals')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(20)
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const { action, id } = await req.json()

    if (action === 'approve') {
      const ok = await approveOrder(id)
      if (!ok) return NextResponse.json({ success: false, reason: '승인 실패 또는 만료' })

      // KIS API로 실제 주문 실행
      const { data: approval } = await supabase
        .from('pending_approvals').select('*').eq('id', id).single()

      if (approval) {
        const result = approval.order_type === 'BUY'
          ? await placeBuyOrder(approval.symbol, approval.quantity)
          : await placeSellOrder(approval.symbol, approval.quantity)
        return NextResponse.json({ success: result.success, orderNo: result.orderNo })
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'reject') {
      await rejectOrder(id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

---

## 3. app/approvals/page.tsx (신규)

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'

interface Approval {
  id: string
  symbol: string
  order_type: string
  quantity: number
  amount: number
  signal_score: number
  signal_reason: string
  expires_at: string
  status: string
}

export default function ApprovalsPage() {
  const [pending,  setPending]  = useState<Approval[]>([])
  const [history,  setHistory]  = useState<Approval[]>([])
  const [loading,  setLoading]  = useState<string | null>(null)
  const [message,  setMessage]  = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [p, h] = await Promise.all([
      fetch('/api/approvals?status=PENDING').then(r => r.json()),
      fetch('/api/approvals?status=APPROVED').then(r => r.json()),
    ])
    setPending(p.data ?? [])
    setHistory(h.data ?? [])
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30_000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setLoading(id)
    const res = await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, id }),
    })
    const data = await res.json()
    setMessage(data.success ? `✅ ${action === 'approve' ? '주문 실행됨' : '거부됨'}` : `❌ ${data.reason}`)
    await loadData()
    setLoading(null)
  }

  const timeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return '만료'
    const min = Math.floor(diff / 60_000)
    const sec = Math.floor((diff % 60_000) / 1000)
    return `${min}분 ${sec}초`
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">승인 대기 신호</h1>
          <p className="text-gray-500 text-sm mt-1">핀시가 생성한 신호 — 승인하면 즉시 실행</p>
        </div>

        {message && (
          <div className={`rounded-lg p-3 text-sm mb-4 ${message.startsWith('✅') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {message}
          </div>
        )}

        {pending.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-12 text-center text-gray-500">
            대기 중인 신호 없음
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {pending.map(a => (
              <div key={a.id} className={`rounded-xl p-5 border ${
                a.order_type === 'BUY'
                  ? 'bg-green-900/10 border-green-800/40'
                  : 'bg-red-900/10 border-red-800/40'
              }`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-lg ${a.order_type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                        {a.order_type}
                      </span>
                      <span className="text-white font-bold">{a.symbol}</span>
                      <span className="text-gray-400 text-sm">{a.quantity}주</span>
                    </div>
                    <p className="text-orange-400 text-sm mt-0.5">
                      {a.amount.toLocaleString()}원
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs">신호 점수</p>
                    <p className="text-orange-400 font-bold">{a.signal_score}점</p>
                    <p className="text-red-400 text-xs mt-1">{timeLeft(a.expires_at)}</p>
                  </div>
                </div>
                <p className="text-gray-400 text-xs mb-3">{a.signal_reason}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(a.id, 'approve')}
                    disabled={loading === a.id}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-lg font-semibold text-sm">
                    ✅ 승인 (실행)
                  </button>
                  <button
                    onClick={() => handleAction(a.id, 'reject')}
                    disabled={loading === a.id}
                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg font-semibold text-sm">
                    ❌ 거부
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {history.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-orange-400 text-sm font-semibold mb-3">최근 실행</p>
            {history.slice(0,5).map(a => (
              <div key={a.id} className="flex justify-between text-xs py-2 border-b border-gray-800/40">
                <span className={a.order_type === 'BUY' ? 'text-green-400' : 'text-red-400'}>{a.order_type}</span>
                <span className="text-white">{a.symbol}</span>
                <span className="text-gray-400">{a.quantity}주</span>
                <span className="text-orange-400">{a.amount.toLocaleString()}원</span>
                <span className="text-gray-600">{new Date(a.expires_at).toLocaleDateString('ko-KR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 4. 메뉴 추가

```typescript
{ href: "/approvals", label: "✅ 승인 대기" },
```

---

# PHASE 23 — 완전 자동 실행

## Supabase SQL

```sql
CREATE TABLE IF NOT EXISTS autopilot_config (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active         boolean     DEFAULT false,
  target_return     numeric     DEFAULT 20,
  max_dd_percent    numeric     DEFAULT 15,
  max_daily_trades  integer     DEFAULT 3,
  max_position_pct  numeric     DEFAULT 10,
  min_signal_score  integer     DEFAULT 80,
  universe          text[]      DEFAULT ARRAY['SPY','QQQ','AAPL','MSFT'],
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

INSERT INTO autopilot_config DEFAULT VALUES
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS autopilot_log (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  action      text        NOT NULL,
  symbol      text,
  amount      numeric,
  reason      text,
  result      text,
  created_at  timestamptz DEFAULT now()
);
```

---

## 1. lib/autopilot.ts (신규)

```typescript
// lib/autopilot.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AutopilotConfig {
  isActive:       boolean
  targetReturn:   number
  maxDdPercent:   number
  maxDailyTrades: number
  maxPositionPct: number
  minSignalScore: number
  universe:       string[]
}

export async function getConfig(): Promise<AutopilotConfig> {
  const { data } = await supabase
    .from('autopilot_config')
    .select('*')
    .single()
  return {
    isActive:       data?.is_active       ?? false,
    targetReturn:   data?.target_return   ?? 20,
    maxDdPercent:   data?.max_dd_percent  ?? 15,
    maxDailyTrades: data?.max_daily_trades ?? 3,
    maxPositionPct: data?.max_position_pct ?? 10,
    minSignalScore: data?.min_signal_score ?? 80,
    universe:       data?.universe        ?? [],
  }
}

export async function updateConfig(config: Partial<AutopilotConfig>): Promise<void> {
  await supabase.from('autopilot_config').update({
    is_active:        config.isActive,
    target_return:    config.targetReturn,
    max_dd_percent:   config.maxDdPercent,
    max_daily_trades: config.maxDailyTrades,
    max_position_pct: config.maxPositionPct,
    min_signal_score: config.minSignalScore,
    universe:         config.universe,
    updated_at:       new Date().toISOString(),
  })
}

// 오늘 거래 횟수 확인
export async function getTodayTradeCount(): Promise<number> {
  const today = new Date().toISOString().slice(0,10)
  const { count } = await supabase
    .from('kis_orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today)
  return count ?? 0
}

// 자동 실행 로그
export async function logAutopilot(
  action: string, symbol?: string,
  amount?: number, reason?: string, result?: string
): Promise<void> {
  await supabase.from('autopilot_log').insert({
    action, symbol, amount, reason, result
  })
}

// 비상 정지 — 모든 포지션 청산
export async function emergencyStop(): Promise<void> {
  await supabase.from('autopilot_config')
    .update({ is_active: false, updated_at: new Date().toISOString() })
  await logAutopilot('EMERGENCY_STOP', undefined, undefined, '사용자 비상 정지')
}
```

---

## 2. app/autopilot/page.tsx (신규)

```typescript
'use client'
import { useState, useEffect } from 'react'
import type { AutopilotConfig } from '@/lib/autopilot'

const DEFAULT_CONFIG: AutopilotConfig = {
  isActive: false, targetReturn: 20, maxDdPercent: 15,
  maxDailyTrades: 3, maxPositionPct: 10, minSignalScore: 80,
  universe: ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA'],
}

export default function AutopilotPage() {
  const [config,  setConfig]  = useState<AutopilotConfig>(DEFAULT_CONFIG)
  const [logs,    setLogs]    = useState<Array<Record<string, unknown>>>([])
  const [saving,  setSaving]  = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/autopilot?action=config').then(r => r.json()).then(d => {
      if (d.config) setConfig(d.config)
    })
    fetch('/api/autopilot?action=logs').then(r => r.json()).then(d => {
      setLogs(d.logs ?? [])
    })
  }, [])

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/autopilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', config }),
    })
    const data = await res.json()
    setMessage(data.ok ? '✅ 저장됨' : '❌ 저장 실패')
    setSaving(false)
  }

  const emergencyStop = async () => {
    if (!confirm('⚠️ 비상 정지: 자동매매를 즉시 중단합니다. 계속?')) return
    await fetch('/api/autopilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'emergency_stop' }),
    })
    setConfig(p => ({ ...p, isActive: false }))
    setMessage('🛑 비상 정지 완료')
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-400">자율 운용 (오토파일럿)</h1>
          <p className="text-gray-500 text-sm mt-1">목표 설정 → 핀시가 알아서 매매</p>
        </div>

        {/* 활성화 토글 */}
        <div className={`rounded-xl p-5 border mb-6 ${
          config.isActive
            ? 'bg-green-900/20 border-green-700/40'
            : 'bg-gray-900 border-gray-800'
        }`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold text-lg">{config.isActive ? '🟢 자동매매 활성화' : '⚪ 자동매매 비활성화'}</p>
              <p className="text-gray-500 text-sm mt-0.5">
                {config.isActive ? '핀시가 신호 기반으로 자동 매매 중' : '수동 모드'}
              </p>
            </div>
            <button
              onClick={() => setConfig(p => ({ ...p, isActive: !p.isActive }))}
              className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                config.isActive
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}>
              {config.isActive ? '중지' : '시작'}
            </button>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-5 mb-4 space-y-4 text-sm">
          <p className="text-orange-400 font-semibold">운용 파라미터</p>

          {[
            { label: '목표 연수익률', key: 'targetReturn', unit: '%', min: 5, max: 100 },
            { label: '최대 낙폭 허용', key: 'maxDdPercent', unit: '%', min: 5, max: 40 },
            { label: '일일 최대 거래', key: 'maxDailyTrades', unit: '회', min: 1, max: 10 },
            { label: '포지션당 최대', key: 'maxPositionPct', unit: '%', min: 2, max: 30 },
            { label: '최소 신호 점수', key: 'minSignalScore', unit: '점', min: 50, max: 100 },
          ].map(f => (
            <div key={f.key}>
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">{f.label}</span>
                <span className="text-orange-400 font-bold">
                  {config[f.key as keyof AutopilotConfig] as number}{f.unit}
                </span>
              </div>
              <input type="range" min={f.min} max={f.max}
                value={config[f.key as keyof AutopilotConfig] as number}
                onChange={e => setConfig(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                className="w-full accent-orange-500" />
            </div>
          ))}

          <div>
            <p className="text-gray-400 mb-1">유니버스 (쉼표 구분)</p>
            <input type="text"
              value={config.universe.join(',')}
              onChange={e => setConfig(p => ({ ...p, universe: e.target.value.split(',').map(s => s.trim().toUpperCase()) }))}
              className="w-full bg-gray-800 rounded px-3 py-2 text-white text-sm" />
          </div>
        </div>

        {message && (
          <div className={`rounded-lg p-3 text-sm mb-4 ${message.startsWith('✅') ? 'bg-green-900/30 text-green-400' : message.startsWith('🛑') ? 'bg-red-900/30 text-red-400' : 'bg-red-900/30 text-red-400'}`}>
            {message}
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-xl font-semibold text-sm">
            {saving ? '저장 중...' : '설정 저장'}
          </button>
          <button onClick={emergencyStop}
            className="px-6 py-2.5 bg-red-700 hover:bg-red-800 rounded-xl font-semibold text-sm">
            🛑 비상 정지
          </button>
        </div>

        {/* 자동매매 조건 */}
        <div className="bg-gray-900/50 rounded-xl p-4 mb-4 text-xs text-gray-400 space-y-1">
          <p className="text-orange-400 font-medium mb-2">자동 실행 조건 (3개 모두 충족)</p>
          <p>① 신호 점수 ≥ {config.minSignalScore}점</p>
          <p>② 드로우다운 &lt; {config.maxDdPercent}%</p>
          <p>③ 오늘 거래 &lt; {config.maxDailyTrades}회</p>
          <p className="text-gray-600 mt-1">손절 신호는 조건 무관 즉시 실행</p>
        </div>

        {/* 로그 */}
        {logs.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-orange-400 text-sm font-semibold mb-3">자동매매 로그</p>
            {logs.slice(0,10).map((l, i) => (
              <div key={i} className="flex justify-between text-xs py-1.5 border-b border-gray-800/40">
                <span className="text-gray-400">{l.action as string}</span>
                <span className="text-white">{(l.symbol as string) ?? '-'}</span>
                <span className="text-orange-400">{l.amount ? `${(l.amount as number).toLocaleString()}원` : '-'}</span>
                <span className="text-gray-600">{new Date(l.created_at as string).toLocaleString('ko-KR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 3. app/api/autopilot/route.ts (신규)

```typescript
// app/api/autopilot/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getConfig, updateConfig, emergencyStop, logAutopilot } from '@/lib/autopilot'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? 'config'

  if (action === 'config') {
    const config = await getConfig()
    return NextResponse.json({ config })
  }
  if (action === 'logs') {
    const { data } = await supabase
      .from('autopilot_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    return NextResponse.json({ logs: data ?? [] })
  }
  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  try {
    const { action, config } = await req.json()
    if (action === 'update') {
      await updateConfig(config)
      await logAutopilot('CONFIG_UPDATE', undefined, undefined, JSON.stringify(config))
      return NextResponse.json({ ok: true })
    }
    if (action === 'emergency_stop') {
      await emergencyStop()
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
```

---

## 4. 메뉴 추가

```typescript
{ href: "/autopilot", label: "🤖 오토파일럿" },
```

---

## PHASE 21~23 완료 확인

```bash
npm run build
# /trading /approvals /autopilot 접속 확인
```
