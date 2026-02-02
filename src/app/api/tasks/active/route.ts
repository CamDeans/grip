import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getServerAuthSession } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import clientPromise from '@/lib/db'

/**
 * GET /api/tasks/active
 * Get active tasks for a project
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get project ID from query params
    const projectId = request.nextUrl.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Validate ObjectId
    if (!ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectToDatabase()
    const client = await clientPromise
    const db = client.db('test')

    // Get active tasks (status = queued, scheduled, or running)
    const tasks = await db.collection('tasks')
      .find({
        projectId: new ObjectId(projectId),
        status: { $in: ['queued', 'scheduled', 'running'] }
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()

    // Convert tasks to JSON-serializable format and return
    return NextResponse.json({
      tasks: tasks.map(task => ({
        ...task,
        _id: task._id.toString(),
        projectId: task.projectId.toString(),
        createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
        updatedAt: task.updatedAt instanceof Date ? task.updatedAt.toISOString() : task.updatedAt,
        startedAt: task.startedAt instanceof Date ? task.startedAt.toISOString() : task.startedAt,
        completedAt: task.completedAt instanceof Date ? task.completedAt.toISOString() : task.completedAt,
      }))
    })
  } catch (error: any) {
    console.error('Error getting active tasks:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get active tasks' },
      { status: 500 }
    )
  }
} 