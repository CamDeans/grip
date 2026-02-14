import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance, getAppAccess } from '@/lib/access'
import { buildTokenBudgetPromptFragment } from '@/lib/constants/tokenBudgetPlan'
import { addTokenUsage } from '@/lib/tokenUsage'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'
import { anthropicService } from '@/lib/services/anthropicService'
import { getOrCloneRepository } from '@/lib/repository'
import { listLegalSandboxFiles } from '@/lib/services/legalSandboxService'
import { getSandboxProject } from '@/lib/services/sandboxProjectService'

const COLLECTION = 'legalSandboxPlans'
const SANDBOX_ANALYSES_COLLECTION = 'sandboxAnalyses'

function buildStructuredAnalysisSummary(analysis: any | undefined): string {
  if (!analysis || typeof analysis !== 'object') return ''

  const identity = analysis.identity || {}
  const arch = analysis.architecture_summary || {}
  const routes = Array.isArray(analysis.route_map) ? analysis.route_map : []
  const entrypoints = Array.isArray(analysis.entrypoints) ? analysis.entrypoints : []
  const deps = analysis.dependency_summary || {}
  const ideation = analysis.ideation_alignment || {}
  const matched = Array.isArray(ideation.matched_capabilities) ? ideation.matched_capabilities : []
  const missing = Array.isArray(ideation.missing_capabilities) ? ideation.missing_capabilities : []

  const lines: string[] = []
  lines.push('Repo identity:')
  lines.push(
    `- Name: ${identity.repo_name || '(unknown)'}`,
    `- Primary languages: ${(identity.primary_languages || []).join(', ') || '(none detected)'}`,
    `- Frameworks: ${(identity.detected_frameworks || []).join(', ') || '(none detected)'}`,
    `- Project type: ${identity.project_type || '(unknown)'}`,
  )

  if (Array.isArray(arch.subsystems) && arch.subsystems.length) {
    lines.push('\nArchitecture (subsystems):')
    arch.subsystems.slice(0, 5).forEach((s: any) => {
      lines.push(`- ${s.name || '(unnamed)'}: ${s.purpose || ''}`)
    })
  }

  if (entrypoints.length) {
    lines.push('\nEntrypoints (inferred):')
    entrypoints.slice(0, 5).forEach((e: any) => {
      lines.push(`- ${e.file || ''} :: ${e.symbol || ''} (${e.reason || ''})`)
    })
  }

  if (routes.length) {
    lines.push('\nRoutes (if any):')
    routes.slice(0, 10).forEach((r: any) => {
      lines.push(`- [${r.method || 'ANY'}] ${r.route || ''} → ${r.handler_symbol || ''} (${r.source_file || ''})`)
    })
  }

  if (Array.isArray(deps.external_packages) && deps.external_packages.length) {
    lines.push('\nExternal packages (partial):')
    lines.push(`- ${deps.external_packages.slice(0, 15).join(', ')}`)
  }

  if (ideation.normalized_requirements?.product_summary) {
    lines.push('\nIdeation alignment (summary):')
    lines.push(`- Product summary: ${ideation.normalized_requirements.product_summary}`)
  }
  if (matched.length || missing.length) {
    lines.push(
      `- Matched capabilities: ${matched.length}`,
      `- Missing capabilities: ${missing.length}`,
    )
  }

  return lines.join('\n')
}

/**
 * GET /api/projects/[id]/legal-sandbox/plan
 * Returns the stored legal-sandbox plan (phases/tasks for writing new code only).
 */
