/**
 * Sandbox-only: advances user plain-English ideation into a technical, comparable
 * analysis prompt. Used to guide repo analysis toward the user's project ideation
 * and end-result hopes. Repo remains separate; analysis is user-repo-only (GRIP
 * codebase is never analyzed).
 */

import Anthropic from '@anthropic-ai/sdk'
import { getAnthropicApiKey, ANTHROPIC_MODEL_CHAT } from '@/lib/anthropicConfig'

export type SandboxIdeation = {
  goals?: string
  targetAudience?: string
  keyFeatures?: string
  technicalRequirements?: string
}

export type BuildTechnicalPromptResult = { prompt: string; totalTokens: number }

/**
 * Builds a technical, comparable analysis prompt from the user's plain-English
 * ideation so sandbox analysis can align with their project goals and end-result
 * hopes. Does not reference or analyze GRIP code—only shapes how we interpret
 * the user's linked repo.
 */
export async function buildTechnicalAnalysisPromptFromIdeation(
  ideation: SandboxIdeation | null | undefined
): Promise<BuildTechnicalPromptResult> {
  if (!ideation) return { prompt: '', totalTokens: 0 }

  const goals = (ideation.goals ?? '').trim()
  const audience = (ideation.targetAudience ?? '').trim()
  const features = (ideation.keyFeatures ?? '').trim()
  const tech = (ideation.technicalRequirements ?? '').trim()
  if (!goals && !audience && !features && !tech) return { prompt: '', totalTokens: 0 }

  const apiKey = getAnthropicApiKey()
  if (!apiKey) return { prompt: '', totalTokens: 0 }

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_CHAT,
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: `You are G.R.I.P. in legal-sandbox mode. The user has described their project in plain English (ideation). Convert this into a strong, technical "analysis prompt" that will guide repository analysis AND later code generation. The output must make analysis and generation top-notch.

Include ALL of the following in your output (weave them into one coherent analysis prompt):
1. **Goals and outcome** — What the user wants to achieve; what "done well" looks like.
2. **L3 file structure and pages (mandatory)** — Assume multi-page app structure: multiple pages/screens/routes (e.g. app/ or pages/ with nested routes like app/dashboard, app/settings), shared layouts, and clear navigation. Single-landing-only only if the user explicitly asks. Output must be best-in-class and beat typical dev tools and other SaaS—top-notch UX, separate from the rest.
3. **UX/UI and design bar** — Best-practice criteria: clear information architecture, sensible user flows, visual hierarchy, feedback and affordances, accessibility (a11y), responsive or 2D layout where relevant. For 2D apps/games: screen flow, key interactions, and what makes the experience good.
4. **Technical and structure** — Stack, entry points, components/features to look for, integration points.
5. **Quality bar** — Not "minimal placeholder" but production-minded: structure that scales, naming and organization, separation of concerns, so generated code can match this bar. Aim to beat other dev tools in output quality.

Output ONLY the technical analysis prompt text: no preamble, no markdown, no code fences. Use 1–2 short paragraphs or a tight bullet list. Do not reference any specific codebase or GRIP; this prompt will be used to interpret the user's linked repo and to drive high-quality plan and code generation.

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
    return { prompt: text || '', totalTokens }
  } catch (err) {
    console.warn('Sandbox ideation→technical prompt failed:', err)
    return { prompt: '', totalTokens: 0 }
  }
}
