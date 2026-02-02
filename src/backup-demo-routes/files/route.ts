import { NextResponse } from 'next/server'

// Mock files data for demo project
const mockFilesData = [
  {
    id: 'file-1',
    projectId: 'demo-project-123',
    path: '/src/components/chat',
    filename: 'EnhancedChatInterface.tsx',
    language: 'typescript',
    content: `
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEnhancedChat } from '@/hooks/useEnhancedChat'
// ... more imports ...

export function EnhancedChat({ projectId, className, welcomeMessage }: EnhancedChatProps) {
  return (
    <EnhancedChatProvider projectId={projectId}>
      <div className={cn("flex flex-row h-full", className)}>
        <EnhancedChatContent className="flex-1" welcomeMessage={welcomeMessage} />
        <ContextPanel />
      </div>
    </EnhancedChatProvider>
  )
}

// More component code...
`,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'file-2',
    projectId: 'demo-project-123',
    path: '/src/components/chat',
    filename: 'ProjectContextDisplay.tsx',
    language: 'typescript',
    content: `
'use client'

import { useState, useEffect } from 'react'
import { useEnhancedChat } from '@/hooks/useEnhancedChat'
import { CheckCircleIcon, CircleIcon, AlertCircleIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export function ProjectContextDisplay() {
  const { projectContext, contextEnabled } = useEnhancedChat();
  // State and hooks...
  
  return (
    <div className="border-t border-border p-2 bg-background-secondary/50">
      {/* Component JSX... */}
    </div>
  );
}
`,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'file-3',
    projectId: 'demo-project-123',
    path: '/src/components/chat',
    filename: 'FilePreview.tsx',
    language: 'typescript',
    content: `
'use client'

import { useState, useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
// More imports...

export function FilePreview({ 
  fileId, 
  projectId, 
  filename = '', 
  path = '', 
  language = 'typescript', 
  content = '', 
  className,
  onClose 
}: FilePreviewProps) {
  // Component implementation...
}
`,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'file-4',
    projectId: 'demo-project-123',
    path: '/src/hooks',
    filename: 'useEnhancedChat.ts',
    language: 'typescript',
    content: `
import { useEnhancedChat as useContextEnhancedChat } from '@/components/providers/EnhancedChatProvider'

export function useEnhancedChat() {
  const chat = useContextEnhancedChat()
  
  return {
    ...chat,
    // Additional functionality...
    
    getContextSummary: () => {
      // Summary functionality...
    },
    
    sendMessageWithContext: async (content: string, contextHint: {
      requiresProject?: boolean;
      requiresAnalysis?: boolean;
      requiresFiles?: boolean;
      requiresStructure?: boolean;
      requiresBuilds?: boolean;
    }) => {
      // Implementation...
    }
  }
}
`,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'file-5',
    projectId: 'demo-project-123',
    path: '/src/components/providers',
    filename: 'EnhancedChatProvider.tsx',
    language: 'typescript',
    content: `
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AIMessage } from '@/types'
// More imports...

export const EnhancedChatContext = createContext<EnhancedChatContextType | null>(null)

export function EnhancedChatProvider({ children, projectId }: EnhancedChatProviderProps) {
  // State and hooks...
  
  return (
    <EnhancedChatContext.Provider value={contextValue}>
      {children}
    </EnhancedChatContext.Provider>
  )
}

export function useEnhancedChat() {
  const context = useContext(EnhancedChatContext)
  if (!context) {
    throw new Error('useEnhancedChat must be used within an EnhancedChatProvider')
  }
  return context
}
`,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params
  
  // If this is the demo project, return mock data
  if (projectId === 'demo-project-123') {
    return NextResponse.json(mockFilesData)
  }
  
  // For other IDs, return an empty array
  return NextResponse.json([])
} 