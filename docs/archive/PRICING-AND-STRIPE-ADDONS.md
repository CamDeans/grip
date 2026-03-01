# GRIP Pricing Model — Business-First, Deployment-Ready

GRIP is run as a **business first**: users and product sustainability come first; admin/operator share is taken on an ongoing basis after GRIP is covered.

**Source of truth for rules:** `docs/CONCRETE-RULES-AND-ALIGNMENT.md` (section "Pricing and Stripe (business-first, concrete)").

---

## Revenue model (business-first)

| Share | Percentage | Purpose |
|-------|------------|--------|
| **GRIP** | **75%** | Product: tokens, infra, margin, runway. Users first; deployment-ready. |
| **Admin** | **25%** | Operator take on an ongoing basis. |

- **Token cost cap:** At 100% token use, API cost is kept to **≤ 50% of revenue** so GRIP always has non-token margin (infra, buffer, growth).
- **Formula:** `token_cost ≤ price × 0.50` → max tokens = `(price × 0.50) / cost_per_1M`.
- **Source of truth:** `src/lib/stripe.ts` — `REVENUE_TO_GRIP_PCT`, `REVENUE_TO_ADMIN_PCT`, `MAX_TOKEN_COST_PCT`.

---

## Cost reference

- **Usage:** 2,185,820 tokens | **Cost:** $15.24  
- **Blended cost per 1M:** ≈ **$6.97** (use for planning; re-run when model mix or API prices change).

---

## Tiers (business-ready at $6.97/1M)

Token amounts are set so that at **100% use**, token cost stays **under 50% of price**. Prices unchanged; Stripe Price IDs unchanged.

| Tier   | Price | Tokens/month | 50% of price | Token cost (100% use) | GRIP (75%) | Admin (25%) |
|--------|-------|----------------|--------------|------------------------|------------|-------------|
| Starter | $19/mo | **1,300,000** | $9.50 | $9.06 | $14.25 | $4.75 |
| Pro    | $49/mo | **3,500,000** | $24.50 | $24.40 | $36.75 | $12.25 |
| Team   | $99/mo | **7,000,000** | $49.50 | $48.79 | $74.25 | $24.75 |

- **Source of truth:** `src/lib/stripe.ts` — `TIERS`.

---

## Token add-ons (one-time)

| Add-on id | Name        | Tokens   | Env var |
|-----------|-------------|----------|---------|
| 500k      | 500K tokens | 500,000  | `STRIPE_PRICE_ID_ADD_TOKENS_500K` |
| 1M        | 1M tokens   | 1,000,000 | `STRIPE_PRICE_ID_ADD_TOKENS_1M` |

**Pricing (business-ready at $6.97/1M):** Token cost ≤ 50% of sale price → price ≥ cost / 0.50.

- **500K:** cost $3.49 → sell at **$6.99** or **$7.99**.
- **1M:** cost $6.97 → sell at **$13.99** or **$14.99**.

---

## What to add in Stripe for token add-ons

1. **Products:** Two one-time products, e.g. "500K tokens" and "1M tokens".
2. **Prices:** One **one-time** price per product (e.g. $6.99 and $13.99); copy each **Price ID**.
3. **Env vars:**  
   `STRIPE_PRICE_ID_ADD_TOKENS_500K` = 500K price ID  
   `STRIPE_PRICE_ID_ADD_TOKENS_1M` = 1M price ID  
4. **Webhook:** No change. App handles `checkout.session.completed` with `metadata.type === 'add_tokens'` and adds `metadata.tokens` to `user.tokenAllowance`.

---

## Summary

- **Revenue split:** 75% GRIP, 25% admin. GRIP first; admin share on an ongoing basis.
- **Token cap:** Token cost ≤ 50% of revenue at 100% use so GRIP stays deployment-ready.
- **Tiers:** 1.3M / 3.5M / 7M at $19 / $49 / $99; math holds at ~$6.97/1M.
- **Add-ons:** Two one-time Stripe products/prices (500K, 1M); set the two env vars.
