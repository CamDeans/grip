# G.R.I.P. Monetization — Paid Tiers & Token Allowances

No freemium; all paid tiers to cover real AI API usage.

## Tiers (Stripe)

| Tier     | Price   | Tokens/month | Use case              |
|----------|---------|--------------|------------------------|
| Starter  | $19/mo  | 650,000      | Light use, side projects |
| Pro     | $49/mo  | 1,700,000    | Serious builders, daily use |
| Team    | $99/mo  | 3,400,000    | Small teams, heavy usage |

- **Competitive**: Comparable to other AI dev tools; clear value per dollar.
- **Profitable**: Margins after AI API cost and 55% admin payout.
- **Feasible**: Users see predictable cost and enough tokens to ship.

## Token behavior

- **No rollover**: Unused tokens do not carry to the next billing period. Allowance resets each period; `tokensUsedThisPeriod` is reset to `0` on renewal (Stripe `invoice.paid` webhook).
- **Usage display**: Showing "X% of monthly tokens used" (or "X / Y tokens") in dashboard/settings is optional; wire to `tokensUsedThisPeriod` and `tokenAllowance` when you add it.
- **Per-token cost**: Intentionally not shown to users (simplifies pricing; input vs output and model mix make a single "per token" number misleading).

## Valued Testers (Admin-managed)

- Max **10** valued testers.
- **50 tokens/month** free per valued tester until removed.
- Stored in `valued_testers`; checked before requiring subscription.

## Revenue Split

- **55%** → Admin (payouts to you).
- **45%** → App (tokens, infrastructure, future builds).

## Stripe Setup

1. Create products/prices in Stripe Dashboard for Starter, Pro, Team.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local`.
3. Set price IDs: `STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_TEAM`.
4. Webhook endpoint: `POST /api/stripe/webhook` (subscribe to `checkout.session.completed`, `customer.subscription.*`, `invoice.*`).
