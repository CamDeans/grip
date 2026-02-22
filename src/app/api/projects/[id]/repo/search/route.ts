import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { getOrCloneRepository } from '@/lib/repository'
import { ObjectId } from 'mongodb'

/**
 * GET /api/projects/[id]/repo/search?q=...
 * Search repo by path, name, or content snippet. Returns matching paths and optional content snippet.
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
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim().toLowerCase()

    if (!projectId || !ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      )
    }

    const { default: clientPromise, DB_NAME } = await import('@/lib/db')
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
    }) as { repository?: { owner: string; name: string } } | null

    if (!project?.repository) {
      return NextResponse.json(
        { error: 'No repository linked' },
        { status: 400 }
      )
    }

    const files = await getOrCloneRepository(
      project.repository.owner,
      project.repository.name,
      projectId
    )

    if (!files?.length) {
      return NextResponse.json({ matches: [], repo: `${project.repository.owner}/${project.repository.name}` })
    }

    if (!q) {
      return NextResponse.json({
        matches: files.map((f) => ({ path: f.path, snippet: null })),
        repo: `${project.repository.owner}/${project.repository.name}`,
      })
    }

    const matches: { path: string; snippet: string | null }[] = []
    for (const f of files) {
      const nameMatch = f.path.toLowerCase().includes(q)
      const content = f.content ?? ''
      const contentMatch = content.toLowerCase().includes(q)
      if (!nameMatch && !contentMatch) continue
      let snippet: string | null = null
      if (contentMatch && content) {
        const idx = content.toLowerCase().indexOf(q)
        const start = Math.max(0, idx - 40)
        const end = Math.min(content.length, idx + q.length + 40)
        snippet = (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '')
      }
      matches.push({ path: f.path, snippet })
    }

    return NextResponse.json({
      matches,
      repo: `${project.repository.owner}/${project.repository.name}`,
    })
  } catch (error) {
    console.error('Repo search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    )
  }
}
