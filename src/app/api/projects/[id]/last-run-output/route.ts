import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

/**
 * GET /api/projects/[id]/last-run-output
 * Returns the last run command output for this project (from Run & Debug or terminal).
 * Used by the Enhanced Chat Run & Debug panel to show output and "Send to GRIP".
 */
export async function GET(
  _request: NextRequest,
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

    const client = await clientPromise
    const db = client.db()
    const project = await db.collection('projects').findOne(
      { _id: new ObjectId(projectId) },
      { projection: { userId: 1, projectPath: 1, lastRunOutput: 1 } }
    ) as { userId?: unknown; projectPath?: string; lastRunOutput?: { command: string; output: string; exitCode: number; duration?: number; timestamp: string } } | null

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (project.userId != null && String(project.userId) !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      canRun: Boolean(project.projectPath),
      lastRunOutput: project.lastRunOutput ?? null,
    })
  } catch (error) {
    console.error('Last-run-output GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get last run output' },
      { status: 500 }
    )
  }
}
