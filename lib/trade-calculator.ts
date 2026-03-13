// lib/trade-calculator.ts

export type AssetType = 'domesticStock' | 'usStock' | 'crypto'

export const TRADING_COSTS: Record<AssetType, {
  buyFee: number; sellFee: number; taxRate: number; slippage: number; taxThreshold: number
}> = {
  domesticStock: { buyFee:0.00015, sellFee:0.00015, taxRate:0.0023,  slippage:0.001, taxThreshold:0 },
  usStock:       { buyFee:0.0025,  sellFee:0.0025,  taxRate:0.22,    slippage:0.002, taxThreshold:2500000 },
  crypto:        { buyFee:0.001,   sellFee:0.001,   taxRate:0.20,    slippage:0.005, taxThreshold:2500000 },
}

export const ASSET_LABELS: Record<AssetType, string> = {
  domesticStock: '국내 주식',
  usStock:       '미국 주식',
  crypto:        '암호화폐',
}

function calcTax(grossProfit: number, sellAmount: number, assetType: AssetType): number {
  const c = TRADING_COSTS[assetType]
  if (assetType === 'domesticStock') return sellAmount * c.taxRate
  return grossProfit > c.taxThreshold ? (grossProfit - c.taxThreshold) * c.taxRate : 0
}

export interface BuyCalcInput {
  totalCapital: number
  currentPrice: number
  assetType: AssetType
  recommendedAmount: number
  stopLossPercent: number
  takeProfitLevels: number[]
}

export interface ScenarioRow {
  label: string
  priceChangePct: number
  grossProfit: number
  fee: number
  tax: number
  netProfit: number
  netReturnPct: number
}

export interface BuyCalcResult {
  investAmount: number
  shares: number
  buyFee: number
  totalCost: number
  stopLossPrice: number
  takeProfitPrices: number[]
  breakEvenReturn: number
  scenarios: ScenarioRow[]
  expectedValue: number
}

export function calcBuyAction(input: BuyCalcInput, winRate: number): BuyCalcResult {
  const c   = TRADING_COSTS[input.assetType]
  const amt = Math.min(Math.max(input.recommendedAmount, 0), input.totalCapital)
  if (amt === 0 || input.currentPrice === 0) {
    return {
      investAmount:0, shares:0, buyFee:0, totalCost:0,
      stopLossPrice:0, takeProfitPrices:[], breakEvenReturn:0,
      scenarios:[], expectedValue:0,
    }
  }

  const shares    = amt / input.currentPrice
  const buyFee    = amt * c.buyFee
  const totalCost = amt + buyFee
  const stopPrice = input.currentPrice * (1 - input.stopLossPercent / 100)
  const tpPrices  = input.takeProfitLevels.map(tp => input.currentPrice * (1 + tp/100))
  const breakEven = (c.buyFee + c.sellFee + c.slippage*2) * 100

  const changePcts = [
    -input.stopLossPercent,
    -input.stopLossPercent/2,
    0,
    ...input.takeProfitLevels,
    input.takeProfitLevels[input.takeProfitLevels.length-1] * 1.5,
  ]
  const labels = [
    `최악 (-${input.stopLossPercent}%, 손절)`,
    `반손절 (-${(input.stopLossPercent/2).toFixed(1)}%)`,
    '본전 (0%)',
    ...input.takeProfitLevels.map(tp => `목표 (+${tp}%)`),
    '최고 시나리오',
  ]

  const scenarios: ScenarioRow[] = changePcts.map((chg, i) => {
    const sellAmt    = shares * input.currentPrice * (1 + chg/100)
    const grossP     = sellAmt - amt
    const sellFee    = sellAmt * c.sellFee
    const slip       = amt * c.slippage
    const tax        = calcTax(grossP, sellAmt, input.assetType)
    const netProfit  = grossP - buyFee - sellFee - slip - tax
    return {
      label: labels[i], priceChangePct: chg,
      grossProfit: grossP, fee: buyFee+sellFee+slip, tax,
      netProfit, netReturnPct: netProfit/amt*100,
    }
  })

  const winsR  = scenarios.filter(s => s.netProfit>0).map(s=>s.netReturnPct/100)
  const lossR  = scenarios.filter(s => s.netProfit<0).map(s=>Math.abs(s.netReturnPct)/100)
  const avgW   = winsR.length  ? winsR.reduce((s,v)=>s+v,0)/winsR.length  : 0
  const avgL   = lossR.length  ? lossR.reduce((s,v)=>s+v,0)/lossR.length  : 0
  const ev     = winRate*avgW - (1-winRate)*avgL

  return { investAmount:amt, shares, buyFee, totalCost, stopLossPrice:stopPrice, takeProfitPrices:tpPrices, breakEvenReturn:breakEven, scenarios, expectedValue:ev }
}

export interface SellCalcInput {
  entryPrice: number
  currentPrice: number
  shares: number
  assetType: AssetType
  peakPrice: number
  stopLossPercent: number
}

export interface SellCalcResult {
  currentReturn: number
  currentProfit: number
  action: 'HOLD' | 'PARTIAL_SELL' | 'FULL_SELL'
  reasoning: string
  stopLossDistance: number
}

export function calcSellAction(input: SellCalcInput): SellCalcResult {
  const c        = TRADING_COSTS[input.assetType]
  const buyAmt   = input.shares * input.entryPrice
  const sellAmt  = input.shares * input.currentPrice
  const grossP   = sellAmt - buyAmt
  const fee      = buyAmt*c.buyFee + sellAmt*c.sellFee + buyAmt*c.slippage
  const tax      = calcTax(grossP, sellAmt, input.assetType)
  const netProfit= grossP - fee - tax
  const ret      = (input.currentPrice - input.entryPrice) / input.entryPrice * 100
  const stopP    = input.entryPrice * (1 - input.stopLossPercent/100)
  const stopDist = (input.currentPrice - stopP) / input.currentPrice * 100
  const fromPeak = input.peakPrice>0 ? (input.peakPrice - input.currentPrice) / input.peakPrice * 100 : 0

  let action: SellCalcResult['action'] = 'HOLD'
  let reasoning = ''

  if (input.currentPrice <= stopP) {
    action='FULL_SELL'
    reasoning=`손절가 ${stopP.toLocaleString()} 도달 — 즉시 전량 매도`
  } else if (fromPeak >= input.stopLossPercent * 0.8) {
    action='PARTIAL_SELL'
    reasoning=`고점 대비 -${fromPeak.toFixed(1)}% — 50% 분할 매도 고려`
  } else if (ret >= input.stopLossPercent * 3) {
    action='PARTIAL_SELL'
    reasoning=`+${ret.toFixed(1)}% 수익 중 — 일부 이익 실현 고려`
  } else {
    reasoning=`손절가까지 -${stopDist.toFixed(1)}% 여유. 보유 유지`
  }

  return { currentReturn:ret, currentProfit:netProfit, action, reasoning, stopLossDistance:stopDist }
}
