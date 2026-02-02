import { NextResponse } from 'next/server'

// Mock active tasks data for demo project
const mockActiveTasks = {
  tasks: [
    {
      id: 'task-1',
      name: 'Running code analysis',
      status: 'running',
      type: 'analyze',
      progress: 65,
      startTime: new Date(Date.now() - 120000), // 2 minutes ago
      phase: 'Analysis',
      step: 'Code Structure'
    },
    {
      id: 'task-2',
      name: 'Generating components',
      status: 'pending',
      type: 'generate',
      progress: 0,
      phase: 'Code Generation',
      step: 'UI Components'
    },
    {
      id: 'task-3',
      name: 'Installing dependencies',
      status: 'completed',
      type: 'build',
      startTime: new Date(Date.now() - 300000), // 5 minutes ago
      endTime: new Date(Date.now() - 240000),   // 4 minutes ago
      phase: 'Setup',
      step: 'Dependencies'
    }
  ]
}

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params
  
  // If this is the demo project, return mock data
  if (projectId === 'demo-project-123') {
    return NextResponse.json(mockActiveTasks)
  }
  
  // For other IDs, return empty tasks
  return NextResponse.json({ tasks: [] })
} 