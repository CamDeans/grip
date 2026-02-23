import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance } from '@/lib/access'
import { addTokenUsage } from '@/lib/tokenUsage'
import { generateFile, FileGenerationRequest } from '@/lib/services/fileGeneratorService'

/**
 * POST /api/files/generate
 * Generate a file from a template
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const appDenied = await requireAppAccess(session)
    if (appDenied) return appDenied
    const tokenExhausted = await requireTokenBalance(session)
    if (tokenExhausted) return tokenExhausted

    const body = await request.json()
    
    // Validate required fields
    if (!body.projectId || !body.templateId || !body.filePath) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: projectId, templateId, filePath' 
        },
        { status: 400 }
      )
    }
    
    // Create file generation request
    const fileRequest: FileGenerationRequest = {
      projectId: body.projectId,
      templateId: body.templateId,
      filePath: body.filePath,
      filename: body.filename,
      variables: body.variables,
      description: body.description
    }
    
    // Generate file
    const result = await generateFile(fileRequest)
    if (result.success && (result.totalTokens ?? 0) > 0 && session?.user?.id) {
      await addTokenUsage(session.user.id, result.totalTokens!).catch((err) =>
        console.warn('Files generate: failed to record token usage', err)
      )
    }
    if (result.success) {
      return NextResponse.json({
        success: true,
        fileId: result.fileId,
        filename: result.filename,
        path: result.path,
        language: result.language,
        size: result.size,
        content: result.content.substring(0, 200) + (result.content.length > 200 ? '...' : '')
      })
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to generate file' 
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error generating file:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate file' 
      },
      { status: 500 }
    )
  }
} 