/**
 * Dispatches a client-side event so TokenUsage (and any other subscribers) refetches
 * token/access data. Call after any successful API response that records token usage.
 *
 * Token-consuming API routes (each calls addTokenUsage; client must call refreshTokenUsage after success):
 * - POST /api/projects/align-check (deduction only; no balance check)
 * - POST /api/projects/[id]/analysis/refresh
 * - POST /api/projects/[id]/files/generate, POST /api/files/generate
 * - POST /api/enhanced-chat, /api/projects/[id]/legal-sandbox/chat
 * - POST /api/projects/[id]/plan, /api/projects/[id]/legal-sandbox/plan
 * - POST /api/projects/[id]/analyze, /api/projects/[id]/legal-sandbox/analyze
 * - POST /api/projects (create with analyze)
 * - POST /api/ai/generate-keywords
 * - POST /api/chat, /api/ai/chat, /api/chat/completion
 * - POST /api/projects/[id]/repo/summarize
 * - POST /api/projects/[id]/files/update-from-chat
 * - POST /api/analysis/enhanced
 */
export function refreshTokenUsage(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('grip-token-update'))
  }
}
