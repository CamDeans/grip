import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { getFilesToGenerate } from '@/lib/services/projectPlanningService'
import { generateFile, getGeneratedFiles, FileGenerationRequest } from '@/lib/services/fileGeneratorService'
import { getProjectState } from '@/lib/services/projectStateService'
import { getProjectContextForHighLevelFiles } from '@/lib/services/highLevelFileContextService'
import { ObjectId } from 'mongodb'

/**
 * POST /api/projects/[id]/files/generate
 * Generate files based on project plan. Writes to projectFiles so files appear in Repo and Generated files.
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

    // Validate ID
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Get request body
    const body = await request.json().catch(() => ({}))
    const { planId, forceRegenerate } = body as { planId?: string; forceRegenerate?: boolean }

    // Get target file list first (from plan suggestedFiles or derived from plan; else structure-based)
    const filesToGenerate = await getFilesToGenerate(id)

    if (!filesToGenerate || filesToGenerate.length === 0) {
      return NextResponse.json({
        message: 'No files to generate',
        fileCount: 0,
        generatedFiles: []
      })
    }

    // Skip only when we already have at least as many files as the plan wants (avoids duplicate token use unless we need to top up)
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

    // Load project state so generated content aligns with current build phase and steps
    const projectState = await getProjectState(id)
    const currentPhase = projectState?.currentPhase || projectState?.phases?.[0]?.name
    const currentPhaseData = projectState?.phases?.find((p: { name: string }) => p.name === currentPhase)
    const phaseContext = currentPhase && currentPhaseData?.steps?.length
      ? {
          currentPhase,
          stepTitles: (currentPhaseData.steps as { title?: string }[]).map((s) => s.title || '').filter(Boolean)
        }
      : undefined

    // Project-specific context for high-level files (package.json name + scripts, entry path)
    let highLevelContext: Awaited<ReturnType<typeof getProjectContextForHighLevelFiles>> | null = null
    try {
      highLevelContext = await getProjectContextForHighLevelFiles(id)
    } catch (e) {
      console.warn('Could not load project context for high-level files, using defaults:', e)
    }

    // Generate files
    const generatedFiles = []
    
    for (const file of filesToGenerate) {
      try {
        const meta = file.generationMetadata || {}
        const filePath = file.path || ''
        const fileName = file.name || filePath.split('/').pop() || 'file.txt'
        const fullPath = filePath && !filePath.endsWith(fileName) ? `${filePath.replace(/\/$/, '')}/${fileName}` : (filePath || fileName)
        const templateId = meta.template || 'ts-utility'

        // Inject project-specific variables for package.json so name and scripts match the project
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
          generatedFiles.push({
            id: result.fileId,
            name: file.name,
            path: file.path,
            success: true
          })
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