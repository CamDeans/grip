import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

/**
 * POST /api/admin/reset-tokens
 * Reset tokensUsedThisPeriod to 0 for the current user (admin) or for a specific user (admin only).
 * Body: {} to reset own tokens; { userId?: string, email?: string } to reset another user (admin only).
 * Used for quick response when token/access errors affect admin or real users.
 */
export async function POST(request: NextRequest) {
  const session = await getServerAuthSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json().catch(() => ({})) as { userId?: string; email?: string }
    const userId = body.userId?.trim()
    const email = body.email?.trim()?.toLowerCase()

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const users = db.collection('users')

    let targetId: ObjectId | null = null

    if (userId || email) {
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
    } else {
      targetId = new ObjectId(session.user.id)
    }

    const result = await users.updateOne(
      { _id: targetId },
      { $set: { tokensUsedThisPeriod: 0, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isSelf = targetId.equals(new ObjectId(session.user.id))
    return NextResponse.json({
      success: true,
      message: isSelf
        ? 'Your tokens have been reset to zero for this period.'
        : 'User tokens have been reset to zero for this period.',
    })
  } catch (e) {
    console.error('Admin reset-tokens error:', e)
    return NextResponse.json({ error: 'Failed to reset tokens' }, { status: 500 })
  }
}
