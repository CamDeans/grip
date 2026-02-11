import Stripe from 'stripe'

/** Pin to Stripe API version 2026-01-28.clover for consistent behavior. */
const STRIPE_API_VERSION = '2026-01-28.clover' as const

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION })
  : null

export const TIERS = [
  { id: 'starter', name: 'Starter', priceCents: 1900, tokensPerMonth: 50_000, stripePriceId: process.env.STRIPE_PRICE_ID_STARTER },
  { id: 'pro', name: 'Pro', priceCents: 4900, tokensPerMonth: 200_000, stripePriceId: process.env.STRIPE_PRICE_ID_PRO },
  { id: 'team', name: 'Team', priceCents: 9900, tokensPerMonth: 500_000, stripePriceId: process.env.STRIPE_PRICE_ID_TEAM },
] as const

export type TierId = typeof TIERS[number]['id']

export function getTierByPriceId(priceId: string): (typeof TIERS)[number] | null {
  return TIERS.find((t) => t.stripePriceId === priceId) ?? null
}

export function getTokensPerMonthForTier(tierId: TierId): number {
  const t = TIERS.find((x) => x.id === tierId)
  return t?.tokensPerMonth ?? 0
}
