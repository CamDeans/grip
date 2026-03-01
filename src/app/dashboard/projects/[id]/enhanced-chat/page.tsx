'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { EnhancedChat } from '@/components/chat/EnhancedChatInterface'
import { LoadingState } from '@/components/ui/LoadingState'
import { EnhancedChatProvider } from '@/components/providers/EnhancedChatProvider'
import { useEnhancedChat } from '@/hooks/useEnhancedChat'
import { Button } from '@/components/ui'
import { Loader2, CheckCircle2, Inbox } from 'lucide-react'

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
  isSandbox?: boolean
}

export default function EnhancedChatPage() {
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const projectId = params?.id || ''
  const taskParam = searchParams ? searchParams.get('task') : null
  
  const [project, setProject] = useState<Project | null>(null)
  const [hasPlan, setHasPlan] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProjectAndPlan = async () => {
      try {
        const [projRes, planRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch(`/api/projects/${projectId}/plan`)
        ])
        if (!projRes.ok) throw new Error('Failed to fetch project')
        const data = await projRes.json()
        setProject(data)
        const planData = planRes.ok ? await planRes.json().catch(() => ({})) : {}
        setHasPlan(!!planData?.plan)
        setError(null)
      } catch (err) {
        console.error('Error fetching project:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (projectId) {
      fetchProjectAndPlan()
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
  const implementCurrentPhase = searchParams?.get('implementCurrentPhase') === '1'

  const showCompleteOverviewBanner = project && !project.isSandbox && hasPlan === false

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] w-full max-w-full min-w-0 overflow-hidden">
      {showCompleteOverviewBanner && (
        <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Complete setup on Overview first.</strong> Plan and file generation run there—not in chat. That avoids wasting tokens and gives GRIP full context. Open the project <strong>Overview</strong>, let GRIP run plan → file generation → build, then return here.
          </p>
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button variant="outline" size="sm" className="shrink-0">Go to Overview</Button>
          </Link>
        </div>
      )}
      <EnhancedChatProvider projectId={projectId}>
        <TaskSpecificChat
          projectId={projectId}
          task={taskParam}
          autoSendRunErrors={stackblitzErrorsSubmitted}
          implementCurrentPhase={implementCurrentPhase}
        />
      </EnhancedChatProvider>
    </div>
  )
}

// Build the GRIP starting message aligned with Develop flow (Overview → Develop → Preview, plan/phases)
function buildWelcomeMessage(currentPhase: string | null): string {
  const phaseLine = currentPhase
    ? `Your plan's current phase is **${currentPhase}**. `
    : ''
  return `I'm G.R.I.P., your GitHub Repo-Analysis Intellectual Partner. You're in **Develop** — I have your project context (ideation, repo, plan, and phases from Overview). ${phaseLine}

**What you can do here:**
• **Implement the current phase** — Say "implement the current phase" or "implement all steps in [phase name]" and I'll output the code for each file; you can apply and run the build from here or from Overview.
• **Fix build or StackBlitz errors** — Paste errors or say what's failing; I'll suggest fixes and updated code.
• **Add or change a feature** — Describe what you want in plain English; I'll align with your plan and generated files.
• **Ask anything** — Goals, structure, next steps, or specific code; I'll stay in context with this project.

Reply with one of the above, or type what you'd like to do first.`
}

