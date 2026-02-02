import { NextResponse } from 'next/server'

// Mock analysis data for demo project
const mockAnalysisData = {
  id: 'analysis-demo-123',
  projectId: 'demo-project-123',
  repositoryStructure: {
    files: [
      { path: '/src/components/ui/Button.tsx', type: 'file', language: 'typescript' },
      { path: '/src/components/chat/ChatMessage.tsx', type: 'file', language: 'typescript' },
      { path: '/src/lib/utils.ts', type: 'file', language: 'typescript' },
      { path: '/src/styles/globals.css', type: 'file', language: 'css' },
    ],
    totalFiles: 42,
    languages: {
      'TypeScript': 65,
      'CSS': 20,
      'JavaScript': 10,
      'JSON': 5
    }
  },
  codeStructure: {
    fileCount: 42,
    directoryStructure: [
      'src/components',
      'src/lib',
      'src/styles',
      'src/app',
      'src/hooks'
    ],
    mainLanguages: {
      'TypeScript': 65,
      'CSS': 20,
      'JavaScript': 10,
      'JSON': 5
    },
    components: [
      'Button',
      'Input',
      'Card',
      'ChatMessage',
      'EnhancedChatInterface'
    ],
    features: [
      'Chat functionality with AI integration',
      'Project context display and management',
      'File preview and code highlighting',
      'Development action buttons for common tasks',
      'Responsive UI with dark mode support'
    ]
  },
  recommendations: [
    'Consider adding more collapsible sections for better organization',
    'Improve visual hierarchy by using size and color effectively',
    'Group related actions together for easier discovery',
    'Add keyboard shortcuts for common actions',
    'Optimize for mobile devices with responsive design'
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params
  
  // If this is the demo project, return mock data
  if (projectId === 'demo-project-123') {
    return NextResponse.json(mockAnalysisData)
  }
  
  // For other IDs, return a not found response
  return new NextResponse('Analysis not found', { status: 404 })
} 