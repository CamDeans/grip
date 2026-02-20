/**
 * Tier-based token and character limits to lower consumption across the flow.
 * Starter = most aggressive caps; Pro = moderate; Team = current or relaxed.
 * Used by: plan context (middle), analysis rawSummary, repo context, enhanced-chat section budgets.
 */

import { TIERS } from '@/lib/stripe'

export type TierId = 'starter' | 'pro' | 'team'

/** Below this remaining (tokens), reduce chat section sizes further. */
export const LOW_BUDGET_THRESHOLD = 100_000
/** Very low: minimal context in chat. */
export const VERY_LOW_BUDGET_THRESHOLD = 30_000

/** Plan context (middle) max character lengths per tier. */
export const PLAN_CONTEXT_LIMITS: Record<TierId, { checklistSummary: number; layerPrompt: number; stackGuidance: number }> = {
  starter: { checklistSummary: 1200, layerPrompt: 400, stackGuidance: 350 },
  pro: { checklistSummary: 1800, layerPrompt: 550, stackGuidance: 500 },
  team: { checklistSummary: 2500, layerPrompt: 700, stackGuidance: 650 },
}

/** Analysis: max rawSummary chars sent to AI (buildProjectAnalysisWithPrompt / buildStructuredAnalysisWithPrompt). */
export const ANALYSIS_RAW_SUMMARY_MAX_CHARS: Record<TierId, number> = {
  starter: 10_000,
  pro: 14_000,
  team: 18_000,
}

/** Default when tier unknown (conservative = starter). */
export const DEFAULT_RAW_SUMMARY_MAX_CHARS = 12_000

/** Repo context document limits when building (chars per file, total chars, max files). */
export const REPO_CONTEXT_LIMITS: Record<TierId, { charsPerFile: number; totalChars: number; maxFiles: number }> = {
  starter: { charsPerFile: 2500, totalChars: 22_000, maxFiles: 35 },
  pro: { charsPerFile: 3200, totalChars: 28_000, maxFiles: 42 },
  team: { charsPerFile: 4000, totalChars: 35_000, maxFiles: 50 },
}

/** Chat prompt section max character budgets by tier (projectAnalysis, structuredSummary, repoReference, buildErrorsRaw). */
export const CHAT_SECTION_BUDGETS: Record<TierId, { projectAnalysis: number; structuredSummary: number; repoReference: number; buildErrorsRaw: number }> = {
  starter: { projectAnalysis: 5000, structuredSummary: 2800, repoReference: 18_000, buildErrorsRaw: 3500 },
  pro: { projectAnalysis: 6500, structuredSummary: 3500, repoReference: 24_000, buildErrorsRaw: 4000 },
  team: { projectAnalysis: 8000, structuredSummary: 4000, repoReference: 28_000, buildErrorsRaw: 4000 },
}

/** When remaining tokens is low or very low, scale down chat section budgets by this factor. */
export const LOW_BUDGET_CHAT_SCALE = 0.7
export const VERY_LOW_BUDGET_CHAT_SCALE = 0.5

function normalizeTier(tier: string | undefined): TierId {
  const t = (tier || 'starter').toLowerCase()
  if (t === 'pro' || t === 'team') return t
  return 'starter'
}

/** Plan context (middle): get max character limits for checklist, each layer prompt, and stack guidance. */
export function getPlanContextLimits(tier: string | undefined): (typeof PLAN_CONTEXT_LIMITS)['starter'] {
  return PLAN_CONTEXT_LIMITS[normalizeTier(tier)]
}

/** Analysis: max chars for rawSummary sent to AI. Optional tier; when missing use default. */
export function getAnalysisRawSummaryMaxChars(tier: string | undefined): number {
  if (!tier) return DEFAULT_RAW_SUMMARY_MAX_CHARS
  return ANALYSIS_RAW_SUMMARY_MAX_CHARS[normalizeTier(tier)] ?? DEFAULT_RAW_SUMMARY_MAX_CHARS
}

/** Repo context: get limits for building the repo reference document. */
export function getRepoContextLimits(tier: string | undefined): (typeof REPO_CONTEXT_LIMITS)['starter'] {
  return REPO_CONTEXT_LIMITS[normalizeTier(tier)]
}

/** Chat: get section character budgets by tier and optional remaining tokens (reduces when low/very low). */
export function getChatSectionBudgets(
  tier: string | undefined,
  remainingTokens?: number
): { projectAnalysis: number; structuredSummary: number; repoReference: number; buildErrorsRaw: number } {
  const id = normalizeTier(tier)
  const base = CHAT_SECTION_BUDGETS[id]
  if (remainingTokens == null || remainingTokens >= LOW_BUDGET_THRESHOLD) {
    return { ...base }
  }
  const scale = remainingTokens < VERY_LOW_BUDGET_THRESHOLD ? VERY_LOW_BUDGET_CHAT_SCALE : LOW_BUDGET_CHAT_SCALE
  return {
    projectAnalysis: Math.floor(base.projectAnalysis * scale),
    structuredSummary: Math.floor(base.structuredSummary * scale),
    repoReference: Math.floor(base.repoReference * scale),
    buildErrorsRaw: Math.floor(base.buildErrorsRaw * scale),
  }
}