export async function GET(
  _request: NextRequest,
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

    const project = await getSandboxProject(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Sandbox project not found' }, { status: 404 })
    }
    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db('test')
    const planDoc = await db.collection(COLLECTION).findOne({
      projectId: new ObjectId(projectId),
    })

    if (!planDoc?.plan) {
      return NextResponse.json({ plan: null })
    }

    return NextResponse.json({ plan: planDoc.plan, updatedAt: planDoc.updatedAt })
  } catch (error) {
    console.error('Legal-sandbox plan GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get plan' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects/[id]/legal-sandbox/plan
 * Generates a development plan for writing NEW code only (repo as dependency). Stores in legalSandboxPlans.
 */
export async function POST(
  _request: NextRequest,
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

    const project = await getSandboxProject(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Sandbox project not found' }, { status: 404 })
    }
    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const accessDenied = await requireAppAccess(session)
    if (accessDenied) return accessDenied
    const tokenExhausted = await requireTokenBalance(session)
    if (tokenExhausted) return tokenExhausted

    const access = await getAppAccess(session)
    const remainingTokens = Math.max(0, (access.tokenAllowance ?? 0) - (access.tokensUsedThisPeriod ?? 0))
    const tokenBudgetHint = buildTokenBudgetPromptFragment(remainingTokens, access.tier ?? 'starter', 'plan')

    let repoPaths: string[] = []
    if (project.repository?.owner && project.repository?.name) {
      try {
        const repoFiles = await getOrCloneRepository(project.repository.owner, project.repository.name, projectId)
        repoPaths = (repoFiles || []).map((f) => f.path)
      } catch {
        // optional
      }
    }

    const sandboxFiles = await listLegalSandboxFiles(projectId)
    const existingPaths = sandboxFiles.map((f) => (f.path ? `${f.path}/${f.filename}` : f.filename)).filter((p) => p !== '.gitkeep')

    let repositoryAnalysisText = ''
    let structuredAnalysisSummary = ''
    try {
      const db = (await clientPromise).db('test')
      // Support both ObjectId and string projectId (pre/post migration)
      const oid = ObjectId.isValid(projectId) ? new ObjectId(projectId) : null
      const analysisDoc = await db.collection(SANDBOX_ANALYSES_COLLECTION).findOne(
        oid ? { $or: [{ projectId: oid }, { projectId: projectId }] } : { projectId: projectId },
        { projection: { repositoryAnalysis: 1 } }
      )
      const analysis = analysisDoc?.repositoryAnalysis as
        | { projectAnalysis?: string; fileAnalyses?: Array<{ path: string; analysis: string }>; structuredAnalysis?: any }
        | undefined
      if (analysis?.projectAnalysis) {
        repositoryAnalysisText = typeof analysis.projectAnalysis === 'string'
          ? analysis.projectAnalysis
          : JSON.stringify(analysis.projectAnalysis)
      }
      if (analysis?.fileAnalyses?.length && !repositoryAnalysisText) {
        repositoryAnalysisText = (analysis.fileAnalyses as Array<{ path: string; analysis: string }>)
          .map((f) => `${f.path}: ${f.analysis}`).join('\n\n')
      }
      if (analysis?.structuredAnalysis) {
        structuredAnalysisSummary = buildStructuredAnalysisSummary(analysis.structuredAnalysis)
      }
    } catch {
      // optional
    }

    const systemPrompt = `You are G.R.I.P. in legal-sandbox mode. Generate a development plan (phases and tasks) for building a project that achieves the SAME end result as the referenced GitHub repo, but by WRITING NEW CODE ONLY. Do not copy or reuse any source code from the repo; treat the repo as a dependency or reference only.

## Quality bar (mandatory)
- Plan for **top-notch output**: not minimal placeholders but clear structure, good UX/UI, and production-minded organization. Results must beat typical dev-tool output and feel best-in-class.
- **L3 file structure (mandatory):** The plan must target a **multi-page app structure**: multiple pages/screens/routes (e.g. app/dashboard, app/settings, pages/about), shared layouts, and clear navigation. Do NOT plan for a single landing page only unless the user explicitly asked for that. This ensures top-notch UX and separates GRIP from other SaaS.
- For **2D apps, games, or any UI**: include phases/tasks for information architecture, screen or scene flow, key user interactions, visual hierarchy, and feedback. Think best-practice UX: clear layout, sensible navigation, accessibility where relevant.
- Each phase should produce something that could be shown to a user and feel intentional—not "wireframe" but "ready to polish."

Project: ${project.title ?? 'Untitled'}
Description: ${project.description ?? ''}
Goals: ${project.ideation?.goals ?? ''}
Target audience: ${project.ideation?.targetAudience ?? ''}
Key features: ${project.ideation?.keyFeatures ?? ''}
Technical requirements: ${project.ideation?.technicalRequirements ?? ''}
${project.repository ? `Linked repo (reference only): ${project.repository.owner}/${project.repository.name}. Repo file paths (structure): ${repoPaths.slice(0, 80).join(', ')}${repoPaths.length > 80 ? '...' : ''}` : ''}
${repositoryAnalysisText ? `\n## Repository analysis (use this to align the plan with what the repo does—patterns and structure only, no code copy)\n${repositoryAnalysisText.slice(0, 4000)}\n` : ''}
${structuredAnalysisSummary ? `\n## Structured repo analysis (tree-link JSON summary; no code)\n${structuredAnalysisSummary}\n` : ''}
${existingPaths.length > 0 ? `\nExisting sandbox files: ${existingPaths.join(', ')}` : ''}

${tokenBudgetHint ? `\n## Token budget (mandatory — scope the plan to fit)\n${tokenBudgetHint}\n` : ''}

Output a JSON object with this exact shape (no markdown, no code fence):
{
  "phases": [
    {
      "name": "Phase name",
      "description": "What this phase achieves (new code only); include UX/design intent where relevant",
      "tasks": [
        { "title": "Task title", "description": "What to implement (new code)" }
      ]
    }
  ]
}
Use 3–6 phases. Include at least one phase focused on UX/structure (screens, flow, layout) and one on core functionality. Each phase should describe writing or implementing something new that aligns with the project and repo structure, not copying repo files.
If the repo has both frontend and backend (e.g. separate api/ or server/ dirs, or multiple package.json), include a phase or task for a single root dev script (e.g. concurrently or npm-run-all) so Run in StackBlitz starts the full stack.`

    const { getAnthropicApiKey } = await import('@/lib/anthropicConfig')
    if (!getAnthropicApiKey()) {
      return NextResponse.json(
        { error: 'G.R.I.P. AI is not configured.' },
        { status: 503 }
      )
    }

    await anthropicService.initialize()
    const response = await anthropicService.createMessage(
      [{ role: 'user', content: 'Generate the legal-sandbox development plan as JSON.' }],
      { system: systemPrompt }
    )

    const totalTokens = response?.usage?.totalTokens ?? (response?.usage?.promptTokens ?? 0) + (response?.usage?.completionTokens ?? 0)
    if (totalTokens > 0 && session.user?.id) {
      addTokenUsage(session.user.id, totalTokens).catch((err) =>
        console.warn('Legal-sandbox plan: failed to record token usage', err)
      )
    }

    const content = (response?.content ?? '').trim()
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const plan = jsonMatch ? JSON.parse(jsonMatch[0]) : { phases: [] }

    const client = await clientPromise
    const db = client.db('test')
    await db.collection(COLLECTION).updateOne(
      { projectId: new ObjectId(projectId) },
      {
        $set: {
          projectId: new ObjectId(projectId),
          plan,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true, plan })
  } catch (error) {
    console.error('Legal-sandbox plan POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate plan' },
      { status: 500 }
    )
  }
}
