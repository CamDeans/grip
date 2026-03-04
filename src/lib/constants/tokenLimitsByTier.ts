/**
 * Token and character limits for GRIP. CONCRETE AND MANDATORY: no tier-based limits.
 * All users receive the same full-power values so GRIP uses 100% of context. Tier is ignored.
 * The token-risk modal (build-token-risk API + PreRunTokenModal) informs the user when
 * estimated usage may exceed their balance; GRIP does not cap context by tier.
 */

export type TierId = 'starter' | 'pro' | 'team'

// --- Single full-power values (no tier differentiation) ---

/** Plan context: checklist, layer prompt, stack guidance. Same for all users. */
export const PLAN_CONTEXT_LIMITS = {
  checklistSummary: 42_000,
  layerPrompt: 10_000,
  stackGuidance: 6_000,
} as const

/** Analysis: max rawSummary chars sent to AI. Same for all users. */
export const ANALYSIS_RAW_SUMMARY_MAX_CHARS = 80_000

/** File-level scope (files/generate, retry-failed, fix-build, template middle). */
export const SCOPE_REMINDER_MAX_CHARS = 2_500

/** Repo context: chars per file, total chars, max files. Same for all users. */
export const REPO_CONTEXT_LIMITS = {
  charsPerFile: 18_000,
  totalChars: 180_000,
  maxFiles: 220,
} as const

/** Chat section budgets. Same for all users; no reduction by tier or remaining tokens. */
export const CHAT_SECTION_BUDGETS = {
  projectAnalysis: 35_000,
  structuredSummary: 22_000,
  repoReference: 110_000,
  buildErrorsRaw: 22_000,
} as const

/** @deprecated Tier is ignored; kept for type compatibility. */
function normalizeTier(_tier: string | undefined): TierId {
  return 'team'
}

/** Plan context: returns same full-power limits for any tier. */
export function getPlanContextLimits(_tier?: string): typeof PLAN_CONTEXT_LIMITS {
  return PLAN_CONTEXT_LIMITS
}

/** Analysis: returns same max chars for any tier. */
export function getAnalysisRawSummaryMaxChars(_tier?: string): number {
  return ANALYSIS_RAW_SUMMARY_MAX_CHARS
}

/** Repo context: returns same full-power limits for any tier. */
export function getRepoContextLimits(_tier?: string): typeof REPO_CONTEXT_LIMITS {
  return REPO_CONTEXT_LIMITS
}

/** Chat section budgets: returns same full-power budgets for any tier; remainingTokens is ignored (no scaling). Token-risk modal warns user instead. */
export function getChatSectionBudgets(
  _tier?: string,
  _remainingTokens?: number
): typeof CHAT_SECTION_BUDGETS {
  return { ...CHAT_SECTION_BUDGETS }
}
