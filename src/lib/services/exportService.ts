import { ObjectId } from 'mongodb'
import clientPromise, { DB_NAME } from '@/lib/db'
import { getOrCloneRepository } from '@/lib/repository'
import { inferStackFromDepsAndPaths, getScriptsForStack, type InferredStack } from '@/lib/services/packageJsonRequirementsService'

interface PackageJsonShape {
  name?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  stackblitz?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * Try to fix common package.json syntax errors (e.g. missing comma between properties) so parse succeeds.
 * Fixes: "value"\n  "nextKey" -> "value",\n  "nextKey"
 */
function tryFixPackageJsonSyntax(content: string): string {
  try {
    JSON.parse(content)
    return content
  } catch {
    // try adding missing commas between string value and next key: "x"\n  "y" -> "x",\n  "y"
    const fixed = content.replace(
      /"([^"\\]*(?:\\.[^"\\]*)*)"\s*(,?)\s*\r?\n(\s*")/g,
      (_, val, comma, rest) => `"${val}"${comma || ','}\n${rest}`
    )
    try {
      JSON.parse(fixed)
      return fixed
    } catch {
      return content
    }
  }
}

/**
 * Ensure package.json has dev, start, and build scripts so exported projects run after npm install.
 * When filePaths is provided, infers stack from deps + paths and overwrites scripts to match (deep analysis).
 * Otherwise only adds missing scripts. Repairs invalid JSON when possible.
 */
function normalizePackageJsonForExport(content: string, filePaths?: string[]): string {
  const repaired = tryFixPackageJsonSyntax(content)
  let pkg: PackageJsonShape
  try {
    pkg = JSON.parse(repaired) as PackageJsonShape
  } catch {
    return repaired
  }
  if (!pkg.scripts) pkg.scripts = {}
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }

  let stack: InferredStack = 'generic'
  if (filePaths && filePaths.length > 0) {
    stack = inferStackFromDepsAndPaths(deps, filePaths)
    const scripts = getScriptsForStack(stack)
    pkg.scripts.dev = scripts.dev
    pkg.scripts.build = scripts.build
    pkg.scripts.start = scripts.start
  } else {
    if (!pkg.scripts.dev) {
      if (deps.next) pkg.scripts.dev = 'next dev'
      else if (deps['react-scripts']) pkg.scripts.dev = 'react-scripts start'
      else if (deps.vite) pkg.scripts.dev = 'vite'
      else if (deps.expo) pkg.scripts.dev = 'expo start'
      else if (deps['react-native']) pkg.scripts.dev = 'react-native start'
      else if (deps.vue && deps['@vitejs/plugin-vue']) pkg.scripts.dev = 'vite'
      else if (deps.vue) pkg.scripts.dev = 'vue-cli-service serve'
      else pkg.scripts.dev = 'node index.js'
    }
    if (!pkg.scripts.start) {
      if (deps.next) pkg.scripts.start = 'next start'
      else if (deps['react-scripts']) pkg.scripts.start = 'react-scripts start'
      else pkg.scripts.start = 'npm run dev'
    }
    if (!pkg.scripts.build) {
      if (deps.next) pkg.scripts.build = 'next build'
      else if (deps['react-scripts']) pkg.scripts.build = 'react-scripts build'
      else if (deps.vite) pkg.scripts.build = 'vite build'
      else if (deps.vue && deps['@vitejs/plugin-vue']) pkg.scripts.build = 'vite build'
      else if (deps.vue) pkg.scripts.build = 'vue-cli-service build'
      else pkg.scripts.build = "echo 'No build script'"
    }
  }

  if (!filePaths || filePaths.length === 0) {
    const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
    stack = inferStackFromDepsAndPaths(allDeps, [])
  }
  stripOtherStackDeps(pkg, stack)

  if (!pkg.stackblitz || typeof pkg.stackblitz !== 'object') {
    pkg.stackblitz = {}
  }
  const sb = pkg.stackblitz as Record<string, unknown>
  if (sb.startCommand === undefined && (pkg.scripts?.dev || pkg.scripts?.start)) {
    sb.startCommand = 'npm run dev'
  }

  return JSON.stringify(pkg, null, 2)
}

/**
 * Remove dependencies that belong to a different stack so package.json has exactly one stack (prevents Next+Expo collision and ERESOLVE).
 * For web stacks we strip expo, react-native, and all @expo/ and @react-native/ scoped deps so expo never corrupts web projects in StackBlitz.
 */
function stripOtherStackDeps(pkg: PackageJsonShape, stack: InferredStack): void {
  const remove = (obj: Record<string, string> | undefined, keys: string[]) => {
    if (!obj) return
    keys.forEach((k) => delete obj[k])
  }
  const depKeys = (obj: Record<string, string> | undefined) => Object.keys(obj ?? {})
  if (stack === 'next' || stack === 'vite' || stack === 'cra' || stack === 'generic') {
    const toRemove: string[] = ['expo', 'react-native']
    ;[pkg.dependencies, pkg.devDependencies].forEach((obj) => {
      depKeys(obj).filter((k) => k.startsWith('@expo/') || k.startsWith('@react-native/')).forEach((k) => toRemove.push(k))
    })
    remove(pkg.dependencies, [...new Set(toRemove)])
    remove(pkg.devDependencies, [...new Set(toRemove)])
  } else if (stack === 'expo') {
    remove(pkg.dependencies, ['next'])
    remove(pkg.devDependencies, ['next'])
  }
}

/**
 * Merge repo and projectFiles package.json so StackBlitz gets the full dependency set.
 * Repo often has the full package.json; projectFiles may have a minimal one (e.g. created before repo link or by terminal).
 * Use repo as base, overlay projectFiles (name, version, scripts, any user edits), and union dependencies/devDependencies
 * so we never send a smaller package.json to StackBlitz than what the user sees on the Repos page.
 */
function mergePackageJsonForExport(repoContent: string, projectContent: string): string {
  let repoPkg: PackageJsonShape
  let projectPkg: PackageJsonShape
  try {
    repoPkg = JSON.parse(repoContent) as PackageJsonShape
  } catch {
    return projectContent
  }
  try {
    projectPkg = JSON.parse(projectContent) as PackageJsonShape
  } catch {
    return repoContent
  }
  const merged: PackageJsonShape = {
    ...repoPkg,
    name: projectPkg.name ?? repoPkg.name,
    version: projectPkg.version ?? repoPkg.version,
    private: projectPkg.private ?? repoPkg.private,
    scripts: { ...(repoPkg.scripts ?? {}), ...(projectPkg.scripts ?? {}) },
    dependencies: { ...(repoPkg.dependencies ?? {}), ...(projectPkg.dependencies ?? {}) },
    devDependencies: { ...(repoPkg.devDependencies ?? {}), ...(projectPkg.devDependencies ?? {}) },
  }
  if (repoPkg.stackblitz || projectPkg.stackblitz) {
    merged.stackblitz = { ...(repoPkg.stackblitz ?? {}), ...(projectPkg.stackblitz ?? {}) }
  }
  return JSON.stringify(merged, null, 2)
}

/**
 * Apply package.json normalization to the export file set so ZIP/GitHub/StackBlitz all have runnable scripts.
 * Uses deep analysis (deps + file paths) to set scripts when file list is available.
 */
function applyPackageJsonNormalization(files: { path: string; content: string }[]): { path: string; content: string }[] {
  const idx = files.findIndex((f) => f.path === 'package.json' || f.path === '/package.json')
  if (idx === -1) return files
  const entry = files[idx]
  const filePaths = files.map((f) => (f.path || '').replace(/^\.\//, '').replace(/^\/+/, '').trim() || f.path)
  const normalized = normalizePackageJsonForExport(entry.content, filePaths)
  const out = [...files]
  out[idx] = { path: entry.path, content: normalized }
  return out
}

/**
 * Build the project file set for export.
 * Used by: export to GitHub, export-files for StackBlitz, download ZIP.
 * package.json is normalized so dev/start/build scripts exist for runnable exports.
 *
 * @param projectId - Project ID
 * @param options.gripOnly - If true, only GRIP project files (saved/generated in chat) are included.
 *   Use for StackBlitz so the build references only GRIP files, not the cloned GitHub repo
 *   (avoids repo assets like empty images/loading.gif causing "Empty file" build errors).
 *   If false or omitted, repo files are included first, then projectFiles override same paths.
 */
export async function getProjectFilesForExport(
  projectId: string,
  options?: { gripOnly?: boolean }
): Promise<{ path: string; content: string }[]> {
  const client = await clientPromise
  const db = client.db(DB_NAME)
  const project = await db.collection('projects').findOne(
    { _id: new ObjectId(projectId) },
    { projection: { repository: 1, title: 1 } }
  ) as { repository?: { owner: string; name: string }; title?: string } | null

  if (!project) return []

  const fileMap = new Map<string, string>()
  const gripOnly = options?.gripOnly === true

  const repoPackageJsonKey = 'package.json'
  let repoHadPackageJson = false
  if (!gripOnly && project.repository?.owner && project.repository?.name) {
    const repoFiles = await getOrCloneRepository(
      project.repository.owner,
      project.repository.name,
      projectId
    )
    for (const f of repoFiles ?? []) {
      const key = (f.path || '').replace(/^\.\//, '').replace(/^\/+/, '').trim() || f.filename || f.path
      fileMap.set(key, f.content ?? '')
      if (key === repoPackageJsonKey) repoHadPackageJson = true
    }
  }

  // Read projectFiles; sort by updatedAt ascending so latest write wins when same path exists (e.g. chat-applied package.json).
  // For package.json only: when both repo and projectFiles have it, merge (union deps) so StackBlitz gets the full set (Repos page shows repo; export must not send a smaller package.json).
  const projectFiles = await db
    .collection('projectFiles')
    .find({ projectId: new ObjectId(projectId) })
    .sort({ updatedAt: 1 })
    .toArray() as { path: string; filename: string; content?: string; updatedAt?: Date }[]
  for (const f of projectFiles) {
    const fullPath = f.path ? `${f.path}/${f.filename}` : f.filename
    const key = fullPath.replace(/^\.\//, '').replace(/^\/+/, '').trim() || fullPath
    const content = f.content ?? ''
    if (key === repoPackageJsonKey && repoHadPackageJson && content) {
      const repoContent = fileMap.get(key) ?? ''
      if (repoContent) {
        fileMap.set(key, mergePackageJsonForExport(repoContent, content))
        continue
      }
    }
    fileMap.set(key, content)
  }

  const files = Array.from(fileMap.entries()).map(([path, content]) => ({ path, content }))
  return applyPackageJsonNormalization(files)
}
