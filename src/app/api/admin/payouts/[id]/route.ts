import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

/** PATCH /api/admin/payouts/[id] — open/close payout (admin only) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Payout ID required' }, { status: 400 })

    const body = await request.json().catch(() => ({})) as { status?: string }
    const status = body.status === 'closed' ? 'closed' : 'open'

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')

    const result = await db.collection('payouts').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    )
    if (result.matchedCount === 0) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })

    await db.collection('admin_activity_log').insertOne({
      action: 'payout_updated',
      userId: session.user.id,
      details: { payoutId: id, status },
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true, status })
  } catch (e) {
    console.error('Admin payout update error:', e)
    return NextResponse.json({ error: 'Failed to update payout' }, { status: 500 })
  }
}
