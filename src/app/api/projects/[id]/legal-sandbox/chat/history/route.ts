import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { getSandboxProject } from '@/lib/services/sandboxProjectService'

const COLLECTION = 'sandboxChatHistory'
const MAX_MESSAGES = 100

/**
 * GET /api/projects/[id]/legal-sandbox/chat/history
 * Returns persisted chat history for this sandbox project only.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    if (!projectId || !ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const project = await getSandboxProject(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Sandbox project not found' }, { status: 404 })
    }
    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db('test')
    const doc = await db.collection(COLLECTION).findOne(
      { projectId },
      { projection: { messages: 1 } }
    )

    const messages = Array.isArray(doc?.messages) ? doc.messages.slice(-MAX_MESSAGES) : []
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Sandbox chat history GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load chat history' },
      { status: 500 }
    )
  }
}
