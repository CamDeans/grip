'use client'

import { useState, useRef, useEffect } from 'react'
import type { AIMessage, StepContext, Phase, Step, ProjectState as ChatProjectState } from '@/types/chat'
import { usePathname } from 'next/navigation'
import { getProjectState, initializeProjectState, addChatMessage, getChatHistory } from '@/lib/api/projectState'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { IProjectStateData } from '@/lib/models/ProjectState'
import { TrackingButton } from '@/components/ui/TrackingButton'
import { useInteractionTracking } from '@/hooks/useInteractionTracking'

// Add error handling interfaces
interface ErrorState {
  id: string;
  type: 'step' | 'phase' | 'system' | 'error';
  message: string;
  phase?: string;
  stepId?: number;
  timestamp: number;
}

// Helper function to ensure type safety for AIMessage
function createAIMessage(
  role: 'user' | 'assistant',
  content: string,
  stepContext?: StepContext
): AIMessage {
  return {
    id: Math.random().toString(36).slice(2),
    role,
    content,
    timestamp: new Date(),
    stepContext
  }
}

// Helper function to create error state
function createErrorState(message: string): ErrorState {
  return {
    id: Date.now().toString(),
    type: 'error',
    message,
    timestamp: Date.now()
  }
}

// Helper function to validate projectId
function validateProjectId(projectId: string | null): string {
  if (!projectId) {
    throw new Error('No project ID available')
  }
  return projectId
}

// Helper function to safely get project state
async function safeGetProjectState(projectId: string | null): Promise<IProjectStateData | null> {
  const validatedId = validateProjectId(projectId)
  return getProjectState(validatedId)
}

// Helper function to safely initialize project state
async function safeInitializeProjectState(projectId: string | null): Promise<IProjectStateData | null> {
  const validatedId = validateProjectId(projectId)
  return initializeProjectState(validatedId)
}

// Helper function to convert project state
function convertProjectState(
  state: IProjectStateData,
  projectId: string | null,
  messages: AIMessage[]
): ChatProjectState {
  const validatedId = validateProjectId(projectId)
  return {
    projectId: validatedId,
    currentPhase: state.currentPhase,
    phases: state.phases.map(convertToUIPhase),
    chatHistory: messages,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt
  }
}

// Convert database step to UI step
function convertToUIStep(dbStep: IProjectStateData['phases'][0]['steps'][0]): Step {
  return {
    id: dbStep.id,
    title: dbStep.title,
    status: dbStep.status,
    action: dbStep.action,
    dependencies: dbStep.dependencies,
    buttons: ['View Details'], // Add required buttons property for UI
    progress: dbStep.progress,
    result: dbStep.result,
    completedAt: dbStep.completedAt
  }
}

// Convert database phase to UI phase
function convertToUIPhase(dbPhase: IProjectStateData['phases'][0]): Phase {
  return {
    name: dbPhase.name,
    status: dbPhase.status,
    steps: dbPhase.steps.map(convertToUIStep),
    completedAt: dbPhase.completedAt
  }
}

