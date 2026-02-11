import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

/**
 * GET /api/projects/[id]/sandboxes
 * Returns all sandbox experiments linked to this main project.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: mainProjectId } = await params
    if (!mainProjectId || !ObjectId.isValid(mainProjectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('test')

    // Verify main project exists and user owns it
    const mainProject = await db.collection('projects').findOne({
      _id: new ObjectId(mainProjectId),
      userId: session.user.id,
    })

    if (!mainProject) {
      return NextResponse.json({ error: 'Main project not found' }, { status: 404 })
    }

    // Find all sandboxes linked to this main project
    const sandboxes = await db
      .collection('sandboxProjects')
      .find({
        parentProjectId: new ObjectId(mainProjectId),
        userId: session.user.id,
      })
      .sort({ updatedAt: -1 })
      .toArray()

    // Convert to unified format
    const formattedSandboxes = sandboxes.map((sb: any) => ({
      _id: sb._id,
      title: sb.title,
      description: sb.description,
      repository: sb.repository,
      ideation: sb.ideation,
      createdAt: sb.createdAt,
      updatedAt: sb.updatedAt,
      parentProjectId: sb.parentProjectId,
      isSandbox: true,
    }))

    return NextResponse.json({ sandboxes: formattedSandboxes })
  } catch (error) {
    console.error('Error fetching sandboxes:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sandboxes' },
      { status: 500 }
    )
  }
}
