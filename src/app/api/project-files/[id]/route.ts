import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import clientPromise, { DB_NAME } from '@/lib/db'

// Phase 8, Step 3: Create API endpoint for retrieving a specific file for preview

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: fileId } = await params
  
  try {
    if (!fileId || !ObjectId.isValid(fileId)) {
      return NextResponse.json(
        { error: 'Invalid file ID format' },
        { status: 400 }
      )
    }
    
    // Connect to database
    const client = await clientPromise
    const db = client.db(DB_NAME)
    
    // Find file in projectFiles collection
    const file = await db.collection('projectFiles').findOne({
      _id: new ObjectId(fileId)
    })
    
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }
    
    // Format the response
    const formattedFile = {
      id: file._id.toString(),
      projectId: file.projectId.toString(),
      path: file.path,
      filename: file.filename,
      content: file.content,
      language: file.language,
      size: file.size,
      version: file.version,
      metadata: file.metadata || {},
      createdAt: file.createdAt,
      updatedAt: file.updatedAt
    }
    
    return NextResponse.json(formattedFile)
  } catch (error: any) {
    console.error('Error retrieving project file:', error)
    
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/project-files/[id] - Update file content and/or path/filename.
 * Body: { content?: string, path?: string, filename?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id: fileId } = await params
    if (!fileId || !ObjectId.isValid(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 })
    }
    const body = await request.json().catch(() => ({}))
    const content = typeof body.content === 'string' ? body.content : undefined
    const path = typeof body.path === 'string' ? body.path.trim() : undefined
    const filename = typeof body.filename === 'string' ? body.filename.trim() : undefined
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const file = await db.collection('projectFiles').findOne({ _id: new ObjectId(fileId) }) as { projectId?: unknown; content?: string } | null
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    const project = await db.collection('projects').findOne({ _id: file.projectId }) as { userId?: unknown } | null
    if (project?.userId != null && String(project.userId) !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (content !== undefined) {
      updates.content = content
      updates.size = Buffer.byteLength(content, 'utf8')
    }
    if (path !== undefined) updates.path = path
    if (filename !== undefined) updates.filename = filename
    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'Provide content, path, or filename to update' }, { status: 400 })
    }
    await db.collection('projectFiles').updateOne(
      { _id: new ObjectId(fileId) },
      { $set: updates }
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Project file PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/project-files/[id] - Delete one project file.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id: fileId } = await params
    if (!fileId || !ObjectId.isValid(fileId)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 })
    }
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const file = await db.collection('projectFiles').findOne({ _id: new ObjectId(fileId) }) as { projectId?: unknown } | null
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    const project = await db.collection('projects').findOne({ _id: file.projectId }) as { userId?: unknown } | null
    if (project?.userId != null && String(project.userId) !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await db.collection('projectFiles').deleteOne({ _id: new ObjectId(fileId) })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Project file DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    )
  }
} 