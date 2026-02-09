'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { EnhancedChat } from '@/components/chat/EnhancedChatInterface'
import { LoadingState } from '@/components/ui/LoadingState'
import { EnhancedChatProvider } from '@/components/providers/EnhancedChatProvider'
import { useEnhancedChat } from '@/hooks/useEnhancedChat'

interface Project {
  _id: string
  title: string
  description: string
  repository: {
    owner: string
    name: string
  }
  ideation?: {
    goals: string
    targetAudience: string
    keyFeatures: string
    technicalRequirements: string
  }
}

export default function EnhancedChatPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const projectId = params?.id || ''
  const taskParam = searchParams ? searchParams.get('task') : null
  
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        if (!response.ok) throw new Error('Failed to fetch project')
        const data = await response.json()
        setProject(data)
        setError(null)
      } catch (error) {
        console.error('Error fetching project:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  if (isLoading) {
    return <LoadingState message="Loading chat interface..." />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Error Loading Project</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const stackblitzErrorsSubmitted = searchParams?.get('stackblitzErrorsSubmitted') === '1'

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] w-full max-w-full min-w-0 overflow-hidden">
      <EnhancedChatProvider projectId={projectId}>
        <TaskSpecificChat projectId={projectId} task={taskParam} autoSendRunErrors={stackblitzErrorsSubmitted} />
      </EnhancedChatProvider>
    </div>
  )
}

// Component to handle task-specific messaging
function TaskSpecificChat({ projectId, task, autoSendRunErrors }: { projectId: string, task: string | null, autoSendRunErrors?: boolean }) {
  const { sendInitialTaskMessage, sendMessage, contextEnabled, projectContext, messages } = useEnhancedChat()
  const runErrorsAutoSendDone = useRef(false)
  
  // Initialize taskMessageSent from sessionStorage, use a unique key based on project and task
  const storageKey = `grip-task-message-sent-${projectId}-${task || 'default'}`
  const [taskMessageSent, setTaskMessageSent] = useState<boolean>(() => {
    // Check if we're in the browser environment
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(storageKey)
      return stored === 'true'
    }
    return false
  })
  
  // Update sessionStorage when taskMessageSent changes
  useEffect(() => {
    if (typeof window !== 'undefined' && task) {
      sessionStorage.setItem(storageKey, taskMessageSent ? 'true' : 'false')
    }
  }, [taskMessageSent, storageKey, task])
  
  // Check for existing task messages
  const hasExistingTaskMessage = useMemo(() => {
    return messages.some(message => 
      message.role === 'assistant' && 
      (message.id === 'welcome-message' || 
       (task && message.id.startsWith(`task-${task}`)))
    )
  }, [messages, task])
  
  // Send the initial task message when component mounts and context is available
  useEffect(() => {
    // Only attempt to send task messages if:
    // 1. We have a task
    // 2. We haven't already sent one (either in this session or visible in messages)
    // 3. We have project context
    // 4. Context is enabled
    if (task && !taskMessageSent && !hasExistingTaskMessage && projectContext && contextEnabled) {
      // Short delay to ensure context is fully loaded and stable
      const timer = setTimeout(() => {
        try {
          sendInitialTaskMessage(task)
          setTaskMessageSent(true)
        } catch (error) {
          console.error('Failed to send task message:', error)
          // Fall back to the default welcome message by NOT setting taskMessageSent to true
        }
      }, 800) // Slightly longer delay for better reliability
      
      return () => {
        clearTimeout(timer)
      }
    }
  }, [task, taskMessageSent, hasExistingTaskMessage, sendInitialTaskMessage, projectContext, contextEnabled])

  // When arriving from "Send to GRIP and open Develop" (StackBlitz errors), auto-send one message so GRIP processes lastRunErrors and responds.
  // Prefer sending once history includes the run_errors_submission message; otherwise send after a fallback delay so the API still gets lastRunErrors from project context.
  useEffect(() => {
    if (!autoSendRunErrors || !projectId || runErrorsAutoSendDone.current) return
    const hasRunErrorsSubmission = messages.some((m) => m.metadata?.type === 'run_errors_submission')
    const delayMs = hasRunErrorsSubmission ? 1200 : 3000
    const timer = setTimeout(() => {
      if (runErrorsAutoSendDone.current) return
      runErrorsAutoSendDone.current = true
      sendMessage('I just submitted StackBlitz errors. Please help fix them.')
      if (typeof window !== 'undefined' && window.history.replaceState) {
        const url = new URL(window.location.href)
        url.searchParams.delete('stackblitzErrorsSubmitted')
        window.history.replaceState({}, '', url.pathname + url.search)
      }
    }, delayMs)
    return () => clearTimeout(timer)
  }, [autoSendRunErrors, projectId, messages, sendMessage])

  // Determine if we should show the default welcome message
  // Only show default welcome if:
  // 1. We don't have a task, or
  // 2. We failed to send the task message and there's no existing task message
  const showDefaultWelcome = !task || (task && !taskMessageSent && !hasExistingTaskMessage)
  
  return (
    <EnhancedChat 
      projectId={projectId} 
      className="flex-1 h-full"
      welcomeMessage={showDefaultWelcome ? 
        `Welcome to the G.R.I.P. Chat Interface! I'm here to help you build your project based on your ideation and requirements. Let me know what you'd like to build first, or ask me any questions about your project development.` : 
        undefined}
    />
  )
} 