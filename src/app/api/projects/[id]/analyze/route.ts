import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance } from '@/lib/access'
import { addTokenUsage } from '@/lib/tokenUsage'
import clientPromise, { DB_NAME } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { analyzeProject } from '@/lib/services/analysisService'

/** Same long-running analysis as analysis/run; allow up to 2 min to avoid gateway 504. */
export const maxDuration = 120

/**
 * POST /api/projects/[id]/analyze
 * Runs repository analysis (clone + tree-sitter) using the same pipeline as analysis/run.
 * Repository can come from body or from project doc. Callers: new project (background), EnhancedChat, ProjectForm.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const accessDenied = await requireAppAccess(session)
    if (accessDenied) return accessDenied
    const tokenExhausted = await requireTokenBalance(session)
    if (tokenExhausted) return tokenExhausted

    const { id } = await params
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const projectIdObj = new ObjectId(id)
    const client = await clientPromise
    const db = client.db(DB_NAME)

    let repository = (await request.json().catch(() => ({})))?.repository
    if (!repository?.owner || !repository?.name) {
      const project = await db.collection('projects').findOne(
        { _id: projectIdObj, userId: session.user?.id },
        { projection: { repository: 1 } }
      ) as { repository?: { owner: string; name: string } } | null
      repository = project?.repository
    }
    if (!repository?.owner || !repository?.name) {
      return NextResponse.json(
        { error: 'Missing repository (owner and name required in body or project)' },
        { status: 400 }
      )
    }

    const result = await analyzeProject(id, {
      owner: repository.owner,
      name: repository.name,
    })
    const totalTokens = (result as { totalTokens?: number })?.totalTokens ?? 0
    if (totalTokens > 0 && session.user?.id) {
      await addTokenUsage(session.user.id, totalTokens).catch((err) =>
        console.warn('Project analyze: failed to record token usage', err)
      )
    }

    await db.collection('analyses').updateOne(
      { projectId: projectIdObj },
      { $unset: { projectContextDocument: '' }, $set: { updatedAt: new Date() } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error analyzing project:', error)
    const message = error instanceof Error ? error.message : 'Failed to analyze project'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
