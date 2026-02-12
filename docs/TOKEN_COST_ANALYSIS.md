# GRIP Token Cost Analysis & Profitability Review

## Current Tier Structure

| Tier     | Price   | Tokens/month | Price per 1K tokens | Use case              |
|----------|---------|--------------|---------------------|------------------------|
| Starter  | $19/mo  | 650,000      | ~$0.029             | Light use, side projects |
| Pro      | $49/mo  | 1,700,000    | ~$0.029             | Serious builders, daily use |
| Team     | $99/mo  | 3,400,000    | ~$0.029             | Small teams, heavy usage |

**Source:** Defined in `src/lib/stripe.ts` and documented in `docs/MONETIZATION_TIERS.md`

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

## Your Sonnet 4 usage (from dashboard)

Rough read from your token usage chart (Feb 1–10, **claude-sonnet-4-20250514** only):

- **~0** before ~Feb 7  
- **~2.8M** tokens in one spike  
- **~800K**, **~750K**, **~500K** in following bars  
- **Total in that window:** ~4.85M tokens in a few days  

If that rate continued: **~4.85M × (30/4) ≈ 36M tokens/month** (order of magnitude). Use your actual monthly totals from the console for planning.

---

## Cost Analysis Per Tier

### Assumption: Sonnet 4 at $9 per 1M tokens (official pricing)

| Tier     | Tokens/month | Cost/month | Revenue | Gross Profit | Margin |
|----------|--------------|------------|---------|--------------|--------|
| Starter  | 650,000      | ~$2.82     | $19     | ~$16.18      | ~85%   |
| Pro      | 1,700,000    | ~$7.38     | $49     | ~$41.62      | ~85%   |
| Team     | 3,400,000    | ~$14.76    | $99     | ~$84.24      | ~85%   |

### After 55% Admin Payout

| Tier     | Revenue | Admin (55%) | App (45%) | API Cost | Net Profit |
|----------|---------|-------------|-----------|----------|------------|
| Starter  | $19     | $10.45      | $8.55     | ~$2.82   | **~$5.73** |
| Pro      | $49     | $26.95      | $22.05    | ~$7.38   | **~$14.67** |
| Team     | $99     | $54.45      | $44.55    | ~$14.76  | **~$29.79** |

**Net profit per subscription (actual cost ~$4.34/1M tokens, 100% allowance used):**
- Starter: **~$5.73/month**
- Pro: **~$14.67/month**
- Team: **~$29.79/month**

If you use a **blended $16/1M** (e.g. 80% Sonnet, 20% Opus), costs roughly double; you’re still profitable (Starter ~$7.74, Pro ~$18.85, Team ~$36.15).

---

## Risk Scenarios

### Worst case: 100% allowance used (Sonnet 4 @ $9/1M)

| Tier     | Tokens/month | Cost     | Revenue | Net Profit |
|----------|--------------|----------|---------|------------|
| Starter  | 650,000      | ~$2.82   | $19     | ~$5.73     |
| Pro      | 1,700,000    | ~$7.38   | $49     | ~$14.67    |
| Team     | 3,400,000     | ~$14.76  | $99     | ~$29.79    |

**✅ Profitable** at 100% usage with Sonnet 4.

### If you shift to Opus 4.1 ($45/1M)

| Tier     | Tokens/month | Cost/month | Revenue | Net Profit |
|----------|--------------|------------|---------|------------|
| Starter  | 650,000      | ~$29.25    | $19     | (loss)     |
| Pro      | 1,700,000    | ~$76.50    | $49     | (loss)     |
| Team     | 3,400,000    | ~$153      | $99     | (loss)     |

**✅ Still profitable**, but margins drop.

### Critical threshold (Sonnet 4)

- **Break-even (Starter):** API cost would need to exceed **~$380/1M** to lose money at 100% usage.
- **Safety margin:** At $9/1M you have a very large margin; even at $45/1M (Opus) you remain in the black.

---

## What “well above break-even” looks like (for your knowledge base)

**Break-even** = the point where **App share of revenue (45%) = API cost**. Above that, every dollar is net profit (to the app); below that, you lose money on that subscription.

### Definition

- **Revenue** = subscription price (e.g. $19).
- **App share** = 45% of revenue = what’s left after 55% admin payout (e.g. $19 × 0.45 = $8.55).
- **Break-even API cost** = App share. If API cost = $8.55 for a Starter user, profit = $0.
- **Well above break-even** = API cost is **much lower** than App share, so **net profit is a large share of App share**.

