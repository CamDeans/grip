# Revenue Split & Token Allowances — Year-One SaaS Best Practice

This doc covers **typical revenue-split ranges** for early-stage SaaS (especially pre-revenue / no real users), a **recommended year-one approach** for what you take vs. what stays in the app, and **revised token math** so you don’t undersell usage or undersell your own take while keeping enough in the pot for updates, DB, and scaling.

---

## 1. Normal percentages: how other businesses do it

### Early-stage / pre-revenue SaaS

- **No “split” yet:** Most early SaaS doesn’t have a formal revenue share; the company keeps 100%, and the founder takes a salary/draw or nothing until there’s revenue. So “split” here is really **how you design** founder take vs. company reserve *before* you have users.
- **Founder vs. company reserve:** Once you do have revenue, common patterns:
  - **50% founder / 50% company** — Very common for “I built it, half is mine, half stays in the company for costs and growth.”
  - **60% founder / 40% company** — Founder-favorable; works if costs (API, infra) are low relative to revenue.
  - **40–45% founder / 55–60% company** — Company-favorable; more room for generous token allowances, infra, and buffer. Better when you want to “undersell yourself” slightly so the product has room to scale.
- **Your current setup:** 55% admin (you) / 45% app is **already founder-favorable**. Many early-stage products use 50/50 or even 45/55 (founder/app) in year one so the app has a clear buffer for API costs and scaling.

### Rule of thumb for “app” side

The **app share** should cover, in order:

1. **API (token) cost** at target utilization (e.g. 50–60% of allowance used).
2. **Infra:** hosting, DB, Stripe, email, etc. (often 5–15% of revenue early on).
3. **Buffer for growth:** 10–20% of revenue so you can add features, scale DB, support more users.

So if API cost at target usage is ~30% of revenue and infra + buffer is ~15%, the app needs **at least ~45%** of revenue. That implies **founder take ≤ 55%** if you want the app to break even or stay profitable. If you want *more* token headroom (generous allowances) or higher buffer, **app share should be 50% or higher** → **founder 50% or less** in year one.

---

## 2. Recommended year-one stance (best case for you + product)

**Best case for you in year one** = you take a fair share while (a) token allowances feel generous so you don’t undersell the app, and (b) the app keeps enough to cover costs and scaling.

Suggested:

| Approach | Founder (admin) | App | When it fits |
|----------|------------------|-----|----------------|
| **A. Balanced** | 50% | 50% | Default: fair to you, enough for tokens + infra + buffer. |
| **B. Product-first (year one)** | 45% | 55% | Maximize token headroom and “money in the pot”; you still take meaningful income. |
| **C. Founder-first** | 55% | 45% | Your current; works if utilization stays modest (e.g. &lt; 50%) and you’re okay with thinner app margin. |

**Recommendation:** Use **50/50** or **45/55 (founder/app)** for year one so that:

- App share is enough to afford **generous** token allowances at 50–60% utilization.
- You still take 45–50% of every dollar.
- There’s room for infra and a small buffer without cutting your take to zero.

Once you have real usage data (e.g. average % of allowance used, blended $/1M), you can re-run the math and optionally move to 55/45 if margins allow.

---

## 3. Revised math: 50/50 and 45/55 (founder / app)

API cost = **$9 per 1M tokens** (Sonnet 4 blended). Target utilization = **50%** of allowance (typical for “healthy” usage without everyone maxing out).

### 3a. 50/50 split (founder 50%, app 50%)

App share per tier: Starter $9.50, Pro $24.50, Team $49.50.

**At 50% utilization, max tokens that keep API cost ≤ app share:**

- Break-even: `App share = (Tokens/1M) × 0.5 × $9` → `Tokens = (App share / $4.50) × 1M`.
- Starter: $9.50 / $4.50 ≈ 2.11M tokens at 50% use → **allowance up to ~4.2M** (we cap at 2.1M used).
- Pro: $24.50 / $4.50 ≈ 5.44M → **allowance up to ~10.9M**.
- Team: $49.50 / $4.50 ≈ 11M → **allowance up to ~22M**.

So at **50/50** and **50% utilization**, you can afford **much higher** allowances than 1.5M / 3M / 6.5M and still have app share cover API cost. The numbers below use **conservative** allowances that leave room for infra and buffer (so we don’t set allowances at the max).

**Conservative token allowances (50/50, 50% utilization, ~20% of app share for infra + buffer):**

- Use ~80% of app share for tokens → effective token budget = App share × 0.80.
- Starter: $9.50 × 0.80 = $7.60 for API → $7.60 / $4.50 ≈ 1.69M tokens *used* → **allowance ~3.4M**.
- Pro: $24.50 × 0.80 = $19.60 → $19.60 / $4.50 ≈ 4.36M used → **allowance ~8.7M**.
- Team: $49.50 × 0.80 = $39.60 → $39.60 / $4.50 ≈ 8.8M used → **allowance ~17.6M**.

So with **50/50** you can safely offer roughly **3–4M / 8–9M / 17–18M** (Starter / Pro / Team) and stay profitable at 50% utilization with room for infra and buffer.

### 3b. 45/55 split (founder 45%, app 55%)

App share: Starter $10.45, Pro $26.95, Team $54.45.

Same logic (50% utilization, 80% of app share for tokens):

