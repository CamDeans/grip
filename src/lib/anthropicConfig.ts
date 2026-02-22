/**
 * Central Anthropic API config for G.R.I.P.
 * GRIP uses only env: .env / .env.local in dev, Vercel (or deployment) vars in production.
 * User Settings vars are for the user's app build (injected into project .env), not for GRIP's AI.
 */

export function getAnthropicApiKey(): string | undefined {
  const key = process.env.ANTHROPIC_API_KEY
  return key && typeof key === 'string' ? key.trim() : undefined
}

export function requireAnthropicApiKey(): string {
  const key = getAnthropicApiKey()
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to .env.local or Vercel Environment Variables.')
  }
  return key
}

/**
 * Latest Claude model IDs. Override via env for newer snapshots (e.g. claude-sonnet-4-5-*, claude-opus-4-6).
 * @see https://docs.anthropic.com/en/api/models
 */

/** Fast model for health checks and validation pings (low cost). */
export const ANTHROPIC_MODEL_FAST = process.env.ANTHROPIC_MODEL_FAST || 'claude-3-5-haiku-20241022'

/** Default model for chat, planning, and general assistant (Sonnet 4). */
export const ANTHROPIC_MODEL_CHAT = process.env.ANTHROPIC_MODEL_CHAT || 'claude-sonnet-4-20250514'

/** Powerful model for heavy reasoning and code (Opus 4). */
export const ANTHROPIC_MODEL_OPUS = process.env.ANTHROPIC_MODEL_OPUS || 'claude-opus-4-1-20250805'
