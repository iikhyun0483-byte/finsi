// app/api/positions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
  syncPositionsFromKIS,
  setStopAndTarget,
  checkStopLossAndTarget,
  getPortfolioSummary,
} from '@/lib/position-manager'
import { getBalance } from '@/lib/kis-api'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') ?? 'summary'

  if (action === 'summary') {
    const summary = await getPortfolioSummary()
    return NextResponse.json(summary)
  }
  if (action === 'sync') {
    try {
      const balance = await getBalance()
      await syncPositionsFromKIS(balance.holdings)
      const summary = await getPortfolioSummary()
      return NextResponse.json({ synced: true, ...summary })
    } catch {
      return NextResponse.json({ synced: false, error: 'KIS API 미연동' })
    }
  }
  return NextResponse.json({ error: 'unknown' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  try {
    const { action, symbol, stopLoss, targetPrice, currentPrices } = await req.json()

    if (action === 'set_stop') {
      await setStopAndTarget(symbol, stopLoss, targetPrice)
      return NextResponse.json({ ok: true })
    }
    if (action === 'check') {
      const triggers = await checkStopLossAndTarget(currentPrices ?? {})
      return NextResponse.json({ triggers })
    }
    return NextResponse.json({ error: 'unknown' }, { status: 400 })
  } catch(e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