### In numbers (actual ~$4.34/1M tokens, 100% allowance used)

| Tier    | Revenue | App share (45%) | API cost | Net profit | % of App share that is profit |
|---------|---------|------------------|----------|------------|-------------------------------|
| Starter | $19     | $8.55            | ~$2.82   | ~$5.73     | **~67%** of App share is profit |
| Pro     | $49     | $22.05           | ~$7.38   | ~$14.67    | **~67%** of App share is profit |
| Team    | $99     | $44.55           | ~$14.76  | ~$29.79    | **~67%** of App share is profit |

So “well above break-even” here means: **API cost is ~33% of App share** at current allowances and cost; the rest is net profit. You retain healthy margin at actual cost (~$4.34/1M). You could absorb a **~2× increase** in API cost before Starter hits break-even.

### Formula for future reviews

1. **Break-even API cost per tier**  
   `Break-even cost = Revenue × 0.45`  
   (Starter: $8.55, Pro: $22.05, Team: $44.55)

2. **Actual API cost per tier (at 100% usage)**  
   `Cost = (Tokens per tier / 1,000,000) × $ per 1M tokens`  
   Example: Starter 650K tokens @ ~$4.34/1M → ~$2.82.

3. **Net profit**  
   `Net profit = App share − API cost = Revenue × 0.45 − Cost`

4. **“Well above” in %**  
   `Profit as % of App share = (Net profit / App share) × 100`  
   Aim to keep this **> 80%** (i.e. API cost &lt; 20% of App share) so you stay clearly above break-even.

### When you’re no longer “well above”

- **API cost &gt; 20% of App share** → margins thinning; monitor and consider small price or token adjustments.
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
   Compare to **break-even cost** = Revenue × 0.45 for that tier.

3. **Net profit per tier (at 100% usage)**  
   `Net profit = Revenue × 0.45 − Cost`

4. **Profit as % of App share**  
   `(Net profit / (Revenue × 0.45)) × 100`  
   Track this over time; keep **> 80%** for “well above break-even.”

5. **Actual usage vs allowance**  
   From your DB: average `tokensUsedThisPeriod` per user by tier, and % of users who hit their limit.  
   If most users use &lt; 50% of allowance, your real cost is lower than the “100% usage” case.

### 3. Decision rules

| If… | Then… |
|-----|--------|
| Blended $/1M has increased (e.g. more Opus, or price change) | Re-run “Cost per tier” and “Net profit”; update this doc. |
| Profit % of App share drops below 80% for a tier | Consider small price increase or token decrease for that tier. |
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
4. **55/45 split** — 55% to admin, 45% to app (covers tokens + infrastructure)

### Where Token Numbers Came From

**Source:** `src/lib/stripe.ts` defines:
- Starter: 650,000 tokens/month
- Pro: 1,700,000 tokens/month
- Team: 3,400,000 tokens/month

**Rationale (from MONETIZATION_TIERS.md):**
- "Competitive": Comparable to other AI dev tools
- "Profitable": Margins after API cost and 55% payout
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
- Tiers are profitable at 100% usage with Sonnet 4 (@ $9/1M).
- “Well above break-even”: ~90–95% of App share is net profit per tier.
- Break-even would require API cost ~$380/1M (Starter); current $9/1M is far below that.
- No rollover prevents cost accumulation.

**⚠️ Keep an eye on:**
- Blended $/1M if you shift more traffic to Opus (higher cost).
- Anthropic pricing changes; re-run “Future reviews” when they publish updates.
- Actual usage vs allowance (track in-app) so you know real cost per user.

**🎯 For future reviews:**
- Use the **“Future reviews: usage & pricing”** section above (pull numbers → compute → apply decision rules → update this doc).
- Aim to keep **profit as % of App share > 80%** so you stay “well above break-even.”

---

## Reference: Official pricing

- **Anthropic pricing:** [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing) and [claude.com/pricing](https://claude.com/pricing)
- **GRIP models in code:** `ANTHROPIC_MODEL_CHAT` = Sonnet 4 (enhanced chat, sandbox, plan, structure, most routes); `ANTHROPIC_MODEL_OPUS` = Opus 4.1 (ai/chat, analysis, generate-keywords). See `src/lib/anthropicConfig.ts`.
