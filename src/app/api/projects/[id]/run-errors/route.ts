import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise, { DB_NAME } from '@/lib/db'
import { ObjectId } from 'mongodb'

/**
 * POST /api/projects/[id]/run-errors
 * Store run errors (e.g. from StackBlitz build/terminal) so GRIP can see them in Develop chat.
 * Body: { source: 'stackblitz' | 'export' | 'deploy', errors: string[], raw?: string }
 * If errors is empty, clears lastRunErrors.
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

    const body = await request.json().catch(() => ({}))
    const source = (body.source === 'stackblitz' || body.source === 'export' || body.source === 'deploy')
      ? body.source
      : 'stackblitz'
    let errors: string[] = Array.isArray(body.errors) ? body.errors.filter((e: unknown) => typeof e === 'string') : []
    const raw = typeof body.raw === 'string' ? body.raw.trim() : undefined

    // If raw log provided and no errors array, try to extract ERROR lines
    if (errors.length === 0 && raw) {
      const lines = raw.split(/\r?\n/)
      for (const line of lines) {
        const trimmed = line.trim()
        if (
          /^ERROR\s/i.test(trimmed) || /Error in\s/i.test(trimmed) || /ENOENT:/i.test(trimmed) ||
          /Syntax error:/i.test(trimmed) || /Module not found/i.test(trimmed) || /Cannot find module/i.test(trimmed) ||
          /RuntimeError:\s*memory access out of bounds/i.test(trimmed) || /metro-file-map/i.test(trimmed) ||
          /\.tsx?:\d+:\d+/i.test(trimmed) || /\.jsx?:\d+:\d+/i.test(trimmed)
        ) {
          errors.push(trimmed)
        }
      }
      if (errors.length === 0 && raw.length > 0 && raw.length < 10000) {
        errors.push(raw.slice(0, 2000))
      }
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)
    const project = await db.collection('projects').findOne(
      { _id: new ObjectId(projectId) },
      { projection: { userId: 1 } }
    ) as { userId?: unknown } | null

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    const projectUserId = project.userId != null ? String(project.userId) : null
    if (projectUserId && projectUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const projectDoc = await db.collection('projects').findOne(
      { _id: new ObjectId(projectId) },
      { projection: { runErrorsSubmissionCount: 1 } }
    ) as { runErrorsSubmissionCount?: number } | null
    const submissionIndex = ((projectDoc?.runErrorsSubmissionCount ?? 0) + 1)

    const lastRunErrors =
      errors.length > 0
        ? {
            source,
            errors,
            submissionIndex,
            ...(raw ? { raw: raw.slice(0, 15000) } : {}),
            at: new Date(),
          }
        : null

    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      {
        $set: { lastRunErrors, updatedAt: new Date() },
        $inc: { runErrorsSubmissionCount: errors.length > 0 ? 1 : 0 },
      }
    )

    if (errors.length > 0) {
      const runErrorsMessage = {
        id: new ObjectId().toString(),
        role: 'user',
        content: 'StackBlitz errors submitted — GRIP has these errors in context.',
        timestamp: new Date(),
        metadata: {
          type: 'run_errors_submission',
          submissionIndex,
          source,
        },
      }
      // Update chatHistory. Try string projectId first (no upsert) so we update the same doc
      // the app loads when it uses string. If no doc exists with string, use ObjectId and upsert:
      // the collection validator may require projectId to be ObjectId, so we must not upsert with string.
      const chatColl = db.collection('chatHistory')
      const updatePayload = {
        $push: { messages: runErrorsMessage },
        $set: { updatedAt: new Date(), 'metadata.lastMessage': runErrorsMessage, 'metadata.lastUpdated': new Date() },
        $inc: { 'metadata.totalMessages': 1 },
      }
      let matched = await chatColl.updateOne({ projectId }, updatePayload, { upsert: false })
      if (matched.matchedCount === 0) {
        await chatColl.updateOne(
          { projectId: new ObjectId(projectId) },
          updatePayload,
          { upsert: true }
        )
      }
    }

    return NextResponse.json({
      ok: true,
      stored: errors.length,
      submissionIndex: errors.length > 0 ? submissionIndex : undefined,
      message: errors.length > 0
        ? 'Errors stored. Open Develop chat and GRIP will see them and help fix the project.'
        : 'Run errors cleared.',
    })
  } catch (error) {
    console.error('Run-errors POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to store run errors' },
      { status: 500 }
    )
  }
}
