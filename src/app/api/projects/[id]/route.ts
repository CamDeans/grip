import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise, { DB_NAME } from '@/lib/db'
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
  const db = client.db(DB_NAME)
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
    if (body.mongodbCollectionName !== undefined) {
      update.mongodbCollectionName = typeof body.mongodbCollectionName === 'string' ? body.mongodbCollectionName.trim() || null : null
    }

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

/** DELETE /api/projects/[id] - Permanently delete project or sandbox experiment */
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

    const oid = new ObjectId(id)

    // 1. Try main project first
    const project = await db.collection('projects').findOne({ _id: oid })
    if (project) {
      const projectUserId = (project as { userId?: string | { toString(): string } }).userId
      const projectUserIdStr = projectUserId != null ? (typeof projectUserId === 'object' && 'toString' in projectUserId ? projectUserId.toString() : String(projectUserId)) : null
      if (projectUserIdStr && projectUserIdStr !== userId) {
        return new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
      }
      await db.collection('projectFiles').deleteMany({ $or: [{ projectId: oid }, { projectId: id }] })
      await db.collection('projectStates').deleteMany({ projectId: oid })
      await db.collection('chatHistory').deleteMany({ $or: [{ projectId: oid }, { projectId: id }] })
      await db.collection('developmentPlans').deleteMany({ projectId: oid })
      await db.collection('planMetadata').deleteMany({ projectId: oid })
      await db.collection('planBackups').deleteMany({ projectId: oid })
      await db.collection('projectStructures').deleteMany({ projectId: oid })
      await db.collection('sandboxProjects').deleteMany({ parentProjectId: oid })
      await db.collection('projects').deleteOne({ _id: oid })
      return NextResponse.json({ success: true, message: 'Project deleted' })
    }

    // 2. Try sandbox experiment
    const sandboxProject = await db.collection('sandboxProjects').findOne({ _id: oid })
    if (sandboxProject) {
      const sandboxUserId = (sandboxProject as { userId?: string }).userId
      if (sandboxUserId && sandboxUserId !== userId) {
        return new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
      }
      await db.collection('legalSandboxFiles').deleteMany({ projectId: oid })
      await db.collection('sandboxChatHistory').deleteMany({ projectId: oid })
      await db.collection('sandboxAnalyses').deleteMany({ projectId: oid })
      await db.collection('legalSandboxPlans').deleteMany({ projectId: oid })
      await db.collection('sandboxProjects').deleteOne({ _id: oid })
      return NextResponse.json({ success: true, message: 'Sandbox experiment deleted' })
    }

    return new NextResponse(JSON.stringify({ error: 'Project not found' }), { status: 404 })
  } catch (error: unknown) {
    console.error('Error deleting project:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Something went wrong' }),
      { status: 500 }
    )
  }
}
