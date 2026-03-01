/**
 * Token budget rules per paid tier so GRIP stays within the user's token allowance.
 * Plan generation and code generation (enhanced-chat) use remaining tokens to scope work
 * and avoid overages or incomplete builds.
 */

import { TIERS } from '@/lib/stripe'

/** Reserve this fraction of remaining tokens for plan/ideation/context; rest for code. */
const PLAN_RESERVE_FRACTION = 0.15
/** Below this remaining (tokens), urge minimal scope. */
const LOW_BUDGET_THRESHOLD = 100_000
/** Very low: one small change per message. */
const VERY_LOW_BUDGET_THRESHOLD = 30_000

/** Max fraction of remaining tokens a single chat response may use (so one reply cannot exhaust budget). */
const CHAT_RESPONSE_BUDGET_FRACTION = 0.35
/** Minimum response max_tokens so we still get useful answers when budget is low. */
const CHAT_RESPONSE_MIN_TOKENS = 2048
/** Hard cap for a single response. */
const CHAT_RESPONSE_MAX_TOKENS = 8192

export type TokenBudgetContext = 'plan' | 'chat'

/**
 * Max tokens allowed for one chat response so we stay within budget and reduce cut-off.
 * Use this as max_tokens when calling the model; when the model hits this limit we show a cut-off notice.
 */
export function getChatResponseMaxTokens(remainingTokens: number): number {
  const budgeted = Math.floor(remainingTokens * CHAT_RESPONSE_BUDGET_FRACTION)
  return Math.min(CHAT_RESPONSE_MAX_TOKENS, Math.max(CHAT_RESPONSE_MIN_TOKENS, budgeted))
}

/**
 * Build a prompt fragment for plan generation: user's tier and remaining tokens so the plan
 * fits within budget (fewer phases / focused tasks for Starter, more headroom for Team).
 */
export function buildTokenBudgetPromptFragment(
  remainingTokens: number,
  tier: string,
  context: TokenBudgetContext
): string {
  const tierLower = (tier || 'starter').toLowerCase()
  const allowance = TIERS.find((t) => t.id === tierLower)?.tokensPerMonth ?? 1_300_000
  const isStarter = tierLower === 'starter'
  const isPro = tierLower === 'pro'
  const isTeam = tierLower === 'team'

  if (context === 'plan') {
    const budgetForCode = Math.max(0, Math.floor(remainingTokens * (1 - PLAN_RESERVE_FRACTION)))
    const phaseHint = isStarter
      ? 'Use 3–4 phases with focused tasks so the build can complete within the user\'s token budget. Prefer fewer, high-value phases over many small ones.'
      : isPro
        ? 'Use 4–5 phases; balance scope with the user\'s token budget so the full plan can be implemented without overage.'
        : 'You may use 5–6 phases; the user has a larger token allowance so scope can be broader.'
    return `
## Token budget (mandatory — scope the plan to fit)
- The user is on the **${tierLower}** plan with approximately **${remainingTokens.toLocaleString()}** tokens remaining this period (allowance: ${allowance.toLocaleString()}/month).
- After this plan is generated, GRIP will use the remaining tokens to implement code. Reserve ~${Math.floor(PLAN_RESERVE_FRACTION * 100)}% for plan/ideation/context; the rest is for code generation.
- **Scope the plan so implementation stays within budget:** ${phaseHint}
- Prefer tasks that deliver runnable value with minimal token use (e.g. one phase = setup + core flow) so the user gets a successful build without exceeding their allowance.
`.trim()
  }

  // context === 'chat'
  const lowBudget = remainingTokens < LOW_BUDGET_THRESHOLD
  const veryLow = remainingTokens < VERY_LOW_BUDGET_THRESHOLD
  let scopeLine = 'Prefer completing the current phase or the user\'s ask with focused, high-value code rather than many files.'
  if (veryLow) {
    scopeLine = 'Token budget is very low. Implement ONE small change or fix per response (e.g. one file, one component). Do not output long multi-file responses.'
  } else if (lowBudget) {
    scopeLine = 'Token budget is low. Keep this response minimal: one or two files max. Complete the user\'s immediate ask; suggest "next step" for the rest after they add more tokens or next period.'
  } else if (isStarter) {
    scopeLine = 'User is on Starter plan. Prefer completing the current phase well with fewer, essential files rather than exceeding budget and causing an incomplete build.'
  }

  return `
## Token budget (mandatory — stay within user's allowance)
- The user has approximately **${remainingTokens.toLocaleString()}** tokens remaining this period (${tierLower} plan).
- **Stay within budget:** ${scopeLine}
- **Never output incomplete or truncated code.** Always output complete files only. If your full answer would exceed the budget, output fewer items that are complete (e.g. one full file) rather than multiple incomplete ones. Never leave a code block or file mid-way—either output the full file or say you will do it in the next message.
- **Scope your response so it fits:** Prefer one or two complete files per reply when budget is limited. If you cannot fit everything the user asked for, do the part that fits completely and add one short line like: "I kept this to [what you did] to stay within your token budget. Next step: [suggested next step]." That way the user knows the response was intentionally scoped, not cut off.
- Avoid dumping the full checklist in one reply when budget is limited; scope to what fits so the build succeeds and the user does not hit an overage.
`.trim()
}
