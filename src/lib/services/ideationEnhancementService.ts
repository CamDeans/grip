/**
 * Ideation Enhancement Service
 * Takes raw user ideation and produces enhanced build requirements before plan/structure
 * so the AI gets the best version of build requirements and the first build is high quality.
 */

import { getAnthropicApiKey, ANTHROPIC_MODEL_CHAT } from '@/lib/anthropicConfig'
import Anthropic from '@anthropic-ai/sdk'

export type RawIdeation = {
  goals?: string
  targetAudience?: string
  keyFeatures?: string
  technicalRequirements?: string
}

export type EnhancedBuildRequirements = {
  clarifiedGoals: string
  targetAudienceSummary: string
  keyFeaturesNormalized: string
  technicalRequirementsNormalized: string
  techStackRecommendations: string
  uxUiPrinciples: string
  qualityBar: string
  /** Single formatted text for injection into plan and chat prompts */
  fullPromptText: string
}

export type EnhanceIdeationResult = {
  enhanced: EnhancedBuildRequirements
  totalTokens: number
}

/**
 * Enhance raw user ideation into structured build requirements.
 * Runs once before plan generation so plan and chat use the best version.
 * Aligns with: latest libraries, modern UX/UI, clean design, best first-build flow.
 */
export async function enhanceIdeationForBuild(
  ideation: RawIdeation | null | undefined
): Promise<EnhanceIdeationResult | null> {
  if (!ideation) return null
  const goals = (ideation.goals ?? '').trim()
  const audience = (ideation.targetAudience ?? '').trim()
  const features = (ideation.keyFeatures ?? '').trim()
  const tech = (ideation.technicalRequirements ?? '').trim()
  if (!goals && !audience && !features && !tech) return null

  const apiKey = getAnthropicApiKey()
  if (!apiKey) return null

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_CHAT,
      max_tokens: 2400,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: `You are G.R.I.P. Your job is to take the user's raw project ideation (goals, audience, features, technical wishes) and produce a single, enhanced "build requirements" document so that the next steps (project structure, development plan, and code generation) get the best possible input. This ensures the first build is high quality and the user does not waste tokens on rework.

Output a JSON object with exactly these keys (all strings; no markdown, no code fences):
- clarifiedGoals: Clear, actionable project goals (1–3 sentences).
- targetAudienceSummary: Who will use it and what they need (1–2 sentences).
- keyFeaturesNormalized: Key features as a clear list or short paragraphs; normalized so implementation is unambiguous.
- technicalRequirementsNormalized: Technical stack and constraints (e.g. "React 18+, TypeScript, Tailwind; mobile-first"). Prefer latest stable libraries and common best practices if the user was vague.
- techStackRecommendations: Concrete recommendations (e.g. "Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Zod for validation") so the build uses current, stable choices.
- uxUiPrinciples: Short UX/UI bar (e.g. "Clean, modern UI; clear hierarchy; loading and error states; responsive; accessible").
- qualityBar: Short quality bar (e.g. "Production-minded: clear structure, one complete user flow in first build, no placeholders for core paths").

Preserve the user's intent; only clarify and normalize. If they said "simple" or "modern," keep that. If they were vague on tech, recommend sensible current defaults. Output ONLY the JSON object, no other text.

User ideation:
- Goals: ${goals || '(none)'}
- Target audience: ${audience || '(none)'}
- Key features: ${features || '(none)'}
- Technical requirements: ${tech || '(none)'}`
        }
      ]
    })

    const text =
      response?.content?.[0] && 'text' in response.content[0]
        ? String(response.content[0].text).trim()
        : ''
    const totalTokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const jsonString = jsonMatch ? jsonMatch[0] : '{}'
    const parsed = JSON.parse(jsonString) as Record<string, string>

    const clarifiedGoals = (parsed.clarifiedGoals ?? goals) || ''
    const targetAudienceSummary = (parsed.targetAudienceSummary ?? audience) || ''
    const keyFeaturesNormalized = (parsed.keyFeaturesNormalized ?? features) || ''
    const technicalRequirementsNormalized = (parsed.technicalRequirementsNormalized ?? tech) || ''
    const techStackRecommendations = parsed.techStackRecommendations ?? ''
    const uxUiPrinciples = parsed.uxUiPrinciples ?? ''
    const qualityBar = parsed.qualityBar ?? ''

    const fullPromptText = [
      `Goals: ${clarifiedGoals}`,
      `Target audience: ${targetAudienceSummary}`,
      `Key features: ${keyFeaturesNormalized}`,
      `Technical requirements: ${technicalRequirementsNormalized}`,
      techStackRecommendations ? `Tech stack (use latest stable): ${techStackRecommendations}` : '',
      uxUiPrinciples ? `UX/UI bar: ${uxUiPrinciples}` : '',
      qualityBar ? `Quality bar: ${qualityBar}` : ''
    ]
      .filter(Boolean)
      .join('\n')

    const enhanced: EnhancedBuildRequirements = {
      clarifiedGoals,
      targetAudienceSummary,
      keyFeaturesNormalized,
      technicalRequirementsNormalized,
      techStackRecommendations,
      uxUiPrinciples,
      qualityBar,
      fullPromptText
    }

    return { enhanced, totalTokens }
  } catch (err) {
    console.warn('Ideation enhancement failed:', err)
    return null
  }
}
