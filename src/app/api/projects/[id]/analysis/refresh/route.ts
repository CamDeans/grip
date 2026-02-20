import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance } from '@/lib/access'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { analyzeProject } from '@/lib/services/analysisService'
import { getSandboxProject } from '@/lib/services/sandboxProjectService'
import { getOrCloneRepository } from '@/lib/repository'
import { analyzeRepositoryStructureWithTreeSitter } from '@/lib/treeSitter/treeSitterAnalysis'
import { buildTechnicalAnalysisPromptFromIdeation } from '@/lib/sandbox/ideationToTechnicalPrompt'

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
    const client = await clientPromise
    const db = client.db('test')

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
      const { prompt: technicalPrompt } = await buildTechnicalAnalysisPromptFromIdeation(project.ideation)
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
      const { totalTokens: _t, ...analysis } = treeResult
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

      await analyzeProject(projectId, {
        owner: projectDoc.repository.owner,
        name: projectDoc.repository.name,
      })

      await db.collection('analyses').updateOne(
        { projectId: new ObjectId(projectId) },
        { $unset: { projectContextDocument: '' }, $set: { updatedAt: new Date() } }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analysis refresh error:', error)
    const message = error instanceof Error ? error.message : 'Failed to refresh analysis'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
