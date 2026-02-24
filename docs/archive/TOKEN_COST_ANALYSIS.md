# GRIP Token Cost Analysis & Profitability Review

## Actual usage from platform log (matches dashboard)

Cost and usage below are taken from the Claude platform usage/cost views so our numbers match the log.

### Daily cost by model (platform log)

| Date   | Claude Sonnet 4 | Claude Opus 4.1 | Claude Haiku 3.5 | Day total   |
|--------|------------------|-----------------|------------------|-------------|
| Feb 12 | $15.41           | $0.05           | $0.00            | **$15.46**  |
| Feb 13 | $10.27           | $0.02           | $0.00            | **$10.29**  |
| Feb 14 | $0.08            | —               | $0.00            | **$0.08**   |
| **Total** | **$25.76**    | **$0.07**       | **$0.00**        | **~$25.83** |

Almost all cost is **Claude Sonnet 4**; small amount from **Opus 4.1**; Haiku 3.5 rounds to $0.00 in this window.

### Token usage from platform log (same window)

From the platform token usage log (tokens in + tokens out, app “grip”):

| Metric        | Value      |
|---------------|------------|
| **Tokens in** | 5,819,177  |
| **Tokens out**| 554,648    |
| **Total tokens** | **6,373,825** |

### Model pricing (list, from platform)

USD per million tokens (MTok). Used to interpret the log; actual billed cost is in the daily table above.

| Model              | Base input | Output  | 5m cache write | 1h cache write | Cache hits |
|--------------------|------------|---------|----------------|----------------|------------|
| Claude Sonnet 4    | $3 / MTok  | $15 / MTok | $3.75       | $6             | $0.30      |
| Claude Sonnet 4.5 | $3 / MTok  | $15 / MTok | $3.75       | $6             | $0.30      |
| Claude Opus 4.1    | $15 / MTok | $75 / MTok | $18.75     | $30            | $1.50      |
| Claude Opus 4.5/4.6| $5 / MTok  | $25 / MTok | $6.25     | $10            | $0.50      |
| Claude Haiku 3.5   | $0.80 / MTok | $4 / MTok | $1         | $1.60          | $0.08      |
| Claude Haiku 4.5   | $1 / MTok  | $5 / MTok  | $1.25     | $2             | $0.10      |

---

## Your actual token usage → effective cost

| Metric | Value (GRIP app) | Value (platform log) |
|--------|-------------------|------------------------|
| **Tokens used** | 6,039,938 | 6,373,825 |
| **Cost** | $25.95 | ~$25.83 (Feb 12–14 sum) |
| **Effective $/1M tokens** | **$4.30** | **~$4.05** |

- **GRIP:** $25.95 ÷ (6,039,938 ÷ 1,000,000) ≈ **$4.30 per 1M** (what we use for tier math).
- **Platform log:** ~$25.83 ÷ (6,373,825 ÷ 1,000,000) ≈ **$4.05 per 1M**.

Tier allowances are set using **$4.30/1M** so we stay profitable; if you prefer to plan on the platform total, **$4.05/1M** gives slightly more margin.

---

## Profitability at a glance

- **45/55 split:** 45% to you (admin), 55% to app (tokens + infra).
- **Token allowances:** **2.3M / 6M / 12M** (Starter / Pro / Team) — sized for **your actual cost (~$4.30/1M)** so API cost stays below the app's 55% share at 100% use, with buffer.
- **Result:** Profitable at your current cost; at 50% utilization margins are strong. If blended cost rises toward $5–6/1M, re-run the math (see formulas below).

---

## Current Tier Structure (45/55 split — based on actual $4.30/1M)

| Tier     | Price   | Tokens/month | Price per 1K tokens | Use case              |
|----------|---------|--------------|---------------------|------------------------|
| Starter  | $19/mo  | 2,300,000    | ~$0.0083            | Light use, side projects |
| Pro      | $49/mo  | 6,000,000    | ~$0.0082            | Serious builders, daily use |
| Team     | $99/mo  | 12,000,000   | ~$0.0083            | Small teams, heavy usage |

**Source:** Defined in `src/lib/stripe.ts` and documented in `docs/MONETIZATION_TIERS.md`

---

## Revenue-to-token math (45% admin / 55% app)

**Assumptions:** Revenue split 45% admin / 55% app. API cost = **$4.30 per 1M tokens** (from your actual usage: 6,039,938 tokens, $25.95).

