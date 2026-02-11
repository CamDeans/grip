import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

/** GET /api/admin/app-updates — list app updates (admin only). Main app reads this to show toasts. */
export async function GET(request: NextRequest) {
  const isPublic = request.nextUrl.searchParams.get('public') === 'true'
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const now = new Date()
    const list = await db
      .collection('app_updates')
      .find(isPublic ? { activeUntil: { $gt: now } } : {})
      .sort({ createdAt: -1 })
      .limit(isPublic ? 5 : 50)
      .toArray()
    return NextResponse.json({ updates: list })
  } catch (e) {
    console.error('App updates list error:', e)
    return NextResponse.json({ error: 'Failed to list app updates' }, { status: 500 })
  }
}

/** POST /api/admin/app-updates — create app update (admin only). Shown as toast in main app. */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({})) as { message: string; type?: string; activeUntil?: string }
    const message = (body.message || '').trim()
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })
    const type = (body.type === 'downtime' || body.type === 'info') ? body.type : 'info'
    const activeUntil = body.activeUntil ? new Date(body.activeUntil) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const doc = {
      message,
      type,
      activeUntil,
      createdBy: session.user.id,
      createdAt: new Date(),
    }
    const result = await db.collection('app_updates').insertOne(doc)
    const id = result.insertedId.toString()

    await db.collection('admin_activity_log').insertOne({
      action: 'app_update_created',
      userId: session.user.id,
      details: { id, message, type },
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true, update: { _id: id, ...doc } })
  } catch (e) {
    console.error('Admin app-update create error:', e)
    return NextResponse.json({ error: 'Failed to create app update' }, { status: 500 })
  }
}

/** DELETE /api/admin/app-updates?id= — delete app update (admin only) */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const result = await db.collection('app_updates').deleteOne({ _id: new ObjectId(id) })
    if (result.deletedCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.collection('admin_activity_log').insertOne({
      action: 'app_update_deleted',
      userId: session.user.id,
      details: { id },
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Admin app-update delete error:', e)
    return NextResponse.json({ error: 'Failed to delete app update' }, { status: 500 })
  }
}
