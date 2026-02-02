import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getTaskById } from '@/lib/services/taskQueueService'
import { connectToDatabase } from '@/lib/mongodb'

/**
 * POST /api/tasks/[id]/retry
 * Retry a failed task
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Get the task ID directly from the params object
  const taskId = params.id;
  
  try {
    const session = await getServerSession()
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    await connectToDatabase()
    
    // First check if task exists
    const task = await getTaskById(taskId)
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }
    
    // Can only retry failed tasks
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
    
    // Set task status back to queued to retry
    task.status = 'queued'
    task.startTime = undefined
    task.endTime = undefined
    
    await task.save()
    
    return NextResponse.json({ 
      success: true,
      message: 'Task queued for retry',
      task
    })
  } catch (error) {
    console.error(`Error in POST /api/tasks/${taskId}/retry:`, error)
    return NextResponse.json(
      { error: 'Failed to retry task' },
      { status: 500 }
    )
  }
} 