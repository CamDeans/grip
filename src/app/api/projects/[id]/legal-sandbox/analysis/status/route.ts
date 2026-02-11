import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { getSandboxProject } from '@/lib/services/sandboxProjectService'

const SANDBOX_ANALYSES_COLLECTION = 'sandboxAnalyses'

/**
 * GET /api/projects/[id]/legal-sandbox/analysis/status
 * Returns analysis status for the sandbox project only (reads sandboxAnalyses, not main projects).
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
    const doc = await db.collection(SANDBOX_ANALYSES_COLLECTION).findOne(
      { projectId },
      { projection: { repositoryAnalysis: 1, updatedAt: 1 } }
    )

    return NextResponse.json({
      hasAnalysis: !!doc?.repositoryAnalysis,
      analysis: doc?.repositoryAnalysis ?? null,
      analysisCompleted: !!doc?.repositoryAnalysis,
    })
  } catch (error) {
    console.error('Sandbox analysis status error:', error)
    return NextResponse.json(
      { error: 'Failed to check analysis status' },
      { status: 500 }
    )
  }
}
