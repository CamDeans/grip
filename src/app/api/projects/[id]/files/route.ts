import { NextRequest, NextResponse } from 'next/server'
import { getGeneratedFiles } from '@/lib/services/fileGeneratorService'
import { IProjectFile } from '@/lib/models/ProjectFile'

/**
 * GET /api/projects/[id]/files
 * Get all generated files for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    
    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required'
        },
        { status: 400 }
      )
    }
    
    // Get files for project
    const files = await getGeneratedFiles(projectId)
    
    // Map files to response format
    const mappedFiles = files.map((file: IProjectFile) => ({
      fileId: file._id?.toString() || '',
      projectId: file.projectId.toString(),
      path: file.path,
      filename: file.filename,
      language: file.language,
      size: file.size,
      version: file.version,
      metadata: file.metadata
    }))
    
    return NextResponse.json({
      success: true,
      files: mappedFiles
    })
  } catch (error) {
    console.error('Error fetching project files:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch project files'
      },
      { status: 500 }
    )
  }
} 