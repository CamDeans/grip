import { ObjectId } from 'mongodb'
import crypto from 'crypto'
import clientPromise from '@/lib/db'
import { isImagePath, validateImageContent } from '@/lib/imageValidation'

const COLLECTION = 'legalSandboxFiles'

export type LegalSandboxFile = {
  path: string
  filename: string
  content: string
  createdAt?: Date
  updatedAt?: Date
}

/**
 * List all files in the legal sandbox for a project (for UI display).
 */
export async function listLegalSandboxFiles(projectId: string): Promise<LegalSandboxFile[]> {
  const client = await clientPromise
  const db = client.db('test')
  const docs = await db
    .collection(COLLECTION)
    .find({ projectId: new ObjectId(projectId) })
    .project({ path: 1, filename: 1, content: 1, createdAt: 1, updatedAt: 1 })
    .toArray() as Array<{ path?: string; filename?: string; content?: string; createdAt?: Date; updatedAt?: Date }>
  return docs.map((d) => ({
    path: d.path ?? '',
    filename: d.filename ?? '',
    content: d.content ?? '',
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }))
}

/**
 * Upsert a file in the legal sandbox. Path is folder path, filename is the file name.
 */
export async function upsertLegalSandboxFile(
  projectId: string,
  fullPath: string,
  content: string
): Promise<{ ok: boolean; message?: string }> {
  const normalized = fullPath.replace(/^\/+/, '').trim()
  const lastSlash = normalized.lastIndexOf('/')
  const path = lastSlash >= 0 ? normalized.slice(0, lastSlash) : ''
  const filename = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized
  if (!filename) return { ok: false, message: 'filename required' }

  let contentToSave = content
  if (isImagePath(fullPath)) {
    const { valid, normalized: norm } = validateImageContent(content, fullPath)
    if (!valid) return { ok: false, message: 'Image content is invalid' }
    if (norm) contentToSave = norm
  }

  const client = await clientPromise
  const db = client.db('test')
  const coll = db.collection(COLLECTION)
  const size = Buffer.byteLength(contentToSave, 'utf8')
  const hash = crypto.createHash('md5').update(contentToSave).digest('hex')
  const now = new Date()

  const existing = await coll.findOne({
    projectId: new ObjectId(projectId),
    path,
    filename,
  })

  if (existing) {
    await coll.updateOne(
      { _id: existing._id },
      { $set: { content: contentToSave, size, hash, updatedAt: now } }
    )
    return { ok: true }
  }

  await coll.insertOne({
    projectId: new ObjectId(projectId),
    path,
    filename,
    content: contentToSave,
    language: 'plaintext',
    size,
    version: 1,
    hash,
    metadata: { source: 'legal-sandbox' },
    createdAt: now,
    updatedAt: now,
  })
  return { ok: true }
}

/**
 * Create a folder in the sandbox (adds a .gitkeep placeholder).
 */
export async function createLegalSandboxFolder(
  projectId: string,
  folderPath: string
): Promise<{ ok: boolean; message: string }> {
  const path = folderPath.replace(/^\/+|\/+$/g, '').trim()
  if (!path) return { ok: false, message: 'path is required' }
  return upsertLegalSandboxFile(projectId, `${path}/.gitkeep`, '')
}

/** Normalize to forward slashes, no leading slash — same as runSandboxProject and StackBlitz export. */
function normalizeExportPath(p: string): string {
  return p.replace(/^\/+/, '').replace(/\\/g, '/').trim() || p
}

/**
 * Return sandbox files as { path, content }[] for export (path = path/filename or filename).
 * Paths are normalized so run and StackBlitz export use the same hierarchy.
 */
export async function getLegalSandboxFilesForExport(
  projectId: string
): Promise<{ path: string; content: string }[]> {
  const files = await listLegalSandboxFiles(projectId)
  return files.map((f) => {
    const fullPath = f.path ? `${f.path}/${f.filename}` : f.filename
    return { path: normalizeExportPath(fullPath), content: f.content ?? '' }
  })
}
