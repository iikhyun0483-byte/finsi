// lib/tax-optimizer.ts
// 세금 최적화 타이밍 계산
import { TRADING_COSTS, type AssetType } from './trade-calculator'

export interface TaxOptResult {
  currentTax:      number
  deferredTax:     number
  savings:         number
  recommendation:  'REALIZE_NOW' | 'DEFER' | 'HARVEST_LOSS'
  reasoning:       string
  optimalSellDate: string | null
}

// 세금 공제 기준액 (2024년 기준)
const TAX_THRESHOLD = 2_500_000  // 250만원

export function calcTaxOptimization(input: {
  entryPrice:    number
  currentPrice:  number
  shares:        number
  assetType:     AssetType
  holdingDays:   number
  otherGains:    number    // 올해 다른 수익 (250만 초과 여부 계산)
  otherLosses:   number    // 올해 다른 손실
}): TaxOptResult {
  const { entryPrice, currentPrice, shares, assetType, holdingDays, otherGains, otherLosses } = input

  const grossProfit = (currentPrice - entryPrice) * shares
  const netOtherGains = otherGains - otherLosses

  // 중앙화된 세율 사용
  const taxRate = TRADING_COSTS[assetType].taxRate

  // 지금 팔 경우 세금
  const taxableNow = Math.max(0, grossProfit + netOtherGains - TAX_THRESHOLD)
  const currentTax = taxableNow * taxRate

  // 내년으로 이월 시 세금
  const taxableDeferred = Math.max(0, grossProfit - TAX_THRESHOLD)
  const deferredTax = taxableDeferred * taxRate

  const savings = currentTax - deferredTax

  let recommendation: TaxOptResult['recommendation'] = 'REALIZE_NOW'
  let reasoning = ''

  if (grossProfit < 0) {
    recommendation = 'HARVEST_LOSS'
    reasoning = `손실 ${Math.abs(grossProfit).toLocaleString()}원 — 올해 다른 수익과 상계하면 세금 절감 가능`
  } else if (savings > 100_000 && holdingDays < 365) {
    recommendation = 'DEFER'
    reasoning = `연말까지 보유 시 세금 ${savings.toLocaleString()}원 절감 가능`
  } else {
    reasoning = `현재 매도가 세금 측면에서 최적`
  }

  // 내년 1월 2일이 최적 매도일 (이월 시)
  const nextYearDate = `${new Date().getFullYear() + 1}-01-02`

  return {
    currentTax,
    deferredTax,
    savings,
    recommendation,
    reasoning,
    optimalSellDate: recommendation === 'DEFER' ? nextYearDate : null,
  }
}
