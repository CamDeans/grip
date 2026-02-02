import { getServerAuthSession } from '@/lib/auth'
import { clientPromise } from '@/lib/mongodb'
import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'

export async function PUT(req: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, githubToken, notifications } = body

    const client = await clientPromise
    const db = client.db()

    await db.collection('users').updateOne(
      { _id: new ObjectId(session.user.id) },
      {
        $set: {
          name,
          githubToken,
          notifications,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
