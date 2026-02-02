import { NextRequest, NextResponse } from 'next/server'
import { loadBuiltInTemplates, loadCustomTemplates } from '@/lib/services/templateEngineService'

/**
 * GET /api/templates
 * Get available templates for code generation
 */
export async function GET(request: NextRequest) {
  try {
    // Get project ID from query params
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    
    // Load templates
    const [builtInTemplates, customTemplates] = await Promise.all([
      loadBuiltInTemplates(),
      projectId ? loadCustomTemplates(projectId) : Promise.resolve([])
    ])
    
    // Combine templates
    const templates = [...builtInTemplates, ...customTemplates]
    
    return NextResponse.json({
      success: true,
      templates
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch templates' 
      },
      { status: 500 }
    )
  }
} 