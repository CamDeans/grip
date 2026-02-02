import { NextResponse } from 'next/server'

// Mock data for demo project
const mockDemoProject = {
  id: 'demo-project-123',
  title: 'Enhanced Chat Demo Project',
  description: 'A demonstration project for the improved chat interface',
  repository: {
    owner: 'grip-framework',
    name: 'grip-demo'
  },
  ideation: {
    goals: 'Create a more user-friendly chat interface with better organization and visual hierarchy',
    targetAudience: 'Developers and project managers',
    keyFeatures: 'Collapsible panels, organized action buttons, cleaner layout, better visual separation',
    technicalRequirements: 'React, Next.js, TailwindCSS, TypeScript'
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params
  
  // If this is the demo project, return mock data
  if (projectId === 'demo-project-123') {
    return NextResponse.json(mockDemoProject)
  }
  
  // For other IDs, return a not found response
  return new NextResponse('Project not found', { status: 404 })
} 