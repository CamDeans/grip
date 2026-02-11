import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

/** GET /api/admin/announcements — list announcements (admin only; show at top of admin portal) */
export async function GET() {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const list = await db.collection('admin_announcements').find({}).sort({ createdAt: -1 }).toArray()
    return NextResponse.json({ announcements: list })
  } catch (e) {
    console.error('Admin announcements list error:', e)
    return NextResponse.json({ error: 'Failed to list announcements' }, { status: 500 })
  }
}

/** POST /api/admin/announcements — create announcement (admin only) */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({})) as { title: string; body?: string }
    const title = (body.title || '').trim()
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const doc = {
      title,
      body: (body.body || '').trim() || null,
      createdBy: session.user.id,
      createdAt: new Date(),
    }
    const result = await db.collection('admin_announcements').insertOne(doc)
    const id = result.insertedId.toString()

    await db.collection('admin_activity_log').insertOne({
      action: 'announcement_created',
      userId: session.user.id,
      details: { id, title },
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true, announcement: { _id: id, ...doc } })
  } catch (e) {
    console.error('Admin announcement create error:', e)
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
  }
}

/** DELETE /api/admin/announcements?id= — delete announcement (admin only) */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const result = await db.collection('admin_announcements').deleteOne({ _id: new ObjectId(id) })
    if (result.deletedCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.collection('admin_activity_log').insertOne({
      action: 'announcement_deleted',
      userId: session.user.id,
      details: { id },
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Admin announcement delete error:', e)
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 })
  }
}
