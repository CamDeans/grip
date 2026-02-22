import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import clientPromise, { DB_NAME } from '@/lib/db'

// Phase 2, Step 3: Create Build Logs Data Fetcher

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401 }
      )
    }

    // Get query parameters
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    const limitParam = url.searchParams.get('limit')
    const taskType = url.searchParams.get('taskType')
    const status = url.searchParams.get('status')

    if (!projectId) {
      return new NextResponse(
        JSON.stringify({ error: 'Project ID is required' }),
        { status: 400 }
      )
    }

    // Parse limit parameter
    const limit = limitParam ? parseInt(limitParam, 10) : 10
    
    // Connect to database
    const client = await clientPromise
    const db = client.db(DB_NAME)

    // Build query
    const query: any = { 
      projectId: new ObjectId(projectId) 
    }
    
    if (taskType) {
      query.taskType = taskType
    }
    
    if (status) {
      query.status = status
    }

    // Fetch build logs from buildLogs collection
    let logsQuery = db.collection('buildLogs').find(query)
    
    // Apply sort (most recent first) and limit
    logsQuery = logsQuery.sort({ startTime: -1 }).limit(limit)
    
    const logs = await logsQuery.toArray()

    // Format the response
    const formattedLogs = logs.map(log => ({
      id: log._id.toString(),
      projectId: log.projectId.toString(),
      taskId: log.taskId,
      taskType: log.taskType,
      status: log.status,
      command: log.command,
      startTime: log.startTime,
      endTime: log.endTime || null,
      duration: log.duration || null,
      output: log.output || '',
      exitCode: log.exitCode || null,
      metadata: log.metadata || {},
      error: log.error || null,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt
    }))

    return NextResponse.json(formattedLogs)
  } catch (error: any) {
    console.error('Error fetching build logs:', error)
    
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Something went wrong' }),
      { status: 500 }
    )
  }
} 