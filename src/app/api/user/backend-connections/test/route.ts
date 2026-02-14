import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { MongoClient } from 'mongodb'

/**
 * POST /api/user/backend-connections/test
 * Test a MongoDB connection string. Body: { mongodbUri: string }
 * Does not store the URI; use PUT /api/user/settings with mongodbUri to save.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const uri = typeof body?.mongodbUri === 'string' ? body.mongodbUri.trim() : ''
    if (!uri) {
      return NextResponse.json({ error: 'mongodbUri is required' }, { status: 400 })
    }

    let client: MongoClient | null = null
    try {
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })
      await client.connect()
      await client.db().command({ ping: 1 })
      return NextResponse.json({ ok: true, message: 'Connection successful' })
    } finally {
      if (client) await client.close()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed'
    return NextResponse.json({ ok: false, error: message }, { status: 200 })
  }
}
