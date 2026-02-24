export type TokenUsageDetail = {
  tokenAllowance: number
  tokensUsedThisPeriod: number
}

/**
 * Dispatches a client-side event so TokenUsage (and any other subscribers) refetches
 * token/access data. Call after any successful API response that records token usage.
 * API routes now await addTokenUsage before responding so refetch sees updated usage.
 *
 * If tokenUsage is provided (e.g. from stream 'done' event), the sidebar/dashboard can
 * update immediately without a round trip; otherwise they refetch /api/me/access.
 *
 * Token-consuming API routes (each awaits addTokenUsage; client should call refreshTokenUsage after success):
 * - POST /api/projects/align-check, /api/projects/[id]/files/generate, POST /api/files/generate
 * - POST /api/enhanced-chat, /api/projects/[id]/legal-sandbox/chat
 * - POST /api/projects/[id]/plan, /api/projects/[id]/legal-sandbox/plan
 * - POST /api/projects/[id]/analyze, /api/projects/[id]/legal-sandbox/analyze
 * - POST /api/projects (create with analyze), /api/projects/[id]/analysis/refresh
 * - POST /api/ai/generate-keywords, /api/chat, /api/ai/chat, /api/chat/completion
 * - POST /api/projects/[id]/repo/summarize, /api/projects/[id]/files/update-from-chat
 * - POST /api/analysis/enhanced
 */
export function refreshTokenUsage(tokenUsage?: TokenUsageDetail): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('grip-token-update', { detail: tokenUsage ?? null }))
  }
}
