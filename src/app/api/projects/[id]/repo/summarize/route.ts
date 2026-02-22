import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance } from '@/lib/access'
import { addTokenUsage } from '@/lib/tokenUsage'
import { getOrCloneRepository } from '@/lib/repository'
import { anthropicService } from '@/lib/services/anthropicService'
import clientPromise, { DB_NAME } from '@/lib/db'
import { ObjectId } from 'mongodb'

const MAX_FILES_TO_SUMMARIZE = 25
const MAX_CONTENT_FOR_SUMMARY = 3000

/**
 * POST /api/projects/[id]/repo/summarize
 * Generate one-sentence AI summaries for repo files and store in repoFileSummaries.
 * Optional body: { limit?: number }
 */
export async function POST(
  request: NextRequest,
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

    const { id: projectId } = await params
    if (!projectId || !ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const { getAnthropicApiKey } = await import('@/lib/anthropicConfig')
    if (!getAnthropicApiKey()) {
      return NextResponse.json(
        { error: 'G.R.I.P. AI is not configured. Set ANTHROPIC_API_KEY in .env.local or environment.' },
        { status: 503 }
      )
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
    }) as { repository?: { owner: string; name: string } } | null

    if (!project?.repository) {
      return NextResponse.json(
        { error: 'No repository linked' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const limit = Math.min(Number(body.limit) || MAX_FILES_TO_SUMMARIZE, 50)

    const files = await getOrCloneRepository(
      project.repository.owner,
      project.repository.name,
      projectId
    )
    const withContent = (files || []).filter(
      (f) => f.content && typeof f.content === 'string' && f.content.length > 0
    ).slice(0, limit)

    try {
      await anthropicService.initialize()
    } catch (initErr) {
      console.error('Anthropic init failed in summarize:', initErr)
      return NextResponse.json(
        { error: 'G.R.I.P. AI service is unavailable. Check ANTHROPIC_API_KEY.' },
        { status: 503 }
      )
    }

    let done = 0
    let totalTokens = 0
    for (const file of withContent) {
      const content = (file.content || '').slice(0, MAX_CONTENT_FOR_SUMMARY)
      const prompt = `Summarize this file in one short sentence (what it does or its role). Be concise.\n\nFile: ${file.path}\n\nContent:\n${content}`

      try {
        const res = await anthropicService.createMessage(
          [{ role: 'user', content: prompt }],
          { system: 'You are G.R.I.P. Provide only a single short sentence summary. No preamble.' }
        )
        totalTokens += res.usage?.totalTokens ?? (res.usage?.promptTokens ?? 0) + (res.usage?.completionTokens ?? 0)
        const summary = (res.content || '').trim()
        await db.collection('repoFileSummaries').updateOne(
          { projectId: new ObjectId(projectId), path: file.path },
          { $set: { summary, updatedAt: new Date() } },
          { upsert: true }
        )
        done++
      } catch (e) {
        console.warn('Summarize failed for', file.path, e)
      }
    }
    if (totalTokens > 0 && session.user?.id) {
      addTokenUsage(session.user.id, totalTokens).catch((err) =>
        console.warn('Summarize: failed to record token usage', err)
      )
    }

    return NextResponse.json({
      success: true,
      summarized: done,
      total: withContent.length,
      message: `Summarized ${done} files. G.R.I.P. chat will use these for context.`,
    })
  } catch (error) {
    console.error('Summarize error:', error)
    const message = error instanceof Error ? error.message : 'Summarize failed'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
