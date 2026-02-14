import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { MongoClient, ObjectId } from 'mongodb'

/**
 * GET /api/user/backend-connections/test-saved
 * Test the user's saved MongoDB connection (no URI in request).
 */
export async function GET() {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { mongodbUri: 1 } }
    ) as { mongodbUri?: string } | null

    const uri = user?.mongodbUri && String(user.mongodbUri).trim()
    if (!uri) {
      return NextResponse.json({ ok: false, error: 'No saved connection' }, { status: 200 })
    }

    let userClient: MongoClient | null = null
    try {
      userClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })
      await userClient.connect()
      await userClient.db().command({ ping: 1 })
      return NextResponse.json({ ok: true, message: 'Saved connection is working' })
    } finally {
      if (userClient) await userClient.close()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed'
    return NextResponse.json({ ok: false, error: message }, { status: 200 })
  }
}
