'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEnhancedChat } from '@/components/providers/EnhancedChatProvider'
import { ChatMessage, AIMessage, ErrorState } from '@/types/chat'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useWebSocket } from '@/hooks/useWebSocket'
import { validateMessage } from '@/lib/validation'
import { EnhancedChatProvider } from '@/components/providers/EnhancedChatProvider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { XCircleIcon, FileIcon, GitForkIcon, TerminalIcon, CodeIcon, RefreshCwIcon } from 'lucide-react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { ProjectContextDisplay } from '@/components/chat/ProjectContextDisplay'
import { TaskProgressIndicator } from '@/components/chat/TaskProgressIndicator'
import { FormattedMessage } from '@/components/chat/FormattedMessage'
import { ActionButtons } from '@/components/chat/ActionButtons'

// Phase 2, Step 1: Enhanced Chat Interface

interface EnhancedChatProps {
  projectId: string
  className?: string
  welcomeMessage?: string
}

// Context panel to display project information
const ContextPanel = () => {
  const params = useParams<{ id: string }>()
  const projectId = params?.id || ''
  const pathname = usePathname() || ''
  
  // Determine which tab is active
  const isHomePage = pathname === `/projects/${projectId}`
  const isSettings = pathname === `/projects/${projectId}/settings`
  const isEnhancedChat = pathname === `/projects/${projectId}/enhanced-chat`
  
  const { 
    projectContext, 
    analysisContext, 
    fileContext, 
    structureContext, 
    buildContext,
    contextEnabled,
    toggleContext,
    loadingContext,
    refreshContext
  } = useEnhancedChat()

  return (
    <div className="h-full flex flex-col bg-background-secondary overflow-y-auto w-full">
      <div className="p-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshContext}
            disabled={loadingContext || !contextEnabled}
            className="text-xs h-7 px-2"
          >
            <RefreshCwIcon className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          <Button
            variant={contextEnabled ? "default" : "outline"}
            size="sm"
            onClick={toggleContext}
            className="text-xs h-7 px-2"
          >
            {contextEnabled ? "Enabled" : "Disabled"}
          </Button>
        </div>
      </div>

      {loadingContext && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent" />
          <span className="ml-2 text-sm">Loading context...</span>
        </div>
      )}

      {!loadingContext && contextEnabled && (
        <Tabs defaultValue="project" className="w-full px-3">
          <TabsList className="w-full bg-background-tertiary mb-2 flex">
            <TabsTrigger value="project" className="flex-1 text-xs">Project</TabsTrigger>
            <TabsTrigger value="analysis" className="flex-1 text-xs">Analysis</TabsTrigger>
            <TabsTrigger value="code" className="flex-1 text-xs">Code</TabsTrigger>
          </TabsList>
          
          <TabsContent value="project" className="space-y-4 mt-2">
            {projectContext ? (
              <div>
                <h4 className="font-medium">{projectContext.title}</h4>
                <p className="text-sm text-muted-foreground">{projectContext.description}</p>
                
                {projectContext.repository && (
                  <div className="mt-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <GitForkIcon className="h-3 w-3" />
                      {projectContext.repository.owner}/{projectContext.repository.name}
                    </Badge>
                  </div>
                )}
                
                {projectContext.ideation && (
                  <div className="mt-4 space-y-2">
                    <h5 className="text-sm font-medium">Project Goals</h5>
                    <p className="text-xs">{projectContext.ideation.goals}</p>
                    
                    <h5 className="text-sm font-medium">Key Features</h5>
                    <p className="text-xs">{projectContext.ideation.keyFeatures}</p>
                    
                    <h5 className="text-sm font-medium">Technical Requirements</h5>
                    <p className="text-xs">{projectContext.ideation.technicalRequirements}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No project context available</p>
            )}
          </TabsContent>
          
          <TabsContent value="analysis" className="mt-2">
            {analysisContext ? (
              <div className="space-y-4">
                <div className="bg-success-light dark:bg-success/10 p-2 rounded text-xs border border-success/30">
                  <p className="font-medium text-success">Repository Analysis Active</p>
                  <p className="text-success opacity-90">
                    AI suggestions are enhanced with repository analysis data
                  </p>
                </div>
                
                {analysisContext.repositoryStructure && (
                  <div>
                    <h4 className="text-sm font-medium">Repository Structure</h4>
                    <p className="text-xs">
                      Total Files: {analysisContext.repositoryStructure.totalFiles}
                    </p>
                    
                    <h5 className="text-xs font-medium mt-2">Languages</h5>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(analysisContext.repositoryStructure.languages || {}).map(([lang, value]) => (
                        <Badge key={lang} variant="secondary" className="text-xs">
                          {lang}: {typeof value === 'number' ? Math.round(value) + '%' : value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {analysisContext.codeStructure && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium">Code Structure</h4>
                    
                    {analysisContext.codeStructure.components && 
                     analysisContext.codeStructure.components.length > 0 && (
                      <div className="mt-1">
                        <h5 className="text-xs font-medium">Key Components</h5>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {analysisContext.codeStructure.components.slice(0, 5).map((comp, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              <CodeIcon className="h-3 w-3 mr-1" />
                              {comp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {analysisContext.codeStructure.features && 
                     analysisContext.codeStructure.features.length > 0 && (
                      <div className="mt-2">
                        <h5 className="text-xs font-medium">Features</h5>
                        <ul className="text-xs list-disc pl-4 mt-1">
                          {analysisContext.codeStructure.features.slice(0, 3).map((feature, i) => (
                            <li key={i}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {analysisContext.recommendations && analysisContext.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium">Recommendations</h4>
                    <ul className="text-xs list-disc pl-4 mt-1">
                      {analysisContext.recommendations.slice(0, 3).map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                  <p>The AI uses this analysis to:</p>
                  <ul className="list-disc pl-4 mt-1">
                    <li>Generate code matching the project&apos;s style</li>
                    <li>Follow existing architectural patterns</li>
                    <li>Integrate with current components</li>
                    <li>Suggest appropriate implementation approaches</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-2">No analysis data available</p>
                {projectContext?.repository && (
                  <div className="bg-primary/10 p-2 rounded text-xs border border-primary/20">
                    <p className="text-text-primary">Repository detected but not yet analyzed. Ask the AI to analyze your repository to get better code suggestions.</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="code" className="mt-2">
            {fileContext && fileContext.length > 0 ? (
              <div className="space-y-2">
                <div className="bg-success-light dark:bg-success/10 p-2 rounded text-xs border border-success/30 mb-3">
                  <p className="font-medium text-success">Code Context Active</p>
                  <p className="text-success opacity-90">
                    AI suggestions are enhanced with code from {fileContext.length} files
                  </p>
                </div>
                
                <h4 className="text-sm font-medium">Repository Files</h4>
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {fileContext.map((file) => (
                    <li key={file.id} className="text-xs flex items-center gap-1 p-1 hover:bg-muted rounded">
                      <FileIcon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {file.path}/{file.filename}
                      </span>
                      <Badge variant="outline" className="ml-auto text-[10px] flex-shrink-0">
                        {file.language}
                      </Badge>
                    </li>
                  ))}
                </ul>
                
                {buildContext && buildContext.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium">Recent Builds</h4>
                    <ul className="space-y-1">
                      {buildContext.map((build, i) => (
                        <li key={i} className="text-xs flex items-center gap-1">
                          <TerminalIcon className="h-3 w-3" />
                          <code className="truncate max-w-[180px]">{build.command}</code>
                          <Badge 
                            variant={build.status === 'completed' ? 'success' : build.status === 'failed' ? 'destructive' : 'secondary'}
                            className="ml-auto text-[10px]"
                          >
                            {build.status}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {structureContext && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium">Project Structure</h4>
                    <p className="text-xs text-muted-foreground">Structure information available</p>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                  <p>Ask the AI to:</p>
                  <ul className="list-disc pl-4 mt-1">
                    <li>Generate new files based on existing code</li>
                    <li>Implement features from project ideation</li>
                    <li>Update code to match repository styles</li>
                    <li>Create new components following project patterns</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-2">No code files available</p>
                {projectContext?.repository && (
                  <div className="bg-primary/10 p-2 rounded text-xs border border-primary/20">
                    <p className="text-text-primary">Repository detected. Ask the AI to analyze your repository or generate code files based on your project ideation.</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {!contextEnabled && (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <XCircleIcon className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-center text-muted-foreground">
            Context is disabled. Enable it to view project information.
          </p>
        </div>
      )}
      
      {/* Navigation buttons */}
      <div className="mt-auto p-3">
        <div className="flex justify-between gap-2">
          <Link href={`/projects/${projectId}`} className="flex-1">
            <Button 
              variant={isHomePage ? "default" : "outline"} 
              size="sm"
              className="w-full text-xs py-1 h-7"
            >
              Standard
            </Button>
          </Link>
          <Link href={`/projects/${projectId}/enhanced-chat`} className="flex-1">
            <Button 
              variant={isEnhancedChat ? "default" : "outline"} 
              size="sm"
              className="w-full text-xs py-1 h-7"
            >
              Enhanced
            </Button>
          </Link>
          <Link href={`/projects/${projectId}/settings`} className="flex-1">
            <Button 
              variant={isSettings ? "default" : "outline"} 
              size="sm"
              className="w-full text-xs py-1 h-7"
            >
              Settings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// Main chat component that wraps everything in the provider
export function EnhancedChat({ projectId, className, welcomeMessage }: EnhancedChatProps) {
  // Initialize showContext from localStorage or default to false
  const [showContext, setShowContext] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('grip-show-context');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Update localStorage when showContext changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('grip-show-context', JSON.stringify(showContext));
    }
  }, [showContext]);

  return (
    <EnhancedChatProvider projectId={projectId}>
      <div className={cn("flex flex-col h-full w-full max-w-full overflow-hidden", className)}>
        <div className="flex-shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-3 py-1">
            <h3 className="text-sm font-medium">G.R.I.P. Enhanced Chat</h3>
            <div className="flex items-center">
              <Button
                variant={showContext ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setShowContext(!showContext)}
              >
                {showContext ? "Hide Context" : "Show Context"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className={cn("flex-1 min-w-0 overflow-hidden transition-all", 
            showContext ? "md:w-[calc(100%-350px)]" : "w-full"
          )}>
            <EnhancedChatContent className="h-full" welcomeMessage={welcomeMessage} />
          </div>
          
          {showContext && (
            <div className="hidden md:block w-[350px] overflow-auto border-l border-border">
              <ContextPanel />
            </div>
          )}
          
          {/* Mobile context panel as overlay */}
          {showContext && (
            <div className="md:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setShowContext(false)}>
              <div 
                className="absolute right-0 top-0 bottom-0 w-[80%] max-w-[350px] overflow-auto bg-background"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center p-2 border-b">
                  <h3 className="text-sm font-medium">Project Context</h3>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowContext(false)}>
                    <XCircleIcon className="h-4 w-4" />
                  </Button>
                </div>
                <ContextPanel />
              </div>
            </div>
          )}
        </div>
      </div>
    </EnhancedChatProvider>
  )
}

// Inner content of the chat
function EnhancedChatContent({ className, welcomeMessage }: EnhancedChatContentProps) {
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    addMessage, 
    projectContext,
    isTyping,
    errors,
    clearErrors,
    isInitialized,
    setProjectId,
    setProjectContext
  } = useEnhancedChat()
  
  const [input, setInput] = useState('')
  const [error, setError] = useState<ErrorState | null>(null)
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false)
  const [showWebSocketError, setShowWebSocketError] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const params = useParams()

  // Add rate limiting and request size limits
  const MAX_MESSAGE_SIZE = 5000; // 5KB
  const RATE_LIMIT_WINDOW = 1000; // 1 second
  const MAX_REQUESTS_PER_WINDOW = 5;

  // Add performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState({
    messageProcessingTime: 0,
    renderTime: 0,
    lastUpdateTime: Date.now()
  });

  // Add error recovery state
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const MAX_RECOVERY_ATTEMPTS = 3;

  // Add caching state
  const [messageCache, setMessageCache] = useState<Map<string, AIMessage>>(new Map());

  // Implement message cache checking
  const checkMessageCache = async (message: string): Promise<string | null> => {
    try {
      // Check if message exists in cache
      const cachedMessage = messageCache.get(message);
      if (cachedMessage) {
        return cachedMessage.content;
      }

      // If not in cache, check if it's a duplicate of an existing message
      const existingMessage = messages.find(m => 
        m.content.toLowerCase() === message.toLowerCase() && 
        m.role === 'assistant'
      );

      if (existingMessage) {
        // Add to cache for future use
        setMessageCache(prev => new Map(prev).set(message, existingMessage as AIMessage));
        return existingMessage.content;
      }

      return null;
    } catch (error) {
      console.error('Error checking message cache:', error);
      return null;
    }
  };

  // Handle WebSocket connection for real-time updates
  useWebSocket({
    url: '/api/ws',
    onOpen: () => {
      setIsWebSocketConnected(true)
      setShowWebSocketError(false)
    },
    onClose: () => {
      setIsWebSocketConnected(false)
    },
    onError: () => {
      setIsWebSocketConnected(false)
      setShowWebSocketError(true)
    }
  })

  // Enhanced WebSocket connection management
  useEffect(() => {
    const checkAndReconnectWebSocket = async () => {
      try {
        const response = await fetch('/api/ws/health');
        if (!response.ok && !isWebSocketConnected) {
          if (recoveryAttempts < MAX_RECOVERY_ATTEMPTS) {
            console.log(`Attempting WebSocket reconnection (${recoveryAttempts + 1}/${MAX_RECOVERY_ATTEMPTS})...`);
            setRecoveryAttempts(prev => prev + 1);
            setTimeout(() => {
              const event = new CustomEvent('grip:reconnect-websocket');
              window.dispatchEvent(event);
            }, 1000 * Math.pow(2, recoveryAttempts)); // Exponential backoff
          } else {
            console.error('Max recovery attempts reached');
            setShowWebSocketError(true);
          }
        } else if (response.ok) {
          setRecoveryAttempts(0);
          setShowWebSocketError(false);
        }
      } catch (error) {
        console.error('WebSocket health check failed:', error);
        setShowWebSocketError(true);
      }
    };
    
    const interval = setInterval(
      checkAndReconnectWebSocket,
      isWebSocketConnected ? 30000 : 5000
    );
    
    return () => clearInterval(interval);
  }, [isWebSocketConnected, recoveryAttempts]);

  // Add welcome message when component mounts
  useEffect(() => {
    // Only add welcome message if messages array is empty and a welcome message is provided
    if (welcomeMessage && messages.length === 0) {
      // Check if we already sent a welcome message to prevent duplicates
      const existingWelcomeMessage = messages.find(m => 
        m.id === 'welcome-message' || m.id.startsWith('task-')
      );
      
      if (!existingWelcomeMessage) {
        const initialMessage: AIMessage = {
          id: 'welcome-message',
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date().toISOString()
        }
        
        // Add the welcome message to the chat
        addMessage(initialMessage)
        console.log('Added default welcome message to chat')
      }
    }
  }, [welcomeMessage, messages, addMessage])

  // Enhanced message handling with rate limiting
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    try {
      // Check message size
      if (trimmedInput.length > MAX_MESSAGE_SIZE) {
        setError({
          id: Math.random().toString(),
          message: `Message exceeds maximum size of ${MAX_MESSAGE_SIZE} characters`,
          timestamp: new Date()
        });
        return;
      }

      // Check rate limiting
      const now = Date.now();
      if (now - performanceMetrics.lastUpdateTime < RATE_LIMIT_WINDOW) {
        setError({
          id: Math.random().toString(),
          message: 'Please wait before sending another message',
          timestamp: new Date()
        });
        return;
      }

      // Validate message
      const validationResult = validateMessage(trimmedInput);
      if (!validationResult.isValid) {
        setError({
          id: Math.random().toString(),
          message: validationResult.error || 'Invalid message',
          timestamp: new Date()
        });
        return;
      }

      // Update performance metrics
      const startTime = performance.now();
      
      // Check cache first
      const cachedMessage = await checkMessageCache(trimmedInput);
      if (cachedMessage) {
        addMessage({
          id: Math.random().toString(),
          role: 'assistant',
          content: cachedMessage,
          timestamp: new Date()
        });
        setInput('');
        setError(null);
        return;
      }

      await sendMessage(trimmedInput);
      
      // Update performance metrics
      const endTime = performance.now();
      setPerformanceMetrics(prev => ({
        ...prev,
        messageProcessingTime: endTime - startTime,
        lastUpdateTime: now
      }));

      setInput('');
      setError(null);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError({
        id: Math.random().toString(),
        message: err?.message || 'Failed to send message. Please try again.',
        timestamp: new Date()
      });
    }
  };

  // Add performance monitoring
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask') {
          console.warn('Long task detected:', entry);
          // Log to monitoring service
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
    return () => observer.disconnect();
  }, []);

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user'
    const isAIMessage = message.role === 'assistant' && 'stepContext' in message

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'flex w-full',
          isUser ? 'justify-end' : 'justify-start'
        )}
      >
        <div
          className={cn(
            'max-w-[85%] md:max-w-[75%] rounded-lg p-2 overflow-hidden',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}
        >
          <FormattedMessage message={message} />
          
          {!isUser && projectContext?.id && (
            <ActionButtons 
              projectId={projectContext.id}
              onActionTriggered={(action, responseMessage) => {
                const aiMessage: AIMessage = {
                  id: Math.random().toString(),
                  role: 'assistant',
                  content: responseMessage,
                  timestamp: new Date()
                };
                addMessage(aiMessage);
              }}
            />
          )}
          
          {isAIMessage && (message as AIMessage).stepContext && (
            <div className="mt-1 text-xs text-muted-foreground">
              <div className="flex flex-wrap gap-2">
                <span>Phase: {(message as AIMessage).stepContext.phase}</span>
                <span>Step: {(message as AIMessage).stepContext.stepId}</span>
                <span>Status: {(message as AIMessage).stepContext.action.status}</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div className={cn('flex flex-col w-full h-full overflow-hidden', className)}>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 p-2 w-full overflow-auto">
          <div className="pb-2 space-y-4">
            <AnimatePresence>
              {messages.map((message) => renderMessage(message))}
            </AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex w-full justify-start"
              >
                <div className="max-w-[85%] md:max-w-[75%] rounded-lg p-2 bg-muted text-foreground">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-muted-foreground">GRIP is thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      <div className="flex-shrink-0">
        {showWebSocketError && (
          <div className="bg-destructive/10 p-2 text-destructive text-xs">
            WebSocket connection issue. Please check your network and try again later.
          </div>
        )}

        {/* Project Context Display - Phase 8, Step 1 */}
        <div className="flex-shrink-0">
          <ProjectContextDisplay />
        </div>

        {/* Task Progress Indicator - Phase 8, Step 2 - Only show when WebSocket is enabled */}
        {isWebSocketConnected && (
          <div className="flex-shrink-0">
            <TaskProgressIndicator projectId={typeof params?.id === 'string' ? params.id : ''} />
          </div>
        )}

        {/* Chat Input */}
        <div className="flex-shrink-0 border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isTyping ? "GRIP is thinking..." : "Type your message..."}
              disabled={isLoading || isTyping}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={isLoading || isTyping}
              title={isTyping ? "GRIP is thinking..." : "Send message"}
            >
              {isLoading ? 'Sending...' : isTyping ? 'Thinking...' : 'Send'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
} 