### 1. Revenue and price-per-token

| Plan   | Price | Tokens/month | Revenue | Price per 1K tokens | Admin (45%) | App (55%) |
|--------|-------|--------------|---------|---------------------|-------------|-----------|
| Starter| $19   | 2,300,000    | $19     | $0.0083             | $8.55       | $10.45    |
| Pro    | $49   | 6,000,000    | $49     | $0.0082             | $22.05      | $26.95    |
| Team   | $99   | 12,000,000   | $99     | $0.0083             | $44.55      | $54.45    |

### 2. API cost at 100% allowance used ($4.30/1M) — all profitable

| Plan   | Tokens/month | API cost (100% use) | App share | Net profit (100% use) |
|--------|----------------|---------------------|-----------|------------------------|
| Starter| 2,300,000      | $9.89               | $10.45    | **+$0.56**            |
| Pro    | 6,000,000      | $25.80              | $26.95    | **+$1.15**            |
| Team   | 12,000,000     | $51.60              | $54.45    | **+$2.85**            |

At **100% token usage** at your current cost ($4.30/1M), every tier is profitable. If cost rises toward $5–6/1M, the app’s margins shrink; track cost and adjust if needed.

### 3. Break-even $/1M (for reference)

At current allowances, break-even $/1M = App share ÷ (tokens/1M). If your cost goes above this, that tier loses at 100% use.

| Plan   | App share | Tokens (millions) | Break-even $/1M tokens |
|--------|-----------|--------------------|--------------------------|
| Starter| $10.45    | 2.3                | **$4.54** /1M            |
| Pro    | $26.95    | 6                  | **$4.49** /1M            |
| Team   | $54.45    | 12                 | **$4.54** /1M            |

Your **$4.30/1M** is below break-even on every tier, so profitable at 100% use.

### 4. At 50% utilization (strong margins)

| Plan   | Tokens at 50% | API cost | App share | Net profit |
|--------|----------------|----------|-----------|------------|
| Starter| 1,150,000      | $4.95    | $10.45    | **+$5.50**  |
| Pro    | 3,000,000      | $12.90   | $26.95    | **+$14.05** |
| Team   | 6,000,000      | $25.80   | $54.45    | **+$28.65** |

At typical use (~50% of allowance), the app keeps a strong margin per subscription.

### 5. Add-tokens packs (one-time)

| Pack   | Tokens | (Set your price in Stripe) | App share (55%) | API cost at $4.30/1M | Net if 100% used |
|--------|--------|----------------------------|-----------------|----------------------|-------------------|
| 500K   | 500,000| e.g. $10                   | $5.50           | $2.15               | ~$3.35 at full use|
| 1M     | 1,000,000 | e.g. $18                 | $9.90           | $4.30               | ~$5.60 at full use|

Price add-on packs so that **price × 0.55 ≥ (tokens/1M) × your $/1M** to avoid loss at full use. At $4.30/1M both packs are well in profit.

---

## Claude API Costs (Official Anthropic Pricing)

**Source:** [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) (claude.com/pricing). All prices USD per **million tokens (MTok)**.

### Your actual usage: Claude Sonnet 4

Your dashboard shows **`claude-sonnet-4-20250514`** as the primary model in use (token usage chart, Feb 1–10). GRIP’s default chat/model config uses **Sonnet 4** for enhanced chat, sandbox, plan generation, and structure; some flows (e.g. AI chat route, analysis, generate-keywords) use **Opus 4.1**.

### Official pricing (current)

| Model           | Input      | Output     | Blended (50/50) |
|----------------|------------|------------|------------------|
| **Claude Sonnet 4** | $3 / MTok  | $15 / MTok | **$9 / MTok**    |
| Claude Sonnet 4.5 | $3 / MTok  | $15 / MTok | $9 / MTok        |
| Claude Opus 4.1   | $15 / MTok | $75 / MTok | $45 / MTok       |
| Claude Opus 4.5/4.6 | $5 / MTok | $25 / MTok | $15 / MTok       |
| Claude Haiku 4.5  | $1 / MTok  | $5 / MTok  | $3 / MTok        |

### Cost assumption for GRIP (Sonnet 4–heavy)

- **Primary (most traffic):** Sonnet 4 → **$9 per 1M tokens** (blended 50/50 input/output).
- **If Opus-heavy:** Opus 4.1 → $45/MTok; Opus 4.5/4.6 → $15/MTok.
- **Blended (e.g. 80% Sonnet, 20% Opus):** 0.8×9 + 0.2×45 ≈ **$16.20 per 1M tokens**.

