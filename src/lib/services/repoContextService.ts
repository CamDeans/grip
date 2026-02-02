import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'

const MAX_CHARS_PER_FILE = 4000
const MAX_TOTAL_CHARS = 35000
const MAX_FILES_WITH_CONTENT = 50

interface RepoFile {
  path: string
  content?: string | null
  type?: string
}

/**
 * Build a single reference document from the full repo stored in DB (repositories collection).
 * Used at chat start to give Claude full codebase context. Result is stored in analyses.projectContextDocument.
 */
export async function buildRepoContextDocument(projectId: string): Promise<string> {
  const client = await clientPromise
  const db = client.db('test')

  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId),
  }) as { repository?: { owner: string; name: string } } | null

  if (!project?.repository) {
    return ''
  }

  const repo = await db.collection('repositories').findOne({
    owner: project.repository.owner,
    repo: project.repository.name,
    linkedProjects: new ObjectId(projectId),
  }) as { files?: RepoFile[] } | null

  if (!repo?.files?.length) {
    return ''
  }

  const lines: string[] = []
  lines.push('# Repository reference (full codebase summary)\n')
  lines.push(`Repo: ${project.repository.owner}/${project.repository.name}\n`)
  lines.push('## Directory structure\n')
  const paths = repo.files.map((f) => f.path).sort()
  paths.forEach((p) => lines.push(`- ${p}`))
  lines.push('\n## File contents (excerpts)\n')

  let totalChars = 0
  const filesWithContent = repo.files.filter(
    (f) => f.content && typeof f.content === 'string' && f.content.length > 0
  )

  for (let i = 0; i < filesWithContent.length && i < MAX_FILES_WITH_CONTENT; i++) {
    if (totalChars >= MAX_TOTAL_CHARS) break
    const f = filesWithContent[i]
    const content = (f.content || '').slice(0, MAX_CHARS_PER_FILE)
    const truncated = (f.content || '').length > MAX_CHARS_PER_FILE
    lines.push(`### ${f.path}\n`)
    lines.push('```')
    lines.push(content)
    lines.push('```')
    if (truncated) lines.push('_(truncated)_\n')
    else lines.push('')
    totalChars += content.length
  }

  if (filesWithContent.length > MAX_FILES_WITH_CONTENT) {
    lines.push(`\n_(${filesWithContent.length - MAX_FILES_WITH_CONTENT} more files not shown)_`)
  }

  return lines.join('\n')
}

/**
 * Get or build and persist the repo context document for a project. Returns the document string.
 */
export async function getOrBuildRepoContextDocument(projectId: string): Promise<string> {
  const client = await clientPromise
  const db = client.db('test')

  const analysis = await db.collection('analyses').findOne({
    projectId: new ObjectId(projectId),
  }) as { projectContextDocument?: string } | null

  if (analysis?.projectContextDocument && analysis.projectContextDocument.length > 0) {
    return analysis.projectContextDocument
  }

  const doc = await buildRepoContextDocument(projectId)
  if (!doc) return ''

  await db.collection('analyses').updateOne(
    { projectId: new ObjectId(projectId) },
    {
      $set: {
        projectContextDocument: doc,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  )

  return doc
}
