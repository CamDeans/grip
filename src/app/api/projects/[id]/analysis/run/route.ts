import { NextResponse } from 'next/server'
import { addTokenUsage } from '@/lib/tokenUsage'
import clientPromise, { DB_NAME } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { analyzeProject } from '@/lib/services/analysisService'
import { gripLog } from '@/lib/gripLogger'

/** This route runs the long analysis in a separate invocation so it can use full maxDuration without gateway 504. */
export const maxDuration = 120

const INTERNAL_SECRET_HEADER = 'x-internal-secret'

/**
 * POST /api/projects/[id]/analysis/run
 * Internal: runs analyzeProject (clone + tree-sitter). Called by analysis/refresh after 202.
 * Requires x-internal-secret header to match ANALYSIS_INTERNAL_SECRET (no session when called from server).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const secret = request.headers.get(INTERNAL_SECRET_HEADER) ?? ''
    const expected = process.env.ANALYSIS_INTERNAL_SECRET ?? ''
    const isDev = process.env.NODE_ENV === 'development'
    if (!expected && !isDev) {
      return NextResponse.json({ error: 'Analysis run not configured' }, { status: 501 })
    }
    if (expected && secret !== expected) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: projectId } = await params
    if (!projectId || !ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)
    const projectDoc = await db.collection('projects').findOne(
      { _id: new ObjectId(projectId) },
      { projection: { repository: 1, userId: 1 } }
    ) as { repository?: { owner: string; name: string }; userId?: string } | null

    if (!projectDoc?.repository?.owner || !projectDoc.repository.name) {
      return NextResponse.json(
        { error: 'Project has no linked repository' },
        { status: 400 }
      )
    }

    const userId = projectDoc.userId

    console.info('[GRIP Stage 2] analysis/run start', { projectId })
    gripLog(2, 'analysis/run start', { projectId })

    const analysisResult = await analyzeProject(projectId, {
      owner: projectDoc.repository.owner,
      name: projectDoc.repository.name,
    })
    const mainPathTokens = (analysisResult as { totalTokens?: number })?.totalTokens ?? 0
    if (mainPathTokens > 0 && userId) {
      await addTokenUsage(userId, mainPathTokens).catch((err) =>
        console.warn('Analysis run: failed to record token usage', err)
      )
    }

    await db.collection('analyses').updateOne(
      { projectId: new ObjectId(projectId) },
      { $unset: { projectContextDocument: '' }, $set: { updatedAt: new Date() } }
    )
    console.info('[GRIP Stage 2] analysis/run complete', { projectId })
    gripLog(2, 'analysis/run complete', { projectId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[GRIP Stage 2] analysis/run error:', error)
    gripLog(2, 'analysis/run error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis run failed' },
      { status: 500 }
    )
  }
}
