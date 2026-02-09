import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import crypto from 'crypto'

/**
 * POST /api/projects/[id]/files/folder
 * Create a folder by adding a placeholder file (.gitkeep) so the folder appears in the project tree.
 * Body: { path: string } e.g. { path: "public/images" } — can be nested (public/images/assets).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id: projectId } = await params
    if (!projectId || !ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }
    const body = await request.json().catch(() => ({}))
    const rawPath = (body.path as string)?.trim()?.replace(/^\/+|\/+$/g, '')?.trim()
    if (!rawPath) {
      return NextResponse.json({ error: 'path is required (e.g. public/images)' }, { status: 400 })
    }
    const folderPath = rawPath.replace(/^\/+|\/+$/g, '').trim()
    const client = await clientPromise
    const db = client.db('test')
    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) }) as { userId?: unknown } | null
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    const userId = (session.user as { id?: string }).id ?? (session.user as { email?: string }).email
    if (project.userId != null && userId != null && String(project.userId) !== String(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const coll = db.collection('projectFiles')
    // Store as path = folder path, filename = .gitkeep so fullPath = folderPath/.gitkeep and folder appears in tree
    const existing = await coll.findOne({
      projectId: new ObjectId(projectId),
      path: folderPath,
      filename: '.gitkeep',
    })
    const content = ''
    const size = 0
    const hash = crypto.createHash('md5').update(content).digest('hex')
    const now = new Date()
    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Folder already exists',
        path: folderPath,
      })
    }
    const doc = {
      projectId: new ObjectId(projectId),
      path: folderPath,
      filename: '.gitkeep',
      content,
      language: 'plaintext',
      size,
      version: 1,
      hash,
      metadata: { generatedBy: 'repo', purpose: 'Folder placeholder' },
      history: [],
      createdAt: now,
      updatedAt: now,
    }
    await coll.insertOne(doc)
    return NextResponse.json({
      success: true,
      message: 'Folder created',
      path: folderPath,
    })
  } catch (error) {
    console.error('Project folder POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create folder' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/[id]/files/folder?path=src/components
 * Delete all generated project files under the given path (path or path/*).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id: projectId } = await params
    const { searchParams } = new URL(request.url)
    const rawPath = searchParams.get('path')?.trim()
    if (!projectId || !ObjectId.isValid(projectId) || rawPath === undefined) {
      return NextResponse.json({ error: 'Invalid project ID or missing path' }, { status: 400 })
    }
    const path = rawPath.replace(/^\/+|\/+$/g, '').trim()
    const client = await clientPromise
    const db = client.db('test')
    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) }) as { userId?: unknown } | null
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    const userId = (session.user as { id?: string }).id ?? (session.user as { email?: string }).email
    if (project.userId != null && userId != null && String(project.userId) !== String(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const pathFilter = path === ''
      ? { projectId: new ObjectId(projectId), path: '' }
      : {
          projectId: new ObjectId(projectId),
          $or: [
            { path },
            { path: { $regex: `^${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/` } },
          ],
        }
    const result = await db.collection('projectFiles').deleteMany(pathFilter)
    return NextResponse.json({ success: true, deleted: result.deletedCount })
  } catch (error) {
    console.error('Project folder DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    )
  }
}
