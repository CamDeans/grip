import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { Task } from '@/lib/models/Task'

// Common handler for both PUT and POST methods
async function handleTaskAction(
  request: NextRequest,
  params: { id: string; action: string }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check for admin role
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { id, action } = params;
    
    if (!id || !action) {
      return NextResponse.json(
        { error: 'Missing task ID or action' },
        { status: 400 }
      )
    }
    
    // Connect to MongoDB
    await connectToDatabase()
    
    // Find the task
    const task = await (Task as any).findById(id)
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }
    
    // Handle different actions
    switch (action) {
      case 'start':
        if (task.status !== 'queued' && task.status !== 'scheduled') {
          return NextResponse.json(
            { error: 'Task is not in a startable state' },
            { status: 400 }
          )
        }
        
        task.status = 'running'
        task.startTime = new Date()
        await task.save()
        break
        
      case 'stop':
        if (task.status !== 'running') {
          return NextResponse.json(
            { error: 'Task is not running' },
            { status: 400 }
          )
        }
        
        task.status = 'completed'
        task.endTime = new Date()
        await task.save()
        break
        
      case 'cancel':
        if (task.status !== 'queued' && task.status !== 'scheduled' && task.status !== 'running') {
          return NextResponse.json(
            { error: 'Task cannot be cancelled' },
            { status: 400 }
          )
        }
        
        task.status = 'cancelled'
        task.endTime = new Date()
        await task.save()
        break
        
      case 'retry':
        if (task.status !== 'failed') {
          return NextResponse.json(
            { error: 'Only failed tasks can be retried' },
            { status: 400 }
          )
        }
        
        // Check if task has exceeded max retries
        if (task.retryCount >= task.maxRetries) {
          return NextResponse.json(
            { error: `Task has exceeded maximum retry count of ${task.maxRetries}` },
            { status: 400 }
          )
        }
        
        task.status = 'queued'
        task.lastError = null
        await task.save()
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
    
    return NextResponse.json({ 
      success: true, 
      task,
      message: `Task ${action} action completed successfully`
    })
  } catch (error) {
    console.error(`Error handling task action:`, error)
    return NextResponse.json(
      { 
        error: 'Failed to process task action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Support both PUT and POST methods
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  return handleTaskAction(request, await params)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  return handleTaskAction(request, await params)
} 