**Recommendation:** Use **$9 per 1M tokens** as the main assumption since your usage is Sonnet 4; adjust if you increase Opus usage.

---

## Your Sonnet 4 usage (from dashboard / platform log)

**Feb 12–14 (platform log):** Cost by model and token totals are in **Actual usage from platform log** above. Sonnet 4 dominates (~$25.76 of ~$25.83); Opus 4.1 ~$0.07; total tokens 6,373,825 (platform) vs 6,039,938 (GRIP app).

For longer-term planning, use your actual monthly totals and cost from the Claude console; re-run effective $/1M and break-even when mix or volume changes.

---

## Cost Analysis Per Tier (45/55 split, 2.3M / 6M / 12M — actual cost $4.30/1M)

### Assumption: Your actual cost $4.30 per 1M tokens (6,039,938 tokens, $25.95)

| Tier     | Tokens/month | Cost/month | Revenue | Gross Profit | Margin |
|----------|--------------|------------|---------|--------------|--------|
| Starter  | 2,300,000     | ~$9.89     | $19     | ~$9.11       | —      |
| Pro      | 6,000,000     | ~$25.80    | $49     | ~$23.20      | —      |
| Team     | 12,000,000    | ~$51.60    | $99     | ~$47.40      | —      |

### After 45% Admin Payout (55% to app)

| Tier     | Revenue | Admin (45%) | App (55%) | API Cost (100% use) | Net Profit (100% use) |
|----------|---------|-------------|-----------|---------------------|------------------------|
| Starter  | $19     | $8.55       | $10.45    | ~$9.89              | **~+$0.56**            |
| Pro      | $49     | $22.05      | $26.95    | ~$25.80             | **~+$1.15**            |
| Team     | $99     | $44.55      | $54.45    | ~$51.60             | **~+$2.85**            |

At **100% use** at your current cost ($4.30/1M), every tier is profitable. At 50% use, margins are higher (see Revenue-to-token math §4).

---

## Risk Scenarios (45/55 split, 2.3M / 6M / 12M)

### Worst case: 100% allowance used at your cost ($4.30/1M) — still profitable

| Tier     | Tokens/month | Cost     | App share (55%) | Net Profit  |
|----------|--------------|----------|------------------|-------------|
| Starter  | 2,300,000    | ~$9.89   | $10.45           | **~+$0.56**  |
| Pro      | 6,000,000    | ~$25.80  | $26.95           | **~+$1.15**  |
| Team     | 12,000,000   | ~$51.60  | $54.45           | **~+$2.85**  |

At 100% usage at **your actual $4.30/1M**, all tiers remain profitable. Break-even $/1M: Starter **$4.54**/1M, Pro **$4.49**/1M, Team **$4.54**/1M — your cost is below that.

### If cost rises (e.g. more Opus) or list $9/1M

If blended cost moved toward $9/1M, at 100% use: Starter would cost ~$20.70 (loss), Pro ~$54 (loss), Team ~$108 (loss). Current allowances are sized for **your actual ~$4.30/1M**; if cost rises, re-run the math or trim allowances.

### Critical threshold (2.3M / 6M / 12M at your cost $4.30/1M)

- **Break-even $/1M (100% use):** Starter **$4.54**/1M, Pro **$4.49**/1M, Team **$4.54**/1M.
- **Your $4.30/1M** is below break-even on every tier → profitable at 100% use.

---

## What “well above break-even” looks like (for your knowledge base)

**Break-even** = the point where **App share of revenue (55%) = API cost**. Above that, every dollar is net profit (to the app); below that, you lose money on that subscription.

### Definition

- **Revenue** = subscription price (e.g. $19).
- **App share** = 55% of revenue = what’s left after 45% admin payout (e.g. $19 × 0.55 = $10.45).
- **Break-even API cost** = App share. If API cost = $10.45 for a Starter user, profit = $0.
- **Well above break-even** = API cost is **much lower** than App share, so **net profit is a large share of App share**.

### In numbers (45/55 split, 2.3M / 6M / 12M; your cost $4.30/1M, profitable at 100% use)

At **100% utilization** at your cost ($4.30/1M): all three tiers are profitable (Starter +$0.56, Pro +$1.15, Team +$2.85 to app). At 50% use, margins are higher. Track utilization and blended $/1M; if cost rises toward $5–6/1M, re-run break-even.

