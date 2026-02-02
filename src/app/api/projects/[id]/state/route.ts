import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Mock project state data for demo project
const mockProjectState = {
  projectId: 'demo-project-123',
  phases: [
    {
      id: 'phase-1',
      name: 'UI Improvement Phase',
      status: 'in_progress',
      steps: [
        { 
          id: 'step-1', 
          title: 'Simplify Layout', 
          status: 'completed',
          description: 'Redesign the layout to be more intuitive and less cluttered'
        },
        { 
          id: 'step-2', 
          title: 'Improve Visual Hierarchy', 
          status: 'in_progress',
          description: 'Enhance visual hierarchy using size, color, and spacing'
        },
        { 
          id: 'step-3', 
          title: 'Add Collapsible Sections', 
          status: 'in_progress',
          description: 'Make sections collapsible to save space'
        },
        { 
          id: 'step-4', 
          title: 'Optimize for Mobile', 
          status: 'pending',
          description: 'Ensure the interface works well on mobile devices'
        },
        { 
          id: 'step-5', 
          title: 'Add Keyboard Shortcuts', 
          status: 'pending',
          description: 'Implement keyboard shortcuts for common actions'
        }
      ]
    },
    {
      id: 'phase-2',
      name: 'Performance Optimization',
      status: 'pending',
      steps: [
        { 
          id: 'step-6', 
          title: 'Reduce Bundle Size', 
          status: 'pending',
          description: 'Optimize JavaScript bundle size'
        },
        { 
          id: 'step-7', 
          title: 'Implement Code Splitting', 
          status: 'pending',
          description: 'Split code into smaller chunks for faster loading'
        },
        { 
          id: 'step-8', 
          title: 'Add Caching', 
          status: 'pending',
          description: 'Implement caching for improved performance'
        }
      ]
    }
  ],
  currentPhase: 'phase-1',
  progress: 30, // percentage
  updatedAt: new Date().toISOString()
}

/**
 * GET /api/projects/[id]/state
 * Retrieves the current state of a project including phases and steps
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401 }
      )
    }

    const { id } = await params

    if (!id) {
      return new NextResponse(
        JSON.stringify({ error: 'Project ID is required' }),
        { status: 400 }
      )
    }

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid project ID format' }),
        { status: 400 }
      )
    }

    // Connect to database
    const client = await clientPromise
    const db = client.db('test')

    // Find project state
    const state = await db.collection('projectStates').findOne({
      projectId: new ObjectId(id)
    })

    if (!state) {
      return new NextResponse(
        JSON.stringify({ error: 'Project state not found' }),
        { status: 404 }
      )
    }

    return NextResponse.json(state)
  } catch (error: any) {
    console.error('Error loading project state:', error)
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Something went wrong' }),
      { status: 500 }
    )
  }
} 