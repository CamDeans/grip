import Stripe from 'stripe'

/** Pin to Stripe API version 2026-01-28.clover for consistent behavior. */
const STRIPE_API_VERSION = '2026-01-28.clover' as const

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION })
  : null

// Token economics: tier allowances per paid plan (45/55 split). Based on actual cost ~$4.30/1M (6.04M tokens, $25.95): 2.3M / 6M / 12M.
export const TIERS = [
  { id: 'starter', name: 'Starter', priceCents: 1900, tokensPerMonth: 2_300_000, stripePriceId: process.env.STRIPE_PRICE_ID_STARTER },
  { id: 'pro', name: 'Pro', priceCents: 4900, tokensPerMonth: 6_000_000, stripePriceId: process.env.STRIPE_PRICE_ID_PRO },
  { id: 'team', name: 'Team', priceCents: 9900, tokensPerMonth: 12_000_000, stripePriceId: process.env.STRIPE_PRICE_ID_TEAM },
] as const

export type TierId = typeof TIERS[number]['id']

export function getTierByPriceId(priceId: string): (typeof TIERS)[number] | null {
  return TIERS.find((t) => t.stripePriceId === priceId) ?? null
}

export function getTokensPerMonthForTier(tierId: TierId): number {
  const t = TIERS.find((x) => x.id === tierId)
  return t?.tokensPerMonth ?? 0
}

/** One-time add-tokens packs (not subscription). Price IDs from env. */
export const TOKEN_ADD_ONS = [
  { id: '500k', name: '500K tokens', tokens: 500_000, stripePriceId: process.env.STRIPE_PRICE_ID_ADD_TOKENS_500K },
  { id: '1M', name: '1M tokens', tokens: 1_000_000, stripePriceId: process.env.STRIPE_PRICE_ID_ADD_TOKENS_1M },
] as const

export type TokenAddOnId = typeof TOKEN_ADD_ONS[number]['id']

export function getAddOnByPriceId(priceId: string): (typeof TOKEN_ADD_ONS)[number] | null {
  return TOKEN_ADD_ONS.find((a) => a.stripePriceId === priceId) ?? null
}
