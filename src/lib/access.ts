import type { Session } from 'next-auth'
import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'
import { isAdminUser } from '@/lib/utils/auth'
import { getTokenLimits, SAFE_MIN_REMAINING_TOKENS } from '@/lib/tokenUsage'

export type AppAccessSource = 'admin' | 'subscription' | 'valued_tester'

export type AppAccess = {
  hasAccess: boolean
  isAdmin: boolean
  source?: AppAccessSource
  tier?: string
  tokenAllowance: number
  tokensUsedThisPeriod: number
  subscriptionPeriodEnd?: Date
}

function endOfCurrentMonth(): Date {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(0)
  d.setHours(23, 59, 59, 999)
  return d
}

/** Return ObjectId if id is a valid 24-char hex string; otherwise null (avoids throw). */
function safeObjectId(id: string | undefined): ObjectId | null {
  if (id == null || typeof id !== 'string') return null
  if (!/^[a-fA-F0-9]{24}$/.test(id)) return null
  return new ObjectId(id)
}

/**
 * Resolve whether the user has access to the main GRIP app (dashboard, projects, chat).
 * - Admin (ADMIN_EMAILS or user.role/admin): full access, no payment required.
 * - Active subscription: hasAccess, tier and token fields from user.
 * - Valued tester (in valued_testers): hasAccess, token allowance 50/month; syncs user document for usage tracking.
 * Never throws: on any error returns defaultDeny so the user can be redirected to /plans (e.g. Stripe checkout).
 */
export async function getAppAccess(session: Session | null): Promise<AppAccess> {
  const defaultDeny: AppAccess = {
    hasAccess: false,
    isAdmin: false,
    tokenAllowance: 0,
    tokensUsedThisPeriod: 0,
  }

  if (!session?.user?.id) return defaultDeny

  const userId = session.user.id
  const oid = safeObjectId(userId)
  if (!oid) return defaultDeny

  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const email = (session.user.email || '').trim().toLowerCase()

    const user = await db.collection('users').findOne(
      { _id: oid }
    ) as {
    stripeSubscriptionId?: string
    tier?: string
    tokenAllowance?: number
    tokensUsedThisPeriod?: number
    subscriptionPeriodEnd?: Date
    email?: string
  } | null

  const limits = await getTokenLimits()

  // 1. Admin: full access with configurable tokens/month (default 500k) for app usage and testing
  // When syncing allowance from admin limits, never overwrite tokensUsedThisPeriod except when the
  // period has actually expired (so remaining = allowance - tokensUsedThisPeriod uses real amounts, not percentage).
  // Do NOT reset usage when subscriptionPeriodEnd is missing (first time or legacy); only reset when period end is in the past.
  if (isAdminUser(session)) {
    const allowance = limits.adminTokenAllowance
    const now = new Date()
    const currentPeriodEnd = user?.subscriptionPeriodEnd ? new Date(user.subscriptionPeriodEnd) : null
    const periodExpired = currentPeriodEnd !== null && currentPeriodEnd < now
    const allowanceMismatch = (user?.tokenAllowance ?? 0) !== allowance
    const needSync = !user?.tokenAllowance || allowanceMismatch || periodExpired
    if (user && needSync) {
      const newEnd = endOfCurrentMonth()
      await db.collection('users').updateOne(
        { _id: oid },
        {
          $set: {
            tokenAllowance: allowance,
            ...(periodExpired ? { tokensUsedThisPeriod: 0 } : {}),
            subscriptionPeriodEnd: newEnd,
            updatedAt: new Date(),
          },
        }
      )
    }
    const updated = await db.collection('users').findOne({ _id: oid }) as {
      tokenAllowance?: number
      tokensUsedThisPeriod?: number
      subscriptionPeriodEnd?: Date
    } | null
    const end = updated?.subscriptionPeriodEnd ? new Date(updated.subscriptionPeriodEnd) : endOfCurrentMonth()
    return {
      hasAccess: true,
      isAdmin: true,
      source: 'admin',
      tier: 'admin',
      tokenAllowance: updated?.tokenAllowance ?? allowance,
      tokensUsedThisPeriod: updated?.tokensUsedThisPeriod ?? 0,
      subscriptionPeriodEnd: end,
    }
  }

  // 2. Active paid subscription
  const periodEnd = user?.subscriptionPeriodEnd
    ? new Date(user.subscriptionPeriodEnd)
    : null
  if (
    user?.stripeSubscriptionId &&
    periodEnd &&
    periodEnd > new Date()
  ) {
    return {
      hasAccess: true,
      isAdmin: false,
      source: 'subscription',
      tier: user.tier || 'starter',
      tokenAllowance: user.tokenAllowance ?? 0,
      tokensUsedThisPeriod: user.tokensUsedThisPeriod ?? 0,
      subscriptionPeriodEnd: periodEnd,
    }
  }

  // 3. Valued tester: sync token fields to user and grant access
  if (email) {
    const vt = await db.collection('valued_testers').findOne(
      { email, removedAt: null }
    ) as { tokenAllowance?: number } | null
    if (vt) {
      const allowance = vt.tokenAllowance ?? limits.valuedTesterTokenAllowance
      const now = new Date()
      const currentPeriodEnd = user?.subscriptionPeriodEnd
        ? new Date(user.subscriptionPeriodEnd)
        : null
      const needReset =
        !currentPeriodEnd || currentPeriodEnd < now

      if (needReset && user) {
        const newEnd = endOfCurrentMonth()
        await db.collection('users').updateOne(
          { _id: oid },
          {
            $set: {
              tokensUsedThisPeriod: 0,
              tokenAllowance: allowance,
              subscriptionPeriodEnd: newEnd,
              updatedAt: new Date(),
            },
          }
        )
      } else if (!user?.tokenAllowance && user) {
        const newEnd = endOfCurrentMonth()
        await db.collection('users').updateOne(
          { _id: oid },
          {
            $set: {
              tokenAllowance: allowance,
              tokensUsedThisPeriod: user.tokensUsedThisPeriod ?? 0,
              subscriptionPeriodEnd: newEnd,
              updatedAt: new Date(),
            },
          }
        )
      }

      const updated = await db.collection('users').findOne(
        { _id: oid }
      ) as { tokenAllowance?: number; tokensUsedThisPeriod?: number; subscriptionPeriodEnd?: Date } | null
      const end = updated?.subscriptionPeriodEnd
        ? new Date(updated.subscriptionPeriodEnd)
        : endOfCurrentMonth()

      return {
        hasAccess: true,
        isAdmin: false,
        source: 'valued_tester',
        tier: 'valued_tester',
        tokenAllowance: updated?.tokenAllowance ?? allowance,
        tokensUsedThisPeriod: updated?.tokensUsedThisPeriod ?? 0,
        subscriptionPeriodEnd: end,
      }
    }
  }

    return defaultDeny
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[getAppAccess]', err)
    }
    return defaultDeny
  }
}

