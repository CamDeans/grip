import { NextResponse } from 'next/server'

// Mock structure data for demo project
const mockStructureData = {
  projectId: 'demo-project-123',
  fileHierarchy: {
    type: 'directory',
    name: 'root',
    path: '/',
    children: [
      {
        type: 'directory',
        name: 'src',
        path: '/src',
        children: [
          {
            type: 'directory',
            name: 'components',
            path: '/src/components',
            children: [
              {
                type: 'directory',
                name: 'chat',
                path: '/src/components/chat',
                children: [
                  {
                    type: 'file',
                    name: 'EnhancedChatInterface.tsx',
                    path: '/src/components/chat/EnhancedChatInterface.tsx',
                    language: 'typescript'
                  },
                  {
                    type: 'file',
                    name: 'ProjectContextDisplay.tsx',
                    path: '/src/components/chat/ProjectContextDisplay.tsx',
                    language: 'typescript'
                  },
                  {
                    type: 'file',
                    name: 'FilePreview.tsx',
                    path: '/src/components/chat/FilePreview.tsx',
                    language: 'typescript'
                  }
                ]
              },
              {
                type: 'directory',
                name: 'ui',
                path: '/src/components/ui',
                children: [
                  {
                    type: 'file',
                    name: 'button.tsx',
                    path: '/src/components/ui/button.tsx',
                    language: 'typescript'
                  },
                  {
                    type: 'file',
                    name: 'input.tsx',
                    path: '/src/components/ui/input.tsx',
                    language: 'typescript'
                  }
                ]
              },
              {
                type: 'directory',
                name: 'providers',
                path: '/src/components/providers',
                children: [
                  {
                    type: 'file',
                    name: 'EnhancedChatProvider.tsx',
                    path: '/src/components/providers/EnhancedChatProvider.tsx',
                    language: 'typescript'
                  }
                ]
              }
            ]
          },
          {
            type: 'directory',
            name: 'hooks',
            path: '/src/hooks',
            children: [
              {
                type: 'file',
                name: 'useEnhancedChat.ts',
                path: '/src/hooks/useEnhancedChat.ts',
                language: 'typescript'
              }
            ]
          },
          {
            type: 'directory',
            name: 'app',
            path: '/src/app',
            children: [
              {
                type: 'file',
                name: 'page.tsx',
                path: '/src/app/page.tsx',
                language: 'typescript'
              },
              {
                type: 'file',
                name: 'layout.tsx',
                path: '/src/app/layout.tsx',
                language: 'typescript'
              },
              {
                type: 'directory',
                name: 'demo-chat',
                path: '/src/app/demo-chat',
                children: [
                  {
                    type: 'file',
                    name: 'page.tsx',
                    path: '/src/app/demo-chat/page.tsx',
                    language: 'typescript'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        type: 'file',
        name: 'package.json',
        path: '/package.json',
        language: 'json'
      },
      {
        type: 'file',
        name: 'tsconfig.json',
        path: '/tsconfig.json',
        language: 'json'
      }
    ]
  },
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
    return NextResponse.json(mockStructureData)
  }
  
  // For other IDs, return a not found response
  return new NextResponse('Structure not found', { status: 404 })
} 