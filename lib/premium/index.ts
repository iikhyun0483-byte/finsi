// lib/premium/index.ts
// TIER2 유료 기능 플러그인
// 현재 미구현 — 서버 비용 확보 후 순차 구현 예정

export const PREMIUM_FEATURES = {
  lstm: false,
  rl: false,
  transformer: false,
  quantumMC: false,
} as const

export type PremiumFeature = keyof typeof PREMIUM_FEATURES
