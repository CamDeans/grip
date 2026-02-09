import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getTaskById } from '@/lib/services/taskQueueService'
import { connectToDatabase } from '@/lib/mongodb'

/**
 * POST /api/tasks/[id]/start
 * Manually start a scheduled or queued task
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
    
    // Can only start scheduled or queued tasks
    if (!['scheduled', 'queued'].includes(task.status)) {
      return NextResponse.json(
        { error: `Cannot start task with status: ${task.status}` },
        { status: 400 }
      )
    }
    
    // Update task status to running
    task.status = 'running'
    task.startTime = new Date()
    task.scheduledFor = undefined
    
    await task.save()
    
    return NextResponse.json({ 
      success: true,
      message: 'Task started successfully',
      task
    })
  } catch (error) {
    console.error(`Error in POST /api/tasks/${taskId}/start:`, error)
    return NextResponse.json(
      { error: 'Failed to start task' },
      { status: 500 }
    )
  }
} 