/**
 * Use in API routes to require app access (admin, subscription, or valued tester).
 * Returns a NextResponse (403) if the user does not have access; otherwise returns null.
 */
export async function requireAppAccess(
  session: Session | null
): Promise<NextResponse | null> {
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getAppAccess(session)
  if (!access.hasAccess) {
    return NextResponse.json(
      { error: 'Subscription required', message: 'Choose a plan at /plans to access GRIP.' },
      { status: 403 }
    )
  }
  return null
}

/**
 * Use in token-consuming API routes (chat, enhanced-chat, etc.) to block when user has no tokens left
 * or when remaining tokens are below a safe minimum (prevents overage from a single large request).
 * Returns a NextResponse (403) with message if exhausted or would exceed; otherwise returns null.
 */
export async function requireTokenBalance(
  session: Session | null
): Promise<NextResponse | null> {
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const access = await getAppAccess(session)
  if (!access.hasAccess) return null
  // Enforce token limit for all users (admin, subscription, valued tester) so no one exceeds allotted tokens
  const used = access.tokensUsedThisPeriod ?? 0
  const allowance = access.tokenAllowance ?? 0
  const remaining = allowance > 0 ? allowance - used : 0
  const tier = (access.tier ?? 'starter').toLowerCase()
  const upgradeSuggestions: { action: 'upgrade' | 'add_tokens'; targetTier?: string; label: string }[] = []
  if (!access.isAdmin && tier === 'starter') {
    upgradeSuggestions.push({ action: 'upgrade', targetTier: 'pro', label: 'Upgrade to Pro (3.5M tokens/month)' })
    upgradeSuggestions.push({ action: 'upgrade', targetTier: 'team', label: 'Upgrade to Team (7M tokens/month)' })
    upgradeSuggestions.push({ action: 'add_tokens', label: 'Add more tokens to this period' })
  } else if (!access.isAdmin && tier === 'pro') {
    upgradeSuggestions.push({ action: 'upgrade', targetTier: 'team', label: 'Upgrade to Team (7M tokens/month)' })
    upgradeSuggestions.push({ action: 'add_tokens', label: 'Add more tokens to this period' })
  } else if (!access.isAdmin && tier === 'team') {
    upgradeSuggestions.push({ action: 'add_tokens', label: 'Add more tokens to this period' })
  }

  if (allowance > 0 && used >= allowance) {
    const message = access.isAdmin
      ? "You've reached your token limit. Request more from Admin portal → Token limits."
      : "You've used all your tokens for this period. Upgrade your plan or add more tokens to continue."
    return NextResponse.json(
      { error: 'Token limit reached', message, code: 'TOKENS_EXHAUSTED', tier, upgradeSuggestions },
      { status: 403 }
    )
  }
  if (allowance > 0 && remaining < SAFE_MIN_REMAINING_TOKENS) {
    const message = access.isAdmin
      ? "You're close to your token limit. Request more from Admin portal → Token limits, or wait for the next period."
      : "You're close to your token limit for this period. Upgrade or add tokens to avoid interruption."
    return NextResponse.json(
      { error: 'Token limit reached', message, code: 'TOKENS_EXHAUSTED', tier, upgradeSuggestions },
      { status: 403 }
    )
  }
  return null
}
