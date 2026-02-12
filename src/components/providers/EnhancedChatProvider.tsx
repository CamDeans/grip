'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { ChatMessage, ErrorState } from '@/types/chat'
import { ProjectContext } from '@/types/project'
import { ObjectId } from 'mongodb'
import { useToast } from '@/components/ui/use-toast'

// Phase 2, Step 1: Update Chat Context Provider

interface AnalysisContext {
  id: string
  projectId: string
  repositoryStructure?: {
    files: Array<{
      path: string
      type: string
      language?: string
    }>
    totalFiles: number
    languages: Record<string, number>
  }
  codeStructure?: {
    fileCount: number
    directoryStructure: string[]
    mainLanguages: Record<string, number>
    components: string[]
    features: string[]
  }
  recommendations?: string[]
}

interface ProjectFileContext {
  id: string
  path: string
  filename: string
  language: string
  content: string
  version: number
}

interface ProjectStructureContext {
  fileHierarchy: {
    type: 'directory' | 'file'
    name: string
    path: string
    children?: any[]
  }
}

interface BuildLogContext {
  taskType: string
  command: string
  status: string
  output: string
}

// Enhanced chat context
interface EnhancedChatContextType {
  messages: ChatMessage[]
  isLoading: boolean
  sendMessage: (message: string) => Promise<void>
  addMessage: (message: ChatMessage) => void
  contextEnabled: boolean
  toggleContext: () => void
  projectContext: ProjectContext | null
  analysisContext: AnalysisContext | null
  fileContext: ProjectFileContext[]
  structureContext: ProjectStructureContext | null
  buildContext: BuildLogContext[]
  loadingContext: boolean
  clearContext: () => void
  refreshContext: () => Promise<void>
  sessionState: {
    isActive: boolean
    lastActivity: number
    timeout: number
  }
  errorState: {
    errors: ErrorState[]
    maxErrors: number
  }
  performanceState: {
    messageProcessingTimes: number[]
    contextLoadTimes: number[]
    maxSamples: number
  }
  isTyping: boolean
  projectId: string | null
  errors: ErrorState[]
  isInitialized: boolean
  clearErrors: () => void
  setProjectId: (id: string | null) => void
  setProjectContext: (context: ProjectContext | null) => void
}

const EnhancedChatContext = createContext<EnhancedChatContextType>({
  messages: [],
  isLoading: false,
  sendMessage: async () => {},
  addMessage: () => {},
  contextEnabled: true,
  toggleContext: () => {},
  projectContext: null,
  analysisContext: null,
  fileContext: [],
  structureContext: null,
  buildContext: [],
  loadingContext: false,
  clearContext: () => {},
  refreshContext: async () => {},
  sessionState: {
    isActive: true,
    lastActivity: Date.now(),
    timeout: 30 * 60 * 1000 // 30 minutes
  },
  errorState: {
    errors: [],
    maxErrors: 100
  },
  performanceState: {
    messageProcessingTimes: [],
    contextLoadTimes: [],
    maxSamples: 100
  },
  isTyping: false,
  projectId: null,
  errors: [],
  isInitialized: false,
  clearErrors: () => {},
  setProjectId: () => {},
  setProjectContext: () => {}
})

export const useEnhancedChat = () => useContext(EnhancedChatContext)

interface EnhancedChatProviderProps {
  children: ReactNode
  projectId: string
}

