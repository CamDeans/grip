import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { clientPromise } from '@/lib/mongodb'

export async function POST(req: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await req.json()
    const client = await clientPromise
    const db = client.db()

    await db.collection('settings').updateOne(
      { userId: session.user.id },
      {
        $set: {
          docker: config,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving Docker settings:', error)
    return NextResponse.json(
      { error: 'Failed to save Docker settings' },
      { status: 500 }
    )
  }
}