### Formula for future reviews

1. **Break-even API cost per tier (total $)**  
   `Break-even cost = Revenue × 0.55`  
   (Starter: $10.45, Pro: $26.95, Team: $54.45)

2. **Break-even $/1M tokens (max before loss at 100% use)**  
   `Break-even $/1M = (Revenue × 0.55) ÷ (Tokens per tier / 1,000,000)`  
   (Starter: $4.54/1M, Pro: $4.49/1M, Team: $4.54/1M at current allowances)

3. **Actual API cost per tier (at 100% usage)**  
   `Cost = (Tokens per tier / 1,000,000) × $ per 1M tokens`  
   Example: Starter 2.3M tokens @ $4.30/1M → $9.89.

4. **Net profit**  
   `Net profit = App share − API cost = Revenue × 0.55 − Cost`

5. **“Well above” in %**  
   `Profit as % of App share = (Net profit / App share) × 100`  
   Aim to keep this **> 0** (profitable); **> 20%** is a healthy buffer.

### When you’re no longer “well above”

- **API cost &gt; 50% of App share** → only half of App share is profit; reprice or rebalance tokens.
- **API cost ≥ App share** → at or below break-even; must reprice or cut costs.

---

## Future reviews: usage & pricing (repeatable process)

Use this whenever you review usage and pricing (e.g. monthly or quarterly).

### 1. Pull the numbers

| What to pull | Where |
|--------------|--------|
| Total tokens used (by model) | Anthropic Console → Usage |
| Revenue per tier | Stripe Dashboard (or your `revenue_events` / billing DB) |
| Tokens used per user/tier | Your app (e.g. `tokensUsedThisPeriod` per user, aggregated by tier) |
| Current tier token allowances | `src/lib/stripe.ts` and `docs/MONETIZATION_TIERS.md` |
| Current Anthropic $/MTok | [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) |

### 2. Compute for the period

1. **Blended $ per 1M tokens**  
   From Anthropic: total spend and total tokens by model.  
   `Blended $/1M = Total spend / (Total tokens / 1,000,000)`  
   Optionally do it per model (Sonnet vs Opus) and weight by usage.

2. **Cost per tier (at 100% allowance)**  
   `Cost = (Tier tokens / 1,000,000) × Blended $/1M`  
   Compare to **break-even cost** = Revenue × 0.55 for that tier.

3. **Net profit per tier (at 100% usage)**  
   `Net profit = Revenue × 0.55 − Cost`

4. **Profit as % of App share**  
   `(Net profit / (Revenue × 0.55)) × 100`  
   Track this over time; keep **> 0** for profitability, **> 20%** for buffer.

5. **Actual usage vs allowance**  
   From your DB: average `tokensUsedThisPeriod` per user by tier, and % of users who hit their limit.  
   If most users use &lt; 50% of allowance, your real cost is lower than the “100% usage” case.

### 3. Decision rules

| If… | Then… |
|-----|--------|
| Blended $/1M has increased (e.g. more Opus, or price change) | Re-run “Cost per tier” and “Net profit”; update this doc. |
| Profit % of App share drops below 20% for a tier | Consider small price increase or token decrease for that tier. |
| Profit % of App share drops below 50% | Plan a pricing/token rebalance soon. |
| You’re at or below break-even (cost ≥ App share) | Reprice or reduce tokens; do not leave as-is. |
| Anthropic change pricing | Update “Official pricing” in this doc; re-run all tables. |
| Average usage per tier grows a lot | Re-check cost at “average usage” and at 100%; consider overage or new tier. |

### 4. Update this doc on each review

- Replace or add a short “Review as of [date]” with: blended $/1M, cost per tier, net profit, profit % of App share.
- If you change tiers or prices, update `src/lib/stripe.ts`, `docs/MONETIZATION_TIERS.md`, and this file so the knowledge base stays accurate.

### 5. Suggested cadence

- **Monthly:** Pull Anthropic usage and spend; compute blended $/1M and compare to last month.
- **Quarterly:** Full review: tiers, break-even, “well above” %, decision rules; update this doc and pricing if needed.

---

## How We Got Here

### Decision Points (from codebase analysis)

1. **No freemium** — All tiers are paid to cover real API costs (`docs/MONETIZATION_TIERS.md`)
2. **1:1 token ratio** — 1 GRIP token = 1 Claude API token (input + output summed)
3. **No rollover** — Tokens reset each billing cycle (prevents cost accumulation)
4. **45/55 split** — 45% to admin, 55% to app (covers tokens + infrastructure)

