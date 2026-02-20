/**
 * Project context for mandatory high-level files (package.json, tsconfig.json, entry point).
 * Uses project title, analysis (structured analysis + repo type), and entrypoints so
 * generated package.json scripts and entry path match the project.
 */

import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'
import { detectRepoType, type RepoTypeCategory } from '@/lib/repoTypeDetection'

export type HighLevelFileContext = {
  projectName: string
  devScript: string
  buildScript: string
  startScript: string
  entryPath: string
  framework: 'next' | 'vite' | 'cra' | 'generic'
  repoCategory: RepoTypeCategory
}

const DEFAULT_ENTRY = 'src/index.tsx'
const DEFAULT_PROJECT_NAME = 'my-app'

/** Script sets for JS/TS web projects so package.json matches the stack. */
const SCRIPTS_BY_FRAMEWORK: Record<HighLevelFileContext['framework'], { dev: string; build: string; start: string }> = {
  next: { dev: 'next dev', build: 'next build', start: 'next start' },
  vite: { dev: 'vite', build: 'tsc && vite build', start: 'vite preview' },
  cra: { dev: 'react-scripts start', build: 'react-scripts build', start: 'react-scripts start' },
  generic: { dev: 'vite', build: 'tsc && vite build', start: 'vite preview' },
}

/**
 * Infer framework from structured analysis (detected_frameworks, project_type, file paths).
 */
function inferFramework(sa: {
  identity?: { project_type?: string; detected_frameworks?: string[] }
  file_manifest?: { paths?: string[] }
}): HighLevelFileContext['framework'] {
  const pt = (sa?.identity?.project_type ?? '').toLowerCase()
  const frameworks = (sa?.identity?.detected_frameworks ?? []).map((f) => String(f).toLowerCase())
  const paths = (sa?.file_manifest?.paths ?? []).map((p) => String(p).toLowerCase())

  if (pt.includes('next') || frameworks.some((f) => f.includes('next'))) return 'next'
  if (frameworks.some((f) => f.includes('vite'))) return 'vite'
  if (frameworks.some((f) => f.includes('react-scripts') || f.includes('cra'))) return 'cra'
  if (paths.some((p) => p.includes('next.config'))) return 'next'
  if (paths.some((p) => p.includes('vite.config'))) return 'vite'

  return 'generic'
}

/**
 * Pick first JS/TS entrypoint from structured analysis, or default src/index.tsx.
 */
function inferEntryPath(sa: { entrypoints?: Array<{ file?: string }> }): string {
  const entrypoints = Array.isArray(sa?.entrypoints) ? sa.entrypoints : []
  const first = entrypoints.find((e) => e?.file && /\.(tsx?|jsx?)$/.test(e.file))
  if (first?.file) return first.file.replace(/^\/+/, '')
  return DEFAULT_ENTRY
}

/**
 * Get project-specific context for mandatory high-level files so package.json name,
 * scripts, and entry path match the project (analysis + repo type).
 * Used by files/generate when generating package.json and entry point.
 */
export async function getProjectContextForHighLevelFiles(projectId: string): Promise<HighLevelFileContext> {
  const db = (await clientPromise).db()
  const projectIdObj = new ObjectId(projectId)

  const project = await db.collection('projects').findOne(
    { _id: projectIdObj },
    { projection: { title: 1 } }
  ) as { title?: string } | null

  const analysis = await db.collection('analyses').findOne(
    { projectId: projectIdObj },
    { projection: { 'repositoryAnalysis.structuredAnalysis': 1 } }
  ) as { repositoryAnalysis?: { structuredAnalysis?: any } } | null

  const sa = analysis?.repositoryAnalysis?.structuredAnalysis ?? {}
  const identity = sa?.identity ?? {}
  const projectType = (identity.project_type ?? '').toLowerCase()
  const filePaths = (sa?.file_manifest?.paths ?? []).map((p) => String(p).replace(/\\/g, '/'))
  const mainLanguages = (typeof identity.main_languages === 'object' && identity.main_languages !== null)
    ? identity.main_languages
    : {}

  const { category } = detectRepoType({
    project_type: projectType,
    detected_frameworks: identity.detected_frameworks ?? [],
    filePaths,
    mainLanguages,
  })

  const projectName =
    project?.title && String(project.title).trim()
      ? String(project.title).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      : DEFAULT_PROJECT_NAME
  const safeName = projectName || DEFAULT_PROJECT_NAME

  let framework: HighLevelFileContext['framework'] = 'generic'
  if (category === 'web_js' || category === 'full_stack_js' || category === 'generic') {
    framework = inferFramework(sa)
  }

  const scripts = SCRIPTS_BY_FRAMEWORK[framework]
  const entryPath = (category === 'web_js' || category === 'full_stack_js' || category === 'generic')
    ? inferEntryPath(sa)
    : DEFAULT_ENTRY

  return {
    projectName: safeName,
    devScript: scripts.dev,
    buildScript: scripts.build,
    startScript: scripts.start,
    entryPath,
    framework,
    repoCategory: category,
  }
}
