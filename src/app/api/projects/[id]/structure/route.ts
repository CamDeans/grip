import { NextRequest, NextResponse } from 'next/server'
import { getProjectStructure } from '@/lib/services/planStorageService'

/**
 * GET /api/projects/[id]/structure
 * Get project file structure
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
    
    // Get project structure
    const structure = await getProjectStructure(projectId)
    
    if (!structure) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project structure not found'
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      structure
    })
  } catch (error) {
    console.error('Error fetching project structure:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch project structure'
      },
      { status: 500 }
    )
  }
} 