### Where Token Numbers Came From

**Source:** `src/lib/stripe.ts` defines:
- Starter: 1,150,000 tokens/month
- Pro: 2,950,000 tokens/month
- Team: 6,000,000 tokens/month

**Rationale (from MONETIZATION_TIERS.md):**
- "Competitive": Comparable to other AI dev tools
- "Profitable": Margins after API cost and 45% admin payout (55% app share for tokens + infra)
- "Feasible": Users see predictable cost and enough tokens to ship

**⚠️ UNKNOWN:** The original calculation methodology isn't documented. We need to verify:
1. What was the assumed API cost per token?
2. What was the target margin?
3. How were the tier boundaries chosen?

---

## Recommendations

### 1. Verify Actual API Costs

**Action:** Check your Anthropic dashboard and calculate:
- Average cost per 1M tokens (input + output)
- Which models you're using (Opus vs Sonnet vs Chat)
- Actual usage patterns (input/output ratio)

**Update:** `docs/TOKEN_COST_ANALYSIS.md` with real numbers.

### 2. Monitor Usage Patterns

**Track:**
- Average tokens used per user per tier
- Percentage of allowance typically used
- Peak usage periods

**Goal:** Ensure most users don't hit 100% usage (which maximizes your margin).

### 3. Set Up Cost Alerts

**Action:** Create alerts if:
- Average API cost per user exceeds $X/month
- Any tier's average cost exceeds 50% of revenue
- Total API costs exceed 20% of total revenue

### 4. Consider Usage-Based Pricing (Future)

If costs become unpredictable, consider:
- Base tier + overage charges
- Pay-as-you-go add-ons
- Higher tiers with more tokens

### 5. Document Decision-Making

**Action:** Create `docs/PRICING_DECISIONS.md` with:
- Original cost assumptions
- Target margins
- Competitive analysis
- Rationale for tier boundaries

---

## Questions to Answer

1. **What is your actual Anthropic API cost per 1M tokens?**
   - Check your billing dashboard
   - Calculate weighted average across models

2. **What was the original margin target?**
   - Was it 80%+ gross margin?
   - Was it break-even + X%?

3. **How were tier boundaries chosen?**
   - Was it based on competitor pricing?
   - Was it based on usage data?
   - Was it arbitrary?

4. **What's your break-even point?**
   - At what API cost would you lose money?
   - What's your safety margin?

5. **Are you tracking actual usage vs allowance?**
   - What % of users hit their limit?
   - What's the average usage per tier?

---

## Next Steps

1. ✅ **Immediate:** Verify actual Anthropic API costs
2. ✅ **Immediate:** Calculate real margins with actual costs
3. ✅ **Short-term:** Set up usage monitoring dashboard
4. ✅ **Short-term:** Document pricing decisions
5. ✅ **Long-term:** Review tier structure quarterly

---

## Current Status Summary

**✅ Good news:**
- 45/55 split gives the app 55% of revenue (Starter $10.45, Pro $26.95, Team $54.45) for tokens and infra.
- At **moderate utilization** (e.g. 30–40%), Pro and Team are profitable; track usage to keep margins healthy.
- No rollover prevents cost accumulation.
- Token allowances 2.3M / 6M / 12M are sized for your actual cost (~$4.30/1M) and keep the app profitable at 100% use.

**⚠️ Keep an eye on:**
- Blended $/1M if you shift more traffic to Opus (higher cost).
- Anthropic pricing changes; re-run “Future reviews” when they publish updates.
- Actual usage vs allowance (track in-app) so you know real cost per user.

**🎯 For future reviews:**
- Use the **“Future reviews: usage & pricing”** section above (pull numbers → compute → apply decision rules → update this doc).
- Aim to keep **profit as % of App share > 0** (profitable); **> 20%** gives a buffer.

---

## Reference: Official pricing

- **Anthropic pricing:** [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing) and [claude.com/pricing](https://claude.com/pricing)
- **GRIP models in code:** `ANTHROPIC_MODEL_CHAT` = Sonnet 4 (enhanced chat, sandbox, plan, structure, most routes); `ANTHROPIC_MODEL_OPUS` = Opus 4.1 (ai/chat, analysis, generate-keywords). See `src/lib/anthropicConfig.ts`.
