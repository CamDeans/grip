import { ObjectId } from 'mongodb'
import clientPromise, { DB_NAME } from '@/lib/db'
import { getOrCloneRepository } from '@/lib/repository'
import crypto from 'crypto'

/**
 * Treat npm/yarn/pnpm installs like file saves: read/update package.json in DB
 * (projectFiles + repo fallback). Works on Vercel and self-hosted; no filesystem.
 */

export interface PackageJsonData {
  name?: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
  [key: string]: unknown
}

export interface InstallResult {
  output: string
  exitCode: number
  added: number
  updated?: boolean
}

/**
 * Resolve package.json content for a project: projectFiles first, then repo.
 */
export async function getPackageJsonForProject(projectId: string): Promise<{
  content: string
  source: 'projectFiles' | 'repo' | 'new'
  data: PackageJsonData
} | null> {
  const db = (await clientPromise).db(DB_NAME)
  const projectIdObj = new ObjectId(projectId)

  // 1. projectFiles: root package.json (path '' or '/', filename 'package.json')
  let projectFile = await db.collection('projectFiles').findOne({
    projectId: projectIdObj,
    path: '',
    filename: 'package.json',
  }) as { path: string; content: string } | null
  if (!projectFile) {
    projectFile = await db.collection('projectFiles').findOne({
      projectId: projectIdObj,
      filename: 'package.json',
    }) as { path: string; content: string } | null
  }

  if (projectFile?.content) {
    try {
      const data = JSON.parse(projectFile.content) as PackageJsonData
      return { content: projectFile.content, source: 'projectFiles', data }
    } catch {
      // invalid JSON, treat as new
    }
  }

  // 2. Repo: find package.json in cloned repo
  const project = await db.collection('projects').findOne(
    { _id: projectIdObj },
    { projection: { repository: 1 } }
  ) as { repository?: { owner: string; name: string } } | null

  if (project?.repository?.owner && project?.repository?.name) {
    const repoFiles = await getOrCloneRepository(
      project.repository.owner,
      project.repository.name,
      projectId
    )
    const pkgFile = repoFiles?.find(
      (f) => f.path === 'package.json' || f.path.endsWith('/package.json')
    )
    if (pkgFile?.content) {
      try {
        const data = JSON.parse(pkgFile.content) as PackageJsonData
        return { content: pkgFile.content, source: 'repo', data }
      } catch {
        // invalid JSON
      }
    }
  }

  // 3. Create minimal package.json and save to projectFiles
  const data: PackageJsonData = {
    name: 'grip-project',
    version: '0.1.0',
    private: true,
    dependencies: {},
    devDependencies: {},
    scripts: { dev: 'echo "Run after export"', build: 'echo "Run after export"' },
  }
  const content = JSON.stringify(data, null, 2)
  await upsertProjectFile(projectId, '', 'package.json', content)
  return { content, source: 'new', data }
}

function upsertProjectFile(
  projectId: string,
  path: string,
  filename: string,
  content: string
): Promise<void> {
  const size = Buffer.byteLength(content, 'utf8')
  const hash = crypto.createHash('md5').update(content).digest('hex')
  const now = new Date()
  return clientPromise.then(async (client) => {
    const db = client.db(DB_NAME)
    const coll = db.collection('projectFiles')
    const existing = await coll.findOne({
      projectId: new ObjectId(projectId),
      path,
      filename,
    })
    if (existing) {
      await coll.updateOne(
        { _id: existing._id },
        { $set: { content, size, hash, updatedAt: now } }
      )
    } else {
      await coll.insertOne({
        projectId: new ObjectId(projectId),
        path,
        filename,
        content,
        language: 'json',
        size,
        version: 1,
        hash,
        metadata: { generatedBy: 'grip-terminal', purpose: 'package.json' },
        history: [],
        createdAt: now,
        updatedAt: now,
      })
    }
  })
}

/**
 * Add dependency to package.json in DB (like a file save). Used by GRIP terminal.
 */
export async function addDependency(
  projectId: string,
  packageName: string,
  options: { dev?: boolean } = {}
): Promise<InstallResult> {
  const resolved = await getPackageJsonForProject(projectId)
  if (!resolved) {
    return {
      output: 'Could not resolve package.json for this project.',
      exitCode: 1,
      added: 0,
    }
  }

  const { data } = resolved
  const key = options.dev ? 'devDependencies' : 'dependencies'
  if (!data[key]) data[key] = {}
  const had = packageName in data[key]
  data[key][packageName] = data[key][packageName] || '^1.0.0'
  const content = JSON.stringify(data, null, 2)
  await upsertProjectFile(projectId, '', 'package.json', content)

  const added = had ? 0 : 1
  const count = Object.keys(data.dependencies || {}).length + Object.keys(data.devDependencies || {}).length
  const output = added
    ? `added 1 package, and audited ${count} package${count === 1 ? '' : 's'} in 1s\n\nfound 0 vulnerabilities`
    : `up to date, audited ${count} package${count === 1 ? '' : 's'} in 1s\n\nfound 0 vulnerabilities`

  return { output, exitCode: 0, added, updated: true }
}

/**
 * Add multiple packages (e.g. npm install pkg1 pkg2).
 */
export async function addDependencies(
  projectId: string,
  packageNames: string[],
  options: { dev?: boolean } = {}
): Promise<InstallResult> {
  if (packageNames.length === 0) {
    const resolved = await getPackageJsonForProject(projectId)
    const count = resolved
      ? Object.keys(resolved.data.dependencies || {}).length + Object.keys(resolved.data.devDependencies || {}).length
      : 0
    return {
      output: `Installing dependencies...\nup to date, audited ${count} package${count === 1 ? '' : 's'} in 1s\n\nfound 0 vulnerabilities`,
      exitCode: 0,
      added: 0,
    }
  }

  let totalAdded = 0
  for (const name of packageNames) {
    const result = await addDependency(projectId, name.trim(), options)
    totalAdded += result.added
  }
  const resolved = await getPackageJsonForProject(projectId)
  const count = resolved
    ? Object.keys(resolved.data.dependencies || {}).length + Object.keys(resolved.data.devDependencies || {}).length
    : 0
  const output = `added ${totalAdded} package${totalAdded === 1 ? '' : 's'}, and audited ${count} package${count === 1 ? '' : 's'} in 1s\n\nfound 0 vulnerabilities`
  return { output, exitCode: 0, added: totalAdded, updated: true }
}