// Component to handle task-specific messaging
function TaskSpecificChat({
  projectId,
  task,
  autoSendRunErrors,
  implementCurrentPhase
}: {
  projectId: string
  task: string | null
  autoSendRunErrors?: boolean
  implementCurrentPhase?: boolean
}) {
  const { sendInitialTaskMessage, sendMessage, contextEnabled, projectContext, messages, isTyping } = useEnhancedChat()
  const runErrorsAutoSendDone = useRef(false)
  const implementPhaseSentRef = useRef(false)
  /** User came from "Send to GRIP" with StackBlitz errors; show status so they see GRIP received and is working. */
  const [runErrorsStatus, setRunErrorsStatus] = useState<'idle' | 'receiving' | 'working' | 'done'>(() =>
    autoSendRunErrors ? 'receiving' : 'idle'
  )
  const [projectState, setProjectState] = useState<{
    currentPhase?: string
    phases?: Array<{ name: string; steps?: Array<{ title?: string }> }>
  } | null>(null)

  // Fetch project state (current phase + phases/steps) for welcome message and implement-current-phase
  useEffect(() => {
    if (!projectId) return
    fetch(`/api/projects/${projectId}/state`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setProjectState({
          currentPhase: data.currentPhase,
          phases: data.phases
        })
      })
      .catch(() => {})
  }, [projectId])

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

  // When arriving from "Send to GRIP and open Develop" (StackBlitz errors), auto-send one message so GRIP starts fixing immediately.
  // Short delay so context (lastRunErrors) is loaded; imperative message so the model fixes without asking.
  useEffect(() => {
    if (!autoSendRunErrors || !projectId || runErrorsAutoSendDone.current) return
    const hasRunErrorsSubmission = messages.some((m) => m.metadata?.type === 'run_errors_submission')
    const delayMs = hasRunErrorsSubmission ? 400 : 1500
    const timer = setTimeout(() => {
      if (runErrorsAutoSendDone.current) return
      runErrorsAutoSendDone.current = true
      setRunErrorsStatus('working')
      sendMessage('Fix the StackBlitz/build errors I just submitted. Start now—output the corrected file(s) in code blocks with exact paths so they can be applied. Do not ask what to fix; apply fixes.')
      if (typeof window !== 'undefined' && window.history.replaceState) {
        const url = new URL(window.location.href)
        url.searchParams.delete('stackblitzErrorsSubmitted')
        window.history.replaceState({}, '', url.pathname + url.search)
      }
    }, delayMs)
    return () => clearTimeout(timer)
  }, [autoSendRunErrors, projectId, messages, sendMessage])

  // When GRIP finishes responding after run-errors flow, mark done and clear banner after a short confirmation.
  const wasTypingRef = useRef(false)
  useEffect(() => {
    if (runErrorsStatus === 'working' && wasTypingRef.current && !isTyping) {
      setRunErrorsStatus('done')
      const t = setTimeout(() => setRunErrorsStatus('idle'), 4000)
      return () => clearTimeout(t)
    }
    wasTypingRef.current = isTyping
  }, [runErrorsStatus, isTyping])

  // When arriving from Overview "Implement current phase in Develop", send one user message so GRIP implements the current phase steps.
  useEffect(() => {
    if (!implementCurrentPhase || !projectId || implementPhaseSentRef.current || !projectState?.phases?.length || !projectContext || !contextEnabled) return
    const currentPhaseName = projectState.currentPhase || projectState.phases[0]?.name
    const phase = projectState.phases.find((p) => p.name === currentPhaseName)
    const stepTitles = phase?.steps?.map((s) => s.title).filter(Boolean) as string[] | undefined
    if (!currentPhaseName || !stepTitles?.length) return
    const timer = setTimeout(() => {
      if (implementPhaseSentRef.current) return
      implementPhaseSentRef.current = true
      const prompt = `Implement all steps in the **${currentPhaseName}** phase: ${stepTitles.join(', ')}. Output the code for each file needed; I will apply and run the build.`
      sendMessage(prompt)
      if (typeof window !== 'undefined' && window.history.replaceState) {
        const url = new URL(window.location.href)
        url.searchParams.delete('implementCurrentPhase')
        window.history.replaceState({}, '', url.pathname + (url.search || ''))
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [implementCurrentPhase, projectId, projectState, projectContext, contextEnabled, sendMessage])

  // Determine if we should show the default welcome message
  // Only show default welcome if:
  // 1. We don't have a task, or
  // 2. We failed to send the task message and there's no existing task message
  const showDefaultWelcome = !task || (task && !taskMessageSent && !hasExistingTaskMessage)

  const welcomeMessage = showDefaultWelcome
    ? buildWelcomeMessage(projectState?.currentPhase ?? null)
    : undefined

  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      {runErrorsStatus !== 'idle' && (
        <div
          className="shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-primary/5 border-primary/20 text-sm"
          role="status"
          aria-live="polite"
          aria-label={
            runErrorsStatus === 'receiving'
              ? 'Receiving StackBlitz errors'
              : runErrorsStatus === 'working'
                ? 'GRIP is working on fixes'
                : 'GRIP has responded'
          }
        >
          {runErrorsStatus === 'receiving' && (
            <>
              <Inbox className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="text-foreground font-medium">StackBlitz errors received.</span>
              <span className="text-muted-foreground">Sending to GRIP…</span>
            </>
          )}
          {runErrorsStatus === 'working' && (
            <>
              <Loader2 className="h-4 w-4 shrink-0 text-primary animate-spin" aria-hidden />
              <span className="text-foreground font-medium">GRIP has your errors and is working on fixes…</span>
            </>
          )}
          {runErrorsStatus === 'done' && (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-500" aria-hidden />
              <span className="text-foreground font-medium">GRIP has responded.</span>
            </>
          )}
        </div>
      )}
      <EnhancedChat
        projectId={projectId}
        className="flex-1 h-full min-h-0"
        welcomeMessage={welcomeMessage}
      />
    </div>
  )
} 