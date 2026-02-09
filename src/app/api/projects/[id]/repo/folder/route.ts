import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { deleteRepositoryFolder } from '@/lib/repository'
import { ObjectId } from 'mongodb'

/**
 * DELETE /api/projects/[id]/repo/folder?path=src/components
 * Remove all files under the folder path from the cached repo.
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
    const rawPath = searchParams.get('path')?.trim()
    if (!projectId || !ObjectId.isValid(projectId) || rawPath === undefined) {
      return NextResponse.json({ error: 'Invalid project ID or missing path' }, { status: 400 })
    }
    const path = rawPath.replace(/^\/+|\/+$/g, '').trim()
    const removed = await deleteRepositoryFolder(projectId, path)
    return NextResponse.json({ success: true, removed })
  } catch (error) {
    console.error('Repo folder DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete folder' },
      { status: 500 }
    )
  }
}
