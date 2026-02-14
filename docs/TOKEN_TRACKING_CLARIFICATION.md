# How GRIP Tracks Tokens vs Claude Platform

## Plain-language summary

**What we track:** GRIP counts the same thing the Claude platform does: **tokens in (input) + tokens out (output)** for every user-facing AI request we record. One GRIP token = one Claude API token (input + output combined).

**Where we get the numbers:** After each Anthropic API call we read `usage.input_tokens` and `usage.output_tokens` from the response (or the equivalent `promptTokens` / `completionTokens` from our anthropicService wrapper) and add them. We then add that sum to the user’s `tokensUsedThisPeriod` in the database.

**So we are tracking the correct amount** — we are not missing “tokens out” or counting only input. Every place that records usage uses **input + output**.

---

## Why your app total can differ from the platform log

You saw **6,039,938** in GRIP and **6,373,825** in the Claude platform log (tokens in 5,819,177 + tokens out 554,648) for roughly the same period. Possible reasons:

1. **Different time windows**  
   GRIP’s “this period” is your billing/subscription period (or admin reset). The platform log is by calendar day (e.g. Feb 12–14). If the period boundaries don’t match exactly, the totals won’t match.

2. **Capping at allowance**  
   We never store more than the user’s `tokenAllowance` in `tokensUsedThisPeriod`. If true usage exceeded the allowance, the platform would show the full usage and GRIP would show the cap. That can make GRIP’s number lower than the platform’s.

3. **Calls we don’t attribute to the user**  
   For example, `/api/health/anthropic` calls the API but we don’t deduct from any user. Those tokens appear on the platform under your app but not in a user’s total in GRIP.

4. **Multiple users**  
   If the platform log is for the whole app “grip” and you’re looking at one user in GRIP, the platform total will be higher than that single user’s total.

So a difference between “GRIP user total” and “platform log total” does **not** mean we’re counting wrong; it often means different scope (time, user, or what counts as “user” usage).

---

## Cost per 1M when the two totals differ

- **If you use GRIP’s total:** 6,039,938 tokens, $25.95 → **$4.30 per 1M** (what we use today).
- **If you use the platform total:** 6,373,825 tokens, $25.95 → **$4.07 per 1M**.

Using the **platform** total is more conservative for cost (slightly lower $/1M). Your current tier math uses $4.30/1M; if you prefer to align to platform totals, you can re-run the math at **$4.07/1M** and you’ll have a bit more margin (or room to give more tokens). No code change is required for “how we count”; only your planning assumption ($/1M) changes.

---

## Code reference: we use input + output everywhere

- **Anthropic API** returns `usage.input_tokens` and `usage.output_tokens`.
- **anthropicService** maps those to `promptTokens` and `completionTokens` and also returns `totalTokens = input_tokens + output_tokens`.
- Routes that call Anthropic directly use:  
  `(response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)`.
- Routes that use anthropicService use:  
  `(response.usage?.promptTokens ?? 0) + (response.usage?.completionTokens ?? 0)`  
  (same as `response.usage?.totalTokens` when present).

So we are **not** missing tokens out; we are tracking the same definition as the platform (input + output).
