/**
 * Pre-plan build requirements analysis.
 * Runs before the development plan is generated to ensure GRIP has full context:
 * user ideation (raw + enhanced), selected repo, and tree-sitter analysis (routes, entrypoints,
 * patterns, missing capabilities). Produces a single "full project build requirements" document
 * so the plan creates a complete build scope—no partial files or code.
 */

import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'
import { analyzeProject } from '@/lib/services/analysisService'
import { buildTechnicalPromptFromEnhancedRequirements } from '@/lib/sandbox/ideationToTechnicalPrompt'
import { analyzeRepositoryStructureWithTreeSitter } from '@/lib/treeSitter/treeSitterAnalysis'
import { getPlanContextLimits } from '@/lib/constants/tokenLimitsByTier'
import { MANDATORY_GRIP_REPO_PIGGYBACK } from '@/lib/constants/buildQualityPlan'

/** No constraint: GRIP gets full build requirements to maximize ideation and tree-sitter use. */
const BUILD_REQUIREMENTS_DOC_MAX_CHARS = 42_000

type ProjectDoc = {
  _id: ObjectId
  title?: string
  description?: string
  ideation?: { goals?: string; targetAudience?: string; keyFeatures?: string; technicalRequirements?: string }
  enhancedBuildRequirements?: { fullPromptText?: string; keyFeaturesNormalized?: string; technicalRequirementsNormalized?: string }
  repository?: { owner: string; name: string }
  researchInstructions?: string
}

type AnalysisDoc = {
  projectId: ObjectId
  repositoryAnalysis?: {
    structuredAnalysis?: any
    projectAnalysis?: string
    mainLanguages?: Record<string, number>
  }
}

/**
 * Build checklist and scope summary from tree-sitter structured analysis (strengthened for full build scope).
 * Includes: routes, entrypoints, subsystems, behavior flows, matched/missing capabilities, boot sequence.
 */
function buildScopeFromStructuredAnalysis(sa: any): string {
  if (!sa) return ''
  const lines: string[] = []

  const routes = Array.isArray(sa.route_map) ? sa.route_map : []
  if (routes.length) {
    lines.push('Routes to implement: ' + routes.map((r: any) => `${r.method || 'GET'} ${r.route || ''} (${r.source_file || ''})`).join('; '))
  }

  const entrypoints = Array.isArray(sa.entrypoints) ? sa.entrypoints : []
  if (entrypoints.length) {
    lines.push('Entrypoints: ' + entrypoints.map((e: any) => `${e.file}:${e.symbol || ''} (${e.reason || ''})`).join('; '))
  }

  const subs = Array.isArray(sa.architecture_summary?.subsystems) ? sa.architecture_summary.subsystems : []
  if (subs.length) {
    lines.push('Subsystems: ' + subs.map((s: any) => `${s.name}: ${s.purpose || ''}`).join('; '))
  }

  const flows = Array.isArray(sa.behavior_flows) ? sa.behavior_flows : []
  if (flows.length) {
    lines.push('Behavior flows: ' + flows.map((f: any) => `${f.flow_id}: ${f.trigger} → ${f.entrypoint}`).join('; '))
  }

  const matched = Array.isArray(sa.ideation_alignment?.matched_capabilities) ? sa.ideation_alignment.matched_capabilities : []
  if (matched.length) {
    lines.push('Matched capabilities (implement in new code): ' + matched.map((c: any) => c.repo_capability).join('; '))
  }

  const missing = Array.isArray(sa.ideation_alignment?.missing_capabilities) ? sa.ideation_alignment.missing_capabilities : []
  if (missing.length) {
    lines.push('Missing capabilities (must include in plan): ' + missing.map((c: any) => `${c.needed_capability} (${c.recommended_approach || ''})`).join('; '))
  }

  const boot = Array.isArray(sa.setup_analysis?.recommended_boot_sequence) ? sa.setup_analysis.recommended_boot_sequence : []
  if (boot.length) {
    lines.push('Recommended boot/setup sequence: ' + boot.join(' → '))
  }

  const coreModules = Array.isArray(sa.architecture_summary?.core_modules) ? sa.architecture_summary.core_modules : []
  if (coreModules.length) {
    lines.push('Core modules: ' + coreModules.join(', '))
  }

  const norm = sa.ideation_alignment?.normalized_requirements
  if (norm) {
    const userStories = Array.isArray(norm.user_stories) ? norm.user_stories : []
    if (userStories.length) {
      lines.push('User stories (must be reflected in tasks and files): ' + userStories.map((u: any) => `As ${u.as_a} I want ${u.i_want} so that ${u.so_that}`).join(' | '))
    }
    const acceptanceCriteria = Array.isArray(norm.acceptance_criteria) ? norm.acceptance_criteria : []
    if (acceptanceCriteria.length) {
      lines.push('Acceptance criteria (plan must satisfy): ' + acceptanceCriteria.map((a: any) => a.criterion || a.id).join('; '))
    }
  }

  const symbolIndex = Array.isArray(sa.symbol_index) ? sa.symbol_index : []
  if (symbolIndex.length) {
    const symLines = symbolIndex.map((entry: any) => {
      const syms = (entry.symbols || []).map((s: any) => s.name || '').filter(Boolean)
      return syms.length ? `${entry.file}: ${syms.join(', ')}` : ''
    }).filter(Boolean)
    if (symLines.length) lines.push('Key exports (file: symbols): ' + symLines.join(' | '))
  }

  const importGraph = Array.isArray(sa.import_graph) ? sa.import_graph : []
  if (importGraph.length) {
    const impLines = importGraph.map((entry: any) => {
      const targets = (entry.imports || []).map((i: any) => i.target || '').filter(Boolean)
      return targets.length ? `${entry.source_file} → ${targets.join(', ')}` : ''
    }).filter(Boolean)
    if (impLines.length) lines.push('Import graph (module dependencies): ' + impLines.join('; '))
  }

  return lines.join('\n')
}

