import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { Task } from '@/lib/models'

// Phase 8, Step 2: API endpoint for active tasks

// Mock active tasks data for demo project
const mockActiveTasks = {
  tasks: [
    {
      _id: 'task-1',
      name: 'Running code analysis',
      description: 'Analyzing code structure and dependencies',
      status: 'running',
      type: 'analyze',
      priority: 'normal',
      command: 'npm run analyze',
      progress: 65,
      startTime: new Date(Date.now() - 120000), // 2 minutes ago
      metadata: {
        createdBy: 'system',
        phase: 'Analysis',
        step: 'Code Structure'
      }
    },
    {
      _id: 'task-2',
      name: 'Generating components',
      description: 'Creating UI components based on design',
      status: 'queued',
      type: 'generate',
      priority: 'high',
      command: 'npm run generate components',
      progress: 0,
      metadata: {
        createdBy: 'user',
        phase: 'Code Generation',
        step: 'UI Components'
      }
    },
    {
      _id: 'task-3',
      name: 'Running tests',
      description: 'Running unit and integration tests',
      status: 'failed',
      type: 'test',
      priority: 'normal',
      command: 'npm run test',
      startTime: new Date(Date.now() - 300000), // 5 minutes ago
      endTime: new Date(Date.now() - 240000),   // 4 minutes ago
      lastError: 'Test failed: expected true to be false',
      metadata: {
        createdBy: 'system',
        phase: 'Testing',
        step: 'Unit Tests'
      }
    },
    {
      _id: 'task-4',
      name: 'Building project',
      description: 'Creating production build',
      status: 'completed',
      type: 'build',
      priority: 'critical',
      command: 'npm run build',
      startTime: new Date(Date.now() - 600000), // 10 minutes ago
      endTime: new Date(Date.now() - 540000),   // 9 minutes ago
      metadata: {
        createdBy: 'user',
        phase: 'Build',
        step: 'Production Build'
      }
    }
  ]
}

/**
 * GET /api/projects/[id]/tasks/active
 * Get active tasks for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    
    // Special case for demo project
    if (projectId === 'demo-project-123') {
      return NextResponse.json(mockActiveTasks)
    }
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }
    
    if (!ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project ID format' },
        { status: 400 }
      )
    }
    
    // Connect to database
    await connectToDatabase()
    
    // Get URL parameters to allow filtering
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Build query
    const query: any = {
      projectId: new ObjectId(projectId)
    }
    
    // Add status filter if specified, otherwise include recent completed/failed tasks too
    if (statusFilter) {
      query.status = statusFilter
    } else {
      // Include active tasks plus recently completed/failed/cancelled tasks
      query.$or = [
        // Always include active tasks
        { status: { $in: ['queued', 'scheduled', 'running'] } },
        
        // Include recently completed/failed/cancelled tasks (in the last hour)
        { 
          status: { $in: ['completed', 'failed', 'cancelled'] },
          endTime: { $gte: new Date(Date.now() - 3600000) } // Last hour
        }
      ]
    }
    
    // Get tasks with proper type casting
    const tasks = await (Task as any).find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
    
    // Post-process sorting by status priority since MongoDB doesn't support this well
    const statusPriority: Record<string, number> = {
      'running': 0,
      'queued': 1,
      'scheduled': 2,
      'failed': 3,
      'completed': 4,
      'cancelled': 5
    }
    
    tasks.sort((a: any, b: any) => {
      // First compare status priority
      const statusA = statusPriority[a.status as string] ?? 999
      const statusB = statusPriority[b.status as string] ?? 999
      if (statusA !== statusB) return statusA - statusB
      
      // Then compare actual priority
      const priorityMap: Record<string, number> = { 'critical': 3, 'high': 2, 'normal': 1, 'low': 0 }
      const priorityA = priorityMap[a.priority as string] ?? 0
      const priorityB = priorityMap[b.priority as string] ?? 0
      if (priorityA !== priorityB) return priorityB - priorityA
      
      // Finally sort by creation date (newest first)
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })
    
    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error fetching active tasks:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch active tasks' },
      { status: 500 }
    )
  }
} 