import { NextResponse } from 'next/server'

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

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params
  
  // If this is the demo project, return mock data
  if (projectId === 'demo-project-123') {
    return NextResponse.json(mockBuildsData)
  }
  
  // For other IDs, return an empty array
  return NextResponse.json([])
} 