/**
 * Build the full project build requirements document from project + analyses.
 * This is the single source of truth for plan generation so the plan has full scope before build phase.
 */
function buildFullProjectBuildRequirementsDocument(
  project: ProjectDoc,
  analysis: AnalysisDoc | null,
  tier?: string
): string {
  const limits = getPlanContextLimits(tier)
  const sections: string[] = []

  // 1. Project identity
  sections.push(`## Project
Title: ${project.title || 'Untitled'}
${project.description ? `Description: ${project.description}` : ''}`)

  // 2. Full ideation (raw + enhanced)
  const enhancedText = project.enhancedBuildRequirements?.fullPromptText?.trim()
  const rawIdeation = project.ideation
    ? `Goals: ${project.ideation.goals ?? ''}\nTarget audience: ${project.ideation.targetAudience ?? ''}\nKey features: ${project.ideation.keyFeatures ?? ''}\nTechnical requirements: ${project.ideation.technicalRequirements ?? ''}`
    : ''
  if (enhancedText) {
    sections.push(`## Build requirements (enhanced from user ideation)
${enhancedText.slice(0, 14_000)}`)
  } else if (rawIdeation.trim()) {
    sections.push(`## User ideation
${rawIdeation.trim().slice(0, 12_000)}`)
  }

  if ((project.researchInstructions ?? '').trim()) {
    sections.push(`## Research for GRIP
${String(project.researchInstructions).trim().slice(0, 2000)}`)
  }

  // 3. Repo and tree-sitter scope (mandatory for full build)
  const ra = analysis?.repositoryAnalysis
  const sa = ra?.structuredAnalysis
  if (sa) {
    const scope = buildScopeFromStructuredAnalysis(sa)
    if (scope) {
      sections.push(`## Implementation scope (from tree-sitter analysis — implement each in new code; do not copy repo source)
${scope.slice(0, limits.checklistSummary)}`)
    }
    const identity = sa.identity
    if (identity) {
      sections.push(`Repo identity: ${identity.project_type || ''}; primary languages: ${(identity.primary_languages || []).join(', ')}; frameworks: ${(identity.detected_frameworks || []).join(', ')}.`)
    }
  } else if (ra?.mainLanguages && Object.keys(ra.mainLanguages).length > 0) {
    const top = Object.entries(ra.mainLanguages)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([ext]) => ext)
    sections.push(`## Repo languages (from analysis)
${top.join(', ')}. Implement features per ideation and repo structure.`)
  }

  if (project.repository?.owner && project.repository?.name) {
    sections.push(`Linked repo: ${project.repository.owner}/${project.repository.name}. Use for patterns and APIs only; implement everything in new code.`)
  }

  sections.push(`## Mandatory: repo piggyback and alignment
${MANDATORY_GRIP_REPO_PIGGYBACK}`)

  // 5. Mandatory full-build rule (no partial files, complete code only)
  sections.push(`## Mandatory: full build scope
The plan MUST include every file needed for a complete, production-ready app in one run. No partial builds; no placeholder-only files; no files that contain only TODOs or stub comments. The "files" array in the plan must list: package.json, tsconfig.json, .env.example, README.md, root layout and page, all routes/pages, API routes, lib/components, and config. Every file must have a task; every task must result in complete, runnable code. Generated code must be production-ready—no "replace with real implementation" or "Edit this page" placeholders.`)

  const full = sections.join('\n\n')
  return full.length > BUILD_REQUIREMENTS_DOC_MAX_CHARS ? full.slice(0, BUILD_REQUIREMENTS_DOC_MAX_CHARS) + '\n\n[truncated]' : full
}

