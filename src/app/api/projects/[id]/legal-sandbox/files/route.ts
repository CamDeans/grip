import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import { listLegalSandboxFiles } from '@/lib/services/legalSandboxService'
import { getSandboxProject } from '@/lib/services/sandboxProjectService'

/**
 * GET /api/projects/[id]/legal-sandbox/files
 * List files in the legal sandbox for this project.
 * Query ?fullPath=src/App.tsx returns that single file with content (for View).
 */
export async function GET(
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

    const project = await getSandboxProject(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Sandbox project not found' }, { status: 404 })
    }
    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const files = await listLegalSandboxFiles(projectId)
    const fullPathParam = request.nextUrl.searchParams.get('fullPath')?.trim()

    if (fullPathParam) {
      const normalized = fullPathParam.replace(/^\/+/, '')
      const match = files.find((f) => {
        const fp = f.path ? `${f.path}/${f.filename}` : f.filename
        return fp === normalized || fp === fullPathParam
      })
      if (!match) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      return NextResponse.json({
        path: match.path,
        filename: match.filename,
        fullPath: match.path ? `${match.path}/${match.filename}` : match.filename,
        content: match.content ?? '',
      })
    }

    return NextResponse.json(
      files.map((f) => {
        const fullPath = f.path ? `${f.path}/${f.filename}` : f.filename
        return {
          path: f.path,
          filename: f.filename,
          fullPath,
          updatedAt: f.updatedAt ? new Date(f.updatedAt).toISOString() : undefined,
          createdAt: f.createdAt ? new Date(f.createdAt).toISOString() : undefined,
        }
      })
    )
  } catch (error) {
    console.error('Legal-sandbox files list error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list files' },
      { status: 500 }
    )
  }
}