- Starter: $10.45 × 0.80 = $8.36 → $8.36 / $4.50 ≈ 1.86M used → **allowance ~3.7M**.
- Pro: $26.95 × 0.80 = $21.56 → $21.56 / $4.50 ≈ 4.79M used → **allowance ~9.6M**.
- Team: $54.45 × 0.80 = $43.56 → $43.56 / $4.50 ≈ 9.68M used → **allowance ~19.4M**.

So **45/55** gives the app *more* room: you can offer **~3.5–4M / ~9–10M / ~19–20M** (Starter / Pro / Team) and still have buffer.

### 3c. Your current 55/45 (founder 55%, app 45%) at 50% utilization

App share: Starter $8.55, Pro $22.05, Team $44.55.  
80% for tokens: Starter $6.84, Pro $17.64, Team $35.64.

- Starter: $6.84 / $4.50 ≈ 1.52M used → **allowance ~3.0M**.
- Pro: $17.64 / $4.50 ≈ 3.92M used → **allowance ~7.8M**.
- Team: $35.64 / $4.50 ≈ 7.92M used → **allowance ~15.8M**.

So even at **55/45**, with 50% utilization and 20% buffer, you can afford **~3M / ~8M / ~16M** — still well above your current 1.5M / 3M / 6.5M.

---

## 4. Suggested token allowances (don’t undersell, keep you paid, room to scale)

Target: **generous to users**, **sustainable** at 50% utilization, **buffer for infra and scaling**.

### Option 1 — Keep current split 55/45, raise tokens (conservative)

| Tier   | Price | Tokens/month (suggested) | App share (45%) | At 50% use, API cost | Net to app (after API) |
|--------|-------|---------------------------|-----------------|----------------------|-------------------------|
| Starter| $19   | **3,000,000**             | $8.55           | $13.50               | -$4.95 (loss at 100%)   |
| Pro    | $49   | **6,000,000**             | $22.05          | $27.00               | -$4.95 (loss at 100%)   |
| Team   | $99   | **12,000,000**            | $44.55          | $54.00               | -$9.45 (loss at 100%)   |

At **50% utilization**: API cost = half of above → Starter $6.75, Pro $13.50, Team $27.00. Then Starter and Pro are **profitable** ($8.55 − $6.75, $22.05 − $13.50); Team is **profitable** ($44.55 − $27). So **3M / 6M / 12M** is sustainable at 55/45 and 50% use, with some buffer.

### Option 2 — Move to 50/50, generous tokens (recommended for year one)

| Tier   | Price | Tokens/month (suggested) | App share (50%) | At 50% use, API cost | Net to app (after API) |
|--------|-------|---------------------------|-----------------|----------------------|-------------------------|
| Starter| $19   | **3,500,000**             | $9.50           | $7.88                | **$1.62**               |
| Pro    | $49   | **7,000,000**             | $24.50          | $15.75               | **$8.75**               |
| Team   | $99   | **14,000,000**            | $49.50          | $31.50               | **$18.00**              |

At 50% use, every tier is profitable and the app keeps a clear buffer. You take 50% of revenue.

### Option 3 — 45/55 (founder 45%, app 55%), profitable at 100% use (implemented)

| Tier   | Price | Tokens/month (implemented) | App share (55%) | At 100% use, API cost | Net to app (after API) |
|--------|-------|-----------------------------|-----------------|------------------------|-------------------------|
| Starter| $19   | **1,150,000**               | $10.45          | $10.35                 | **+$0.10**              |
| Pro    | $49   | **2,950,000**               | $26.95          | $26.55                 | **+$0.40**              |
| Team   | $99   | **6,000,000**               | $54.45          | $54.00                 | **+$0.45**              |

You take 45%; the app stays **profitable even at 100% utilization** ($9/1M) — no losing scenario. At 50% use, margins are much higher.

---

## 5. Summary: what to use — **current implementation (45/55)**

| Goal | Split (founder / app) | Token allowances (Starter / Pro / Team) |
|------|------------------------|----------------------------------------|
| **Implemented** | **45 / 55** | **2.3M / 6M / 12M** — based on actual cost ~$4.30/1M; profitable at 100% use. |

**Current setup:** 45% admin / 55% app. Token allowances **1,150,000 / 2,950,000 / 6,000,000** (Starter / Pro / Team). At **100% utilization** and $9/1M, all three tiers are profitable (see table above). At 50% use, margins are higher.

- **Payout logic:** Admin payouts use 45% of revenue; app retains 55%.
- **Token allowances:** Defined in `src/lib/stripe.ts`; reflected in MONETIZATION_TIERS and TOKEN_COST_ANALYSIS.

---

## 6. Quick reference formulas

- **App share** = Revenue × (1 − founder_pct). (e.g. 50% founder → app share = Revenue × 0.50.)
- **At target utilization U (e.g. 0.50):**  
  `Tokens_allowed = (App_share × buffer_pct) / ( (Tokens_used_per_1M) × $/1M × U )`  
  with `Tokens_used_per_1M = Allowance / 1M`, so  
  `Allowance = (App_share × buffer_pct) / ($/1M × U)`.
- **Break-even at 100% use:**  
  `Allowance_breakeven = App_share / ($/1M)`.

Use **buffer_pct** (e.g. 0.80) so 20% of app share is for infra and buffer, not just API.
