/**
 * POST /api/projects/[id]/files/retry-failed
 * Regenerate only the given file paths (e.g. after Stage 4 failures).
 * Uses same context and resolveTemplateForPath as files/generate so e.g. public/robots.txt
 * gets full-file on retry instead of ts-utility. GRIP uses this autonomously to fix failed files.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance } from '@/lib/access'
import { addTokenUsage } from '@/lib/tokenUsage'
import { getFilesToGenerate } from '@/lib/services/projectPlanningService'
import { getProjectContextForHighLevelFiles } from '@/lib/services/highLevelFileContextService'
import { generateFile, FileGenerationRequest } from '@/lib/services/fileGeneratorService'
import { getProjectState } from '@/lib/services/projectStateService'
import { saveProjectFile } from '@/lib/services/gripProjectActions'
import { CANONICAL_ROOT_LAYOUT, CANONICAL_GLOBALS_CSS, isRootLayoutPath, isGlobalsCssPath } from '@/lib/constants/canonicalAppFiles'
import { SCOPE_REMINDER_MAX_CHARS } from '@/lib/constants/tokenLimitsByTier'
import { gripLog } from '@/lib/gripLogger'
import { ObjectId } from 'mongodb'
import clientPromise, { DB_NAME } from '@/lib/mongodb'

type IdeationForGen = { goals?: string; targetAudience?: string; keyFeatures?: string; technicalRequirements?: string } | null

function resolveTemplateForPath(
  fullPath: string,
  planTemplate: string,
  framework: string | undefined
): string {
  const normalized = fullPath.replace(/^\/+/, '').replace(/\\/g, '/')
  const baseName = normalized.split('/').pop() || ''
  if ((normalized === 'app/page.tsx' || normalized === 'app/page.jsx' || normalized === 'src/app/page.tsx' || normalized === 'src/app/page.jsx') && (framework === 'next' || !framework)) {
    return 'full-file'
  }
  if (baseName.startsWith('tailwind.config.') || baseName.startsWith('postcss.config.') || baseName.startsWith('next.config.') || baseName === 'sanity.config.ts' || baseName === 'sanity.config.js') {
    return 'full-file'
  }
  if (/^(src\/)?lib\/.+\.(ts|js)$/.test(normalized)) return 'full-file'
  if (/^(src\/)?types\/.+\.(ts|js)$/.test(normalized)) return 'full-file'
  if (/^sanity\/.+\.(ts|js)$/.test(normalized)) return 'full-file'
  if (/^public\/.+\.svg$/i.test(normalized)) return 'full-file'
  if (/^public\/robots\.txt$/i.test(normalized) || /^public\/sitemap\.xml$/i.test(normalized)) return 'full-file'
  if (/^public\/.+\.(txt|xml)$/i.test(normalized)) return 'full-file'
  const isNextAppApiRoute = /^(src\/)?app\/api\/.+\/route\.(ts|js)$/.test(normalized)
  if (isNextAppApiRoute) {
    return framework === 'next' ? 'nextjs-app-api-route' : 'generic-api-route'
  }
  const looksLikeApiRoute =
    /^(src\/)?(api|routes)\/.+\.(ts|js)$/.test(normalized) || /\/route\.(ts|js)$/.test(normalized)
  if (looksLikeApiRoute && framework && framework !== 'next') {
    return 'generic-api-route'
  }
  return planTemplate
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const appDenied = await requireAppAccess(session)
    if (appDenied) return appDenied
    const tokenExhausted = await requireTokenBalance(session)
    if (tokenExhausted) return tokenExhausted

    const { id } = await params
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const paths: string[] = Array.isArray(body.paths) ? body.paths : []
    const normalizedPaths = new Set(paths.map((p: string) => String(p).replace(/^\/+/, '').replace(/\\/g, '/').trim()).filter(Boolean))

    if (normalizedPaths.size === 0) {
      return NextResponse.json({
        successCount: 0,
        errorCount: 0,
        results: [],
        message: 'No paths to retry',
      })
    }

    const filesToGenerate = await getFilesToGenerate(id)
    if (!filesToGenerate?.length) {
      return NextResponse.json({
        successCount: 0,
        errorCount: normalizedPaths.size,
        results: [...normalizedPaths].map((path) => ({ path, success: false, error: 'No plan files' })),
      })
    }

    const toRetry = filesToGenerate.filter((f) => {
      const filePath = (f.path || '').replace(/^\/+/, '').replace(/\\/g, '/')
      const fileName = f.name || filePath.split('/').pop() || 'file.txt'
      const fullPath = filePath && !filePath.endsWith(fileName) ? `${filePath.replace(/\/$/, '')}/${fileName}` : filePath || fileName
      return normalizedPaths.has(fullPath)
    })

    if (toRetry.length === 0) {
      return NextResponse.json({
        successCount: 0,
        errorCount: normalizedPaths.size,
        results: [...normalizedPaths].map((path) => ({ path, success: false, error: 'Path not in plan' })),
      })
    }

    let highLevelContext: Awaited<ReturnType<typeof getProjectContextForHighLevelFiles>> | null = null
    try {
      highLevelContext = await getProjectContextForHighLevelFiles(id)
    } catch (e) {
      console.warn('[retry-failed] Could not load project context:', e)
    }

    const projectState = await getProjectState(id)
    const currentPhase = projectState?.currentPhase || projectState?.phases?.[0]?.name
    const currentPhaseData = projectState?.phases?.find((p: { name: string }) => p.name === currentPhase)
    const phaseContext = currentPhase && currentPhaseData?.steps?.length
      ? {
          currentPhase,
          stepTitles: (currentPhaseData.steps as { title?: string }[]).map((s) => s.title || '').filter(Boolean),
        }
      : undefined

    let projectIdeation: IdeationForGen = null
    let projectTitle: string | undefined
    let scopeReminder: string | undefined
    try {
      const client = await clientPromise
      const db = client.db(DB_NAME)
      let proj = await db.collection('projects').findOne(
        { _id: new ObjectId(id) },
        { projection: { ideation: 1, title: 1 } }
      ) as { ideation?: { goals?: string; targetAudience?: string; keyFeatures?: string; technicalRequirements?: string }; title?: string } | null
      if (!proj) {
        proj = await db.collection('sandboxProjects').findOne(
          { _id: new ObjectId(id) },
          { projection: { ideation: 1, title: 1 } }
        ) as typeof proj | null
      }
      const hasIdeation = proj?.ideation && [proj.ideation.goals, proj.ideation.targetAudience, proj.ideation.keyFeatures, proj.ideation.technicalRequirements].some((v) => v && String(v).trim())
      if (proj && !hasIdeation) {
        const fullProj = await db.collection('projects').findOne({ _id: new ObjectId(id) }) as typeof proj | null
        if (fullProj?.ideation) proj = fullProj
      }
      if (proj?.ideation) projectIdeation = proj.ideation
      if (proj?.title && String(proj.title).trim()) projectTitle = String(proj.title).trim()
      const analysis = await db.collection('analyses').findOne(
        { projectId: new ObjectId(id) },
        { projection: { buildRequirementsDocument: 1 } }
      ) as { buildRequirementsDocument?: string } | null
      if (analysis?.buildRequirementsDocument?.trim()) {
        scopeReminder = analysis.buildRequirementsDocument.trim().slice(0, SCOPE_REMINDER_MAX_CHARS)
      }
    } catch (e) {
      console.warn('[retry-failed] Could not load ideation/scope:', e)
    }

    const framework = highLevelContext?.framework ?? undefined
    const repoCategory = highLevelContext?.repoCategory ?? undefined
    const primaryLanguages = highLevelContext?.primaryLanguages ?? undefined
    const mainLanguages = highLevelContext?.mainLanguages ?? undefined

    const results: Array<{ path: string; success: boolean; error?: string }> = []
    let totalTokens = 0

    gripLog(4, 'retry-failed start', { projectId: id, paths: toRetry.length })

    for (const file of toRetry) {
      const meta = file.generationMetadata || {}
      const filePath = (file.path || '').replace(/^\/+/, '').replace(/\\/g, '/')
      const fileName = file.name || filePath.split('/').pop() || 'file.txt'
      const fullPath = filePath && !filePath.endsWith(fileName) ? `${filePath.replace(/\/$/, '')}/${fileName}` : filePath || fileName

      const templateId = resolveTemplateForPath(fullPath, meta.template || 'ts-utility', framework)
      let variables = meta.variables || {}
      if (templateId === 'package-json' && highLevelContext) {
        variables = {
          ProjectName: highLevelContext.projectName,
          DevScript: highLevelContext.devScript,
          BuildScript: highLevelContext.buildScript,
          StartScript: highLevelContext.startScript,
          LintScript: highLevelContext.framework === 'next' ? 'next lint' : 'eslint .',
          NextVersion: '^14.0.0',
          ReactVersion: '^18.2.0',
          ReactDomVersion: '^18.2.0',
          TypescriptVersion: '^5.0.0',
          TypesNodeVersion: '^20.0.0',
          TypesReactVersion: '^18.2.0',
          TypesReactDomVersion: '^18.2.0',
        }
      }

      const genRequest: FileGenerationRequest = {
        projectId: id,
        filePath: fullPath,
        filename: fileName,
        templateId,
        variables,
        description: meta.description || 'Retry from plan',
        phaseContext,
        framework,
        repoCategory,
        primaryLanguages,
        mainLanguages,
        ideation: projectIdeation ?? undefined,
        projectTitle,
        scopeReminder,
      }

      try {
        // Root layout: write canonical directly so we never get next/head rejection.
        if (isRootLayoutPath(fullPath)) {
          const saveResult = await saveProjectFile(id, fullPath, CANONICAL_ROOT_LAYOUT)
          if (saveResult.ok) {
            results.push({ path: fullPath, success: true })
            gripLog(4, 'retry-failed file success (canonical layout)', { path: fullPath })
          } else {
            results.push({ path: fullPath, success: false, error: saveResult.message || 'Failed to save layout' })
          }
        } else if (isGlobalsCssPath(fullPath)) {
          const saveResult = await saveProjectFile(id, fullPath, CANONICAL_GLOBALS_CSS)
          if (saveResult.ok) {
            results.push({ path: fullPath, success: true })
            gripLog(4, 'retry-failed file success (canonical globals.css)', { path: fullPath })
          } else {
            results.push({ path: fullPath, success: false, error: saveResult.message || 'Failed to save globals.css' })
          }
        } else {
          const result = await generateFile(genRequest)
          if (result.success) {
            totalTokens += result.totalTokens ?? 0
            results.push({ path: fullPath, success: true })
            gripLog(4, 'retry-failed file success', { path: fullPath })
          } else {
            const err = result.error || 'Unknown error'
            results.push({ path: fullPath, success: false, error: err })
            gripLog(4, 'retry-failed file failed', { path: fullPath, error: err })
          }
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        results.push({ path: fullPath, success: false, error: errMsg })
        gripLog(4, 'retry-failed file failed', { path: fullPath, error: errMsg })
      }
    }

    if (totalTokens > 0 && session.user?.id) {
      await addTokenUsage(session.user.id, totalTokens).catch((err) =>
        console.warn('[retry-failed] token usage:', err)
      )
    }

    const successCount = results.filter((r) => r.success).length
    const errorCount = results.filter((r) => !r.success).length
    gripLog(4, 'retry-failed complete', { projectId: id, successCount, errorCount, total: results.length })

    return NextResponse.json({
      successCount,
      errorCount,
      results,
      message: errorCount === 0 ? `All ${results.length} file(s) fixed.` : `${successCount} fixed, ${errorCount} still failed.`,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[GRIP Stage 4] files/retry-failed route error:', error)
    gripLog(4, 'retry-failed route error', { error: errMsg })
    return NextResponse.json({ error: 'Retry failed', details: errMsg }, { status: 500 })
  }
}
