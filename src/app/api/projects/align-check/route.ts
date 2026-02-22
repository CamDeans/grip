/**
 * POST /api/projects/align-check
 * Compares project ideation + details against the selected GitHub repo and returns
 * alignment percentage and whether to proceed. Used before creating a project so the
 * user can confirm or choose a different repo.
 * On any server error returns 200 with neutral payload so the UI never sees 500.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import clientPromise, { DB_NAME } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { anthropicService } from '@/lib/services/anthropicService'
import { getAnthropicApiKey, getAnthropicApiKeyForUser } from '@/lib/anthropicConfig'
import { addTokenUsage } from '@/lib/tokenUsage'

const GITHUB_API = 'https://api.github.com'

function neutralResponse(message?: string) {
  return NextResponse.json({
    alignmentPercent: 65,
    message: message ?? 'Alignment check unavailable. You can proceed with the build.',
    suggestedProceed: true,
  })
}

export async function POST(request: NextRequest) {
  let session: Awaited<ReturnType<typeof getServerAuthSession>> = null
  try {
    session = await getServerAuthSession()
  } catch (e) {
    console.error('Align-check: session error', e)
    return neutralResponse()
  }
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Missing required fields: title, repository.owner, repository.name' },
      { status: 400 }
    )
  }
  const {
    title,
    description,
    ideation,
    repository,
  } = (body || {}) as {
    title?: string
    description?: string
    ideation?: { goals?: string; targetAudience?: string; keyFeatures?: string; technicalRequirements?: string }
    repository?: { owner?: string; name?: string }
  }

  if (!title?.trim() || !repository?.owner?.trim() || !repository?.name?.trim()) {
    return NextResponse.json(
      { error: 'Missing required fields: title, repository.owner, repository.name' },
      { status: 400 }
    )
  }

  try {
  const goals = ideation?.goals?.trim() ?? ''
  const targetAudience = ideation?.targetAudience?.trim() ?? ''
  const keyFeatures = ideation?.keyFeatures?.trim() ?? ''
  const technicalRequirements = ideation?.technicalRequirements?.trim() ?? ''

  let repoDescription = ''
  let repoLanguage = ''
  const userId =
    typeof session.user?.id === 'string' && session.user.id.trim() && ObjectId.isValid(session.user.id)
      ? session.user.id
      : null

  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const user = userId
      ? await db.collection('users').findOne(
          { _id: new ObjectId(userId) },
          { projection: { githubToken: 1, anthropicApiKey: 1 } }
        ) as { githubToken?: string; anthropicApiKey?: string } | null
      : null
    const token = user?.githubToken || process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN

    if (token) {
      try {
        const res = await fetch(
          `${GITHUB_API}/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
              Authorization: `Bearer ${token}`,
            },
          }
        )
        if (res.ok) {
          const repo = await res.json()
          repoDescription = repo.description || ''
          repoLanguage = repo.language || ''
        }
      } catch {
        // Continue without repo metadata
      }
    }

    const repoSummary = [
      `Repo: ${repository.owner}/${repository.name}`,
      repoDescription ? `Description: ${repoDescription}` : '',
      repoLanguage ? `Primary language: ${repoLanguage}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const projectSummary = [
      `Title: ${title.trim()}`,
      description?.trim() ? `Description: ${description.trim()}` : '',
      goals ? `Goals: ${goals}` : '',
      targetAudience ? `Target audience: ${targetAudience}` : '',
      keyFeatures ? `Key features: ${keyFeatures}` : '',
      technicalRequirements ? `Technical requirements: ${technicalRequirements}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    let apiKey = getAnthropicApiKey()
    if (!apiKey && userId) {
      try {
        apiKey = (await getAnthropicApiKeyForUser(userId)) ?? undefined
      } catch {
        // Continue with env key only
      }
    }
    if (!apiKey) {
      return NextResponse.json({
        alignmentPercent: 70,
        message: 'Alignment check is unavailable (no API key). You can proceed with the build.',
        suggestedProceed: true,
      })
    }

    await anthropicService.initialize(apiKey)
    const response = await anthropicService.createMessage(
      [
        {
          role: 'user',
          content: `Compare this project idea with this GitHub repo and output ONLY a single JSON object (no markdown, no explanation) with these exact keys: "alignmentPercent" (number 0-100), "message" (one short sentence for the user), "suggestedProceed" (boolean). suggestedProceed should be true if alignment is at least 55%; otherwise false and message should suggest choosing a different repo.\n\nProject:\n${projectSummary}\n\nRepo:\n${repoSummary}`,
        },
      ],
      {
        system: `You are an alignment checker for G.R.I.P. Output only valid JSON. alignmentPercent: how well the project goals, audience, and features match the repo's purpose and tech (0-100). message: one sentence, e.g. "Project ideation and repo align at 85% — good to proceed." or "Alignment is low (35%). Consider choosing a repo that better matches your project goals." suggestedProceed: true if alignmentPercent >= 55, false otherwise. No other text.`,
        maxTokens: 256,
      }
    )

    const totalTokens = response.usage?.totalTokens ?? (response.usage?.promptTokens ?? 0) + (response.usage?.completionTokens ?? 0)
    if (totalTokens > 0 && session.user?.id) {
      await addTokenUsage(session.user.id as string, totalTokens).catch((err) =>
        console.warn('Align-check: failed to record token usage', err)
      )
    }

    const content = (response.content && String(response.content).trim()) || ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : content
    let result: { alignmentPercent?: number; message?: string; suggestedProceed?: boolean }
    try {
      result = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({
        alignmentPercent: 65,
        message: 'Alignment check could not be parsed. You can proceed with the build.',
        suggestedProceed: true,
      })
    }

    const alignmentPercent = typeof result.alignmentPercent === 'number'
      ? Math.min(100, Math.max(0, result.alignmentPercent))
      : 65
    const message =
      typeof result.message === 'string' && result.message.trim()
        ? result.message.trim()
        : `Project and repo align at ${alignmentPercent}%. ${alignmentPercent >= 55 ? 'Good to proceed.' : 'Consider choosing a different repo.'}`
    const suggestedProceed =
      typeof result.suggestedProceed === 'boolean' ? result.suggestedProceed : alignmentPercent >= 55

    return NextResponse.json({
      alignmentPercent,
      message,
      suggestedProceed,
    })
  } catch (error) {
    console.error('Align-check error:', error)
    return neutralResponse('Alignment check failed. You can still proceed with the build.')
  }
  } catch (error) {
    console.error('Align-check unexpected error:', error)
    return neutralResponse()
  }
}
