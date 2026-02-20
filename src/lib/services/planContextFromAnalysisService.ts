/**
 * Middle layer: turns tree-sitter analysis + ideation into detailed prompt feeds
 * for Claude before the plan is generated. Produces checklist, layer-specific
 * prompts (website / web app / data), and stack guidance (Shadcn, Refine, GitHub).
 * Styling guidance references shadcn-ui/ui and tailwindlabs/headlessui for UI requirements.
 * Tier-based caps lower token consumption (Starter = tightest).
 */

import { getPlanContextLimits } from '@/lib/constants/tokenLimitsByTier'
import { STYLING_REFERENCE_REPOS } from '@/lib/constants/stylingReferenceRepos'

export type LayerPrompts = {
  website?: string
  webApp?: string
  data?: string
}

export type PlanContextFromAnalysis = {
  checklistSummary: string
  layerPrompts: LayerPrompts
  stackGuidance: string
  activeLayers: { website: boolean; webApp: boolean; data: boolean }
}

type IdeationInput = {
  goals?: string
  keyFeatures?: string
  technicalRequirements?: string
}

type EnhancedBuildReqsInput = {
  fullPromptText?: string
  keyFeaturesNormalized?: string
  technicalRequirementsNormalized?: string
}

/** Project types from tree-sitter structured analysis identity.project_type */
const WEB_APP_TYPES = new Set(['web_app', 'full_stack'])
const DATA_HEAVY_KEYWORDS = /admin|dashboard|crud|data\s*table|api\s*route|backend|database|auth|storage|resource/i
const WEBSITE_KEYWORDS = /landing|marketing|content|seo|blog|static\s*site|brochure/i
const WEB_APP_KEYWORDS = /multi-?page|app\s*shell|navigation|layout|route|spa|dashboard|auth\s*flow/i

/**
 * Build checklist summary from tree-sitter structured analysis (routes, entrypoints, missing capabilities).
 */
function buildChecklistSummaryFromStructuredAnalysis(sa: any): string {
  if (!sa) return ''
  const routes = Array.isArray(sa.route_map) ? sa.route_map : []
  const entrypoints = Array.isArray(sa.entrypoints) ? sa.entrypoints : []
  const missing = Array.isArray(sa.ideation_alignment?.missing_capabilities) ? sa.ideation_alignment.missing_capabilities : []
  const lines: string[] = []
  if (routes.length) {
    lines.push('Routes to implement: ' + routes.map((r: any) => `${r.method || 'GET'} ${r.route || ''}`).join('; '))
  }
  if (entrypoints.length) {
    lines.push('Entrypoints: ' + entrypoints.map((e: any) => `${e.file}:${e.symbol || ''}`).join('; '))
  }
  if (missing.length) {
    lines.push('Missing capabilities: ' + missing.map((c: any) => c.needed_capability || '').join('; '))
  }
  return lines.join('\n')
}

/**
 * Derive which layers (website, web app, data) are relevant from ideation text and project_type.
 */
function deriveActiveLayers(
  ideationText: string,
  projectType: string
): { website: boolean; webApp: boolean; data: boolean } {
  const text = (ideationText || '').toLowerCase()
  const isWebAppType = WEB_APP_TYPES.has((projectType || '').toLowerCase())
  const hasDataHeavy = DATA_HEAVY_KEYWORDS.test(text)
  const hasWebsite = WEBSITE_KEYWORDS.test(text)
  const hasWebApp = WEB_APP_KEYWORDS.test(text) || isWebAppType

  return {
    website: hasWebsite || (!hasWebApp && !hasDataHeavy),
    webApp: hasWebApp || isWebAppType,
    data: hasDataHeavy || isWebAppType,
  }
}

/**
 * Build layer-specific prompt fragments from structured analysis and active layers.
 */
