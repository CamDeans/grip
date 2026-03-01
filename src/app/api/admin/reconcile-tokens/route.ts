import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

/**
 * POST /api/admin/reconcile-tokens
 * Admin only. Set a user's tokensUsedThisPeriod to a specific value so GRIP tracking matches
 * actual usage (e.g. from Claude console). Use when there's a discrepancy (e.g. race-condition
 * undercount) so real users see correct remaining tokens.
 *
 * Body: { userId?: string, email?: string, tokensUsedThisPeriod?: number, remaining?: number }
 * - userId or email: target user (required).
 * - Exactly one of tokensUsedThisPeriod or remaining (required).
 * - tokensUsedThisPeriod: set recorded usage to this value (capped at tokenAllowance).
 * - remaining: set tokensUsedThisPeriod = max(0, tokenAllowance - remaining).
 */
export async function POST(request: NextRequest) {
  const session = await getServerAuthSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json().catch(() => ({})) as {
      userId?: string
      email?: string
      tokensUsedThisPeriod?: number
      remaining?: number
    }
    const userId = body.userId?.trim()
    const email = body.email?.trim()?.toLowerCase()
    const tokensUsed = body.tokensUsedThisPeriod
    const remaining = body.remaining

    const hasUser = !!(userId || email)
    const hasUsed = typeof tokensUsed === 'number' && tokensUsed >= 0
    const hasRemaining = typeof remaining === 'number' && remaining >= 0
    if (!hasUser) {
      return NextResponse.json(
        { error: 'Provide userId or email to identify the user.' },
        { status: 400 }
      )
    }
    if (hasUsed && hasRemaining) {
      return NextResponse.json(
        { error: 'Provide only one of tokensUsedThisPeriod or remaining.' },
        { status: 400 }
      )
    }
    if (!hasUsed && !hasRemaining) {
      return NextResponse.json(
        { error: 'Provide either tokensUsedThisPeriod (recorded usage to set) or remaining (tokens left).' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const users = db.collection('users')

    let targetId: ObjectId | null = null
    if (userId && ObjectId.isValid(userId)) {
      targetId = new ObjectId(userId)
    } else if (email) {
      const u = await users.findOne(
        { email },
        { projection: { _id: 1 } }
      ) as { _id: ObjectId } | null
      targetId = u?._id ?? null
    }
    if (!targetId) {
      return NextResponse.json(
        { error: 'User not found. Provide a valid userId or email.' },
        { status: 404 }
      )
    }

    const user = await users.findOne(
      { _id: targetId },
      { projection: { tokenAllowance: 1, tokensUsedThisPeriod: 1 } }
    ) as { tokenAllowance?: number; tokensUsedThisPeriod?: number } | null
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const allowance = user.tokenAllowance ?? 0
    let newUsed: number
    if (hasUsed) {
      newUsed = allowance > 0 ? Math.min(tokensUsed!, allowance) : tokensUsed!
    } else {
      newUsed = Math.max(0, allowance - remaining!)
    }

    await users.updateOne(
      { _id: targetId },
      { $set: { tokensUsedThisPeriod: newUsed, updatedAt: new Date() } }
    )

    const newRemaining = allowance > 0 ? Math.max(0, allowance - newUsed) : 0
    return NextResponse.json({
      success: true,
      message: `Reconciled: tokensUsedThisPeriod = ${newUsed.toLocaleString()}, remaining = ${newRemaining.toLocaleString()} (allowance ${allowance.toLocaleString()}).`,
      tokensUsedThisPeriod: newUsed,
      remaining: newRemaining,
      tokenAllowance: allowance,
    })
  } catch (e) {
    console.error('Admin reconcile-tokens error:', e)
    return NextResponse.json({ error: 'Failed to reconcile tokens' }, { status: 500 })
  }
}