export default function AIChat() {
  const pathname = usePathname()
  
  // Extract project ID from pathname and validate
  const extractProjectId = (path: string): string => {
    const matches = path.match(/\/projects\/([a-f\d]{24})/)
    if (!matches?.[1]) {
      throw new Error('Invalid project ID in URL')
    }
    return matches[1]
  }
  
  const projectId = extractProjectId(pathname)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [currentPhase, setCurrentPhase] = useState<string>('initial')
  const [phases, setPhases] = useState<Phase[]>([])
  const [errors, setErrors] = useState<ErrorState[]>([])
  const [projectState, setProjectState] = useState<ChatProjectState | null>(null)

  // Add interaction tracking
  const { trackUserPrompt } = useInteractionTracking(projectId)

  // Load project state
  const loadProjectState = async () => {
    if (!projectId) {
      setErrors(prev => [...prev, createErrorState('No project ID available')])
      return
    }

    try {
      const validatedId = validateProjectId(projectId)
      
      // First, try to get chat history directly
      try {
        const chatHistory = await getChatHistory(validatedId)
        if (chatHistory && chatHistory.length > 0) {
          console.log('AIChat: Retrieved chat history directly:', chatHistory.length)
          setMessages(chatHistory)
        } else {
          console.log('AIChat: No chat history found via direct API')
        }
      } catch (chatError) {
        console.error('Error fetching chat history:', chatError)
      }
      
      // Then get or initialize project state
      try {
        const state = await safeGetProjectState(validatedId)
        if (state) {
          console.log('AIChat: Got project state with phases:',
            state.phases.length, 'phases')
          
          const newProjectState = convertProjectState(state, validatedId, messages)
          setCurrentPhase(newProjectState.currentPhase)
          setPhases(newProjectState.phases)
          setProjectState(newProjectState)
        } else {
          // Initialize new state
          const newState = await safeInitializeProjectState(validatedId)
          if (newState) {
            console.log('AIChat: Initialized new state with phases:',
              newState.phases.length, 'phases')
            
            const newProjectState = convertProjectState(newState, validatedId, messages)
            setCurrentPhase(newProjectState.currentPhase)
            setPhases(newProjectState.phases)
            setProjectState(newProjectState)
          }
        }
      } catch (stateError) {
        console.error('Error with project state:', stateError)
        throw stateError
      }
    } catch (error) {
      console.error('Error loading project state:', error)
      setErrors(prev => [...prev, createErrorState(
        error instanceof Error ? error.message : 'Failed to load project state'
      )])
    }
  }

  // Load project state when project ID is available
  useEffect(() => {
    if (projectId) {
      loadProjectState()
    }
  }, [projectId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!input.trim()) return
    if (isThinking) return

    // Create user message
    const userMessage = createAIMessage('user', input)
    
    // Add to UI immediately
    setMessages(prev => [...prev, userMessage])
    
    // Track user prompt if we have current phase
    if (projectState?.currentPhase) {
      // Find current step based on phases
      const currentPhase = projectState.phases.find(p => p.name === projectState.currentPhase);
      const currentStep = currentPhase?.steps.find(s => s.status === 'in_progress')?.id || 0;
      
      await trackUserPrompt(
        projectState.currentPhase,
        currentStep,
        input
      )
    }
    
    setInput('')
    setIsThinking(true)
    
    try {
      // Save user message to chat history
      if (projectId) {
        const saveResult = await addChatMessage(projectId, userMessage)
        console.log('AIChat: Saved user message result:', saveResult)
      }
      
      // Call Anthropic Claude API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          message: userMessage.content,
          currentPhase,
          phases
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }
      
      const aiResponse = await response.json()
      
      // Create a properly formatted AI message
      const aiMessage = createAIMessage(
        'assistant',
        aiResponse.content,
        aiResponse.stepContext
      )
      
      console.log('AIChat: Received AI response:', {
        id: aiMessage.id,
        role: aiMessage.role,
        contentLength: aiMessage.content.length
      })
      
      // Add AI response to UI
      setMessages(prev => [...prev, aiMessage])
      
      // Save AI message to chat history
      if (projectId) {
        const saveResult = await addChatMessage(projectId, aiMessage)
        console.log('AIChat: Saved AI message result:', saveResult)
      }
      
      setIsThinking(false)
    } catch (error) {
      console.error('Error in chat interaction:', error)
      setErrors(prev => [...prev, createErrorState(
        error instanceof Error ? error.message : 'Error in chat interaction'
      )])
      setIsThinking(false)
    }
  }

  if (errors.length > 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-4 bg-destructive/10 text-destructive">
          {errors.map(error => (
            <div key={error.id} className="text-destructive mb-2">
              {error.message}
            </div>
          ))}
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Project Progress Panel */}
      <div className="w-1/3 min-w-[300px] border-r border-border p-4 bg-background">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Project Progress</h2>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          {phases.map((phase: Phase) => (
            <div key={phase.name} className="mb-6">
              <h3 className="text-lg font-medium mb-2 text-foreground">
                {phase.name}
                <span className={`ml-2 text-sm ${
                  phase.status === 'completed' ? 'text-success' :
                  phase.status === 'in_progress' ? 'text-primary' :
                  'text-muted-foreground'
                }`}>
                  ({phase.status})
                </span>
              </h3>
              <div className="space-y-3">
                {phase.steps.map((step: Step) => (
                  <div key={step.id} className="pl-4 border-l-2 border-border">
                    <div className="text-sm font-medium text-foreground">
                      {step.title}
                      <span className={`ml-2 text-xs ${
                        step.status === 'completed' ? 'text-success' :
                        step.status === 'in_progress' ? 'text-primary' :
                        'text-muted-foreground'
                      }`}>
                        ({step.status})
                      </span>
                    </div>
                    {step.action && (
                      <p className="text-xs text-muted-foreground mt-1">{step.action}</p>
                    )}
                    {step.progress && (
                      <p className="text-xs text-success mt-1">{step.progress}</p>
                    )}
                    {step.result && (
                      <p className="text-xs text-primary mt-1">{step.result}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col h-full">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg: AIMessage) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'assistant'
                      ? 'bg-primary/10 text-foreground'
                      : 'bg-primary text-foreground'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.role === 'assistant' && msg.stepContext?.action?.type === 'init' && (
                    <div className="mt-4 space-x-2">
                      {msg.stepContext.stepId && projectState?.phases
                        .find((phase: Phase) => phase.name === msg.stepContext?.phase)
                        ?.steps.find((step: Step) => step.id === msg.stepContext?.stepId)
                        ?.buttons?.map((button: string, index: number) => (
                          <TrackingButton
                            key={index}
                            variant="secondary"
                            size="sm"
                            onClick={() => setInput(button)}
                            trackingPhase={msg.stepContext?.phase || 'unknown'}
                            trackingStep={msg.stepContext?.stepId || 0}
                            trackingContext="chat_button_selection"
                          >
                            {button}
                          </TrackingButton>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <div className="flex space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 text-black bg-white dark:text-white dark:bg-background-tertiary placeholder:text-muted-foreground"
            />
            <Button onClick={handleSendMessage} disabled={!input.trim()}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