export function EnhancedChatProvider({ children, projectId: initialProjectId }: EnhancedChatProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [contextEnabled, setContextEnabled] = useState(true)
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null)
  const [analysisContext, setAnalysisContext] = useState<AnalysisContext | null>(null)
  const [fileContext, setFileContext] = useState<ProjectFileContext[]>([])
  const [structureContext, setStructureContext] = useState<ProjectStructureContext | null>(null)
  const [buildContext, setBuildContext] = useState<BuildLogContext[]>([])
  const [loadingContext, setLoadingContext] = useState(false)
  const [analysisInProgress, setAnalysisInProgress] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(initialProjectId)
  const [isInitialized, setIsInitialized] = useState(false)
  const [errorState, setErrorState] = useState<ErrorState[]>([])
  const [performanceState, setPerformanceState] = useState({
    messageProcessingTimes: [] as number[],
    contextLoadTimes: [] as number[],
    maxSamples: 100
  })
  const { toast } = useToast()

  // Add session management
  const [sessionState, setSessionState] = useState({
    isActive: true,
    lastActivity: Date.now(),
    timeout: 30 * 60 * 1000 // 30 minutes
  });

  // Load initial chat messages and context
  useEffect(() => {
    if (projectId) {
      loadChatHistory()
      if (contextEnabled) {
        refreshContext()
        
        // Set up periodic refresh (every 5 minutes)
        const refreshInterval = setInterval(() => {
          if (contextEnabled) {
            console.log('Performing periodic context refresh')
            refreshContext()
          }
        }, 5 * 60 * 1000)
        
        return () => clearInterval(refreshInterval)
      }
    }
  }, [projectId, contextEnabled])

  // Load chat history when user returns so progress is not lost
  const loadChatHistory = async () => {
    if (!projectId) return
    try {
      // Check if this is a sandbox project
      const projectRes = await fetch(`/api/projects/${projectId}`)
      const projectData = projectRes.ok ? await projectRes.json() : null
      const isSandbox = projectData?.isSandbox === true
      
      // Use appropriate endpoint based on project type
      const historyEndpoint = isSandbox
        ? `/api/projects/${projectId}/legal-sandbox/chat/history`
        : `/api/chat/history?projectId=${projectId}`
      
      const response = await fetch(historyEndpoint)
      
      if (response.ok) {
        const data = await response.json()
        if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages)
        }
        // If no messages, keep current state (e.g. welcome message) instead of clearing
      } else {
        console.error('Error loading chat history:', response.statusText)
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }

  // Refresh all context data
  const refreshContext = useCallback(async () => {
    if (!projectId || !contextEnabled) return
    
    setLoadingContext(true)
    try {
      // Load project details
      await loadProjectContext()
      
      // Load analysis data
      await loadAnalysisContext()
      
      // Load recent files - fetch more files for better code context
      await loadFileContext(10) // Increase file limit to 10 for better context
      
      // Load project structure
      await loadStructureContext()
      
      // Load build logs
      await loadBuildContext()
    } catch (error) {
      console.error('Error refreshing context:', error)
    } finally {
      setLoadingContext(false)
    }
  }, [projectId, contextEnabled])

  // Load project context with retry mechanism
  const loadProjectContext = async (retryCount = 0) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const project = await response.json()
        setProjectContext(project)
        console.log('Project context loaded:', project.title)
      } else {
        console.error('Error loading project:', response.status, response.statusText)
        
        // Retry logic for server errors (5xx)
        if (response.status >= 500 && retryCount < 3) {
          console.log(`Retrying project context load (${retryCount + 1}/3)...`)
          // Exponential backoff
          setTimeout(() => loadProjectContext(retryCount + 1), 1000 * Math.pow(2, retryCount))
        }
      }
    } catch (error) {
      console.error('Error loading project context:', error)
      
      // Retry network errors
      if (retryCount < 3) {
        console.log(`Retrying project context load after error (${retryCount + 1}/3)...`)
        setTimeout(() => loadProjectContext(retryCount + 1), 1000 * Math.pow(2, retryCount))
      }
    }
  }

  // Load analysis context with detailed repository information
  const loadAnalysisContext = async () => {
    try {
      const response = await fetch(`/api/analysis/${projectId}`)
      if (response.ok) {
        const analysis = await response.json()
        setAnalysisContext(analysis)
        console.log('Analysis context loaded with', 
          analysis.repositoryStructure?.files?.length || 0, 'files and',
          analysis.codeStructure?.components?.length || 0, 'components')
        
        // If we have a repository but no analysis, trigger analysis in the background
        if (!analysis && projectContext?.repository) {
          triggerRepositoryAnalysis()
        }
      } else if (response.status === 404 && projectContext?.repository) {
        // If analysis not found but we have a repository, trigger background analysis
        console.log('Analysis not found, triggering background analysis')
        triggerRepositoryAnalysis()
      }
    } catch (error) {
      console.error('Error loading analysis context:', error)
    }
  }

  // Trigger repository analysis in the background with notifications
  const triggerRepositoryAnalysis = async () => {
    if (!projectContext?.repository) return
    
    try {
      console.log('Triggering repository analysis in the background')
      setAnalysisInProgress(true)
      
      // Show toast notification for analysis start
      toast({
        title: "Repository Analysis Started",
        description: "Analyzing your repository structure. This may take a few minutes.",
      })
      
      // Call the API to start analysis (this should be a non-blocking operation)
      const response = await fetch(`/api/projects/${projectId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          forceRefresh: true,
          notifyOnComplete: true
        })
      })
      
      if (response.ok) {
        console.log('Repository analysis started successfully')
        
        // Set up polling for analysis completion
        const checkAnalysisStatus = async () => {
          try {
            const statusResponse = await fetch(`/api/analysis/${projectId}/status`)
            if (statusResponse.ok) {
              const status = await statusResponse.json()
              
              if (status.completed) {
                clearInterval(statusCheckInterval)
                setAnalysisInProgress(false)
                
                // Show toast notification for completion
                toast({
                  title: "Analysis Complete",
                  description: "Repository analysis completed successfully.",
                })
                
                // Refresh the analysis context
                await loadAnalysisContext()
              }
            }
          } catch (error) {
            console.error('Error checking analysis status:', error)
          }
        }
        
        // Check every 30 seconds
        const statusCheckInterval = setInterval(checkAnalysisStatus, 30000)
        
        // Clear interval after 10 minutes max to prevent memory leaks
        setTimeout(() => {
          clearInterval(statusCheckInterval)
          if (analysisInProgress) {
            setAnalysisInProgress(false)
            toast({
              title: "Analysis Status Unknown",
              description: "Repository analysis may still be in progress. Please check back later.",
            })
          }
        }, 10 * 60 * 1000)
      }
    } catch (error) {
      setAnalysisInProgress(false)
      console.error('Error triggering repository analysis:', error)
      
      // Show error toast
      toast({
        title: "Analysis Error",
        description: "Failed to start repository analysis. Please try again later.",
        variant: "destructive",
      })
    }
  }

  // Load file context with an optional limit parameter
  const loadFileContext = async (limit = 5) => {
    try {
      const response = await fetch(`/api/project-files?projectId=${projectId}&limit=${limit}`)
      if (response.ok) {
        const files = await response.json()
        setFileContext(files)
        console.log(`Loaded ${files.length} project files for context`)
        
        // If no files were found but we have a repository, try to fetch repository files
        if (files.length === 0 && projectContext?.repository) {
          await loadRepositoryFiles()
        }
      }
    } catch (error) {
      console.error('Error loading file context:', error)
    }
  }

  // Load repository files if project files aren't available
  const loadRepositoryFiles = async () => {
    if (!projectContext?.repository) return
    
    try {
      console.log('Fetching files from repository...')
      const { owner, name } = projectContext.repository
      
      // Fetch repository files
      const response = await fetch(`/api/repositories/${owner}/${name}/files?limit=10`)
      
      if (response.ok) {
        const files = await response.json()
        setFileContext(files)
        console.log(`Loaded ${files.length} repository files for context`)
      }
    } catch (error) {
      console.error('Error loading repository files:', error)
    }
  }

  // Load structure context
  const loadStructureContext = async () => {
    try {
      const response = await fetch(`/api/project-structure/${projectId}`)
      if (response.ok) {
        const structure = await response.json()
        setStructureContext(structure)
        console.log('Project structure loaded:', structure.name)
      } else if (response.status !== 404) {
        // Only log as error if it's not simply "not found"
        console.error('Error loading structure:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading structure context:', error)
    }
  }

  // Load build context
  const loadBuildContext = async () => {
    try {
      const response = await fetch(`/api/build-logs?projectId=${projectId}&limit=3`)
      if (response.ok) {
        const logs = await response.json()
        setBuildContext(logs)
      }
    } catch (error) {
      console.error('Error loading build context:', error)
    }
  }

  // Toggle context on/off
  const toggleContext = () => {
    setContextEnabled(prev => !prev)
    if (!contextEnabled) {
      refreshContext()
    }
  }

  // Clear context data
  const clearContext = () => {
    setProjectContext(null)
    setAnalysisContext(null)
    setFileContext([])
    setStructureContext(null)
    setBuildContext([])
  }

  // Add session management
  useEffect(() => {
    const checkSession = () => {
      const now = Date.now();
      if (now - sessionState.lastActivity > sessionState.timeout) {
        setSessionState(prev => ({ ...prev, isActive: false }));
        // Clear sensitive data
        setMessages([]);
        setProjectContext(null);
        setAnalysisContext(null);
        setFileContext([]);
        setStructureContext(null);
        setBuildContext([]);
      }
    };

    const interval = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [sessionState.lastActivity]);

  // Update session activity
  const updateSessionActivity = () => {
    setSessionState(prev => ({ ...prev, lastActivity: Date.now() }));
  };

  // Enhanced error handling
  const handleError = (error: Error, context: string) => {
    setErrorState(prev => [
      {
        id: Math.random().toString(36).slice(2),
        message: error instanceof Error ? error.message : 'Failed to send message',
        timestamp: new Date()
      },
      ...prev.slice(0, prev.length - 1)
    ]);
  };

  // Enhanced performance tracking
  const trackPerformance = (metric: 'messageProcessing' | 'contextLoad', time: number) => {
    setPerformanceState(prev => ({
      messageProcessingTimes: metric === 'messageProcessing' 
        ? [time, ...prev.messageProcessingTimes.slice(0, prev.maxSamples - 1)]
        : prev.messageProcessingTimes,
      contextLoadTimes: metric === 'contextLoad'
        ? [time, ...prev.contextLoadTimes.slice(0, prev.maxSamples - 1)]
        : prev.contextLoadTimes,
      maxSamples: prev.maxSamples
    }));
  };

  // Enhanced message sending with retry mechanism
  const sendMessage = async (message: string) => {
    try {
      console.log('Client: Starting sendMessage function')
      console.log('Client: Message:', message)
      console.log('Client: Project ID:', projectId)
      console.log('Client: Context:', JSON.stringify(projectContext, null, 2))

      if (!projectId) {
        console.error('Client: Project ID is missing')
        throw new Error('Project ID is required')
      }

      // Create user message
      const userMessage: ChatMessage = {
        id: Math.random().toString(36).slice(2),
        role: 'user',
        content: message,
        timestamp: new Date()
      }

      // Add user message to local state only once
      console.log('Client: Adding user message to local state:', JSON.stringify(userMessage, null, 2))
      setMessages(prev => [...prev, userMessage])

      // Show typing indicator
      setIsTyping(true)

      // Determine endpoint based on project type
      // Check if this is a sandbox project
      const projectRes = await fetch(`/api/projects/${projectId}`)
      const projectData = projectRes.ok ? await projectRes.json() : null
      const isSandbox = projectData?.isSandbox === true
      
      // Use appropriate endpoint based on project type
      const chatEndpoint = isSandbox
        ? `/api/projects/${projectId}/legal-sandbox/chat`
        : '/api/enhanced-chat'
      
      // Send message to API with conversation history so GRIP responds in context
      console.log('Client: Sending message to API', { endpoint: chatEndpoint, isSandbox })
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          projectId,
          context: projectContext,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          runAfterApply: true, // Enable automatic builds
        }),
      })

      console.log('Client: API Response status:', response.status)
      console.log('Client: API Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2))

      if (!response.ok) {
        let errorMessage = response.statusText
        try {
          const errorData = await response.json()
          if (typeof errorData?.error === 'string') errorMessage = errorData.error
        } catch {
          // ignore
        }
        const err = new Error(errorMessage) as Error & { status?: number }
        err.status = response.status
        throw err
      }

      const data = await response.json()
      console.log('Client: Received AI response:', data)

      // Create AI message (include build status so UI can show automated build result)
      const aiMessage: ChatMessage = {
        id: Math.random().toString(36).slice(2),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        ...(data.buildRan !== undefined && {
          metadata: {
            ...(typeof data.buildSucceeded === 'boolean' && { buildSucceeded: data.buildSucceeded }),
            buildRan: true,
            ...(Array.isArray(data.runErrors) && data.runErrors.length > 0 && { runErrors: data.runErrors }),
          },
        }),
      }

      // Add AI message to local state
      console.log('Client: Adding AI message to local state:', JSON.stringify(aiMessage, null, 2))
      setMessages(prev => [...prev, aiMessage])

      // Hide typing indicator
      setIsTyping(false)

      // After a build ran, refresh project context so next message sends updated lastRunErrors and GRIP can fix
      if (data.buildRan === true) {
        console.log('Client: Build ran — refreshing context so next turn has lastRunErrors')
        await refreshContext()
      }

      // Refresh context if needed (e.g. other triggers)
      if (data.refreshContext) {
        console.log('Client: Refreshing context')
        await refreshContext()
      }

    } catch (error) {
      console.error('Client: Error sending message:', error)
      console.error('Client: Response status:', error instanceof Error ? error.message : 'Unknown error')
      console.error('Client: Error details:', error)
      console.error('Client: Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      
      // Hide typing indicator on error
      setIsTyping(false)
      
      // Add error to state
      setErrorState(prev => [
        ...prev.slice(0, prev.length - 1),
        {
          id: Math.random().toString(36).slice(2),
          message: error instanceof Error ? error.message : 'Failed to send message',
          timestamp: new Date()
        }
      ])
    }
  }

  // Determine if we should refresh context based on user query
  const shouldRefreshContextForQuery = (query: string): boolean => {
    const refreshKeywords = [
      'analyze', 'refresh', 'update context', 'project structure',
      'show files', 'latest code', 'current state', 'repository structure'
    ]
    
    return refreshKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    )
  }
  
  // Determine if we should refresh context based on AI response
  const shouldRefreshContextAfterResponse = (response: string): boolean => {
    const refreshIndicators = [
      'I\'ve created', 'I\'ve generated', 'I\'ve updated', 'file has been created',
      'changes have been made', 'code has been updated', 'generated successfully'
    ]
    
    return refreshIndicators.some(indicator => 
      response.includes(indicator)
    )
  }

  // After clearContext method and before sendMessage method
  const addMessage = (message: ChatMessage) => {
    // Check if a message with the same ID already exists
    // If it does, don't add the duplicate message
    setMessages(prev => {
      const messageExists = prev.some(m => m.id === message.id);
      if (messageExists) {
        return prev;
      }
      return [...prev, message];
    });
  };

  return (
    <EnhancedChatContext.Provider
      value={{
        messages,
        isLoading,
        sendMessage,
        addMessage,
        contextEnabled,
        toggleContext,
        projectContext,
        analysisContext,
        fileContext,
        structureContext,
        buildContext,
        loadingContext,
        clearContext,
        refreshContext,
        sessionState,
        errorState: { errors: errorState, maxErrors: 100 },
        performanceState,
        isTyping,
        projectId,
        errors: errorState,
        isInitialized,
        clearErrors: () => setErrorState([]),
        setProjectId,
        setProjectContext
      }}
    >
      {children}
    </EnhancedChatContext.Provider>
  )
} 