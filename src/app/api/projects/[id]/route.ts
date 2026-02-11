import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId, type Db } from 'mongodb'
import type { Session } from 'next-auth'

type AuthAndProject = { session: Session; id: string; db: Db }

async function requireAuthAndProjectId(
  params: Promise<{ id: string }>
): Promise<AuthAndProject | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
  }
  const { id } = await params
  if (!ObjectId.isValid(id)) {
    return new NextResponse(JSON.stringify({ error: 'Invalid project ID format' }), { status: 400 })
  }
  const client = await clientPromise
  const db = client.db('test')
  return { session, id, db }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAuthAndProjectId(params)
    if (result instanceof NextResponse) return result
    const { id, db } = result

    // Try main projects first
    let project = await db.collection('projects').findOne({ _id: new ObjectId(id) })
    if (project) {
      return NextResponse.json({ ...project, isSandbox: false })
    }

    // Try sandbox projects
    const sandboxProject = await db.collection('sandboxProjects').findOne({ _id: new ObjectId(id) })
    if (sandboxProject) {
      // Convert to unified format
      return NextResponse.json({
        _id: sandboxProject._id,
        title: sandboxProject.title,
        description: sandboxProject.description,
        repository: sandboxProject.repository,
        ideation: sandboxProject.ideation,
        userId: sandboxProject.userId,
        createdAt: sandboxProject.createdAt,
        updatedAt: sandboxProject.updatedAt,
        status: 'active',
        isSandbox: true,
        parentProjectId: sandboxProject.parentProjectId,
      })
    }

    return new NextResponse(JSON.stringify({ error: 'Project not found' }), { status: 404 })
  } catch (error: unknown) {
    console.error('Error loading project:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Something went wrong' }),
      { status: 500 }
    )
  }
}

/** PATCH /api/projects/[id] - Update project (title, description, ideation, repository, status) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAuthAndProjectId(params)
    if (result instanceof NextResponse) return result
    const { id, db } = result
    const userId = result.session.user?.id
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
    }

    const project = await db.collection('projects').findOne({ _id: new ObjectId(id) })
    if (!project) {
      return new NextResponse(JSON.stringify({ error: 'Project not found' }), { status: 404 })
    }
    // Ensure user owns project if schema has userId
    const projectUserId = (project as { userId?: string | { toString(): string } }).userId
    const projectUserIdStr = projectUserId != null ? (typeof projectUserId === 'object' && 'toString' in projectUserId ? projectUserId.toString() : String(projectUserId)) : null
    if (projectUserIdStr && projectUserIdStr !== userId) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (body.title !== undefined) update.title = body.title
    if (body.description !== undefined) update.description = body.description
    if (body.status !== undefined) {
      if (!['active', 'completed', 'archived'].includes(body.status)) {
        return new NextResponse(JSON.stringify({ error: 'Invalid status' }), { status: 400 })
      }
      update.status = body.status
    }
    if (body.ideation !== undefined) update.ideation = body.ideation
    if (body.repository !== undefined) update.repository = body.repository
    if (body.completionStatus !== undefined) {
      const allowed = ['draft', 'ready_to_export', 'exported', 'deployed']
      if (!allowed.includes(body.completionStatus)) {
        return new NextResponse(JSON.stringify({ error: 'Invalid completionStatus' }), { status: 400 })
      }
      update.completionStatus = body.completionStatus
    }
    if (body.exportedRepoUrl !== undefined) update.exportedRepoUrl = body.exportedRepoUrl
    if (body.deployedUrl !== undefined) update.deployedUrl = body.deployedUrl

    await db.collection('projects').updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    )
    const updated = await db.collection('projects').findOne({ _id: new ObjectId(id) })
    return NextResponse.json(updated)
  } catch (error: unknown) {
    console.error('Error updating project:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Something went wrong' }),
      { status: 500 }
    )
  }
}

/** DELETE /api/projects/[id] - Permanently delete project */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireAuthAndProjectId(params)
    if (result instanceof NextResponse) return result
    const { id, db } = result
    const userId = result.session.user?.id
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
    }

    const project = await db.collection('projects').findOne({ _id: new ObjectId(id) })
    if (!project) {
      return new NextResponse(JSON.stringify({ error: 'Project not found' }), { status: 404 })
    }
    const projectUserId = (project as { userId?: string | { toString(): string } }).userId
    const projectUserIdStr = projectUserId != null ? (typeof projectUserId === 'object' && 'toString' in projectUserId ? projectUserId.toString() : String(projectUserId)) : null
    if (projectUserIdStr && projectUserIdStr !== userId) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    }

    await db.collection('projects').deleteOne({ _id: new ObjectId(id) })
    return NextResponse.json({ success: true, message: 'Project deleted' })
  } catch (error: unknown) {
    console.error('Error deleting project:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Something went wrong' }),
      { status: 500 }
    )
  }
}
