import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { addTokenUsage } from '@/lib/tokenUsage'
import { getFilesToGenerate } from '@/lib/services/projectPlanningService'
import { generateFile, getGeneratedFiles, FileGenerationRequest } from '@/lib/services/fileGeneratorService'
import { getProjectState } from '@/lib/services/projectStateService'
import { getProjectContextForHighLevelFiles } from '@/lib/services/highLevelFileContextService'
import { ObjectId } from 'mongodb'

const STREAM_HEADER = 'x-stream-progress'

/** Emit parent folder paths for a file path (e.g. "src/app/page.tsx" -> ["src", "src/app"]) */
function parentFoldersForPath(fullPath: string): string[] {
  const parts = fullPath.replace(/\\/g, '/').split('/').filter(Boolean)
  if (parts.length <= 1) return []
  const out: string[] = []
  for (let i = 1; i < parts.length; i++) {
    out.push(parts.slice(0, i).join('/'))
  }
  return out
}

/**
 * POST /api/projects/[id]/files/generate
 * Generate files based on project plan. Writes to projectFiles so files appear in Repo and Generated files.
 * If header X-Stream-Progress: true, returns NDJSON stream of { type, ... } events for live preview.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const streamProgress = request.headers.get(STREAM_HEADER) === 'true'
    const body = await request.json().catch(() => ({}))
    const { forceRegenerate } = body as { planId?: string; forceRegenerate?: boolean }

    const filesToGenerate = await getFilesToGenerate(id)

    if (!filesToGenerate || filesToGenerate.length === 0) {
      return NextResponse.json({
        message: 'No files to generate',
        fileCount: 0,
        generatedFiles: []
      })
    }

    const existingFiles = await getGeneratedFiles(id)
    if (!forceRegenerate && existingFiles.length >= filesToGenerate.length) {
      return NextResponse.json({
        message: 'Project already has full file set; skipping generation',
        fileCount: existingFiles.length,
        successCount: existingFiles.length,
        errorCount: 0,
        skipped: true,
        generatedFiles: existingFiles.slice(0, 20).map((f) => ({ id: f._id?.toString(), name: f.filename, path: f.path, success: true }))
      })
    }

    const projectState = await getProjectState(id)
    const currentPhase = projectState?.currentPhase || projectState?.phases?.[0]?.name
    const currentPhaseData = projectState?.phases?.find((p: { name: string }) => p.name === currentPhase)
    const phaseContext = currentPhase && currentPhaseData?.steps?.length
      ? {
          currentPhase,
          stepTitles: (currentPhaseData.steps as { title?: string }[]).map((s) => s.title || '').filter(Boolean)
        }
      : undefined

    let highLevelContext: Awaited<ReturnType<typeof getProjectContextForHighLevelFiles>> | null = null
    try {
      highLevelContext = await getProjectContextForHighLevelFiles(id)
    } catch (e) {
      console.warn('Could not load project context for high-level files, using defaults:', e)
    }

    if (streamProgress) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          const emit = (obj: object) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
          try {
            emit({ type: 'start', total: filesToGenerate.length })
            const emittedFolders = new Set<string>()
            const generatedFiles: Array<{ id?: string; name?: string; path?: string; success: boolean; error?: string }> = []
            let streamTotalTokens = 0

            for (const file of filesToGenerate) {
              const meta = file.generationMetadata || {}
              const filePath = file.path || ''
              const fileName = file.name || filePath.split('/').pop() || 'file.txt'
              const fullPath = filePath && !filePath.endsWith(fileName) ? `${filePath.replace(/\/$/, '')}/${fileName}` : (filePath || fileName)

              for (const folder of parentFoldersForPath(fullPath)) {
                if (!emittedFolders.has(folder)) {
                  emittedFolders.add(folder)
                  emit({ type: 'folder', path: folder })
                }
              }

              const templateId = meta.template || 'ts-utility'
              let variables = meta.variables || {}
              if (templateId === 'package-json' && highLevelContext) {
                variables = {
                  ProjectName: highLevelContext.projectName,
                  DevScript: highLevelContext.devScript,
                  BuildScript: highLevelContext.buildScript,
                  StartScript: highLevelContext.startScript,
                  LintScript: highLevelContext.framework === 'next' ? 'next lint' : highLevelContext.framework === 'vite' ? 'eslint .' : 'next lint',
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
                description: meta.description || 'Generated from plan',
                phaseContext
              }

              try {
                const result = await generateFile(genRequest)
                if (result.success) {
                  streamTotalTokens += result.totalTokens ?? 0
                  generatedFiles.push({ id: result.fileId, name: file.name, path: file.path, success: true })
                  emit({ type: 'file', path: fullPath, name: fileName, success: true })
                } else {
                  throw new Error(result.error || 'Unknown error generating file')
                }
              } catch (error) {
                const errMsg = error instanceof Error ? error.message : 'Unknown error'
                console.error(`Error generating file ${file.path}/${file.name}:`, error)
                generatedFiles.push({ name: file.name, path: file.path, success: false, error: errMsg })
                emit({ type: 'file', path: fullPath, name: fileName, success: false, error: errMsg })
              }
            }

            if (streamTotalTokens > 0 && session.user?.id) {
              addTokenUsage(session.user.id, streamTotalTokens).catch((err) =>
                console.warn('Projects files generate (stream): failed to record token usage', err)
              )
            }
            emit({
              type: 'done',
              successCount: generatedFiles.filter((f) => f.success).length,
              errorCount: generatedFiles.filter((f) => !f.success).length,
              generatedFiles
            })
          } catch (err) {
            emit({ type: 'error', error: err instanceof Error ? err.message : 'Stream error' })
          } finally {
            controller.close()
          }
        }
      })
      return new Response(stream, {
        headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' }
      })
    }

    const generatedFiles: Array<{ id?: string; name?: string; path?: string; success: boolean; error?: string }> = []
    let totalTokens = 0
    for (const file of filesToGenerate) {
      try {
        const meta = file.generationMetadata || {}
        const filePath = file.path || ''
        const fileName = file.name || filePath.split('/').pop() || 'file.txt'
        const fullPath = filePath && !filePath.endsWith(fileName) ? `${filePath.replace(/\/$/, '')}/${fileName}` : (filePath || fileName)
        const templateId = meta.template || 'ts-utility'

        let variables = meta.variables || {}
        if (templateId === 'package-json' && highLevelContext) {
          variables = {
            ProjectName: highLevelContext.projectName,
            DevScript: highLevelContext.devScript,
            BuildScript: highLevelContext.buildScript,
            StartScript: highLevelContext.startScript,
          }
        }

        const genRequest: FileGenerationRequest = {
          projectId: id,
          filePath: fullPath,
          filename: fileName,
          templateId,
          variables,
          description: meta.description || 'Generated from plan',
          phaseContext
        }

        const result = await generateFile(genRequest)
        if (result.success) {
          totalTokens += result.totalTokens ?? 0
          generatedFiles.push({ id: result.fileId, name: file.name, path: file.path, success: true })
        } else {
          throw new Error(result.error || 'Unknown error generating file')
        }
      } catch (error) {
        console.error(`Error generating file ${file.path}/${file.name}:`, error)
        generatedFiles.push({
          name: file.name,
          path: file.path,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    if (totalTokens > 0 && session.user?.id) {
      addTokenUsage(session.user.id, totalTokens).catch((err) =>
        console.warn('Projects files generate: failed to record token usage', err)
      )
    }
    return NextResponse.json({
      message: `Generated ${generatedFiles.filter(f => f.success).length} of ${filesToGenerate.length} files`,
      fileCount: filesToGenerate.length,
      successCount: generatedFiles.filter(f => f.success).length,
      errorCount: generatedFiles.filter(f => !f.success).length,
      generatedFiles
    })
  } catch (error) {
    console.error('Error generating files:', error)
    return NextResponse.json(
      { error: 'Failed to generate files' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to determine file language from filename
 */
function getLanguageFromFileName(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase()
  
  switch (extension) {
    case 'js':
      return 'javascript'
    case 'jsx':
      return 'jsx'
    case 'ts':
      return 'typescript'
    case 'tsx':
      return 'tsx'
    case 'css':
      return 'css'
    case 'scss':
      return 'scss'
    case 'html':
      return 'html'
    case 'json':
      return 'json'
    case 'md':
      return 'markdown'
    case 'py':
      return 'python'
    case 'java':
      return 'java'
    case 'c':
      return 'c'
    case 'cpp':
      return 'cpp'
    case 'go':
      return 'go'
    case 'rb':
      return 'ruby'
    case 'php':
      return 'php'
    case 'sh':
      return 'bash'
    default:
      return 'plaintext'
  }
} 