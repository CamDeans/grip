import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance } from '@/lib/access'
import { addTokenUsage } from '@/lib/tokenUsage'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { analyzeRepositoryStructureWithTreeSitter } from '@/lib/sandbox/treeSitterAnalysis'
import { buildTechnicalAnalysisPromptFromIdeation } from '@/lib/sandbox/ideationToTechnicalPrompt'
import { getSandboxProject } from '@/lib/services/sandboxProjectService'

const SANDBOX_ANALYSES_COLLECTION = 'sandboxAnalyses'

/**
 * POST /api/projects/[id]/legal-sandbox/analyze
 * Run repo analysis for a sandbox project only. Uses user's linked repo only (repo separation—never GRIP code).
 * Advances user plain-English ideation into a technical analysis prompt to align analysis with their goals.
 * Stores result in sandboxAnalyses; does not touch main projects collection.
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
    const accessDenied = await requireAppAccess(session)
    if (accessDenied) return accessDenied
    const tokenExhausted = await requireTokenBalance(session)
    if (tokenExhausted) return tokenExhausted

    const repository = project.repository
    if (!repository?.owner || !repository?.name) {
      return NextResponse.json(
        { error: 'Sandbox project has no linked repository' },
        { status: 400 }
      )
    }

    // Repo separation: only analyze the user's linked repo (owner/name). Never GRIP codebase.
    const owner = repository.owner
    const repo = repository.name

    const { prompt: technicalPrompt, totalTokens: ideationTokens } = await buildTechnicalAnalysisPromptFromIdeation(project.ideation)

    const treeResult = await analyzeRepositoryStructureWithTreeSitter(
      owner,
      repo,
      projectId,
      { technicalPrompt: technicalPrompt || undefined }
    )
    const { totalTokens: treeTokens, ...analysis } = treeResult
    const totalTokens = ideationTokens + (treeTokens ?? 0)

    if (totalTokens > 0 && session.user?.id) {
      addTokenUsage(session.user.id, totalTokens).catch((err) =>
        console.warn('Sandbox analyze: failed to record token usage', err)
      )
    }

    const client = await clientPromise
    const db = client.db('test')
    await db.collection(SANDBOX_ANALYSES_COLLECTION).updateOne(
      { projectId },
      {
        $set: {
          projectId,
          repositoryAnalysis: analysis,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sandbox analyze error:', error)
    const message = error instanceof Error ? error.message : 'Analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
