import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance } from '@/lib/access'
import { addTokenUsage } from '@/lib/tokenUsage'
import clientPromise, { DB_NAME } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { analyzeProject } from '@/lib/services/analysisService'
import { getSandboxProject } from '@/lib/services/sandboxProjectService'
import { getOrCloneRepository } from '@/lib/repository'
import { analyzeRepositoryStructureWithTreeSitter } from '@/lib/treeSitter/treeSitterAnalysis'
import { buildTechnicalAnalysisPromptFromIdeation } from '@/lib/sandbox/ideationToTechnicalPrompt'
import { gripLog } from '@/lib/gripLogger'

/** Long-running analysis runs in background after 202; this route returns quickly so gateway does not 504. */
const SANDBOX_ANALYSES_COLLECTION = 'sandboxAnalyses'

/**
 * POST /api/projects/[id]/analysis/refresh?sandbox=true
 * Re-runs full repository analysis and clears cached repo context so the next chat load
 * gets fresh analysis and repo reference. Works for both GRIP (main) and sandbox GRIP.
 * - Main: no query param → analyses collection, analyzeProject.
 * - Sandbox: ?sandbox=true → sandboxAnalyses, tree-sitter sandbox flow.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const accessDenied = await requireAppAccess(session)
    if (accessDenied) return accessDenied
    const tokenExhausted = await requireTokenBalance(session)
    if (tokenExhausted) return tokenExhausted

    const { id: projectId } = await params
    if (!projectId || !ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const isSandbox = new URL(request.url).searchParams.get('sandbox') === 'true'
    console.info('[GRIP Stage 2] analysis/refresh start', { projectId, isSandbox })
    gripLog(2, 'analysis/refresh start', { projectId, isSandbox })
    const client = await clientPromise
    const db = client.db(DB_NAME)

    if (isSandbox) {
      const project = await getSandboxProject(projectId)
      if (!project) {
        return NextResponse.json({ error: 'Sandbox project not found' }, { status: 404 })
      }
      if (project.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const repository = project.repository
      if (!repository?.owner || !repository?.name) {
        return NextResponse.json(
          { error: 'Sandbox project has no linked repository' },
          { status: 400 }
        )
      }
      const { prompt: technicalPrompt, totalTokens: ideationTokens } = await buildTechnicalAnalysisPromptFromIdeation(project.ideation)
      let repoFiles: Array<{ path: string; content: string | null }> | undefined
      try {
        repoFiles = await getOrCloneRepository(repository.owner, repository.name, projectId)
        if (!repoFiles?.length) repoFiles = undefined
      } catch {
        repoFiles = undefined
      }
      const treeResult = await analyzeRepositoryStructureWithTreeSitter(
        repository.owner,
        repository.name,
        projectId,
        { technicalPrompt: technicalPrompt || undefined, repoFiles }
      )
      const { totalTokens: treeTokens, ...analysis } = treeResult
      const sandboxTokens = (ideationTokens ?? 0) + (treeTokens ?? 0)
      if (sandboxTokens > 0 && session.user?.id) {
        await addTokenUsage(session.user.id, sandboxTokens).catch((err) =>
          console.warn('Analysis refresh (sandbox): failed to record token usage', err)
        )
      }
      const projectIdObj = new ObjectId(projectId)
      await db.collection(SANDBOX_ANALYSES_COLLECTION).updateOne(
        { $or: [{ projectId: projectIdObj }, { projectId }] },
        {
          $set: {
            projectId: projectIdObj,
            repositoryAnalysis: analysis,
            updatedAt: new Date(),
          },
          $unset: { projectContextDocument: '' },
        },
        { upsert: true }
      )
      console.info('[GRIP Stage 2] analysis/refresh sandbox complete', { projectId })
      gripLog(2, 'analysis/refresh sandbox complete', { projectId })
    } else {
      const projectDoc = await db.collection('projects').findOne(
        { _id: new ObjectId(projectId) },
        { projection: { repository: 1 } }
      ) as { repository?: { owner: string; name: string } } | null

      if (!projectDoc?.repository?.owner || !projectDoc.repository.name) {
        return NextResponse.json(
          { error: 'Project has no linked repository' },
          { status: 400 }
        )
      }

      // Main project: return 202 and trigger analysis/run in a separate invocation so gateway does not 504.
      // Client polls analysis/status; run route has maxDuration 120 and runs in its own serverless invocation.
      const origin = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : new URL(request.url).origin
      const runUrl = `${origin}/api/projects/${projectId}/analysis/run`
      const secret = process.env.ANALYSIS_INTERNAL_SECRET ?? ''
      fetch(runUrl, {
        method: 'POST',
        headers: { 'x-internal-secret': secret },
        // Don't await; run runs in separate invocation
      }).catch((err) => {
        console.warn('[GRIP Stage 2] analysis/refresh: trigger run failed', err)
      })

      return NextResponse.json({ accepted: true }, { status: 202 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    gripLog(2, 'analysis/refresh error', { error: error instanceof Error ? error.message : String(error) })
    console.error('[GRIP Stage 2] analysis/refresh error:', error)
    const message = error instanceof Error ? error.message : 'Failed to refresh analysis'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
