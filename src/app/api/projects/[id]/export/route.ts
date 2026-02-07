import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { Octokit } from '@octokit/rest'
import { getOrCloneRepository } from '@/lib/repository'

/**
 * POST /api/projects/[id]/export
 * Export project files to a new GitHub repo under the authenticated user (or org token).
 * Body: { repoName?: string, description?: string, private?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    if (!projectId || !ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db('test')
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
    }) as { userId?: unknown; title?: string; repository?: { owner: string; name: string } } | null

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    const projectUserId = project.userId != null ? String(project.userId) : null
    if (projectUserId && projectUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const repoName = (body.repoName as string)?.trim() || slug(project.title || 'grip-export')
    const description = (body.description as string)?.trim() || project.title || 'Exported from G.R.I.P.'
    const isPrivate = body.private !== false

    const serverToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN
    const user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) }) as { githubToken?: string } | null
    const authToken = user?.githubToken?.trim() || serverToken?.trim()
    if (!authToken) {
      return NextResponse.json(
        { error: 'GitHub token not configured. Add GITHUB_TOKEN in server env or your GitHub token in user settings.' },
        { status: 503 }
      )
    }

    const octokit = new Octokit({ auth: authToken })

    const files = await getOrCloneRepository(
      project.repository!.owner,
      project.repository!.name,
      projectId
    )
    if (!files?.length) {
      return NextResponse.json(
        { error: 'No files to export. Link a repo and ensure it has been cloned.' },
        { status: 400 }
      )
    }

    const { data: me } = await octokit.users.getAuthenticated()
    const owner = me.login

    const { data: newRepo } = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description,
      private: isPrivate,
      auto_init: true,
    })
    const defaultBranch = newRepo.default_branch || 'main'

    const ref = await octokit.git.getRef({
      owner,
      repo: newRepo.name,
      ref: `heads/${defaultBranch}`,
    })
    const commitSha = ref.data.object.sha
    const { data: parentCommit } = await octokit.git.getCommit({
      owner,
      repo: newRepo.name,
      commit_sha: commitSha,
    })

    const treeItems: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = []
    for (const file of files) {
      const content = file.content ?? ''
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo: newRepo.name,
        content: Buffer.from(content, 'utf8').toString('base64'),
        encoding: 'base64',
      })
      treeItems.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha })
    }

    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo: newRepo.name,
      tree: treeItems,
      base_tree: parentCommit.tree.sha,
    })

    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo: newRepo.name,
      message: 'Initial export from G.R.I.P.',
      tree: newTree.sha,
      parents: [parentCommit.sha],
    })

    await octokit.git.updateRef({
      owner,
      repo: newRepo.name,
      ref: `heads/${defaultBranch}`,
      sha: newCommit.sha,
    })

    const exportedRepoUrl = newRepo.html_url
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          exportedRepoUrl,
          exportedAt: new Date(),
          updatedAt: new Date(),
          completionStatus: 'exported',
        },
      }
    )

    return NextResponse.json({
      success: true,
      repoUrl: exportedRepoUrl,
      repoName: newRepo.full_name,
    })
  } catch (error) {
    console.error('Export error:', error)
    const message = error instanceof Error ? error.message : 'Export failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'grip-export'
}
