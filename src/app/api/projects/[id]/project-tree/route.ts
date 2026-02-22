import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { getOrCloneRepository } from '@/lib/repository'
import clientPromise, { DB_NAME } from '@/lib/db'
import { ObjectId } from 'mongodb'

/**
 * Project tree node: repo + generated files merged. Files have source and optional fileId.
 */
export interface ProjectTreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: ProjectTreeNode[]
  size?: number
  /** For files: where content comes from; 'both' means generated overrides repo for display */
  source?: 'repo' | 'generated' | 'both'
  /** When source is 'generated' or 'both', use this to fetch/update content via project-files */
  fileId?: string
}

/** Build merged tree from repo paths + generated paths; each file gets source and optional fileId */
function buildMergedTree(
  repoPaths: { path: string; size?: number }[],
  generated: { fullPath: string; fileId: string; size?: number }[]
): ProjectTreeNode[] {
  const pathToMeta = new Map<string, { size?: number; source: 'repo' | 'generated' | 'both'; fileId?: string }>()
  for (const f of repoPaths) {
    pathToMeta.set(f.path, { size: f.size, source: 'repo' })
  }
  for (const g of generated) {
    const existing = pathToMeta.get(g.fullPath)
    pathToMeta.set(g.fullPath, {
      size: g.size,
      source: existing ? 'both' : 'generated',
      fileId: g.fileId,
    })
  }
  const nodeByPath = new Map<string, ProjectTreeNode>()
  const allPaths = Array.from(pathToMeta.keys())

  for (const path of allPaths) {
    const parts = path.split('/')
    for (let i = 1; i <= parts.length; i++) {
      const subPath = parts.slice(0, i).join('/')
      if (nodeByPath.has(subPath)) continue
      const name = parts[i - 1]
      const isFile = i === parts.length
      const meta = isFile ? pathToMeta.get(subPath) : undefined
      nodeByPath.set(subPath, {
        name,
        path: subPath,
        type: isFile ? 'file' : 'dir',
        size: meta?.size,
        source: meta?.source,
        fileId: meta?.fileId,
        children: isFile ? undefined : [],
      })
    }
  }

  const sorted = Array.from(nodeByPath.keys()).sort()
  for (const path of sorted) {
    const node = nodeByPath.get(path)!
    const slashIdx = path.lastIndexOf('/')
    if (slashIdx <= 0) continue
    const parentPath = path.slice(0, slashIdx)
    const parent = nodeByPath.get(parentPath)
    if (parent?.children) parent.children.push(node)
  }

  const roots = sorted
    .filter((p) => p.indexOf('/') === -1)
    .map((p) => nodeByPath.get(p)!)
    .filter(Boolean)
  const sortNodes = (a: ProjectTreeNode, b: ProjectTreeNode) =>
    a.type === 'dir' && b.type === 'file' ? -1 : a.type === 'file' && b.type === 'dir' ? 1 : a.name.localeCompare(b.name)
  roots.sort(sortNodes)
  function sortChildren(n: ProjectTreeNode) {
    if (n.children) {
      n.children.sort(sortNodes)
      n.children.forEach(sortChildren)
    }
  }
  roots.forEach(sortChildren)
  return roots
}

/**
 * GET /api/projects/[id]/project-tree
 * Returns one unified tree: linked repo + generated projectFiles (same folder structure; generated overrides same path).
 * Lets the user see "my project" (repo + their new code) in one place. No restructuring of the original repo.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
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
    }) as { repository?: { owner: string; name: string } } | null

    const repoPaths: { path: string; size?: number }[] = []
    let repoLabel = ''

    if (project?.repository) {
      const files = await getOrCloneRepository(
        project.repository.owner,
        project.repository.name,
        projectId
      )
      repoLabel = `${project.repository.owner}/${project.repository.name}`
      for (const f of files ?? []) {
        repoPaths.push({
          path: f.path,
          size: f.content != null ? f.content.length : undefined,
        })
      }
    }

    const projectFiles = await db
      .collection('projectFiles')
      .find({ projectId: new ObjectId(projectId) })
      .toArray() as { _id: ObjectId; path: string; filename: string; size?: number }[]

    const generated = projectFiles.map((f) => ({
      fullPath: f.path ? `${f.path}/${f.filename}` : f.filename,
      fileId: f._id.toString(),
      size: f.size,
    }))

    const tree = buildMergedTree(repoPaths, generated)
    const fileCount = repoPaths.length
    const generatedCount = generated.length

    return NextResponse.json({
      tree,
      repo: repoLabel,
      fileCount,
      generatedCount,
      message: generatedCount > 0
        ? 'Project view: repo + your generated files. Same structure; your files override where paths match.'
        : repoLabel
          ? 'Repo only. Save code from chat or generate files to see them here.'
          : 'No repo linked. Add generated files or link a repo in settings.',
    })
  } catch (error) {
    console.error('Project tree error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load project tree' },
      { status: 500 }
    )
  }
}
