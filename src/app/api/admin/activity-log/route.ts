import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import clientPromise from '@/lib/db'

/** GET /api/admin/activity-log — list admin portal activity (admin only) */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500)

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const log = await db.collection('admin_activity_log').find({}).sort({ createdAt: -1 }).limit(limit).toArray()

    return NextResponse.json({ log })
  } catch (e) {
    console.error('Admin activity-log error:', e)
    return NextResponse.json({ error: 'Failed to fetch activity log' }, { status: 500 })
  }
}
