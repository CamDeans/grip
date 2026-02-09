import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

const VERCEL_API = 'https://api.vercel.com'

/**
 * Sanitize a name for Vercel project: up to 100 chars, lowercase; letters, digits, '.', '_', '-'; no sequence '---'.
 */
function sanitizeVercelProjectName(name: string): string {
  if (typeof name !== 'string' || !name.trim()) return 'grip-project'
  let s = name.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-')
  s = s.replace(/-+/g, '-').replace(/^[-.]|[-.]$/g, '') // collapse dashes, trim leading/trailing - or .
  s = s.slice(0, 100)
  return s || 'grip-project'
}

/**
 * POST /api/projects/[id]/deploy
 * Trigger a Vercel deployment from the project's GitHub repo (linked or exported).
 * Requires VERCEL_TOKEN. Optionally VERCEL_TEAM_ID.
 * Uses exported repo if set, otherwise the linked repository.
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

    const token = process.env.VERCEL_TOKEN
    if (!token?.trim()) {
      return NextResponse.json(
        { error: 'Vercel is not configured. An admin must add VERCEL_TOKEN to the server environment. See docs (Deploy to Vercel & FAQs) for details.' },
        { status: 503 }
      )
    }

    const client = await clientPromise
    const db = client.db('test')
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
    }) as {
      userId?: unknown
      title?: string
      repository?: { owner: string; name: string }
      exportedRepoUrl?: string
    } | null

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    const projectUserId = project.userId != null ? String(project.userId) : null
    if (projectUserId && projectUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let owner: string
    let repo: string
    if (project.exportedRepoUrl) {
      const match = project.exportedRepoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\/|$)/)
      if (!match) {
        return NextResponse.json(
          { error: 'Exported repo URL could not be parsed. Export to GitHub first.' },
          { status: 400 }
        )
      }
      owner = match[1]
      repo = match[2].replace(/\.git$/, '')
    } else if (project.repository) {
      owner = project.repository.owner
      repo = project.repository.name
    } else {
      return NextResponse.json(
        { error: 'No GitHub repo linked. Link a repo in settings or export to GitHub first.' },
        { status: 400 }
      )
    }

    // Vercel: project names up to 100 chars, lowercase; letters, digits, '.', '_', '-'; cannot contain '---'
    const projectName = sanitizeVercelProjectName(project.title || repo)
    const teamId = process.env.VERCEL_TEAM_ID

    const url = new URL('/v13/deployments', VERCEL_API)
    if (teamId) url.searchParams.set('teamId', teamId)

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        project: projectName,
        target: 'production',
        gitSource: {
          type: 'github',
          ref: 'main',
          repo,
          org: owner,
        },
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = data.error?.message || data.message || res.statusText
      return NextResponse.json(
        { error: `Vercel deploy failed: ${msg}. Ensure the repo is connected to Vercel (Vercel dashboard → Import Git Repository).` },
        { status: res.status >= 500 ? 502 : res.status }
      )
    }

    const deploymentUrl = data.url ? `https://${data.url}` : data.alias?.[0] || ''
    const deployedUrl = deploymentUrl || data.deploymentUrl || ''

    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          deployedUrl: deployedUrl || undefined,
          deployedAt: new Date(),
          updatedAt: new Date(),
          completionStatus: 'deployed',
        },
      }
    )

    return NextResponse.json({
      success: true,
      deploymentId: data.id,
      url: deployedUrl,
      status: data.status,
      message: 'Deployment started. The live URL will be ready once the build completes.',
    })
  } catch (error) {
    console.error('Deploy error:', error)
    const message = error instanceof Error ? error.message : 'Deploy failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
