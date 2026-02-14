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
 * Used at chat start to give Claude full codebase context. Result is stored in analyses.projectContextDocument
 * (main) or sandboxAnalyses.projectContextDocument (sandbox).
 * @param projectId - Main project _id or sandbox project _id
 * @param isSandbox - If true, resolve project and analysis from sandboxProjects/sandboxAnalyses
 * @param priorityPaths - Paths from tree-sitter (route_map.source_file, entrypoints.file, etc.) to include first
 */
export async function buildRepoContextDocument(
  projectId: string,
  isSandbox = false,
  priorityPaths: string[] = []
): Promise<string> {
  const client = await clientPromise
  const db = client.db('test')
  const projectCollection = isSandbox ? 'sandboxProjects' : 'projects'

  const project = await db.collection(projectCollection).findOne({
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
  let filesWithContent = repo.files.filter(
    (f) => f.content && typeof f.content === 'string' && f.content.length > 0
  )
  if (priorityPaths.length > 0) {
    const prioritySet = new Set(priorityPaths.map((p) => p.replace(/\\/g, '/')))
    filesWithContent = [
      ...filesWithContent.filter((f) => prioritySet.has(f.path) || priorityPaths.some((pp) => f.path.includes(pp) || pp.includes(f.path))) ,
      ...filesWithContent.filter((f) => !prioritySet.has(f.path) && !priorityPaths.some((pp) => f.path.includes(pp) || pp.includes(f.path))),
    ]
  }

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

  const summaries = await db.collection('repoFileSummaries').find({ projectId: new ObjectId(projectId) }).toArray() as { path: string; summary: string }[]
  if (summaries.length > 0) {
    lines.push('\n## AI summaries (per file)\n')
    summaries.forEach((s) => {
      lines.push(`- **${s.path}**: ${(s.summary || '').trim()}\n`)
    })
  }

  return lines.join('\n')
}

/**
 * Get or build and persist the repo context document for a project. Returns the document string.
 * Supports both main projects (analyses) and sandbox projects (sandboxAnalyses).
 */
export async function getOrBuildRepoContextDocument(projectId: string, isSandbox = false): Promise<string> {
  const client = await clientPromise
  const db = client.db('test')
  const analysisCollection = isSandbox ? 'sandboxAnalyses' : 'analyses'

  const projectIdObj = new ObjectId(projectId)
  const analysis = await db.collection(analysisCollection).findOne(
    isSandbox
      ? { $or: [{ projectId: projectIdObj }, { projectId }] }
      : { projectId: projectIdObj },
  ) as { projectContextDocument?: string; projectId?: unknown } | null

  if (analysis?.projectContextDocument && analysis.projectContextDocument.length > 0) {
    return analysis.projectContextDocument
  }

  const analysisDoc = analysis as { repositoryAnalysis?: { structuredAnalysis?: any } }
  const sa = analysisDoc?.repositoryAnalysis?.structuredAnalysis
  // Always prioritize package.json and lockfiles so repo dependencies are in context for pattern alignment (e.g. text-to-image, text-to-video)
  const priorityPaths: string[] = ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']
  if (sa) {
    const routes = Array.isArray(sa.route_map) ? sa.route_map : []
    const entrypoints = Array.isArray(sa.entrypoints) ? sa.entrypoints : []
    const recommended = Array.isArray(sa.ideation_alignment?.recommended_integration_points) ? sa.ideation_alignment.recommended_integration_points : []
    routes.forEach((r: { source_file?: string }) => { if (r.source_file) priorityPaths.push(r.source_file) })
    entrypoints.forEach((e: { file?: string }) => { if (e.file) priorityPaths.push(e.file) })
    recommended.forEach((r: { touches?: { files?: string[] } }) => { (r.touches?.files || []).forEach((f) => priorityPaths.push(f)) })
  }

  const doc = await buildRepoContextDocument(projectId, isSandbox, priorityPaths)
  if (!doc) return ''

  const filter = isSandbox ? { $or: [{ projectId: projectIdObj }, { projectId }] } : { projectId: projectIdObj }
  await db.collection(analysisCollection).updateOne(
    filter,
    {
      $set: {
        projectId: projectIdObj,
        projectContextDocument: doc,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  )

  return doc
}
