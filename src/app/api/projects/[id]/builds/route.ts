import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'

// Mock builds data for demo project
const mockBuildsData = [
  {
    id: 'build-1',
    projectId: 'demo-project-123',
    taskType: 'build',
    command: 'npm run build',
    status: 'completed',
    output: 'Build completed successfully in 2.5s',
    startTime: new Date(Date.now() - 3600000), // 1 hour ago
    endTime: new Date(Date.now() - 3597500),   // 1 hour ago - 2.5s
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3597500).toISOString()
  },
  {
    id: 'build-2',
    projectId: 'demo-project-123',
    taskType: 'test',
    command: 'npm run test',
    status: 'completed',
    output: 'All tests passed!',
    startTime: new Date(Date.now() - 1800000), // 30 minutes ago
    endTime: new Date(Date.now() - 1795000),   // 30 minutes ago - 5s
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 1795000).toISOString()
  },
  {
    id: 'build-3',
    projectId: 'demo-project-123',
    taskType: 'analyze',
    command: 'npm run analyze',
    status: 'failed',
    output: 'Analysis failed: Could not find configuration file',
    startTime: new Date(Date.now() - 900000),  // 15 minutes ago
    endTime: new Date(Date.now() - 899000),    // 15 minutes ago - 1s
    createdAt: new Date(Date.now() - 900000).toISOString(),
    updatedAt: new Date(Date.now() - 899000).toISOString()
  },
  {
    id: 'build-4',
    projectId: 'demo-project-123',
    taskType: 'deploy',
    command: 'npm run deploy',
    status: 'running',
    output: 'Deploying to production environment...',
    startTime: new Date(Date.now() - 120000),  // 2 minutes ago
    createdAt: new Date(Date.now() - 120000).toISOString(),
    updatedAt: new Date(Date.now() - 120000).toISOString()
  }
]

/**
 * GET /api/projects/[id]/builds
 * Get builds for a project
 */
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    
    // Special case for demo project
    if (projectId === 'demo-project-123') {
      return NextResponse.json(mockBuildsData)
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
    const client = await clientPromise
    const db = client.db('test')
    
    // Get builds from buildLogs collection
    const builds = await db.collection('buildLogs')
      .find({ projectId: new ObjectId(projectId) })
      .sort({ createdAt: -1 })
      .toArray()
    
    return NextResponse.json(builds)
  } catch (error) {
    console.error('Error fetching project builds:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project builds' },
      { status: 500 }
    )
  }
} 