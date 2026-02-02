import { getServerAuthSession } from '@/lib/auth'
import { clientPromise } from '@/lib/mongodb'
import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email } = await req.json()
    const client = await clientPromise
    const db = client.db()

    const user = await db.collection('users').findOne({ email })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await db.collection('projects').updateOne(
      { _id: new ObjectId(params.id) },
      { $addToSet: { collaborators: user._id } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()

    const project = await db.collection('projects').findOne({
      _id: new ObjectId(params.id),
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const collaborators = await db
      .collection('users')
      .find({ _id: { $in: project.collaborators || [] } })
      .project({ password: 0 })
      .toArray()

    return NextResponse.json(collaborators)
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
