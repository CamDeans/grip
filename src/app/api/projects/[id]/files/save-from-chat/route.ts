import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import crypto from 'crypto'
import { isImagePath, validateImageContent } from '@/lib/imageValidation'
import { recordFileSaveAndAdvanceStep } from '@/lib/services/projectStateService'

/**
 * POST /api/projects/[id]/files/save-from-chat
 * Save a code block from chat to projectFiles (create or update).
 * Uses same DB client and projectFiles collection as GET /api/project-files.
 * Body: { path?: string, filename: string, content: string, language?: string }
 */
export async function POST(
  request: NextRequest,
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
    const db = client.db('test')
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
    }) as { userId?: unknown } | null

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    const projectUserId = project.userId != null ? String(project.userId) : null
    if (projectUserId && projectUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const path = typeof body.path === 'string' ? body.path.trim() : ''
    const filename = typeof body.filename === 'string' ? body.filename.trim() : ''
    const content = typeof body.content === 'string' ? body.content : ''
    const language = typeof body.language === 'string' ? body.language.trim() || 'plaintext' : 'plaintext'

    if (!filename) {
      return NextResponse.json(
        { error: 'filename is required' },
        { status: 400 }
      )
    }

    // For image files, ensure content is actual image data (not blank/encrypted/wrong format) so StackBlitz can use it.
    let contentToSave = content
    if (isImagePath(filename)) {
      const { valid, normalized, error } = validateImageContent(content, path ? `${path}/${filename}` : filename)
      if (!valid) {
        return NextResponse.json(
          { error: error ?? 'Image content is invalid. Provide base64-encoded image data (PNG/JPEG/GIF/WEBP/BMP/ICO).' },
          { status: 400 }
        )
      }
      if (normalized) contentToSave = normalized
    }

    const coll = db.collection('projectFiles')
    const existing = await coll.findOne({
      projectId: new ObjectId(projectId),
      path,
      filename,
    })

    if (existing) {
      const size = Buffer.byteLength(contentToSave, 'utf8')
      const hash = crypto.createHash('md5').update(contentToSave).digest('hex')
      await coll.updateOne(
        { _id: existing._id },
        {
          $set: {
            content: contentToSave,
            size,
            hash,
            updatedAt: new Date(),
          },
        }
      )
      await recordFileSaveAndAdvanceStep(projectId, path, filename)
      return NextResponse.json({
        success: true,
        action: 'updated',
        file: {
          id: existing._id.toString(),
          path: existing.path,
          filename: existing.filename,
        },
      })
    }

    const size = Buffer.byteLength(contentToSave, 'utf8')
    const hash = crypto.createHash('md5').update(contentToSave).digest('hex')
    const now = new Date()
    const doc = {
      projectId: new ObjectId(projectId),
      path,
      filename,
      content: contentToSave,
      language,
      size,
      version: 1,
      hash,
      metadata: {
        generatedBy: 'chat',
        purpose: 'Saved from GRIP chat',
      },
      history: [],
      createdAt: now,
      updatedAt: now,
    }
    const result = await coll.insertOne(doc)
    const id = result.insertedId.toString()
    await recordFileSaveAndAdvanceStep(projectId, path, filename)
    return NextResponse.json({
      success: true,
      action: 'created',
      file: {
        id,
        path,
        filename,
      },
    })
  } catch (error) {
    console.error('Save-from-chat error:', error)
    const message = error instanceof Error ? error.message : 'Save failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
