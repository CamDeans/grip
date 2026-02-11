import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import { getLegalSandboxFilesForExport } from '@/lib/services/legalSandboxService'
import { getSandboxProject } from '@/lib/services/sandboxProjectService'

/**
 * GET /api/projects/[id]/legal-sandbox/preflight?target=stackblitz
 * Validates that the legal sandbox has enough files to run in StackBlitz (sandbox store only).
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

    const { searchParams } = new URL(request.url)
    const target = searchParams.get('target') || 'stackblitz'

    const errors: string[] = []
    const suggestions: string[] = []

    if (target === 'stackblitz') {
      const filesArray = await getLegalSandboxFilesForExport(projectId)
      if (!filesArray.length) {
        errors.push('No sandbox files yet. Use the chat on this page to generate a project (e.g. "Create a small React app with package.json and src/App.tsx").')
        suggestions.push('Describe what you want in the chat; GRIP will generate new code and save it to the sandbox.')
      } else {
        const filesMap: Record<string, string> = {}
        for (const { path, content } of filesArray) {
          const key = path.replace(/^\.\//, '').replace(/^\/+/, '').trim() || path
          filesMap[key] = content
        }
        const pkgRaw = filesMap['package.json']
        if (!pkgRaw) {
          errors.push('package.json is required to run in StackBlitz.')
          suggestions.push('In the chat, ask for a package.json (e.g. "Add package.json with React and a dev script").')
        } else {
          try {
            JSON.parse(pkgRaw)
          } catch {
            errors.push('package.json has invalid JSON. Ask GRIP to fix it in the chat.')
          }
        }
      }
    }

    const ok = errors.length === 0
    return NextResponse.json({
      ok,
      errors,
      suggestions,
    })
  } catch (error) {
    console.error('Legal-sandbox preflight error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Preflight failed' },
      { status: 500 }
    )
  }
}
