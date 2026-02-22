import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { getOrCloneRepository, updateRepositoryFile, deleteRepositoryFile, renameRepositoryFile, deleteRepositoryFolder } from '@/lib/repository'
import { getRepositoryContentServer } from '@/lib/github'
import { ObjectId } from 'mongodb'

/** File extensions that are binary; we keep base64 and do not decode to UTF-8. */
const BINARY_EXTENSIONS = /\.(png|jpg|jpeg|gif|ico|webp|bmp|woff|woff2|ttf|eot|otf|cur)(\?.*)?$/i

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
    const rawPath = searchParams.get('path')?.trim()
    if (!projectId || !ObjectId.isValid(projectId) || !rawPath) {
      return NextResponse.json(
        { error: 'Invalid project ID or missing path query' },
        { status: 400 }
      )
    }
    const path = rawPath.replace(/^\/+/, '')

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

    const file = files?.find((f) => f.path === path || f.path === path.replace(/^\//, ''))
    if (!file) {
      return NextResponse.json(
        { error: 'File not found in repository', path },
        { status: 404 }
      )
    }

    let content: string | null = file.content ?? null
    if ((content === null || content === '') && project.repository) {
      try {
        const fresh = await getRepositoryContentServer(
          project.repository.owner,
          project.repository.name,
          path
        )
        if (fresh && !Array.isArray(fresh) && (fresh as { content?: string; encoding?: string }).content) {
          const raw = fresh as { content: string; encoding?: string }
          try {
            // Binary files (images, fonts): keep base64 so content is not corrupted; StackBlitz expects it.
            if (raw.encoding === 'base64' && BINARY_EXTENSIONS.test(path)) {
              content = raw.content
            } else if (raw.encoding === 'base64') {
              content = Buffer.from(raw.content, 'base64').toString('utf8')
            } else {
              content = typeof raw.content === 'string' ? raw.content : null
            }
          } catch {
            content = null
          }
        }
      } catch (e) {
        console.error('Repo file re-fetch from GitHub:', e)
      }
    }

    return NextResponse.json({
      path: file.path,
      content,
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
 * PATCH /api/projects/[id]/repo/files - Update file content or rename (path + content in body, or oldPath + newPath).
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
    const path = (body.path as string)?.trim()
    const content = body.content
    const newPath = (body.newPath as string)?.trim()

    if (!projectId || !ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      )
    }

    if (newPath && path) {
      await renameRepositoryFile(projectId, path, newPath)
      return NextResponse.json({ success: true, path: newPath })
    }
    if (path && typeof content === 'string') {
      await updateRepositoryFile(projectId, path, content)
      return NextResponse.json({ success: true, path })
    }
    return NextResponse.json(
      { error: 'Provide path + content to update, or path + newPath to rename' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Repo file PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update file' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/projects/[id]/repo/files?path=src/App.tsx - Remove one file from cached repo.
 */
export async function DELETE(
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
    const path = searchParams.get('path')?.trim()
    if (!projectId || !ObjectId.isValid(projectId) || !path) {
      return NextResponse.json({ error: 'Invalid project ID or missing path' }, { status: 400 })
    }
    const ok = await deleteRepositoryFile(projectId, path)
    if (!ok) return NextResponse.json({ error: 'File not found or could not delete' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Repo file DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete file' },
      { status: 500 }
    )
  }
}
