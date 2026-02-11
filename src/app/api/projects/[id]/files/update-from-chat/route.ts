import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance } from '@/lib/access'
import { addTokenUsage } from '@/lib/tokenUsage'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import crypto from 'crypto'
import { anthropicService } from '@/lib/services/anthropicService'
import { recordFileSaveAndAdvanceStep } from '@/lib/services/projectStateService'

/**
 * POST /api/projects/[id]/files/update-from-chat
 * Load current file content, merge the new snippet into it (via AI), then save.
 * Body: { path?: string, filename: string, newSnippet: string, language?: string }
 * If the file does not exist, creates it with newSnippet. If it exists, merges and updates.
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
    const accessDenied = await requireAppAccess(session)
    if (accessDenied) return accessDenied
    const tokenExhausted = await requireTokenBalance(session)
    if (tokenExhausted) return tokenExhausted

    const { id: projectId } = await params
    if (!projectId || !ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const path = typeof body.path === 'string' ? body.path.trim() : ''
    const filename = typeof body.filename === 'string' ? body.filename.trim() : ''
    const newSnippet = typeof body.newSnippet === 'string' ? body.newSnippet : ''
    const language = typeof body.language === 'string' ? body.language.trim() || 'plaintext' : 'plaintext'

    if (!filename || !newSnippet.trim()) {
      return NextResponse.json(
        { error: 'filename and newSnippet are required' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db('test')
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
    }) as { userId?: unknown } | null

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    const projectUserId = project.userId != null ? String(project.userId) : null
    if (projectUserId && projectUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const coll = db.collection('projectFiles')
    const existing = await coll.findOne({
      projectId: new ObjectId(projectId),
      path,
      filename,
    }) as { _id: unknown; content?: string } | null

    // No existing file: create with newSnippet (same as save-from-chat)
    if (!existing) {
      const size = Buffer.byteLength(newSnippet.trim(), 'utf8')
      const hash = crypto.createHash('md5').update(newSnippet.trim()).digest('hex')
      const now = new Date()
      const doc = {
        projectId: new ObjectId(projectId),
        path,
        filename,
        content: newSnippet.trim(),
        language,
        size,
        version: 1,
        hash,
        metadata: { generatedBy: 'chat', purpose: 'Saved from GRIP chat (update-from-chat)' },
        history: [],
        createdAt: now,
        updatedAt: now,
      }
      const result = await coll.insertOne(doc)
      await recordFileSaveAndAdvanceStep(projectId, path, filename)
      return NextResponse.json({
        success: true,
        action: 'created',
        file: { id: result.insertedId.toString(), path, filename },
        content: newSnippet.trim(),
      })
    }

    const currentContent = typeof existing.content === 'string' ? existing.content : ''

    // Merge via AI: integrate newSnippet into currentContent
    const { getAnthropicApiKey } = await import('@/lib/anthropicConfig')
    if (!getAnthropicApiKey()) {
      return NextResponse.json(
        { error: 'AI is not configured. Set ANTHROPIC_API_KEY to use Update file.' },
        { status: 503 }
      )
    }
    try {
      await anthropicService.initialize()
    } catch (initErr) {
      const msg = initErr instanceof Error ? initErr.message : String(initErr)
      console.error('Anthropic init failed in update-from-chat:', msg)
      return NextResponse.json(
        { error: 'AI is temporarily unavailable. Try "Save to project" to overwrite the file.' },
        { status: 503 }
      )
    }

    const systemPrompt = `You are a code merge assistant. You will be given:
1. The CURRENT FILE content (full file as it exists now).
2. A NEW CODE SNIPPET to integrate (e.g. a fix, a new function, or a replacement section).

Your task: Integrate the snippet into the file. If the snippet is a fix or replacement for an existing part (e.g. same function name, same structure), replace that part. Otherwise add the snippet in the appropriate place. Preserve formatting, imports, and structure. Do not duplicate code.

Output ONLY the complete merged file content. No explanation, no markdown code fence, no preamble. Just the file contents.`

    const userMessage = `CURRENT FILE (${filename}):\n\`\`\`\n${currentContent.slice(0, 90000)}\n\`\`\`\n\nNEW SNIPPET TO INTEGRATE:\n\`\`\`\n${newSnippet.slice(0, 30000)}\n\`\`\`\n\nReturn ONLY the full merged file content.`

    let mergedContent: string
    try {
      const response = await anthropicService.createMessage(
        [{ role: 'user', content: userMessage }],
        { system: systemPrompt }
      )
      mergedContent = (response.content || '').trim()
      const totalTokens = (response.usage?.promptTokens ?? 0) + (response.usage?.completionTokens ?? 0)
      if (totalTokens > 0 && session.user?.id) {
        addTokenUsage(session.user.id, totalTokens).catch((err) =>
          console.warn('Update-from-chat: failed to record token usage', err)
        )
      }
      // Strip accidental markdown code fence if present
      if (mergedContent.startsWith('```')) {
        const firstNewline = mergedContent.indexOf('\n')
        if (firstNewline > 0) mergedContent = mergedContent.slice(firstNewline).trim()
        if (mergedContent.endsWith('```')) mergedContent = mergedContent.slice(0, -3).trimEnd()
      }
      if (!mergedContent) {
        return NextResponse.json(
          { error: 'AI did not return merged content. Use "Save to project" to overwrite the file.' },
          { status: 502 }
        )
      }
    } catch (apiErr) {
      console.error('Update-from-chat merge request failed:', apiErr)
      return NextResponse.json(
        { error: 'Merge failed. Use "Save to project" to overwrite the file with the snippet.' },
        { status: 502 }
      )
    }

    const size = Buffer.byteLength(mergedContent, 'utf8')
    const hash = crypto.createHash('md5').update(mergedContent).digest('hex')
    await coll.updateOne(
      { _id: existing._id },
      {
        $set: {
          content: mergedContent,
          size,
          hash,
          updatedAt: new Date(),
        },
      }
    )
    await recordFileSaveAndAdvanceStep(projectId, path, filename)

    return NextResponse.json({
      success: true,
      action: 'merged',
      file: {
        id: (existing._id as { toString(): string }).toString(),
        path,
        filename,
      },
      content: mergedContent,
    })
  } catch (error) {
    console.error('Update-from-chat error:', error)
    const message = error instanceof Error ? error.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
