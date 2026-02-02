import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { Task } from '@/lib/models'

// Helper to generate unique task ID
function generateTaskId(projectId: string, type: string) {
  return `${type}-${projectId}-${Date.now()}`
}

export async function GET(request: NextRequest) {
  try {
    // Check for authentication and admin role
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check for admin role in user session (assuming roles are stored in session)
    // This is a critical security check for admin endpoints
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Connect to MongoDB
    await connectToDatabase()
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const sort = searchParams.get('sort') || 'createdAt'
    const order = searchParams.get('order') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = parseInt(searchParams.get('skip') || '0')
    const projectId = searchParams.get('projectId')
    
    // Build query
    const query: any = {}
    if (status && status !== 'all') {
      query.status = status
    }
    
    if (projectId) {
      query.projectId = projectId
    }
    
    // Build sort object
    const sortObj: any = {}
    sortObj[sort] = order === 'desc' ? -1 : 1
    
    // Count total matching tasks for pagination
    const totalTasks = await (Task as any).countDocuments(query)
    
    // Query tasks with proper type casting
    const tasks = await (Task as any).find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec()
    
    // Return response with pagination metadata
    return NextResponse.json({ 
      tasks: tasks || [],
      pagination: {
        total: totalTasks,
        limit,
        skip,
        hasMore: skip + tasks.length < totalTasks
      }
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for authentication and admin role
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check for admin role
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Connect to MongoDB
    await connectToDatabase()
    
    // Get task data from request
    const data = await request.json()
    
    // Validate required fields
    if (!data.name || !data.command || !data.projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, command, and projectId are required' },
        { status: 400 }
      )
    }
    
    // Create task with validated data
    const task = await Task.create({
      projectId: data.projectId,
      name: data.name,
      description: data.description || '',
      type: data.type || 'build',
      status: 'queued', // New tasks start as queued
      priority: data.priority || 'normal',
      command: data.command,
      args: data.args || [],
      retryCount: 0,
      maxRetries: data.maxRetries || 3,
      dependencies: data.dependencies || [],
      metadata: {
        createdBy: data.metadata?.createdBy || session.user.name || 'admin',
        phase: data.metadata?.phase,
        step: data.metadata?.step
      }
      // timestamps will be added automatically by the schema
    })
    
    return NextResponse.json({ 
      message: 'Task created successfully',
      task 
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper function to check if user has admin role
function isAdminUser(session: any): boolean {
  // This implementation depends on how roles are stored in your session
  // Common patterns include session.user.role === 'admin' or session.user.roles.includes('admin')
  return session?.user?.isAdmin === true || 
         session?.user?.role === 'admin' || 
         (session?.user?.roles && session?.user?.roles.includes('admin'));
} 