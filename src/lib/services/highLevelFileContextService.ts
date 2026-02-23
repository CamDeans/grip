/**
 * Project context for mandatory high-level files (package.json, tsconfig.json, entry point).
 * Uses project title, analysis (structured analysis + repo type), and existing package.json
 * when available so generated package.json scripts and entry path match the project (deep analysis).
 */

import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'
import { detectRepoType, type RepoTypeCategory } from '@/lib/repoTypeDetection'
import { inferStackFromDepsAndPaths, getScriptsForStack, type InferredStack } from '@/lib/services/packageJsonRequirementsService'
import { getOrCloneRepository } from '@/lib/repository'

export type HighLevelFileContext = {
  projectName: string
  devScript: string
  buildScript: string
  startScript: string
  entryPath: string
  framework: 'next' | 'vite' | 'cra' | 'expo' | 'generic'
  repoCategory: RepoTypeCategory
  /** Primary languages from tree-sitter structured analysis (identity.primary_languages) */
  primaryLanguages?: string[]
  /** Language extension counts from tree-sitter analysis (mainLanguages) */
  mainLanguages?: Record<string, number>
}

const DEFAULT_ENTRY = 'src/index.tsx'
const DEFAULT_PROJECT_NAME = 'my-app'

/** Script sets for JS/TS web projects so package.json matches the stack. */
const SCRIPTS_BY_FRAMEWORK: Record<HighLevelFileContext['framework'], { dev: string; build: string; start: string }> = {
  next: { dev: 'next dev', build: 'next build', start: 'next start' },
  vite: { dev: 'vite', build: 'tsc && vite build', start: 'vite preview' },
  cra: { dev: 'react-scripts start', build: 'react-scripts build', start: 'react-scripts start' },
  expo: { dev: 'expo start --web --port 8081', build: 'expo export', start: 'expo start --web' },
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
  if (pt.includes('expo') || frameworks.some((f) => f.includes('expo') || f.includes('react-native'))) return 'expo'
  if (frameworks.some((f) => f.includes('vite'))) return 'vite'
  if (frameworks.some((f) => f.includes('react-scripts') || f.includes('cra'))) return 'cra'
  if (paths.some((p) => p.includes('next.config'))) return 'next'
  if (paths.some((p) => p.includes('vite.config'))) return 'vite'
  if (paths.some((p) => p.includes('app/') || p.includes('src/app/'))) return 'next'

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

/** Map InferredStack to HighLevelFileContext framework (expo is same; others align). */
function stackToFramework(stack: InferredStack): HighLevelFileContext['framework'] {
  return stack === 'expo' ? 'expo' : stack
}

/**
 * Get project-specific context for mandatory high-level files so package.json name,
 * scripts, and entry path match the project. Uses deep analysis: when existing
 * package.json is present, infers stack from dependencies + file paths; otherwise
 * uses structured analysis. Used by files/generate when generating package.json and entry point.
 */
export async function getProjectContextForHighLevelFiles(projectId: string): Promise<HighLevelFileContext> {
  const db = (await clientPromise).db()
  const projectIdObj = new ObjectId(projectId)

  const project = await db.collection('projects').findOne(
    { _id: projectIdObj },
    { projection: { title: 1, repository: 1 } }
  ) as { title?: string; repository?: { owner: string; name: string } } | null

  const analysis = await db.collection('analyses').findOne(
    { projectId: projectIdObj },
    {
      projection: {
        'repositoryAnalysis.structuredAnalysis': 1,
        'repositoryAnalysis.mainLanguages': 1,
        'codeStructure.mainLanguages': 1
      }
    }
  ) as {
    repositoryAnalysis?: { structuredAnalysis?: any; mainLanguages?: Record<string, number> }
    codeStructure?: { mainLanguages?: Record<string, number> }
  } | null

  const sa = analysis?.repositoryAnalysis?.structuredAnalysis ?? {}
  const identity = sa?.identity ?? {}
  const projectType = (identity.project_type ?? '').toLowerCase()
  // file_manifest is array of { path, language, ... }; tree-sitter has no .paths
  const filePaths = ((sa?.file_manifest ?? []) as Array<{ path?: string }>)
    .map((f) => (f.path && String(f.path).replace(/\\/g, '/')) || '')
    .filter(Boolean)
  // Prefer tree-sitter mainLanguages (extension counts); fallback identity.main_languages or primary_languages
  let mainLanguages: Record<string, number> =
    analysis?.repositoryAnalysis?.mainLanguages ??
    analysis?.codeStructure?.mainLanguages ??
    {}
  if (typeof identity.main_languages === 'object' && identity.main_languages !== null) {
    mainLanguages = identity.main_languages as Record<string, number>
  }
  if (Object.keys(mainLanguages).length === 0 && Array.isArray(identity.primary_languages) && identity.primary_languages.length > 0) {
    identity.primary_languages.forEach((lang: string) => {
      mainLanguages[lang] = (mainLanguages[lang] ?? 0) + 1
    })
  }

  const { category } = detectRepoType({
    project_type: projectType,
    primary_languages: identity.primary_languages,
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
  let scripts = SCRIPTS_BY_FRAMEWORK.generic

  if (category === 'web_js' || category === 'full_stack_js' || category === 'generic') {
    let pkgDeps: Record<string, string> | null = null
    try {
      const pkgFile = await db.collection('projectFiles').findOne({
        projectId: projectIdObj,
        filename: 'package.json',
      }) as { content?: string } | null
      if (pkgFile?.content) {
        const pkg = JSON.parse(pkgFile.content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
        pkgDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
      }
    } catch {
      // ignore invalid package.json
    }
    if (!pkgDeps && project?.repository?.owner && project?.repository?.name) {
      try {
        const repoFiles = await getOrCloneRepository(project.repository.owner, project.repository.name, projectId)
        const pkgFile = repoFiles?.find((f) => f.path === 'package.json' || f.path?.endsWith('/package.json'))
        if (pkgFile?.content) {
          const pkg = JSON.parse(pkgFile.content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
          pkgDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
        }
      } catch {
        // ignore
      }
    }
    if (pkgDeps && Object.keys(pkgDeps).length > 0) {
      const stack = inferStackFromDepsAndPaths(pkgDeps, filePaths)
      framework = stackToFramework(stack)
      scripts = getScriptsForStack(stack)
    } else {
      framework = inferFramework(sa)
      scripts = SCRIPTS_BY_FRAMEWORK[framework]
    }
  }

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
    primaryLanguages: identity.primary_languages ?? [],
    mainLanguages: Object.keys(mainLanguages).length > 0 ? mainLanguages : undefined,
  }
}
