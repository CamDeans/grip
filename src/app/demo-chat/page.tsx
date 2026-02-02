'use client'

import { useState, useEffect } from 'react'
import { EnhancedChat } from '@/components/chat/EnhancedChatInterface'
import { Button } from '@/components/ui'
import Link from 'next/link'
import { ArrowLeftIcon } from 'lucide-react'

// Create a mock implementation for the demo that bypasses API routes
const createMockProviderForDemo = () => {
  // This will create a version of the EnhancedChat that doesn't rely on 
  // the problematic API routes by mocking the responses in-memory
  
  // Import the EnhancedChatProvider component dynamically to prevent issues
  // with Next.js static analysis of imports
  return import('@/components/providers/EnhancedChatProvider').then(({ EnhancedChatProvider }) => {
    // We'll modify this later if needed
    return EnhancedChatProvider;
  });
}

// Demo page to showcase the improved EnhancedChat interface
export default function EnhancedChatDemoPage() {
  // For the demo, we'll use a hardcoded project ID
  const projectId = 'demo-project-123'
  
  // Welcome message for the demo
  const welcomeMessage = `
# 👋 Welcome to the Improved EnhancedChat Interface

I'm G.R.I.P. AI, your development partner. This interface has been simplified and redesigned for better usability:

- **Cleaner layout** with improved visual hierarchy
- **Collapsible panels** to focus on what matters
- **Organized action buttons** grouped by function
- **Better spacing and visual separation** between components

Try exploring the interface by:
1. Toggling the context panel
2. Expanding/collapsing the action buttons
3. Trying the different tabs in the context panel

How can I help you with your project today?
  `
  
  return (
    <div className="h-screen flex flex-col">
      <header className="bg-background-secondary border-b border-border p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeftIcon className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">G.R.I.P. Enhanced Chat Demo</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            Project ID: {projectId}
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden">
        <EnhancedChat 
          projectId={projectId} 
          welcomeMessage={welcomeMessage}
        />
      </main>
    </div>
  )
} 