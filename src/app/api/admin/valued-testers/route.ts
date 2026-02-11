import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

const MAX_VALUED_TESTERS = 10
const VALUED_TESTER_TOKENS_PER_MONTH = 50

/** GET /api/admin/valued-testers — list valued testers (admin only) */
export async function GET() {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const list = await db.collection('valued_testers').find({ removedAt: null }).sort({ addedAt: -1 }).toArray()
    return NextResponse.json({ testers: list, max: MAX_VALUED_TESTERS, tokensPerMonth: VALUED_TESTER_TOKENS_PER_MONTH })
  } catch (e) {
    console.error('Admin valued-testers list error:', e)
    return NextResponse.json({ error: 'Failed to list valued testers' }, { status: 500 })
  }
}

/** POST /api/admin/valued-testers — add valued tester (admin only). Max 10, 50 tokens/month each. */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({})) as { email: string; name?: string }
    const email = (body.email || '').trim().toLowerCase()
    const name = (body.name || '').trim() || email
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')

    const current = await db.collection('valued_testers').countDocuments({ removedAt: null })
    if (current >= MAX_VALUED_TESTERS) {
      return NextResponse.json({ error: `Maximum ${MAX_VALUED_TESTERS} valued testers` }, { status: 400 })
    }

    const existing = await db.collection('valued_testers').findOne({ email, removedAt: null })
    if (existing) return NextResponse.json({ error: 'Already a valued tester' }, { status: 400 })

    const doc = {
      email,
      name,
      tokenAllowance: VALUED_TESTER_TOKENS_PER_MONTH,
      addedAt: new Date(),
      addedBy: session.user.id,
      removedAt: null,
    }
    const result = await db.collection('valued_testers').insertOne(doc)
    const id = result.insertedId.toString()

    await db.collection('admin_activity_log').insertOne({
      action: 'valued_tester_added',
      userId: session.user.id,
      details: { email, name, id },
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true, tester: { _id: id, ...doc } })
  } catch (e) {
    console.error('Admin valued-tester add error:', e)
    return NextResponse.json({ error: 'Failed to add valued tester' }, { status: 500 })
  }
}

/** DELETE /api/admin/valued-testers — remove valued tester (admin only). Body: { email } or ?email= */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const email = request.nextUrl.searchParams.get('email') || ((await request.json().catch(() => ({})) as { email?: string }).email) || ''
    const normalized = email.trim().toLowerCase()
    if (!normalized) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')

    const result = await db.collection('valued_testers').updateOne(
      { email: normalized, removedAt: null },
      { $set: { removedAt: new Date(), removedBy: session.user.id } }
    )
    if (result.matchedCount === 0) return NextResponse.json({ error: 'Valued tester not found' }, { status: 404 })

    await db.collection('admin_activity_log').insertOne({
      action: 'valued_tester_removed',
      userId: session.user.id,
      details: { email: normalized },
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Admin valued-tester remove error:', e)
    return NextResponse.json({ error: 'Failed to remove valued tester' }, { status: 500 })
  }
}
