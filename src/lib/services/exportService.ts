import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'
import { getOrCloneRepository } from '@/lib/repository'

interface PackageJsonShape {
  name?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
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
 * Only adds missing scripts; does not overwrite existing ones. Repairs invalid JSON when possible.
 */
function normalizePackageJsonForExport(content: string): string {
  const repaired = tryFixPackageJsonSyntax(content)
  let pkg: PackageJsonShape
  try {
    pkg = JSON.parse(repaired) as PackageJsonShape
  } catch {
    return repaired
  }
  if (!pkg.scripts) pkg.scripts = {}
  const deps = { ...pkg.dependencies, ...pkg.devDependencies } || {}

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

  // StackBlitz (WebContainers) auto-runs npm install, then runs startCommand. Explicitly use npm run dev so the preview loads.
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
 * Apply package.json normalization to the export file set so ZIP/GitHub/StackBlitz all have runnable scripts.
 */
function applyPackageJsonNormalization(files: { path: string; content: string }[]): { path: string; content: string }[] {
  const idx = files.findIndex((f) => f.path === 'package.json' || f.path === '/package.json')
  if (idx === -1) return files
  const entry = files[idx]
  const normalized = normalizePackageJsonForExport(entry.content)
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
  const db = client.db('test')
  const project = await db.collection('projects').findOne(
    { _id: new ObjectId(projectId) },
    { projection: { repository: 1, title: 1 } }
  ) as { repository?: { owner: string; name: string }; title?: string } | null

  if (!project) return []

  const fileMap = new Map<string, string>()
  const gripOnly = options?.gripOnly === true

  if (!gripOnly && project.repository?.owner && project.repository?.name) {
    const repoFiles = await getOrCloneRepository(
      project.repository.owner,
      project.repository.name,
      projectId
    )
    for (const f of repoFiles ?? []) {
      fileMap.set(f.path, f.content ?? '')
    }
  }

  // Read projectFiles with the same native client (lib/db) used when saving copied files
  // (gripProjectActions), so copied files in nested folders are included in the export.
  const projectFiles = await db
    .collection('projectFiles')
    .find({ projectId: new ObjectId(projectId) })
    .toArray() as { path: string; filename: string; content?: string }[]
  for (const f of projectFiles) {
    const fullPath = f.path ? `${f.path}/${f.filename}` : f.filename
    fileMap.set(fullPath, f.content ?? '')
  }

  const files = Array.from(fileMap.entries()).map(([path, content]) => ({ path, content }))
  return applyPackageJsonNormalization(files)
}
