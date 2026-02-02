import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFilesToGenerate } from '@/lib/services/projectPlanningService'
import { generateFile, FileGenerationRequest } from '@/lib/services/fileGeneratorService'
import { renderTemplate, getTemplateById } from '@/lib/services/templateEngineService'
import { createFile } from '@/lib/services/fileStorageService'
import { ObjectId } from 'mongodb'

/**
 * POST /api/projects/[id]/files/generate
 * Generate files based on project plan
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project ID
    const { id } = params

    // Validate ID
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Get request body
    const body = await request.json()
    
    // Get plan ID (optional - if not provided, will use the latest plan)
    const { planId } = body

    // Get files to generate
    const filesToGenerate = await getFilesToGenerate(id)
    
    if (!filesToGenerate || filesToGenerate.length === 0) {
      return NextResponse.json({ 
        message: 'No files to generate',
        fileCount: 0,
        generatedFiles: []
      })
    }

    // Generate files
    const generatedFiles = []
    
    for (const file of filesToGenerate) {
      try {
        // Create request for file generator
        const request: FileGenerationRequest = {
          projectId: id,
          filePath: file.path,
          filename: file.name,
          templateId: file.generationMetadata.template,
          variables: file.generationMetadata.variables || {},
          description: file.generationMetadata.description
        }
        
        // Generate file
        const result = await generateFile(request)
        
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