export type RunPrePlanAnalysisResult = {
  buildRequirementsDocument: string
  analysisRan: boolean
}

/**
 * Run the pre-plan build requirements analysis step.
 * 1. Ensures tree-sitter analysis exists (runs analysisService.analyzeProject if repo present and analysis missing).
 * 2. If project has enhanced build requirements and repo, re-runs tree-sitter with enhanced prompt and updates analyses.
 * 3. Builds and stores the full project build requirements document in analyses.buildRequirementsDocument.
 * Call this after ideation enhancement and before generating the development plan.
 */
export async function runPrePlanBuildRequirementsAnalysis(
  projectId: string,
  options?: { tier?: string }
): Promise<RunPrePlanAnalysisResult> {
  const client = await clientPromise
  const db = client.db()
  const projectObjectId = new ObjectId(projectId)

  const project = await db.collection('projects').findOne(
    { _id: projectObjectId },
    {
      projection: {
        title: 1,
        description: 1,
        ideation: 1,
        enhancedBuildRequirements: 1,
        repository: 1,
        researchInstructions: 1,
      },
    }
  ) as ProjectDoc | null

  if (!project) {
    throw new Error(`Project not found: ${projectId}`)
  }

  let analysis = (await db.collection('analyses').findOne(
    { projectId: projectObjectId },
    { projection: { repositoryAnalysis: 1 } }
  )) as AnalysisDoc | null

  let analysisRan = false

  // Ensure tree-sitter analysis exists when project has a repo
  if (project.repository?.owner && project.repository?.name) {
    const hasStructuredAnalysis = analysis?.repositoryAnalysis?.structuredAnalysis != null

    if (!analysis || !hasStructuredAnalysis) {
      await analyzeProject(projectId, project.repository)
      analysisRan = true
      analysis = (await db.collection('analyses').findOne(
        { projectId: projectObjectId },
        { projection: { repositoryAnalysis: 1 } }
      )) as AnalysisDoc | null
    }

    // Re-run tree-sitter with enhanced build requirements when available (align analysis with ideation)
    if (project.enhancedBuildRequirements && !analysisRan) {
      try {
        const technicalPrompt = buildTechnicalPromptFromEnhancedRequirements(project.enhancedBuildRequirements)
        if (technicalPrompt) {
          const treeResult = await analyzeRepositoryStructureWithTreeSitter(
            project.repository.owner,
            project.repository.name,
            projectId,
            { technicalPrompt, tier: options?.tier }
          )
          const { totalTokens: _t, ...analysisForDb } = treeResult
          await db.collection('analyses').updateOne(
            { projectId: projectObjectId },
            { $set: { repositoryAnalysis: analysisForDb, updatedAt: new Date() } }
          )
          analysis = { ...analysis!, repositoryAnalysis: analysisForDb }
          analysisRan = true
        }
      } catch (err) {
        console.warn('[prePlanBuildRequirements] Tree-sitter re-run with enhanced reqs failed (non-fatal):', err)
      }
    }
  }

  const buildRequirementsDocument = buildFullProjectBuildRequirementsDocument(project, analysis, options?.tier)

  await db.collection('analyses').updateOne(
    { projectId: projectObjectId },
    {
      $set: {
        buildRequirementsDocument,
        buildRequirementsDocumentAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  )

  return { buildRequirementsDocument, analysisRan }
}

/**
 * Persist a minimal build requirements document (project-only, no tree-sitter) when full pre-plan analysis fails.
 * Ensures the plan generator still receives full ideation and full-build scope so we avoid partial plans.
 */
export async function persistMinimalBuildRequirementsDocument(projectId: string, tier?: string): Promise<void> {
  const client = await clientPromise
  const db = client.db()
  const project = await db.collection('projects').findOne(
    { _id: new ObjectId(projectId) },
    { projection: { title: 1, description: 1, ideation: 1, enhancedBuildRequirements: 1, repository: 1, researchInstructions: 1 } }
  ) as ProjectDoc | null
  if (!project) return
  const doc = buildFullProjectBuildRequirementsDocument(project, null, tier)
  await db.collection('analyses').updateOne(
    { projectId: new ObjectId(projectId) },
    { $set: { buildRequirementsDocument: doc, buildRequirementsDocumentAt: new Date(), updatedAt: new Date() } },
    { upsert: true }
  )
}
