import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { getOrCloneRepository } from '@/lib/repository'
import { ObjectId } from 'mongodb'

export interface RepoTreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: RepoTreeNode[]
  size?: number
}

/** Build a tree from flat file paths — every folder and file. */
function buildTreeFromPathsV2(files: { path: string; content?: string | null }[]): RepoTreeNode[] {
  const pathToSize = new Map<string, number>()
  for (const f of files) {
    if (f.content != null) pathToSize.set(f.path, f.content.length)
  }
  const nodeByPath = new Map<string, RepoTreeNode>()

  // Ensure every path prefix (directory) exists
  for (const path of files.map((f) => f.path)) {
    const parts = path.split('/')
    for (let i = 1; i <= parts.length; i++) {
      const subPath = parts.slice(0, i).join('/')
      if (nodeByPath.has(subPath)) continue
      const name = parts[i - 1]
      const isFile = i === parts.length
      nodeByPath.set(subPath, {
        name,
        path: subPath,
        type: isFile ? 'file' : 'dir',
        size: isFile ? pathToSize.get(subPath) : undefined,
        children: isFile ? undefined : [],
      })
    }
  }

  // Attach each node to its parent
  const allPaths = Array.from(nodeByPath.keys()).sort()
  for (const path of allPaths) {
    const node = nodeByPath.get(path)!
    const slashIdx = path.lastIndexOf('/')
    if (slashIdx <= 0) continue
    const parentPath = path.slice(0, slashIdx)
    const parent = nodeByPath.get(parentPath)
    if (parent?.children) parent.children.push(node)
  }

  const roots = allPaths
    .filter((p) => p.indexOf('/') === -1)
    .map((p) => nodeByPath.get(p)!)
    .filter(Boolean)
  const sortNodes = (a: RepoTreeNode, b: RepoTreeNode) =>
    a.type === 'dir' && b.type === 'file' ? -1 : a.type === 'file' && b.type === 'dir' ? 1 : a.name.localeCompare(b.name)
  roots.sort(sortNodes)
  function sortChildren(n: RepoTreeNode) {
    if (n.children) {
      n.children.sort(sortNodes)
      n.children.forEach(sortChildren)
    }
  }
  roots.forEach(sortChildren)
  return roots
}

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

    const { default: clientPromise, DB_NAME } = await import('@/lib/db')
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
    }) as { repository?: { owner: string; name: string } } | null

    if (!project?.repository) {
      return NextResponse.json(
        { error: 'No repository linked. Link a GitHub repo in project settings.' },
        { status: 400 }
      )
    }

    const files = await getOrCloneRepository(
      project.repository.owner,
      project.repository.name,
      projectId
    )

    if (!files?.length) {
      return NextResponse.json({
        tree: [],
        fileCount: 0,
        message: 'No files in repository yet. Clone or refresh the repo.',
      })
    }

    const tree = buildTreeFromPathsV2(files)
    return NextResponse.json({
      tree,
      fileCount: files.length,
      repo: `${project.repository.owner}/${project.repository.name}`,
    })
  } catch (error) {
    console.error('Repo tree error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load repo tree' },
      { status: 500 }
    )
  }
}
