'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEnhancedChat } from '@/components/providers/EnhancedChatProvider'
import { ChatMessage, AIMessage, ErrorState } from '@/types/chat'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useWebSocket } from '@/hooks/useWebSocket'
import { validateMessage } from '@/lib/validation'
import { EnhancedChatProvider } from '@/components/providers/EnhancedChatProvider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { XCircleIcon, FileIcon, GitForkIcon, TerminalIcon, CodeIcon, RefreshCwIcon, ChevronDownIcon, ChevronUpIcon, PlayIcon, SendIcon, Loader2Icon, CheckCircle2, Circle } from 'lucide-react'
import Link from 'next/link'
import { toast as sonnerToast } from 'sonner'
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
interface RepoTreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: RepoTreeNode[]
}

const ContextPanel = () => {
  const params = useParams<{ id: string }>()
  const projectId = params?.id || ''
  const pathname = usePathname() || ''
  
  // Determine which tab is active
  const isHomePage = pathname === `/dashboard/projects/${projectId}`
  const isSettings = pathname === `/dashboard/projects/${projectId}/settings`
  const isEnhancedChat = pathname === `/dashboard/projects/${projectId}/enhanced-chat`
  
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

  const [repoTree, setRepoTree] = useState<{ tree: RepoTreeNode[]; fileCount: number; repo: string } | null>(null)
  const [repoTreeLoading, setRepoTreeLoading] = useState(false)
  const [repoTreeError, setRepoTreeError] = useState<string | null>(null)

  const [planData, setPlanData] = useState<{ plan?: { phases?: Array<{ name: string; description?: string; tasks?: Array<{ name?: string; title?: string; status?: string }> }> }; structure?: { fileHierarchy?: unknown } } | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [generatedFilesList, setGeneratedFilesList] = useState<Array<{ path: string; filename: string }>>([])

  const [contextTab, setContextTab] = useState<string>('project')
  const CONTEXT_TABS = [
    { value: 'project', label: 'Project' },
    { value: 'analysis', label: 'Analysis' },
    { value: 'code', label: 'Code' },
    { value: 'repo', label: 'Repository' },
    { value: 'plan', label: 'Plan & files' },
    { value: 'terminal', label: 'Terminal' },
  ] as const
  const currentContextLabel = CONTEXT_TABS.find((t) => t.value === contextTab)?.label ?? 'Project'

  useEffect(() => {
    if (!projectId || !projectContext?.repository || !contextEnabled) return
    setRepoTreeLoading(true)
    setRepoTreeError(null)
    fetch(`/api/projects/${projectId}/repo/tree`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 400 ? 'No repo linked or clone needed' : 'Failed to load repo tree')
        return r.json()
      })
      .then((data) => {
        setRepoTree({ tree: data.tree || [], fileCount: data.fileCount || 0, repo: data.repo || '' })
      })
      .catch((e) => {
        setRepoTreeError(e instanceof Error ? e.message : 'Failed to load')
        setRepoTree(null)
      })
      .finally(() => setRepoTreeLoading(false))
  }, [projectId, projectContext?.repository, contextEnabled])

  useEffect(() => {
    if (!projectId || !contextEnabled) return
    setPlanLoading(true)
    Promise.all([
      fetch(`/api/projects/${projectId}/plan`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/project-files?projectId=${projectId}&limit=200`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([plan, files]) => {
      setPlanData(plan || null)
      setGeneratedFilesList(Array.isArray(files) ? files.map((f: { path?: string; filename?: string }) => ({ path: f.path || '', filename: f.filename || '' })) : [])
    }).finally(() => setPlanLoading(false))
  }, [projectId, contextEnabled])

  const renderRepoTree = (nodes: RepoTreeNode[], depth = 0) => (
    <ul className={cn('list-none pl-0', depth > 0 && 'pl-3 border-l border-border ml-1')}>
      {nodes.map((node) => (
        <li key={node.path} className="text-xs py-0.5">
          <span className={cn('text-muted-foreground', node.type === 'dir' && 'font-medium')}>
            {node.type === 'dir' ? '📁 ' : '📄 '}
            {node.name}
          </span>
          {node.children?.length ? renderRepoTree(node.children, depth + 1) : null}
        </li>
      ))}
    </ul>
  )

  return (
    <div className="h-full flex flex-col bg-background-secondary overflow-y-auto overflow-x-hidden w-full min-w-0">
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
        <Tabs value={contextTab} onValueChange={setContextTab} className="w-full px-3">
          <div className="mb-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between text-xs font-medium h-8"
                >
                  <span className="truncate">{currentContextLabel}</span>
                  <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[180px]">
                {CONTEXT_TABS.map((tab) => (
                  <DropdownMenuItem
                    key={tab.value}
                    onClick={() => setContextTab(tab.value)}
                    className={cn(contextTab === tab.value && 'bg-primary/10 text-primary')}
                  >
                    {tab.value === 'terminal' ? (
                      <span className="flex items-center gap-2">
                        <TerminalIcon className="h-3.5 w-3.5" />
                        {tab.label}
                      </span>
                    ) : (
                      tab.label
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

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

          <TabsContent value="repo" className="mt-2">
            {projectContext?.repository ? (
              <div className="space-y-2">
                <div className="bg-success-light dark:bg-success/10 p-2 rounded text-xs border border-success/30">
                  <p className="font-medium text-success">Cloned GitHub repo in GRIP&apos;s context</p>
                  <p className="text-success opacity-90">
                    This folder/file list is included in GRIP&apos;s context for the build. Your project input + this repo are used together.
                  </p>
                </div>
                <p className="text-xs font-medium">
                  {projectContext.repository.owner}/{projectContext.repository.name}
                </p>
                {repoTreeLoading ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2Icon className="h-3 w-3 animate-spin" /> Loading repo tree…
                  </p>
                ) : repoTreeError ? (
                  <p className="text-xs text-destructive">{repoTreeError}</p>
                ) : repoTree && repoTree.tree.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto rounded border border-border p-2 bg-background">
                    <p className="text-[10px] text-muted-foreground mb-1">{repoTree.fileCount} files</p>
                    {renderRepoTree(repoTree.tree)}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No repo files yet. Open the Repo tab, clone or refresh the repo, then return here to confirm it&apos;s in context.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Link a GitHub repo in project settings so GRIP can use it for the build.</p>
            )}
          </TabsContent>

          <TabsContent value="plan" className="mt-2">
            <div className="space-y-3 text-xs">
              <div className="bg-success-light dark:bg-success/10 p-2 rounded text-xs border border-success/30">
                <p className="font-medium text-success">Planning outcomes (no Planning page needed)</p>
                <p className="text-success opacity-90">Phases, steps, and generated files below are used by GRIP for the build.</p>
              </div>
              {planLoading ? (
                <p className="text-muted-foreground flex items-center gap-1"><Loader2Icon className="h-3 w-3 animate-spin" /> Loading…</p>
              ) : planData?.plan?.phases?.length ? (
                <>
                  <h4 className="text-sm font-medium">Phases</h4>
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {planData.plan.phases.map((phase, i) => (
                      <li key={i} className="border border-border rounded p-2">
                        <span className="font-medium">{phase.name}</span>
                        {phase.tasks?.length ? (
                          <ul className="mt-1 pl-3 list-disc text-muted-foreground">
                            {phase.tasks.slice(0, 5).map((t, j) => (
                              <li key={j}>{t.name ?? t.title ?? 'Task'}</li>
                            ))}
                            {(phase.tasks?.length ?? 0) > 5 && <li>+{(phase.tasks?.length ?? 0) - 5} more</li>}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  <h4 className="text-sm font-medium mt-2">Generated files (used in build)</h4>
                  {generatedFilesList.length > 0 ? (
                    <ul className="max-h-32 overflow-y-auto space-y-0.5">
                      {generatedFilesList.slice(0, 30).map((f, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <FileIcon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{f.path ? `${f.path}/` : ''}{f.filename}</span>
                        </li>
                      ))}
                      {generatedFilesList.length > 30 && <li className="text-muted-foreground">+{generatedFilesList.length - 30} more</li>}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">None yet. Plan-generated files appear here and are required for the build.</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No plan yet. It will appear here after setup so you can go straight to Develop.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="terminal" className="mt-2">
            <div className="space-y-3 text-xs">
              <h4 className="text-sm font-medium flex items-center gap-1">
                <TerminalIcon className="h-3.5 w-3.5" />
                Running commands in the app
              </h4>
              <p className="text-muted-foreground">
                Run <code className="px-1 rounded bg-muted">npm install</code>, <code className="px-1 rounded bg-muted">npm run dev</code>, and other CLI commands in the <strong>in-app terminal</strong>.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Go to <strong>Dashboard → Terminal</strong> (or use the terminal in this project when available).</li>
                <li>Copy shell commands from GRIP&apos;s chat (use Copy on bash/shell blocks).</li>
                <li>Paste and run them in the app terminal. Everything stays local to the app.</li>
              </ol>
              <p className="text-muted-foreground">
                GRIP suggests commands in shell code blocks; copy and run them in the GRIP terminal so all work stays within the app.
              </p>
            </div>
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
          <Link href={`/dashboard/projects/${projectId}`} className="flex-1">
            <Button 
              variant={isHomePage ? "default" : "outline"} 
              size="sm"
              className="w-full text-xs py-1 h-7"
            >
              Overview
            </Button>
          </Link>
          <Link href={`/dashboard/projects/${projectId}/enhanced-chat`} className="flex-1">
            <Button 
              variant={isEnhancedChat ? "default" : "outline"} 
              size="sm"
              className="w-full text-xs py-1 h-7"
            >
              Develop
            </Button>
          </Link>
          <Link href={`/dashboard/projects/${projectId}/settings`} className="flex-1">
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
      <div className={cn("flex flex-col h-full w-full max-w-full min-w-0 overflow-hidden", className)}>
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
    projectId,
    isTyping,
    errors,
    clearErrors,
    isInitialized,
    setProjectId,
    setProjectContext,
    refreshContext
  } = useEnhancedChat()
  
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<ErrorState | null>(null)
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false)
  const [showWebSocketError, setShowWebSocketError] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastAssistantMessageRef = useRef<HTMLDivElement>(null)
  const params = useParams()
  const prevMessagesLengthRef = useRef(0)
  const lastOpenedStackBlitzForMessageIdRef = useRef<string | null>(null)

  // When user returns to chat or messages load/update, scroll to last message so they see the latest GRIP response
  useEffect(() => {
    if (messages.length === 0) return
    const isInitialLoadOrReturn = prevMessagesLengthRef.current === 0 && messages.length > 0
    prevMessagesLengthRef.current = messages.length
    const scrollToLast = () => {
      messagesEndRef.current?.scrollIntoView({
        behavior: isInitialLoadOrReturn ? 'auto' : 'smooth',
        block: 'end'
      })
    }
    const t = requestAnimationFrame(() => scrollToLast())
    return () => cancelAnimationFrame(t)
  }, [messages.length, messages])

  // When GRIP finishes streaming, scroll to the TOP of the last assistant message so the user sees the start of the response (code blocks are collapsed by default)
  useEffect(() => {
    if (messages.length > 0 && !isTyping) {
      const lastMessage = messages[messages.length - 1]
      const lastIsAssistant = lastMessage?.role === 'assistant'
      const t = requestAnimationFrame(() => {
        if (lastIsAssistant && lastAssistantMessageRef.current) {
          lastAssistantMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }
      })
      return () => cancelAnimationFrame(t)
    }
  }, [isTyping, messages.length, messages])

  // Auto-open StackBlitz when GRIP says "Run in StackBlitz" in chat. We only open a new tab (never navigate away).
  // On revisit: we try once but do not show "Popup blocked" — that toast is only for when the user clicks and it's blocked.
  useEffect(() => {
    if (!projectId || isTyping || messages.length === 0) return
    const last = messages[messages.length - 1]
    if (last?.role !== 'assistant') return
    const content = 'content' in last ? last.content : undefined
    if (typeof content !== 'string') return
    const lower = content.toLowerCase()
    const mentionsStackBlitz = lower.includes('stackblitz') || lower.includes('run in stackblitz') || lower.includes('preview tab') || lower.includes('preview the app') || lower.includes('test in stackblitz') || /preview.*stackblitz|stackblitz.*preview/i.test(content)
    if (!mentionsStackBlitz || lastOpenedStackBlitzForMessageIdRef.current === last.id) return
    lastOpenedStackBlitzForMessageIdRef.current = last.id
    const url = `/dashboard/open-stackblitz/${projectId}`
    const win = window.open(url, '_blank', 'noopener,noreferrer')
    if (win) {
      sonnerToast.success('Opening StackBlitz', { description: 'A new tab is opening. Stay here in chat — paste any errors back for GRIP to fix.' })
    }
    // If blocked (win is null): do not show toast here — user may be returning to the page. Show "Popup blocked" only when they click "Open StackBlitz again" and it fails.
  }, [projectId, isTyping, messages.length, messages])

  // Add rate limiting and request size limits (allow pasted StackBlitz/build errors)
  const MAX_MESSAGE_SIZE = 32000; // 32k so users can paste error output and stack traces
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
  const [projectFiles, setProjectFiles] = useState<Array<{ id: string; path: string; filename: string }>>([])

  // Run & Debug: run project commands and send output to GRIP
  const [runDebugOpen, setRunDebugOpen] = useState(false)
  const [lastRunOutput, setLastRunOutput] = useState<{ command: string; output: string; exitCode: number; duration?: number; timestamp?: string } | null>(null)
  const [canRun, setCanRun] = useState(false)
  const [running, setRunning] = useState(false)
  const [runCommand, setRunCommand] = useState('npm install && npm run build')

  // Build progress (phases/steps) — same as Overview, so user stays in sync without leaving chat
  const [projectState, setProjectState] = useState<{
    currentPhase?: string
    phases?: Array<{
      name: string
      status: string
      steps?: Array<{ id: number; title: string; status: string; result?: string }>
    }>
  } | null>(null)
  const [progressSyncing, setProgressSyncing] = useState(false)
  const [progressLastSynced, setProgressLastSynced] = useState<Date | null>(null)
  const PROGRESS_POLL_MS = 45000 // 45s auto-refresh so user never falls off track

  const fetchProjectState = useCallback(() => {
    if (!projectId) return
    setProgressSyncing(true)
    fetch(`/api/projects/${projectId}/state`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && (data.phases?.length || data.currentPhase)) {
          setProjectState({
            currentPhase: data.currentPhase,
            phases: data.phases,
          })
        } else {
          setProjectState(null)
        }
        setProgressLastSynced(new Date())
      })
      .catch(() => setProjectState(null))
      .finally(() => setProgressSyncing(false))
  }, [projectId])

  useEffect(() => {
    fetchProjectState()
  }, [fetchProjectState])

  useEffect(() => {
    if (!projectId) return
    const interval = setInterval(fetchProjectState, PROGRESS_POLL_MS)
    return () => clearInterval(interval)
  }, [projectId, fetchProjectState])

  const handleSyncWithGrip = useCallback(() => {
    fetchProjectState()
    refreshContext?.()
  }, [fetchProjectState, refreshContext])

  // Fetch project files so we can show "Saved" on code blocks after refresh and pass to FormattedMessage
  useEffect(() => {
    if (!projectId) {
      setProjectFiles([])
      return
    }
    fetch(`/api/project-files?projectId=${projectId}&limit=500`)
      .then((r) => r.ok ? r.json() : [])
      .then((files: Array<{ id: string; path: string; filename: string }>) => setProjectFiles(files))
      .catch(() => setProjectFiles([]))
  }, [projectId])

  // Fetch last run output and canRun for Run & Debug panel
  useEffect(() => {
    if (!projectId) return
    fetch(`/api/projects/${projectId}/last-run-output`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { canRun?: boolean; lastRunOutput?: typeof lastRunOutput } | null) => {
        if (data) {
          setCanRun(Boolean(data.canRun))
          setLastRunOutput(data.lastRunOutput ?? null)
        }
      })
      .catch(() => {})
  }, [projectId])

  const handleRunCommand = async (commandOverride?: string) => {
    if (!projectId || running) return
    const cmd = commandOverride ?? runCommand
    setRunning(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/run-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 501) {
        setLastRunOutput({ command: cmd, output: data.hint ?? data.error ?? 'Run requires a local project path.', exitCode: 1 })
        return
      }
      if (res.ok && data.output !== undefined) {
        setLastRunOutput({ command: cmd, output: data.output, exitCode: data.exitCode ?? 0, duration: data.duration })
      } else {
        setLastRunOutput({ command: cmd, output: data.error ?? 'Run failed.', exitCode: 1 })
      }
    } catch (err) {
      setLastRunOutput({ command: cmd, output: err instanceof Error ? err.message : 'Run failed.', exitCode: 1 })
    } finally {
      setRunning(false)
    }
  }

  const handleSendOutputToGrip = (andSend = false) => {
    if (!lastRunOutput?.output) return
    const msg = `Here is the build/run output (exit code ${lastRunOutput.exitCode}):\n\n\`\`\`\n${lastRunOutput.output.slice(0, 8000)}${lastRunOutput.output.length > 8000 ? '\n...(truncated)' : ''}\n\`\`\`\nPlease fix any errors and suggest next steps.`
    if (andSend) {
      sendMessage(msg)
      setRunDebugOpen(false)
    } else {
      if (inputRef.current) inputRef.current.value = msg
      setRunDebugOpen(false)
    }
  }

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

  // WebSocket only when NEXT_PUBLIC_ENABLE_WEBSOCKET and NEXT_PUBLIC_WEBSOCKET_URL are set (no Socket.IO server at /api/ws)
  useWebSocket({
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

  // Enhanced message handling with rate limiting (uncontrolled input to avoid lag on keystroke)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = inputRef.current?.value ?? '';
    const trimmedInput = raw.trim();
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
        if (inputRef.current) {
          inputRef.current.value = ''
          inputRef.current.style.height = 'auto'
        }
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

      if (inputRef.current) {
        inputRef.current.value = ''
        inputRef.current.style.height = 'auto'
      }
      setError(null);
    } catch (err: any) {
      console.error('Error sending message:', err);
      const status = err?.status;
      const msg = err?.message;
      setError({
        id: Math.random().toString(),
        message: status === 503 ? (msg || 'G.R.I.P. AI is temporarily unavailable. Please try again later.') : (msg || 'Failed to send message. Please try again.'),
        timestamp: new Date()
      });
    }
  };

  // Performance monitoring: observe long tasks without spamming console (optional: send to monitoring service)
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'longtask' && entry.duration > 500) {
          // Only log in dev when explicitly needed; avoid console spam
          if (process.env.NODE_ENV === 'development' && typeof (window as any).__GRIP_DEBUG_LONGTASK === 'boolean' && (window as any).__GRIP_DEBUG_LONGTASK) {
            console.warn('Long task detected:', entry);
          }
          // TODO: send to monitoring service in production
        }
      }
    });
    observer.observe({ entryTypes: ['longtask'] });
    return () => observer.disconnect();
  }, []);

  /** Detect if GRIP's message tells the user to preview in StackBlitz so we can show a quick-link */
  const messageMentionsStackBlitzPreview = (content: string | undefined): boolean => {
    if (!content || typeof content !== 'string') return false
    const lower = content.toLowerCase()
    return (
      lower.includes('stackblitz') ||
      lower.includes('run in stackblitz') ||
      lower.includes('preview tab') ||
      lower.includes('preview the app') ||
      lower.includes('test in stackblitz') ||
      /preview.*stackblitz|stackblitz.*preview/i.test(content)
    )
  }

  const RUN_ERRORS_SUBMISSION_COLORS = [
    'bg-blue-500/25 text-blue-900 dark:text-blue-100 border-blue-400/50',
    'bg-emerald-500/25 text-emerald-900 dark:text-emerald-100 border-emerald-400/50',
    'bg-amber-500/25 text-amber-900 dark:text-amber-100 border-amber-400/50',
    'bg-violet-500/25 text-violet-900 dark:text-violet-100 border-violet-400/50',
    'bg-teal-500/25 text-teal-900 dark:text-teal-100 border-teal-400/50',
    'bg-pink-500/25 text-pink-900 dark:text-pink-100 border-pink-400/50',
  ]

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user'
    const isAIMessage = message.role === 'assistant' && 'stepContext' in message
    const isRunErrorsSubmission = message.metadata?.type === 'run_errors_submission'
    const submissionIndex = message.metadata?.submissionIndex ?? 0
    const submissionColor = RUN_ERRORS_SUBMISSION_COLORS[(submissionIndex - 1) % RUN_ERRORS_SUBMISSION_COLORS.length]
    const isLastAssistantMessage = index === messages.length - 1 && message.role === 'assistant'

    return (
      <motion.div
        key={message.id}
        ref={isLastAssistantMessage ? lastAssistantMessageRef : undefined}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'flex w-full max-w-full min-w-0',
          isUser ? 'justify-end' : 'justify-start'
        )}
      >
        <div
          className={cn(
            'min-w-0 max-w-[85%] md:max-w-[75%] rounded-lg p-2 overflow-hidden break-words',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}
        >
          {isRunErrorsSubmission && (
            <div
              className={cn(
                'mb-2 shrink-0 rounded border px-2 py-1 text-xs font-medium whitespace-nowrap',
                submissionColor
              )}
              title={`StackBlitz errors submission #${submissionIndex}`}
            >
              StackBlitz errors #{submissionIndex}
            </div>
          )}
          <FormattedMessage
              message={message}
              projectId={projectId ?? ''}
              projectFiles={message.role === 'assistant' ? projectFiles : undefined}
              onFileSaved={
                projectId
                  ? () => {
                      refreshContext()
                      fetchProjectState()
                      fetch(`/api/project-files?projectId=${projectId}&limit=500`)
                        .then((r) => (r.ok ? r.json() : []))
                        .then((files: Array<{ id: string; path: string; filename: string }>) => setProjectFiles(files))
                        .catch(() => setProjectFiles([]))
                    }
                  : undefined
              }
            />
          
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

          {!isUser && projectId && messageMentionsStackBlitzPreview('content' in message ? message.content : undefined) && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">StackBlitz opens in a new tab. Paste any errors here and send to GRIP to fix.</p>
              <button
                type="button"
                onClick={() => {
                  const win = window.open(`/dashboard/open-stackblitz/${projectId}`, '_blank', 'noopener,noreferrer')
                  if (win) {
                    sonnerToast.success('Opening StackBlitz', { description: 'Stay here — paste errors from StackBlitz and send to GRIP.' })
                  } else {
                    sonnerToast.warning('Popup blocked', { description: 'Allow popups for this site, or copy the Preview URL and open it in a new tab.' })
                  }
                }}
                className="inline-flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                <CodeIcon className="h-4 w-4 shrink-0" />
                Open StackBlitz again
              </button>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div className={cn('flex flex-col w-full h-full min-w-0 overflow-hidden', className)}>
      {/* Build progress (phase/steps) — same as Overview, so user stays in sync without leaving chat */}
      <div className="flex-shrink-0 border-b border-border bg-background-secondary/50 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-xs font-medium text-text-secondary shrink-0">Build progress:</span>
            {projectState?.phases?.length ? (
              <>
                <span className="text-xs text-primary font-medium truncate">
                  {projectState.currentPhase || projectState.phases[0]?.name || '—'}
                </span>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {(projectState.phases.find((p) => p.name === projectState.currentPhase) || projectState.phases[0])?.steps?.map((step) => (
                    <span
                      key={step.id}
                      className="inline-flex items-center gap-0.5 text-xs text-text-muted"
                      title={`${step.title}${step.result ? ` — ${step.result}` : ''}`}
                    >
                      {step.status === 'completed' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                      ) : step.status === 'in_progress' ? (
                        <Loader2Icon className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-text-muted shrink-0" />
                      )}
                      <span className="truncate max-w-[100px]">{step.title}</span>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <span className="text-xs text-text-muted">No phases yet — complete Plan on Overview</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {projectFiles.length > 0 && (
              <span className="text-[10px] text-text-muted" title="Files saved to this project (from chat or plan)">
                {projectFiles.length} file{projectFiles.length !== 1 ? 's' : ''} in project
              </span>
            )}
            {progressLastSynced && (
              <span className="text-[10px] text-text-muted" title="Auto-updates every 45s">
                Synced {progressLastSynced.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={handleSyncWithGrip}
              disabled={progressSyncing || !projectId}
              title="Refresh phase/step progress and context so you stay in sync with GRIP"
            >
              {progressSyncing ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <RefreshCwIcon className="h-3 w-3" />}
              <span className="ml-1">Sync with GRIP</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Plain scroll container: no Radix viewport so width stays bounded and bubbles stay visible */}
      <div className="flex-1 min-h-0 w-full max-w-full min-w-0 overflow-x-hidden overflow-y-auto p-2">
        <div className="pb-2 space-y-4 w-full max-w-full min-w-0 overflow-x-hidden box-border">
          <AnimatePresence>
            {messages.map((message, index) => renderMessage(message, index))}
          </AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex w-full max-w-full min-w-0 justify-start"
            >
              <div className="min-w-0 max-w-[85%] md:max-w-[75%] rounded-lg p-2 overflow-hidden break-words bg-muted text-foreground">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-sm text-muted-foreground">GRIP is thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
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

        {/* Run & Debug - run project commands and send output to GRIP */}
        <div className="flex-shrink-0 border-t border-border">
          <button
            type="button"
            onClick={() => setRunDebugOpen(!runDebugOpen)}
            aria-controls="run-debug-panel"
            id="run-debug-toggle"
            className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-primary border border-primary/40 bg-primary/10 hover:bg-primary/20 transition-colors rounded-b-none"
          >
            <span className="flex items-center gap-2">
              <TerminalIcon className="h-4 w-4 text-primary shrink-0" />
              Run & Debug
              {canRun ? (
                <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">Ready</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0 text-muted-foreground">Paste errors in chat</Badge>
              )}
            </span>
            {runDebugOpen ? <ChevronUpIcon className="h-4 w-4 shrink-0" /> : <ChevronDownIcon className="h-4 w-4 shrink-0" />}
          </button>
          {runDebugOpen && (
            <div id="run-debug-panel" role="region" aria-labelledby="run-debug-toggle" className="px-4 pb-4 pt-3 space-y-3 border-t border-border bg-background-secondary/30">
              <p className="text-xs text-text-secondary">
                Run build/install here → send output to GRIP → get fixes in chat. {!canRun && 'No local path? Paste build or run errors in the chat below and GRIP will fix them.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => handleRunCommand('npm install')} disabled={running} className="font-mono text-xs font-medium border-primary/50 text-primary bg-primary/10 hover:bg-primary/20">
                  {running ? <Loader2Icon className="h-3 w-3 animate-spin shrink-0" /> : null}
                  npm install
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleRunCommand('npm run build')} disabled={running} className="font-mono text-xs font-medium border-primary/50 text-primary bg-primary/10 hover:bg-primary/20">
                  npm run build
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleRunCommand('npm run dev')} disabled={running} className="font-mono text-xs font-medium border-primary/50 text-primary bg-primary/10 hover:bg-primary/20">
                  npm run dev
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={runCommand}
                  onChange={(e) => setRunCommand(e.target.value)}
                  placeholder="npm install && npm run build"
                  className="flex-1 font-mono text-sm min-w-0"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleRunCommand())}
                  disabled={running}
                />
                <Button type="button" onClick={() => handleRunCommand()} disabled={running} size="icon" title="Run command">
                  {running ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <PlayIcon className="h-4 w-4" />}
                </Button>
              </div>
              {lastRunOutput && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-2">
                      Last: <code className="font-mono bg-background-tertiary px-1 rounded">{lastRunOutput.command}</code>
                      <span className={cn(lastRunOutput.exitCode === 0 ? 'text-success' : 'text-destructive')}>
                        exit {lastRunOutput.exitCode}
                      </span>
                      {lastRunOutput.duration != null && lastRunOutput.duration > 0 && (
                        <span>· {(lastRunOutput.duration / 1000).toFixed(1)}s</span>
                      )}
                    </span>
                    <div className="flex gap-1">
                      {lastRunOutput.exitCode !== 0 && (
                        <Button type="button" variant="outline" size="sm" onClick={() => handleRunCommand(lastRunOutput.command)} disabled={running} title="Run same command again">
                          <RefreshCwIcon className="h-3 w-3 mr-1" />
                          Run again
                        </Button>
                      )}
                      <Button type="button" variant="default" size="sm" onClick={() => handleSendOutputToGrip(true)} title="Put output in chat and send to GRIP" className="font-semibold shadow-sm">
                        <SendIcon className="h-3 w-3 mr-1" />
                        Send to GRIP
                      </Button>
                    </div>
                  </div>
                  <pre className={cn(
                    'max-h-48 overflow-auto rounded-md p-2 text-xs font-mono whitespace-pre-wrap break-words border',
                    lastRunOutput.exitCode === 0 ? 'bg-success/10 border-success/30 text-success-foreground' : 'bg-destructive/10 border-destructive/30 text-destructive'
                  )}>
                    {lastRunOutput.output.slice(0, 4000)}{lastRunOutput.output.length > 4000 ? '\n...(truncated)' : ''}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Input — textarea expands with content; Enter sends, Shift+Enter new line */}
        <div className="flex-shrink-0 border-t p-4">
          {messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && (messages[messages.length - 1]?.content ?? '').includes('```') && !isTyping && (
            <p className="text-[11px] text-muted-foreground mb-2">Save any code blocks above with &quot;Save to project&quot;, then tell GRIP when you&apos;re ready or paste errors from StackBlitz.</p>
          )}
          <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              name="message"
              defaultValue=""
              placeholder={isTyping ? "GRIP is thinking..." : "Ask GRIP to build, fix, or add features… Paste errors here for fixes. (Shift+Enter new line)"}
              disabled={isLoading || isTyping}
              className="flex-1 min-h-[40px] max-h-[200px] resize-none py-2.5"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  formRef.current?.requestSubmit()
                }
              }}
              onInput={(e) => {
                const ta = e.target as HTMLTextAreaElement
                ta.style.height = 'auto'
                ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
              }}
            />
            <button
              type="submit"
              disabled={isLoading || isTyping}
              title={isTyping ? "GRIP is thinking..." : "Send message (Enter)"}
              className="inline-flex items-center justify-center gap-2 shrink-0 min-w-[5rem] h-10 px-4 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary disabled:pointer-events-none disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : isTyping ? 'Thinking...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
} 