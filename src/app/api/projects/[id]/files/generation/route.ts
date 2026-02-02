import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { planFileGeneration, getFilesToGenerate } from '@/lib/services/projectPlanningService'
import { ObjectId } from 'mongodb'

/**
 * GET /api/projects/[id]/files/generation
 * Get files that are planned for generation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Validate id
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Get files to generate
    const files = await getFilesToGenerate(id)

    return NextResponse.json({ files })
  } catch (error) {
    console.error('Error fetching files to generate:', error)
    return NextResponse.json(
      { error: 'Failed to fetch files to generate' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects/[id]/files/generation
 * Plan file generation for a specific file
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

    const { id } = params

    // Validate id
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    const { filePath, templateName, description } = body

    // Validate required fields
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      )
    }

    if (!templateName) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      )
    }

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Plan file generation
    const success = await planFileGeneration(
      id,
      filePath,
      templateName,
      description
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to plan file generation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error planning file generation:', error)
    return NextResponse.json(
      { error: 'Failed to plan file generation' },
      { status: 500 }
    )
  }
} 