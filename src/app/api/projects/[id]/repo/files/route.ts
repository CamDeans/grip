import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { getOrCloneRepository, updateRepositoryFile } from '@/lib/repository'
import { ObjectId } from 'mongodb'

/**
 * GET /api/projects/[id]/repo/files?path=src/App.tsx
 * Returns content of a single file from the cached repo.
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
    const path = searchParams.get('path')

    if (!projectId || !ObjectId.isValid(projectId) || !path?.trim()) {
      return NextResponse.json(
        { error: 'Invalid project ID or missing path query' },
        { status: 400 }
      )
    }

    const client = await (await import('@/lib/db')).default
    const db = client.db('test')
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

    const file = files?.find((f) => f.path === path || f.path === path.replace(/^\//, ''))
    if (!file) {
      return NextResponse.json(
        { error: 'File not found in repository', path },
        { status: 404 }
      )
    }

    return NextResponse.json({
      path: file.path,
      content: file.content ?? null,
      type: file.type ?? 'file',
    })
  } catch (error) {
    console.error('Repo file error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load file' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/projects/[id]/repo/files - Update file content (path + content in body).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json().catch(() => ({}))
    const path = body.path as string
    const content = body.content

    if (!projectId || !ObjectId.isValid(projectId) || !path?.trim()) {
      return NextResponse.json(
        { error: 'Invalid project ID or missing path' },
        { status: 400 }
      )
    }
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid content (must be string)' },
        { status: 400 }
      )
    }

    await updateRepositoryFile(projectId, path.trim(), content)
    return NextResponse.json({ success: true, path: path.trim() })
  } catch (error) {
    console.error('Repo file PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update file' },
      { status: 500 }
    )
  }
}
