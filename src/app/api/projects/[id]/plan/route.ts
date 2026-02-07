import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateProjectPlan, getProjectPlan } from '@/lib/services/projectPlanningService'
import { ObjectId } from 'mongodb'

/**
 * GET /api/projects/[id]/plan
 * Get a project's planning data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params;

    // Validate id
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Get the project plan
    const plan = await getProjectPlan(id)

    if (!plan) {
      return NextResponse.json({ error: 'Project plan not found' }, { status: 404 })
    }

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error fetching project plan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project plan' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects/[id]/plan
 * Generate a project plan
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params;

    // Validate id
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Generate plan
    const plan = await generateProjectPlan(id)

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error generating project plan:', error)
    return NextResponse.json(
      { error: 'Failed to generate project plan' },
      { status: 500 }
    )
  }
} 