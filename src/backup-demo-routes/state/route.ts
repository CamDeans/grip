import { NextResponse } from 'next/server'

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

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params
  
  // If this is the demo project, return mock data
  if (projectId === 'demo-project-123') {
    return NextResponse.json(mockProjectState)
  }
  
  // For other IDs, return a not found response
  return new NextResponse('Project state not found', { status: 404 })
} 