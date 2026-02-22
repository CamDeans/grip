import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { clientPromise, DB_NAME } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)

    // Get chat history from projectState
    const projectState = await db.collection('projectState').findOne({
      projectId: new ObjectId(id)
    })

    return NextResponse.json({ messages: projectState?.chatHistory || [] })
  } catch (error) {
    console.error('Error loading chat history:', error)
    return NextResponse.json(
      { error: 'Failed to load chat history' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authSession = await getServerAuthSession()
    if (!authSession?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages } = await request.json()
    const client = await clientPromise
    const db = client.db(DB_NAME)

    // Update only projectState with new chat history
    const result = await db.collection('projectState').updateOne(
      { projectId: new ObjectId(id) },
      { 
        $set: { 
          chatHistory: messages,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )

    if (!result.acknowledged) {
      throw new Error('Failed to update chat history')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving chat history:', error)
    return NextResponse.json(
      { error: 'Failed to save chat history' },
      { status: 500 }
    )
  }
}