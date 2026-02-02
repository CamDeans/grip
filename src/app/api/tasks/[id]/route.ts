import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getTaskById, cancelTask } from '@/lib/services/taskQueueService'
import { Task } from '@/lib/models/Task'
import { connectToDatabase } from '@/lib/mongodb'

/**
 * GET /api/tasks/[id]
 * Get a specific task by ID
 */
export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: taskId } = params;
  
  try {
    await connectToDatabase()
    
    const task = await getTaskById(taskId)
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ task })
  } catch (error) {
    console.error(`Error in GET /api/tasks/${taskId}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tasks/[id]
 * Delete a specific task
 */
export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: taskId } = params;
  
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
    
    // Cancel the task if it's running
    if (['queued', 'scheduled', 'running'].includes(task.status)) {
      await cancelTask(taskId, 'Deleted by admin')
    }
    
    // Then delete the task from database
    await Task.deleteOne({ _id: taskId })
    
    return NextResponse.json({ 
      success: true,
      message: 'Task deleted successfully'
    })
  } catch (error) {
    console.error(`Error in DELETE /api/tasks/${taskId}:`, error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
} 