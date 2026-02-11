import { NextResponse } from 'next/server'
import clientPromise from '@/lib/db'

/** GET /api/app-updates — public: active app updates (for main app toast). No auth. */
export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const now = new Date()
    const updates = await db
      .collection('app_updates')
      .find({ activeUntil: { $gt: now } })
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ message: 1, type: 1, activeUntil: 1 })
      .toArray()
    return NextResponse.json({ updates })
  } catch (e) {
    console.error('App updates public error:', e)
    return NextResponse.json({ updates: [] })
  }
}