function buildLayerPrompts(sa: any, activeLayers: { website: boolean; webApp: boolean; data: boolean }): LayerPrompts {
  const out: LayerPrompts = {}
  const routes = Array.isArray(sa?.route_map) ? sa.route_map : []
  const entrypoints = Array.isArray(sa?.entrypoints) ? sa.entrypoints : []
  const dep = sa?.dependency_summary
  const dataPatterns = Array.isArray(dep?.data_storage_patterns) ? dep.data_storage_patterns : []
  const authPatterns = Array.isArray(dep?.auth_patterns) ? dep.auth_patterns : []

  if (activeLayers.website) {
    out.website = `Website layer: Focus on marketing/landing/content pages, hero, CTAs, and SEO. Use semantic HTML and layout components. Align with any content or page structure from the repo analysis.`
  }

  if (activeLayers.webApp) {
    const routeList = routes.length ? routes.slice(0, 15).map((r: any) => `${r.method || 'GET'} ${r.route || ''}`).join(', ') : 'none'
    const entryList = entrypoints.length ? entrypoints.slice(0, 10).map((e: any) => `${e.file}:${e.symbol || ''}`).join(', ') : 'none'
    out.webApp = `Web app layer: Focus on app shell, navigation, layouts, and auth-guarded routes. Routes to align with: ${routeList}. Entrypoints: ${entryList}. Implement each in new code; do not copy repo source.`
  }

  if (activeLayers.data) {
    const apiRoutes = routes.filter((r: any) => /^(get|post|put|patch|delete)\s+/i.test((r.method || '') + ' ') || (r.route || '').includes('api'))
    const apiList = apiRoutes.length ? apiRoutes.slice(0, 12).map((r: any) => `${r.method || 'GET'} ${r.route || ''}`).join(', ') : 'from analysis'
    out.data = `Data layer: Focus on API routes, data shapes, and storage. API/routes to implement: ${apiList}. Data patterns: ${dataPatterns.length ? dataPatterns.join(', ') : 'align with repo'}. Auth patterns: ${authPatterns.length ? authPatterns.join(', ') : 'align with repo'}. Implement in new code only.`
  }

  return out
}

/**
 * Build stack guidance (Shadcn, Refine, GitHub) based on active layers and whether a repo is linked.
 * For web/UI layers, inject styling requirements from shadcn-ui/ui and tailwindlabs/headlessui.
 */
function buildStackGuidance(
  activeLayers: { website: boolean; webApp: boolean; data: boolean },
  hasRepo: boolean
): string {
  const parts: string[] = []

  if (activeLayers.website || activeLayers.webApp) {
    const repoRefs = STYLING_REFERENCE_REPOS.map((r) => `${r.owner}/${r.name}`).join(', ')
    parts.push(
      `UI stack: Styling reference repos ${repoRefs}. Use Shadcn-style components (Radix primitives, Tailwind, composition) and Headless UI for accessible unstyled behavior. Prefer accessibility (keyboard, focus, ARIA) and a consistent design system for app and marketing pages.`
    )
  }

  if (activeLayers.data || activeLayers.webApp) {
    parts.push(
      'For data-heavy views or admin/CRUD flows, use Refine-style resource and form patterns where appropriate (resource routing, list/create/edit views, data provider alignment with APIs).'
    )
  }

  if (hasRepo) {
    parts.push(
      'Repository reference: The linked GitHub repo analysis (routes, entrypoints, capabilities) describes what to implement. Use it for patterns and APIs only; implement everything in new, clean-room code. Do not copy or paraphrase repo source.'
    )
  }

  return parts.length ? parts.join(' ') : ''
}

/**
 * Build full plan context from tree-sitter analysis and ideation. Call this before generating the development plan.
 * Optional tier applies character caps to lower token consumption (Starter = tightest).
 */
export function buildPlanContextFromAnalysis(input: {
  structuredAnalysis?: any
  projectAnalysis?: string
  ideation?: IdeationInput
  enhancedBuildRequirements?: EnhancedBuildReqsInput
  hasRepo?: boolean
  tier?: string
}): PlanContextFromAnalysis {
  const sa = input.structuredAnalysis
  const hasRepo = input.hasRepo ?? false
  const limits = getPlanContextLimits(input.tier)

  const ideationText = [
    input.enhancedBuildRequirements?.fullPromptText ?? '',
    input.enhancedBuildRequirements?.keyFeaturesNormalized ?? '',
    input.enhancedBuildRequirements?.technicalRequirementsNormalized ?? '',
    input.ideation?.goals ?? '',
    input.ideation?.keyFeatures ?? '',
    input.ideation?.technicalRequirements ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  const projectType = (sa?.identity?.project_type as string) || ''

  let checklistSummary = buildChecklistSummaryFromStructuredAnalysis(sa)
  const activeLayers = deriveActiveLayers(ideationText, projectType)
  let layerPrompts = buildLayerPrompts(sa, activeLayers)
  let stackGuidance = buildStackGuidance(activeLayers, hasRepo)

  checklistSummary = checklistSummary.slice(0, limits.checklistSummary)
  layerPrompts = {
    website: layerPrompts.website?.slice(0, limits.layerPrompt),
    webApp: layerPrompts.webApp?.slice(0, limits.layerPrompt),
    data: layerPrompts.data?.slice(0, limits.layerPrompt),
  }
  stackGuidance = stackGuidance.slice(0, limits.stackGuidance)

  return {
    checklistSummary,
    layerPrompts,
    stackGuidance,
    activeLayers,
  }
}
