/**
 * POST /api/projects/align-check
 * Compares project ideation + details against the selected GitHub repo and returns
 * alignment percentage and whether to proceed. Used before creating a project so the
 * user can confirm or choose a different repo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { anthropicService } from '@/lib/services/anthropicService'
import { getAnthropicApiKey } from '@/lib/anthropicConfig'

const GITHUB_API = 'https://api.github.com'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      ideation,
      repository,
    } = body as {
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

    const goals = ideation?.goals?.trim() ?? ''
    const targetAudience = ideation?.targetAudience?.trim() ?? ''
    const keyFeatures = ideation?.keyFeatures?.trim() ?? ''
    const technicalRequirements = ideation?.technicalRequirements?.trim() ?? ''

    // Fetch repo metadata from GitHub (description, language) if we have a token
    let repoDescription = ''
    let repoLanguage = ''
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    const user = await db.collection('users').findOne(
      { _id: session.user?.id ? new ObjectId(session.user.id as string) : undefined },
      { projection: { githubToken: 1 } }
    ) as { githubToken?: string } | null
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

    const apiKey = getAnthropicApiKey()
    if (!apiKey) {
      // No AI: return a neutral alignment so user can still proceed
      return NextResponse.json({
        alignmentPercent: 70,
        message: 'Alignment check is unavailable (no API key). You can proceed with the build.',
        suggestedProceed: true,
      })
    }

    await anthropicService.initialize()
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
    return NextResponse.json(
      { error: 'Alignment check failed. You can still proceed with the build.' },
      { status: 500 }
    )
  }
}
