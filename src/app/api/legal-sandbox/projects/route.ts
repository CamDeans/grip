import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createSandboxProject, listSandboxProjects } from '@/lib/services/sandboxProjectService'

/**
 * GET /api/legal-sandbox/projects
 * List sandbox projects for the current user only. Main app project list does not include these.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const projects = await listSandboxProjects(session.user.id)
    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Legal-sandbox projects list error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list sandbox projects' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/legal-sandbox/projects
 * Create a sandbox-only project. Stored in sandboxProjects; never appears in main app.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const repository =
      body.repository && typeof body.repository === 'object' && body.repository.owner && body.repository.name
        ? { owner: String(body.repository.owner).trim(), name: String(body.repository.name).trim() }
        : undefined
    const ideation = body.ideation && typeof body.ideation === 'object'
      ? {
          goals: String(body.ideation.goals ?? '').trim(),
          targetAudience: String(body.ideation.targetAudience ?? '').trim(),
          keyFeatures: String(body.ideation.keyFeatures ?? '').trim(),
          technicalRequirements: String(body.ideation.technicalRequirements ?? '').trim(),
        }
      : { goals: '', targetAudience: '', keyFeatures: '', technicalRequirements: '' }

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      )
    }

    const project = await createSandboxProject({
      userId: session.user.id,
      title,
      description,
      repository: repository ?? null,
      ideation,
    })

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Legal-sandbox project create error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create sandbox project' },
      { status: 500 }
    )
  }
}
