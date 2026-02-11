import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import { getSandboxProject } from '@/lib/services/sandboxProjectService'
import { upsertLegalSandboxFile } from '@/lib/services/legalSandboxService'

/**
 * POST /api/projects/[id]/legal-sandbox/files/save
 * Save one file to the sandbox (same behavior as "Save to project" in main app, but writes to legalSandboxFiles).
 * Body: { path?: string, filename: string, content: string } or { fullPath: string, content: string }
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

    const project = await getSandboxProject(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Sandbox project not found' }, { status: 404 })
    }
    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    let fullPath: string
    const content = typeof body.content === 'string' ? body.content : ''
    if (typeof body.fullPath === 'string' && body.fullPath.trim()) {
      fullPath = body.fullPath.trim()
    } else {
      const path = typeof body.path === 'string' ? body.path.trim() : ''
      const filename = typeof body.filename === 'string' ? body.filename.trim() : ''
      if (!filename) {
        return NextResponse.json({ error: 'filename or fullPath is required' }, { status: 400 })
      }
      fullPath = path ? `${path}/${filename}` : filename
    }

    if (!content && fullPath !== '.gitkeep') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const result = await upsertLegalSandboxFile(projectId, fullPath, content)
    if (!result.ok) {
      return NextResponse.json({ error: result.message ?? 'Save failed' }, { status: 400 })
    }

    return NextResponse.json({ success: true, path: fullPath })
  } catch (error) {
    console.error('Legal-sandbox files save error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Save failed' },
      { status: 500 }
    )
  }
}
