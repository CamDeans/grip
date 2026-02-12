import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'

const DEFAULT_ADMIN_ALLOWANCE = 500_000
const DEFAULT_VALUED_TESTER_ALLOWANCE = 50

/** Minimum remaining tokens required to start a token-consuming request (avoids overage from a single large call). */
export const SAFE_MIN_REMAINING_TOKENS = 2_000

export type TokenLimits = {
  adminTokenAllowance: number
  valuedTesterTokenAllowance: number
}

const TOKEN_LIMITS_ID = 'token_limits'

export async function getTokenLimits(): Promise<TokenLimits> {
  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB_NAME || 'test')
  const doc = await db.collection('app_settings').findOne(
    { _id: TOKEN_LIMITS_ID }
  ) as { adminTokenAllowance?: number; valuedTesterTokenAllowance?: number } | null
  return {
    adminTokenAllowance: doc?.adminTokenAllowance ?? DEFAULT_ADMIN_ALLOWANCE,
    valuedTesterTokenAllowance: doc?.valuedTesterTokenAllowance ?? DEFAULT_VALUED_TESTER_ALLOWANCE,
  }
}

export async function setTokenLimits(limits: Partial<TokenLimits>): Promise<void> {
  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB_NAME || 'test')
  await db.collection('app_settings').updateOne(
    { _id: TOKEN_LIMITS_ID },
    {
      $set: {
        ...limits,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  )
}

/**
 * Add token usage for a user this period. Call after a successful AI request.
 * Caps at allowance so we never record an overage (tokensUsedThisPeriod never exceeds tokenAllowance).
 */
export async function addTokenUsage(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return
  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB_NAME || 'test')
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(userId) },
    { projection: { tokenAllowance: 1, tokensUsedThisPeriod: 1 } }
  ) as { tokenAllowance?: number; tokensUsedThisPeriod?: number } | null
  const allowance = user?.tokenAllowance ?? 0
  const used = user?.tokensUsedThisPeriod ?? 0
  const capped = allowance > 0 ? Math.min(used + amount, allowance) : used + amount
  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    { $set: { tokensUsedThisPeriod: capped, updatedAt: new Date() } }
  )
}

/**
 * Check if user has tokens remaining. Returns { ok: false, message } if exhausted.
 */
export async function checkTokenBalance(
  userId: string,
  tokenAllowance: number,
  tokensUsedThisPeriod: number,
  isAdmin: boolean
): Promise<{ ok: boolean; message?: string }> {
  if (tokenAllowance <= 0) return { ok: false, message: 'No token allowance for this period.' }
  if (tokensUsedThisPeriod >= tokenAllowance) {
    if (isAdmin) {
      return {
        ok: false,
        message: "You've reached your token limit. Request more from Admin portal → Token limits.",
      }
    }
    return {
      ok: false,
      message: "You've used all your tokens for this period. Your allowance resets at the start of the next billing cycle.",
    }
  }
  return { ok: true }
}
