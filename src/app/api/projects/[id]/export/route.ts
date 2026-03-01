import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { Octokit } from '@octokit/rest'
import { getProjectFilesForExport } from '@/lib/services/exportService'
import { isBinaryAssetPath } from '@/lib/services/fileGeneratorService'

/** Max size per file for GitHub blob (100MB limit; use safe base64 size). */
const GITHUB_BLOB_SIZE_LIMIT = 95 * 1024 * 1024

/**
 * Sanitize a file path for GitHub Git tree API.
 * GitHub rejects paths with backslashes, leading/trailing slashes, empty segments, or . / ..
 */
function sanitizePathForGitHub(path: string): string {
  if (typeof path !== 'string') return ''
  // Normalize to forward slashes and remove control chars / null bytes
  let p = path.replace(/\\/g, '/').replace(/\0/g, '')
  // Collapse multiple slashes and trim leading/trailing slashes
  p = p.replace(/\/+/g, '/').replace(/^\/|\/$/g, '')
  // Resolve . and .. segments (GitHub rejects them)
  const parts = p.split('/').filter(Boolean)
  const resolved: string[] = []
  for (const part of parts) {
    if (part === '.') continue
    if (part === '..') {
      resolved.pop()
      continue
    }
    resolved.push(part)
  }
  return resolved.join('/')
}

/**
 * POST /api/projects/[id]/export
 * Export full project (repo + generated projectFiles) to a new GitHub repo.
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
    const dbName = process.env.MONGODB_DB_NAME || 'test'
    const db = client.db(dbName)
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
    }) as { userId?: unknown; title?: string } | null

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

    // Use only the current user's GitHub token so export goes to their account (GRIP treats users as themselves).
    // Do not fall back to server/env token so one user's export never uses another's token.
    const user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) }) as { githubToken?: string } | null
    const authToken = user?.githubToken?.trim()
    if (!authToken) {
      return NextResponse.json(
        {
          error: 'Add your GitHub Personal Access Token so the export uses your account.',
          hint: 'Dashboard → Settings (or Project → Settings) → GitHub token. Create a token with repo scope at github.com/settings/tokens. GRIP does not use a shared token for your export.',
        },
        { status: 503 }
      )
    }

    // GitHub repo is REFERENCE ONLY. Export contains only GRIP-generated files (projectFiles), never the linked repo.
    const filesArray = await getProjectFilesForExport(projectId, { gripOnly: true })
    if (!filesArray.length) {
      return NextResponse.json(
        { error: 'No files to export. Run the plan and build to generate files, or add files in Develop.' },
        { status: 400 }
      )
    }

    const octokit = new Octokit({ auth: authToken })

    let owner: string
    try {
      const { data: me } = await octokit.users.getAuthenticated()
      owner = me.login
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('401') || msg.includes('Bad credentials')) {
        return NextResponse.json(
          { error: 'Invalid GitHub token. Create a new token at github.com/settings/tokens with repo scope and add it in Settings.' },
          { status: 401 }
        )
      }
      throw err
    }

    let newRepo: { name: string; default_branch?: string; html_url: string; full_name: string }
    try {
      const { data } = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description,
        private: isPrivate,
        auto_init: true,
      })
      newRepo = data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('name already exists') || (err as { status?: number })?.status === 422) {
        return NextResponse.json(
          { error: `A repo named "${repoName}" already exists on your GitHub. Pick a different name or delete the existing repo.` },
          { status: 409 }
        )
      }
      if (msg.includes('403') || msg.includes('Resource not accessible')) {
        return NextResponse.json(
          { error: 'GitHub token does not have permission to create repos. Use a token with repo scope.' },
          { status: 403 }
        )
      }
      throw err
    }

    const defaultBranch = newRepo.default_branch || 'main'

    let ref: { data: { object: { sha: string } } }
    try {
      ref = await octokit.git.getRef({
        owner,
        repo: newRepo.name,
        ref: `heads/${defaultBranch}`,
      })
    } catch (err) {
      console.error('Export: getRef failed', err)
      return NextResponse.json(
        { error: 'Could not read new repo branch. Try again in a moment.' },
        { status: 502 }
      )
    }

    const commitSha = ref.data.object.sha
    let parentCommit: { tree: { sha: string }; sha: string }
    try {
      const { data } = await octokit.git.getCommit({
        owner,
        repo: newRepo.name,
        commit_sha: commitSha,
      })
      parentCommit = data
    } catch (err) {
      console.error('Export: getCommit failed', err)
      return NextResponse.json(
        { error: 'Could not read new repo commit. Try again in a moment.' },
        { status: 502 }
      )
    }

    const treeItems: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = []
    const seenPaths = new Set<string>()
    for (const file of filesArray) {
      const sanitizedPath = sanitizePathForGitHub(file.path)
      if (!sanitizedPath) {
        console.warn(`Export: skipping file with invalid path "${file.path}"`)
        continue
      }
      if (seenPaths.has(sanitizedPath)) {
        console.warn(`Export: skipping duplicate path "${sanitizedPath}"`)
        continue
      }
      seenPaths.add(sanitizedPath)
      const content = file.content ?? ''
      const sizeBytes = Buffer.byteLength(content, 'utf8')
      if (sizeBytes > GITHUB_BLOB_SIZE_LIMIT) {
        console.warn(`Export: skipping large file ${sanitizedPath} (${sizeBytes} bytes)`)
        continue
      }
      const isBinary = isBinaryAssetPath(sanitizedPath)
      const blobContentBase64 = isBinary ? content : Buffer.from(content, 'utf8').toString('base64')
      try {
        const { data: blob } = await octokit.git.createBlob({
          owner,
          repo: newRepo.name,
          content: blobContentBase64,
          encoding: 'base64',
        })
        treeItems.push({ path: sanitizedPath, mode: '100644', type: 'blob', sha: blob.sha })
      } catch (err) {
        console.error(`Export: createBlob failed for ${sanitizedPath}`, err)
        return NextResponse.json(
          { error: `Failed to upload file "${sanitizedPath}". File may be too large or contain invalid content.` },
          { status: 400 }
        )
      }
    }

    if (treeItems.length === 0) {
      return NextResponse.json(
        { error: 'No files could be uploaded (e.g. all too large). GitHub limits files to 100MB each.' },
        { status: 400 }
      )
    }

    try {
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
    } catch (err) {
      console.error('Export: createTree/createCommit/updateRef failed', err)
      return NextResponse.json(
        { error: 'Failed to create commit on GitHub. Try again or use a different repo name.' },
        { status: 502 }
      )
    }

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
      fileCount: filesArray.length,
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
