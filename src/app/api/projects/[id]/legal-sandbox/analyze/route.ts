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
import { getOrCloneRepository } from '@/lib/repository'

const SANDBOX_ANALYSES_COLLECTION = 'sandboxAnalyses'

/**
 * POST /api/projects/[id]/legal-sandbox/analyze
 * Run repo analysis for a sandbox project only. Uses user's linked repo only (repo separation—never GRIP code).
 * Same tree-sitter flow as main project: full repo via cached clone (repoFiles) so sandbox gets complete
 * routes/entrypoints/capabilities. Stores result in sandboxAnalyses; does not touch main project or analyses.
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

    // Full repo for sandbox too: use cached clone (same as main project) so analysis is complete
    let repoFiles: Array<{ path: string; content: string | null }> | undefined
    try {
      repoFiles = await getOrCloneRepository(owner, repo, projectId)
      if (!repoFiles?.length) repoFiles = undefined
    } catch (e) {
      console.warn('Sandbox analyze: no cached repo, falling back to root+src only', e)
    }

    const treeResult = await analyzeRepositoryStructureWithTreeSitter(
      owner,
      repo,
      projectId,
      { technicalPrompt: technicalPrompt || undefined, repoFiles }
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
    const projectIdObj = new ObjectId(projectId)
    await db.collection(SANDBOX_ANALYSES_COLLECTION).updateOne(
      { $or: [{ projectId: projectIdObj }, { projectId }] },
      {
        $set: {
          projectId: projectIdObj,
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
