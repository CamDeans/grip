import { getServerAuthSession } from '@/lib/auth'
import { clientPromise } from '@/lib/mongodb'
import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'

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
      { projection: { name: 1, githubToken: 1, notifications: 1 } }
    ) as { name?: string; githubToken?: string; notifications?: boolean } | null
    // Do not send the raw token to the client; only indicate whether one is set (so UI can show "saved" state).
    const hasGithubToken = !!(user?.githubToken && String(user.githubToken).trim())
    return NextResponse.json({
      name: user?.name ?? '',
      hasGithubToken,
      notifications: user?.notifications ?? false,
    })
  } catch (error) {
    console.error('User settings GET error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, githubToken, notifications } = body

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (name !== undefined) updates.name = name
    if (githubToken !== undefined) updates.githubToken = githubToken
    if (notifications !== undefined) updates.notifications = notifications

    await db.collection('users').updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: updates },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
