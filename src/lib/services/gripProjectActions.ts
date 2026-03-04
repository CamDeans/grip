import { ObjectId } from 'mongodb'
import crypto from 'crypto'
import clientPromise, { DB_NAME } from '@/lib/db'
import { listProjectFiles } from '@/lib/services/fileStorageService'
import { getOrCloneRepository } from '@/lib/repository'
import { isImagePath, validateImageContent } from '@/lib/imageValidation'

/**
 * Create a folder in the project by adding a .gitkeep placeholder.
 * Used by GRIP to create folders for the user without manual steps.
 */
export async function createProjectFolder(
  projectId: string,
  folderPath: string
): Promise<{ ok: boolean; message: string }> {
  const path = folderPath.replace(/^\/+|\/+$/g, '').trim()
  if (!path) return { ok: false, message: 'path is required' }
  const client = await clientPromise
  const db = client.db(DB_NAME)
  const coll = db.collection('projectFiles')
  const existing = await coll.findOne({
    projectId: new ObjectId(projectId),
    path,
    filename: '.gitkeep',
  })
  if (existing) return { ok: true, message: 'Folder already exists' }
  const content = ''
  const hash = crypto.createHash('md5').update(content).digest('hex')
  const now = new Date()
  await coll.insertOne({
    projectId: new ObjectId(projectId),
    path,
    filename: '.gitkeep',
    content,
    language: 'plaintext',
    size: 0,
    version: 1,
    hash,
    metadata: { generatedBy: 'grip', purpose: 'Folder placeholder' },
    history: [],
    createdAt: now,
    updatedAt: now,
  })
  return { ok: true, message: 'Folder created' }
}

/**
 * Get file content by full path (project files first, then repo).
 */
export async function getFileContentByPath(
  projectId: string,
  fullPath: string
): Promise<string | null> {
  const normalized = fullPath.replace(/^\/+/, '')
  const files = await listProjectFiles(projectId)
  const file = files.find(
    (f) => (f.path ? `${f.path}/${f.filename}` : f.filename) === normalized
  )
  if (file && file.content != null) return file.content
  const project = await (await clientPromise).db(DB_NAME).collection('projects').findOne(
    { _id: new ObjectId(projectId) },
    { projection: { repository: 1 } }
  ) as { repository?: { owner: string; name: string } } | null
  if (!project?.repository) return null
  const repoFiles = await getOrCloneRepository(
    project.repository.owner,
    project.repository.name,
    projectId
  )
  const repoFile = repoFiles?.find((f) => f.path === normalized)
  return repoFile?.content ?? null
}

/**
 * Save or update a file at the given full path (path/filename).
 * Used by GRIP to copy files or write new content without user clicking Save.
 * Uses find-then-write (findOne then updateOne or insertOne) to avoid MongoDB ConflictingUpdateOperators
 * ($setOnInsert version vs $inc version on upsert). Ensures fix-build and file generation can save without 500s.
 */
export async function saveProjectFile(
  projectId: string,
  fullPath: string,
  content: string
): Promise<{ ok: boolean; message?: string; version?: number }> {
  const normalized = fullPath.replace(/^\/+/, '').trim()
  const lastSlash = normalized.lastIndexOf('/')
  const path = lastSlash >= 0 ? normalized.slice(0, lastSlash) : ''
  const filename = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized
  if (!filename) return { ok: false, message: 'filename required' }

  // For image files, ensure content is actual image data so StackBlitz can use it.
  let contentToSave = content
  if (isImagePath(fullPath)) {
    const { valid, normalized: normalizedContent } = validateImageContent(content, fullPath)
    if (!valid) return { ok: false, message: 'Image content is invalid (blank or not a recognized image format)' }
    if (normalizedContent) contentToSave = normalizedContent
  }

  const client = await clientPromise
  const db = client.db(DB_NAME)
  const coll = db.collection('projectFiles')
  const size = Buffer.byteLength(contentToSave, 'utf8')
  const hash = crypto.createHash('md5').update(contentToSave).digest('hex')
  const now = new Date()
  const filter = {
    projectId: new ObjectId(projectId),
    path,
    filename,
  }
  // Use find-then-write to avoid MongoDB ConflictingUpdateOperators ($setOnInsert version vs $inc version on upsert).
  const existing = await coll.findOne(filter, { projection: { version: 1 } })
  const nextVersion = existing ? ((existing as { version?: number }).version ?? 0) + 1 : 1
  if (existing) {
    await coll.updateOne(filter, {
      $set: {
        content: contentToSave,
        size,
        hash,
        updatedAt: now,
        version: nextVersion,
      },
    })
  } else {
    await coll.insertOne({
      ...filter,
      content: contentToSave,
      size,
      hash,
      language: 'plaintext',
      metadata: { generatedBy: 'grip', purpose: 'Saved by GRIP' },
      history: [],
      createdAt: now,
      updatedAt: now,
      version: nextVersion,
    })
  }
  return { ok: true, version: nextVersion }
}
