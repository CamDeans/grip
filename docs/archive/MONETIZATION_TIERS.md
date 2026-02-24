# G.R.I.P. Monetization — Paid Tiers & Token Allowances

No freemium; all paid tiers to cover real AI API usage.

## Tiers (Stripe)

| Tier     | Price   | Tokens/month | Use case              |
|----------|---------|--------------|------------------------|
| Starter  | $19/mo  | 2,300,000    | Light use, side projects |
| Pro     | $49/mo  | 6,000,000    | Serious builders, daily use |
| Team    | $99/mo  | 12,000,000   | Small teams, heavy usage |

- **Competitive**: Comparable to other AI dev tools; clear value per dollar.
- **Profitable**: Based on your actual cost (~$4.30/1M). At 100% use, API cost stays below app share (55%) on every tier. 45% admin payout; 55% to app for tokens + infra.
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

- **45%** → Admin (payouts to you).
- **55%** → App (tokens, infrastructure, future builds).

## Stripe Setup

1. Create products/prices in Stripe Dashboard for Starter, Pro, Team (subscription prices).
2. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local`.
3. Set subscription price IDs: `STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_TEAM`.
4. **Add-tokens (one-time):** Create two one-time products (e.g. "500K tokens", "1M tokens") and set `STRIPE_PRICE_ID_ADD_TOKENS_500K`, `STRIPE_PRICE_ID_ADD_TOKENS_1M`. The webhook adds the purchased tokens to the user's `tokenAllowance` for the current period when `checkout.session.completed` has `mode: 'payment'` and `metadata.type: 'add_tokens'`.
5. Webhook endpoint: `POST /api/stripe/webhook` (subscribe to `checkout.session.completed`, `customer.subscription.*`, `invoice.*`).

## Out of tokens

- When a user exhausts their token allowance (or is below the safe minimum), token-consuming routes return **403** with `code: 'TOKENS_EXHAUSTED'`, `tier`, and `upgradeSuggestions` (e.g. "Upgrade to Pro", "Upgrade to Team", "Add more tokens").
- The enhanced-chat (and legal-sandbox chat) client redirects to **`/plans?out=1`** so the user can upgrade or buy an add-tokens pack. The plans page shows an "You're out of tokens" banner and the **Add more tokens** section (500K / 1M one-time) when `?out=1`.
- Subscribed users with `?out=1` are not redirected to dashboard so they can complete upgrade or add-tokens checkout.
