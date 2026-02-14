import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

/** GET /api/admin/payouts — list payouts (admin only) */
export async function GET() {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const payouts = await db.collection('payouts').find({}).sort({ createdAt: -1 }).toArray()
    return NextResponse.json({ payouts })
  } catch (e) {
    console.error('Admin payouts list error:', e)
    return NextResponse.json({ error: 'Failed to list payouts' }, { status: 500 })
  }
}

/** POST /api/admin/payouts — create payout (45% of revenue to admin, 55% to app). Admin can open/close. */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({})) as { amountCents: number; note?: string }
    const amountCents = Math.round(Number(body.amountCents) || 0)
    if (amountCents <= 0) {
      return NextResponse.json({ error: 'Amount required' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')

    const doc = {
      amountCents,
      adminShareCents: Math.round(amountCents * 0.45),
      appShareCents: Math.round(amountCents * 0.55),
      status: 'open',
      note: (body.note || '').trim() || null,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const result = await db.collection('payouts').insertOne(doc)
    const id = result.insertedId.toString()

    await db.collection('admin_activity_log').insertOne({
      action: 'payout_created',
      userId: session.user.id,
      details: { payoutId: id, amountCents, adminShareCents: doc.adminShareCents, appShareCents: doc.appShareCents },
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true, payout: { _id: id, ...doc } })
  } catch (e) {
    console.error('Admin payout create error:', e)
    return NextResponse.json({ error: 'Failed to create payout' }, { status: 500 })
  }
}
