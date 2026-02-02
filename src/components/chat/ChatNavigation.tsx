'use client'

import { useState, useEffect } from 'react'
import { ChatBubbleLeftIcon, ClockIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface ChatNavigationProps {
  onSelectThread: (threadId: string) => void
  currentThreadId?: string
  projectId: string
}

interface ChatThread {
  id: string
  title: string
  date: Date
}

export function ChatNavigation({ onSelectThread, currentThreadId, projectId }: ChatNavigationProps) {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadThreads = async () => {
      try {
        const response = await fetch(`/api/project-state/${projectId}`)
        if (!response.ok) {
          throw new Error('Failed to load project state')
        }
        const data = await response.json()
        
        // Create a thread for each phase that has chat history
        const chatThreads = data.phases
          .filter((phase: any) => phase.chatHistory?.length > 0)
          .map((phase: any) => ({
            id: phase.name,
            title: phase.name,
            date: new Date(phase.chatHistory[0].timestamp)
          }))
          .sort((a: ChatThread, b: ChatThread) => b.date.getTime() - a.date.getTime())

        setThreads(chatThreads)
      } catch (error) {
        console.error('Error loading chat threads:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (projectId) {
      loadThreads()
    }
  }, [projectId])

  if (isLoading) {
    return (
      <div className="w-64 border-r border-border-default bg-background-secondary h-full flex flex-col">
        <div className="flex h-16 items-center justify-between border-b border-border-default px-4 flex-shrink-0">
          <h2 className="text-lg font-medium text-text-primary">Chat History</h2>
        </div>
        <div className="p-4">Loading threads...</div>
      </div>
    )
  }

  return (
    <div className="w-64 border-r border-border-default bg-background-secondary h-full flex flex-col">
      <div className="flex h-16 items-center justify-between border-b border-border-default px-4 flex-shrink-0">
        <h2 className="text-lg font-medium text-text-primary">Chat History</h2>
      </div>
      <nav className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
        {threads.length === 0 ? (
          <div className="text-sm text-text-secondary">No chat history yet</div>
        ) : (
          threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => onSelectThread(thread.id)}
              className={cn(
                'w-full rounded-lg p-3 text-left transition-colors duration-200',
                'hover:bg-background-tertiary',
                currentThreadId === thread.id
                  ? 'bg-primary-500/10 text-primary-500'
                  : 'text-text-secondary'
              )}
            >
              <div className="flex items-center space-x-3">
                <ChatBubbleLeftIcon className="h-5 w-5" />
                <div className="flex-1 truncate">
                  <p className="text-sm font-medium">{thread.title}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <ClockIcon className="h-4 w-4" />
                    <p className="text-xs">{thread.date.toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </nav>
    </div>
  )
} 
