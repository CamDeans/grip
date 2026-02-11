import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import { getSandboxProject } from '@/lib/services/sandboxProjectService'
import { runSandboxProject } from '@/lib/sandbox/runSandboxProject'

/**
 * POST /api/projects/[id]/legal-sandbox/run
 * Run the sandbox project in a temp dir (npm install + npm run build/dev), capture
 * terminal output and errors. Returns errors so chat can use them as next-step phases.
 * Backend-only; not visible to the user. Used to automate "run → get errors → feed to GRIP".
 */
export async function POST(
  _request: Request,
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

    const result = await runSandboxProject(projectId)
    return NextResponse.json({
      success: result.success,
      errors: result.errors,
      output: result.output.slice(-5000),
      buildCommand: result.buildCommand,
    })
  } catch (error) {
    console.error('Legal-sandbox run error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Run failed' },
      { status: 500 }
    )
  }
}
