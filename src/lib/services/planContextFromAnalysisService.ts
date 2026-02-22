/**
 * Middle layer: turns tree-sitter analysis + ideation into detailed prompt feeds
 * for Claude before the plan is generated. Produces checklist, layer-specific
 * prompts (website / web app / data), and stack guidance (Shadcn, Refine, GitHub).
 * Styling guidance references shadcn-ui/ui and tailwindlabs/headlessui for UI requirements.
 * Tier-based caps lower token consumption (Starter = tightest).
 */

import { getPlanContextLimits } from '@/lib/constants/tokenLimitsByTier'
import { STYLING_REFERENCE_REPOS } from '@/lib/constants/stylingReferenceRepos'
import {
  DATA_REFERENCE_REPOS,
  getReferenceReposGuidanceLine,
} from '@/lib/constants/referenceRepos'
import { detectRepoType, getRepoTypeSummary, type RepoTypeCategory } from '@/lib/repoTypeDetection'

export type LayerPrompts = {
  website?: string
  webApp?: string
  data?: string
  /** High-quality images, 2D/3D models, games, animations — same pattern as website/webApp/data. */
  media?: string
}

export type PlanContextFromAnalysis = {
  checklistSummary: string
  layerPrompts: LayerPrompts
  stackGuidance: string
  /** Short line for plan phase: "Detected repo type: X. Expected commands: Y." */
  repoTypeSummary: string
  activeLayers: { website: boolean; webApp: boolean; data: boolean; media: boolean }
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
const GAMES_MEDIA_KEYWORDS = /game|2d|3d|model|animation|sprite|texture|canvas|webgl|three|unity|babylon|rendering|asset|scene|glb|gltf|interactive\s*media/i

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
 * Derive which layers (website, web app, data, media) are relevant from ideation text and project_type.
 */
function deriveActiveLayers(
  ideationText: string,
  projectType: string
): { website: boolean; webApp: boolean; data: boolean; media: boolean } {
  const text = (ideationText || '').toLowerCase()
  const pt = (projectType || '').toLowerCase()
  const isWebAppType = WEB_APP_TYPES.has(pt)
  const hasDataHeavy = DATA_HEAVY_KEYWORDS.test(text)
  const hasWebsite = WEBSITE_KEYWORDS.test(text)
  const hasWebApp = WEB_APP_KEYWORDS.test(text) || isWebAppType
  const hasMedia =
    GAMES_MEDIA_KEYWORDS.test(text) || pt === 'game' || pt === 'interactive_3d'

  return {
    website: hasWebsite || (!hasWebApp && !hasDataHeavy && !hasMedia),
    webApp: hasWebApp || isWebAppType,
    data: hasDataHeavy || isWebAppType,
    media: hasMedia,
  }
}

/**
 * Build layer-specific prompt fragments from structured analysis and active layers.
 */
function buildLayerPrompts(
  sa: any,
  activeLayers: { website: boolean; webApp: boolean; data: boolean; media: boolean }
): LayerPrompts {
  const out: LayerPrompts = {}
  const routes = Array.isArray(sa?.route_map) ? sa.route_map : []
  const entrypoints = Array.isArray(sa?.entrypoints) ? sa.entrypoints : []
  const dep = sa?.dependency_summary
  const dataPatterns = Array.isArray(dep?.data_storage_patterns) ? dep.data_storage_patterns : []
  const authPatterns = Array.isArray(dep?.auth_patterns) ? dep.auth_patterns : []
  const fileManifest = Array.isArray(sa?.file_manifest) ? sa.file_manifest : []
  const assetPaths = fileManifest
    .filter((f: any) => /\.(glb|gltf|fbx|obj|png|jpg|jpeg|webp|gif|svg)$/i.test(f.path || '') || /(models|textures|scenes|assets)\//.test((f.path || '')))
    .slice(0, 12)
    .map((f: any) => f.path)
  const assetList = assetPaths.length ? assetPaths.join(', ') : 'align with repo'

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

  if (activeLayers.media) {
    out.media = `Media/rendering layer: Focus on high-quality images, 2D/3D models, animations, and scene structure. Asset paths to align with: ${assetList}. Use the repo's rendering pipeline (e.g. Three.js/R3F, Babylon, Canvas 2D) and reference repos for patterns only; implement in new code. Preserve glTF/WebGL and asset loading conventions.`
  }

  return out
}

/**
 * Build stack guidance (Shadcn, Refine, GitHub) based on active layers and whether a repo is linked.
 * For web/UI layers, inject styling requirements from shadcn-ui/ui and tailwindlabs/headlessui.
 * When structuredAnalysis or detected is provided, appends type-specific reference-repo guidance.
 */
function buildStackGuidance(
  activeLayers: { website: boolean; webApp: boolean; data: boolean; media: boolean },
  hasRepo: boolean,
  structuredAnalysis?: any,
  detected?: { category: RepoTypeCategory; label: string }
): string {
  const parts: string[] = []

  if (activeLayers.website || activeLayers.webApp) {
    const repoRefs = STYLING_REFERENCE_REPOS.map((r) => `${r.owner}/${r.name}`).join(', ')
    parts.push(
      `UI stack: Styling reference repos ${repoRefs}. Use Shadcn-style components (Radix primitives, Tailwind, composition) and Headless UI for accessible unstyled behavior. Prefer accessibility (keyboard, focus, ARIA) and a consistent design system for app and marketing pages.`
    )
  }

  if (activeLayers.media) {
    parts.push(
      'For 2D/3D and games: use Three.js / React Three Fiber (or Babylon.js) for structure and patterns; align with the repo\'s asset pipeline and scene format (e.g. glTF). High-quality images and animations: follow existing asset paths and rendering conventions.'
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

  const typeDetected = detected ?? (structuredAnalysis ? detectRepoType(structuredAnalysis) : null)
  if (typeDetected) {
    const refLine = getReferenceReposGuidanceLine(typeDetected.category, typeDetected.label)
    if (refLine) parts.push(refLine)
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
  const detected = sa ? detectRepoType(sa) : null
  let stackGuidance = buildStackGuidance(activeLayers, hasRepo, sa, detected ?? undefined)
  const repoTypeSummary = detected ? getRepoTypeSummary(detected.category, detected.label) : ''

  checklistSummary = checklistSummary.slice(0, limits.checklistSummary)
  layerPrompts = {
    website: layerPrompts.website?.slice(0, limits.layerPrompt),
    webApp: layerPrompts.webApp?.slice(0, limits.layerPrompt),
    data: layerPrompts.data?.slice(0, limits.layerPrompt),
    media: layerPrompts.media?.slice(0, limits.layerPrompt),
  }
  stackGuidance = stackGuidance.slice(0, limits.stackGuidance)

  return {
    checklistSummary,
    layerPrompts,
    stackGuidance,
    repoTypeSummary,
    activeLayers,
  }
}
