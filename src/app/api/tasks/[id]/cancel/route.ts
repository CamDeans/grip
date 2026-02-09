import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getTaskById, cancelTask } from '@/lib/services/taskQueueService'
import { connectToDatabase } from '@/lib/mongodb'

/**
 * POST /api/tasks/[id]/cancel
 * Cancel a specific task
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params
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
    
    // Get the reason from request body or use default
    const body = await request.json().catch(() => ({}))
    const reason = body.reason || 'Cancelled by admin'
    
    // Cancel the task
    const cancelled = await cancelTask(taskId, reason)
    
    if (!cancelled) {
      return NextResponse.json(
        { error: 'Failed to cancel task or task is already in a terminal state' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Task cancelled successfully'
    })
  } catch (error) {
    console.error(`Error in POST /api/tasks/${taskId}/cancel:`, error)
    return NextResponse.json(
      { error: 'Failed to cancel task' },
      { status: 500 }
    )
  }
} 