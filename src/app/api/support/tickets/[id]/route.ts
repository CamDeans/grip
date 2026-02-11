import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

/** PATCH /api/support/tickets/[id] — admin open/close ticket */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({})) as { status?: string }
    const status = body.status === 'closed' ? 'closed' : 'open'

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')

    const result = await db.collection('support_tickets').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('Support ticket update error:', error)
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    )
  }
}
