import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { MongoClient, ObjectId } from 'mongodb'

/**
 * GET /api/user/backend-connections/mongodb/collections
 * List collection names from the user's connected MongoDB.
 * GRIP app DB: clientPromise uses MONGODB_URI / MONGODB_DB_NAME from .env or Vercel.
 * User's MongoDB URI comes from Settings (user profile); if unset, returns { collections: [] } so preview does not error.
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
      return NextResponse.json({ collections: [] })
    }

    let userClient: MongoClient | null = null
    try {
      userClient = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 })
      await userClient.connect()
      const userDb = userClient.db()
      // Prefer _grip_collections (names we know about)
      try {
        const metaColl = userDb.collection('_grip_collections')
        const meta = await metaColl.find({}).project({ name: 1 }).toArray()
        const fromMeta = (meta as Array<{ name?: string }>).map((d) => d.name).filter((n): n is string => typeof n === 'string')
        if (fromMeta.length > 0) {
          return NextResponse.json({ collections: fromMeta.sort() })
        }
      } catch {
        // fall through to listCollections
      }
      const names = await userDb.listCollections().map((c) => c.name).toArray()
      const filtered = names.filter((n) => n !== '_grip_collections' && !n.startsWith('system.'))
      return NextResponse.json({ collections: filtered.sort() })
    } finally {
      if (userClient) await userClient.close()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list collections'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/user/backend-connections/mongodb/collections
 * Create a new collection in the user's connected MongoDB.
 * Body: { collectionName: string, schemaHint?: string }
 * Uses the user's stored mongodbUri from their profile.
 */
export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'No MongoDB connection configured. Add your connection string in Settings → Backend connections.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const collectionName = typeof body?.collectionName === 'string' ? body.collectionName.trim() : ''
    if (!collectionName) {
      return NextResponse.json({ error: 'collectionName is required' }, { status: 400 })
    }
    if (!/^[a-zA-Z0-9_]+$/.test(collectionName)) {
      return NextResponse.json({ error: 'Collection name can only contain letters, numbers, and underscores' }, { status: 400 })
    }

    let userClient: MongoClient | null = null
    try {
      userClient = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 })
      await userClient.connect()
      const userDb = userClient.db()
      const existing = await userDb.listCollections({ name: collectionName }).hasNext()
      if (existing) {
        return NextResponse.json(
          { error: `Collection "${collectionName}" already exists` },
          { status: 400 }
        )
      }
      await userDb.createCollection(collectionName)
      const schemaHint = typeof body?.schemaHint === 'string' ? body.schemaHint.trim() : ''
      if (schemaHint) {
        try {
          const metaColl = userDb.collection('_grip_collections')
          await metaColl.insertOne({
            name: collectionName,
            schemaHint,
            createdAt: new Date(),
          })
        } catch {
          // non-fatal: collection was created; metadata is optional
        }
      }
      return NextResponse.json({ success: true, collectionName, message: `Collection "${collectionName}" created.` })
    } finally {
      if (userClient) await userClient.close()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create collection'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
