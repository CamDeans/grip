import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createTask, getProjectTasks, getQueueStatus } from '@/lib/services/taskQueueService'
import { connectToDatabase } from '@/lib/mongodb'

/**
 * GET /api/tasks
 * Get all tasks with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    // Get the request URL to extract query parameters
    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId') || undefined
    const status = url.searchParams.get('status')?.split(',') || undefined
    const type = url.searchParams.get('type')?.split(',') || undefined
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined
    const skip = url.searchParams.get('skip') ? parseInt(url.searchParams.get('skip')!) : undefined
    
    await connectToDatabase()
    
    // Get tasks based on filters
    let tasks = []
    if (projectId) {
      tasks = await getProjectTasks(projectId, { 
        status: status as string[], 
        type: type as string[],
        limit,
        skip
      })
    } else {
      // If no projectId is provided, return a 400 error
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }
    
    // Get queue stats
    const queueStatus = await getQueueStatus()
    
    return NextResponse.json({ 
      tasks, 
      status: queueStatus,
      pagination: {
        limit,
        skip,
        total: queueStatus.totalActive + queueStatus.totalProcessed
      }
    })
  } catch (error) {
    console.error('Error in GET /api/tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tasks
 * Create a new task
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get request body
    const body = await req.json()
    
    // Validate required fields
    if (!body.name || !body.command || !body.projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, command, and projectId are required' },
        { status: 400 }
      )
    }
    
    // Set default type if not provided
    body.type = body.type || 'other'
    
    // Set created by from session user or default to 'admin'
    body.metadata = {
      ...(body.metadata || {}),
      createdBy: session.user?.email || 'admin'
    }
    
    // Create task
    const task = await createTask(body)
    
    if (!task) {
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error in POST /api/tasks:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
} 