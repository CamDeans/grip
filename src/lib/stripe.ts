import Stripe from 'stripe'

/** Pin to Stripe API version 2026-01-28.clover for consistent behavior. */
const STRIPE_API_VERSION = '2026-01-28.clover' as const

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION })
  : null

/**
 * Business-first revenue model (GRIP as the product; deployment-ready).
 * - GRIP share (REVENUE_TO_GRIP_PCT): product sustainability — tokens, infra, margin, runway. Users first.
 * - Admin share (REVENUE_TO_ADMIN_PCT): operator take on an ongoing basis, after GRIP is covered.
 * - Token cost at 100% use is kept ≤ MAX_TOKEN_COST_PCT of revenue so GRIP always has margin.
 */
export const REVENUE_TO_GRIP_PCT = 0.75
export const REVENUE_TO_ADMIN_PCT = 0.25
export const MAX_TOKEN_COST_PCT = 0.5

/** Tier allowances: sized so at ~$6.97/1M blended cost, token cost ≤ 50% of price (business-ready at 100% use). */
export const TIERS = [
  { id: 'starter', name: 'Starter', priceCents: 1900, tokensPerMonth: 1_300_000, stripePriceId: process.env.STRIPE_PRICE_ID_STARTER },
  { id: 'pro', name: 'Pro', priceCents: 4900, tokensPerMonth: 3_500_000, stripePriceId: process.env.STRIPE_PRICE_ID_PRO },
  { id: 'team', name: 'Team', priceCents: 9900, tokensPerMonth: 7_000_000, stripePriceId: process.env.STRIPE_PRICE_ID_TEAM },
] as const

export type TierId = typeof TIERS[number]['id']

export function getTierByPriceId(priceId: string): (typeof TIERS)[number] | null {
  return TIERS.find((t) => t.stripePriceId === priceId) ?? null
}

export function getTokensPerMonthForTier(tierId: TierId): number {
  const t = TIERS.find((x) => x.id === tierId)
  return t?.tokensPerMonth ?? 0
}

/** One-time add-tokens packs (not subscription). Price IDs from env; displayPriceCents for landing/plans (must match Stripe). */
export const TOKEN_ADD_ONS = [
  { id: '500k', name: '500K tokens', tokens: 500_000, displayPriceCents: 699, stripePriceId: process.env.STRIPE_PRICE_ID_ADD_TOKENS_500K },
  { id: '1M', name: '1M tokens', tokens: 1_000_000, displayPriceCents: 1399, stripePriceId: process.env.STRIPE_PRICE_ID_ADD_TOKENS_1M },
] as const

export type TokenAddOnId = typeof TOKEN_ADD_ONS[number]['id']

export function getAddOnByPriceId(priceId: string): (typeof TOKEN_ADD_ONS)[number] | null {
  return TOKEN_ADD_ONS.find((a) => a.stripePriceId === priceId) ?? null
}
