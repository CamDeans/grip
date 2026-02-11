import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import { getSandboxProject } from '@/lib/services/sandboxProjectService'

/**
 * GET /api/legal-sandbox/projects/[id]
 * Get one sandbox project. Returns 404 if not found or not owner. Main app never uses this.
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

    const project = await getSandboxProject(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Sandbox project not found' }, { status: 404 })
    }
    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Legal-sandbox project get error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get sandbox project' },
      { status: 500 }
    )
  }
}
