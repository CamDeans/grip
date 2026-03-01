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
 * Allowance = fixed monthly cap (set by admin or plan). Remaining = allowance - tokensUsedThisPeriod;
 * as usage goes up, remaining goes down (allowance does not go down).
 *
 * Uses a single atomic update (aggregation pipeline) so concurrent requests never overwrite each other.
 * Previously a read-then-write could undercount when multiple AI calls completed at once (e.g. ~550k
 * discrepancy between GRIP remaining and Claude console usage).
 */
export async function addTokenUsage(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return
  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB_NAME || 'test')
  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    [
      {
        $set: {
          tokensUsedThisPeriod: {
            $cond: {
              if: { $gt: [{ $ifNull: ['$tokenAllowance', 0] }, 0] },
              then: {
                $min: [
                  { $add: [{ $ifNull: ['$tokensUsedThisPeriod', 0] }, amount] },
                  '$tokenAllowance',
                ],
              },
              else: { $add: [{ $ifNull: ['$tokensUsedThisPeriod', 0] }, amount] },
            },
          },
          updatedAt: new Date(),
        },
      },
    ]
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
