/**
 * Central Anthropic API config for G.R.I.P.
 * GRIP prefers env (ANTHROPIC_API_KEY); when unset, falls back to user's stored key from Dashboard → Settings.
 */

import clientPromise, { DB_NAME } from '@/lib/db'
import { ObjectId } from 'mongodb'

export function getAnthropicApiKey(): string | undefined {
  const key = process.env.ANTHROPIC_API_KEY
  return key && typeof key === 'string' ? key.trim() : undefined
}

/** When env key is not set, use the key stored in user settings (Dashboard → Settings). */
export async function getAnthropicApiKeyForUser(userId: string): Promise<string | undefined> {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { anthropicApiKey: 1 } }
    ) as { anthropicApiKey?: string } | null
    const key = user?.anthropicApiKey
    return key && typeof key === 'string' ? key.trim() : undefined
  } catch {
    return undefined
  }
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

/** Fast model for health checks and validation pings (low cost). Use current Haiku 4.5; override with ANTHROPIC_MODEL_FAST if needed. */
export const ANTHROPIC_MODEL_FAST = process.env.ANTHROPIC_MODEL_FAST || 'claude-haiku-4-5-20251001'

/** Default model for chat, planning, and general assistant (Sonnet 4). */
export const ANTHROPIC_MODEL_CHAT = process.env.ANTHROPIC_MODEL_CHAT || 'claude-sonnet-4-20250514'

/** Powerful model for heavy reasoning and code (Opus 4). */
export const ANTHROPIC_MODEL_OPUS = process.env.ANTHROPIC_MODEL_OPUS || 'claude-opus-4-1-20250805'
