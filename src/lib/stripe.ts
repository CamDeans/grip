import Stripe from 'stripe'

/** Pin to Stripe API version 2026-01-28.clover for consistent behavior. */
const STRIPE_API_VERSION = '2026-01-28.clover' as const

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION })
  : null

// Token economics: 1,030,051 tokens = $4.47 (Claude). Cost/token ≈ $4.34/1M. Tier allowances set so token cost ≤ 15% of revenue (85% margin).
export const TIERS = [
  { id: 'starter', name: 'Starter', priceCents: 1900, tokensPerMonth: 650_000, stripePriceId: process.env.STRIPE_PRICE_ID_STARTER },
  { id: 'pro', name: 'Pro', priceCents: 4900, tokensPerMonth: 1_700_000, stripePriceId: process.env.STRIPE_PRICE_ID_PRO },
  { id: 'team', name: 'Team', priceCents: 9900, tokensPerMonth: 3_400_000, stripePriceId: process.env.STRIPE_PRICE_ID_TEAM },
] as const

export type TierId = typeof TIERS[number]['id']

export function getTierByPriceId(priceId: string): (typeof TIERS)[number] | null {
  return TIERS.find((t) => t.stripePriceId === priceId) ?? null
}

export function getTokensPerMonthForTier(tierId: TierId): number {
  const t = TIERS.find((x) => x.id === tierId)
  return t?.tokensPerMonth ?? 0
}
