import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise, { DB_NAME } from '@/lib/db'
import { ObjectId } from 'mongodb'
import crypto from 'crypto'
import {
  getUploadPurpose,
  isAllowedUpload,
  validateAndPrepareUploadContent,
  DEFAULT_IMAGE_PATH,
  DEFAULT_DOC_PATH,
  type UploadPurpose,
} from '@/lib/uploadValidation'

const PROJECT_FILES_COLLECTION = 'projectFiles'
const USER_UPLOAD_SOURCE = 'user_upload'

/**
 * GET /api/projects/[id]/uploads
 * List user-uploaded files (images and reference docs) for this project.
 * Used by Overview and by enhanced chat to inject "User uploads" into GRIP context.
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

    const client = await clientPromise
    const db = client.db(DB_NAME)
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
    }) as { userId?: unknown } | null

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (project.userId != null && String(project.userId) !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const docs = await db
      .collection(PROJECT_FILES_COLLECTION)
      .find({
        projectId: new ObjectId(projectId),
        'metadata.generatedBy': USER_UPLOAD_SOURCE,
      })
      .project({ path: 1, filename: 1, size: 1, metadata: 1 })
      .sort({ path: 1, filename: 1 })
      .toArray() as Array<{ path?: string; filename?: string; size?: number; metadata?: { purpose?: string; mimeType?: string } }>

    const uploads = docs.map((d) => ({
      path: d.path ?? '',
      filename: d.filename ?? '',
      size: d.size ?? 0,
      purpose: (d.metadata?.purpose as string) || 'reference_doc',
      mimeType: d.metadata?.mimeType as string | undefined,
    }))

    return NextResponse.json({ uploads })
  } catch (error) {
    console.error('List uploads error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list uploads' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects/[id]/uploads
 * Upload one or more files (images or reference docs) for GRIP to use in the build.
 * Body: multipart/form-data with field "file" (or "files") — images go to public/, docs to docs/ by default.
 * Optional field "path" per file or single "path" for all: override folder (e.g. "public" or "docs").
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
    const db = client.db(DB_NAME)
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
    }) as { userId?: unknown } | null

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (project.userId != null && String(project.userId) !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const files: File[] = []
    for (const [key, value] of formData.entries()) {
      if ((key === 'file' || key === 'files') && value instanceof File && value.size > 0) {
        files.push(value)
      }
    }
    const globalPathOverride = formData.get('path')
    const pathOverride = typeof globalPathOverride === 'string' ? globalPathOverride.trim() : ''

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No file(s) provided. Use form field "file" or "files".' },
        { status: 400 }
      )
    }

    const coll = db.collection(PROJECT_FILES_COLLECTION)
    const projectIdObj = new ObjectId(projectId)
    const now = new Date()
    const results: Array<{ path: string; filename: string; size: number; purpose: UploadPurpose }> = []
    const errors: string[] = []

    for (const file of files) {
      const purpose = getUploadPurpose(file.type, file.name)
      if (!purpose || !isAllowedUpload(file.type, file.name)) {
        errors.push(`${file.name}: type not allowed. Use images (PNG/JPEG/GIF/WEBP/ICO/BMP) or docs (PDF/TXT/MD).`)
        continue
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const prepared = validateAndPrepareUploadContent(buffer, purpose, file.name)
      if (!prepared.ok) {
        errors.push(`${file.name}: ${prepared.error}`)
        continue
      }

      const folder =
        pathOverride ||
        (purpose === 'image' ? DEFAULT_IMAGE_PATH : DEFAULT_DOC_PATH)
      const path = folder.replace(/\/+$/, '').replace(/^\/+/, '')
      const filename = file.name.replace(/^.*[\\/]/, '') || 'upload'
      const content = prepared.content
      const size = Buffer.byteLength(content, 'utf8')
      const hash = crypto.createHash('md5').update(content).digest('hex')

      const existing = await coll.findOne({
        projectId: projectIdObj,
        path,
        filename,
      })

      const doc = {
        projectId: projectIdObj,
        path,
        filename,
        content,
        language: prepared.language,
        size,
        version: 1,
        hash,
        metadata: {
          generatedBy: USER_UPLOAD_SOURCE,
          purpose,
          mimeType: file.type || undefined,
        },
        history: [],
        createdAt: now,
        updatedAt: now,
      }

      if (existing) {
        await coll.updateOne(
          { _id: existing._id },
          { $set: { content, size, hash, metadata: doc.metadata, updatedAt: now } }
        )
      } else {
        await coll.insertOne(doc)
      }
      results.push({ path, filename, size, purpose })
    }

    if (results.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: 'All uploads failed.', details: errors },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      uploads: results,
      ...(errors.length > 0 ? { warnings: errors } : {}),
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
