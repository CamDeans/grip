'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState } from '@/components/ui/LoadingState'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { CheckCircle2, Code, Lightbulb, MessageSquare, PenTool, PuzzleIcon, ChevronRight, ChevronDown, Book, ArrowRight, Zap, ClipboardIcon, HelpCircle, Loader2, ExternalLink, FileCode, Terminal, Circle, ListChecks, FlaskConical, GitBranch, Shield, ArrowUpCircle, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { refreshTokenUsage } from '@/lib/tokenRefresh'
import { toast as sonnerToast } from 'sonner'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Project {
  _id: string
  title: string
  description: string
  repository?: {
    owner: string
    name: string
  }
  ideation?: {
    goals: string
    targetAudience: string
    keyFeatures: string
    technicalRequirements: string
  }
  createdAt?: string
  updatedAt?: string
  status?: 'active' | 'completed' | 'archived'
  completionStatus?: 'draft' | 'ready_to_export' | 'exported' | 'deployed'
  exportedRepoUrl?: string
  deployedUrl?: string
  isSandbox?: boolean
  parentProjectId?: string
}

interface SandboxExperiment {
  _id: string
  title: string
  description: string
  repository?: { owner: string; name: string }
  createdAt: string
  updatedAt: string
  isSandbox: true
  parentProjectId: string
}

export default function ProjectOverviewPage() {
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [generatedFiles, setGeneratedFiles] = useState<Array<{ id: string; path: string; filename: string; size?: number; content?: string; language?: string }>>([])
  const [viewingFile, setViewingFile] = useState<{ path: string; filename: string; content?: string } | null>(null)
  const [projectState, setProjectState] = useState<{
    currentPhase?: string
    phases?: Array<{
      name: string
      status: string
      steps: Array<{ id: number; title: string; status: string; action?: string; progress?: string; result?: string }>
    }>
  } | null>(null)
  const [hasAnalysis, setHasAnalysis] = useState<boolean | null>(null)
  const [hasPlan, setHasPlan] = useState<boolean | null>(null)
  const [sandboxes, setSandboxes] = useState<SandboxExperiment[]>([])
  const [loadingSandboxes, setLoadingSandboxes] = useState(false)
  const [creatingSandbox, setCreatingSandbox] = useState(false)
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const projectId = params?.id || ''

  const refreshProject = () => {
    if (!projectId) return
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setProject(data))
      .catch(() => {})
  }

  const handleMarkReady = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completionStatus: 'ready_to_export' }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setProject((p) => p ? { ...p, completionStatus: 'ready_to_export' } : null)
      sonnerToast.success('Marked ready to export')
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  const handleExport = async () => {
    if (!projectId || exporting) return
    setExporting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/export`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Export failed')
      sonnerToast.success('Exported to GitHub', { description: data.repoUrl })
      refreshProject()
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleDeploy = async () => {
    if (!projectId || deploying) return
    setDeploying(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/deploy`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Deploy failed')
      sonnerToast.success('Deployment started', { description: data.message || data.url })
      refreshProject()
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'Deploy failed')
    } finally {
      setDeploying(false)
    }
  }

  const handleSetStatus = async (status: 'active' | 'completed' | 'archived') => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setProject((p) => (p ? { ...p, status } : null))
      sonnerToast.success('Status updated')
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        if (!response.ok) throw new Error('Failed to fetch project')
        const data = await response.json()
        console.log('[Project Overview] Loaded project:', { id: projectId, isSandbox: data.isSandbox, title: data.title })
        setProject(data)
        setError(null)
      } catch (error) {
        console.error('Error fetching project:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }
    fetchProject()
  }, [projectId])

  // Fetch sandbox experiments for main projects
  useEffect(() => {
    if (!projectId || project?.isSandbox) return
    const fetchSandboxes = async () => {
      setLoadingSandboxes(true)
      try {
        const response = await fetch(`/api/projects/${projectId}/sandboxes`)
        if (response.ok) {
          const data = await response.json()
          setSandboxes(data.sandboxes || [])
        }
      } catch (error) {
        console.error('Error fetching sandboxes:', error)
      } finally {
        setLoadingSandboxes(false)
      }
    }
    fetchSandboxes()
  }, [projectId, project?.isSandbox])

  const refreshGeneratedFiles = () => {
    if (!projectId) return
    setLoadingFiles(true)
    // Use appropriate endpoint based on project type
    const endpoint = project?.isSandbox
      ? `/api/projects/${projectId}/legal-sandbox/files`
      : `/api/project-files?projectId=${projectId}&limit=100`
    fetch(endpoint)
      .then(async (r) => {
        if (!r.ok) return []
        const data = await r.json()
        // Handle different response formats
        if (project?.isSandbox && Array.isArray(data)) {
          return data.map((f: { path?: string; filename?: string; content?: string }) => ({
            id: `${f.path || ''}/${f.filename || ''}`,
            path: f.path || '',
            filename: f.filename || '',
            content: f.content,
          }))
        }
        return Array.isArray(data) ? data : []
      })
      .then((list: Array<{ id: string; path: string; filename: string; size?: number; content?: string; language?: string }>) => setGeneratedFiles(list))
      .catch(() => setGeneratedFiles([]))
      .finally(() => setLoadingFiles(false))
  }

  useEffect(() => {
    if (!projectId) return
    refreshGeneratedFiles()
  }, [projectId, project?.isSandbox])

  // Fetch project state (phases), analysis status, and plan for Get started + Phases
  // Works for both main and sandbox projects
  const refetchPhaseStatus = useCallback(() => {
    if (!projectId) return
    const stateUrl = `/api/projects/${projectId}/state`
    const analysisUrl = `/api/projects/${projectId}/analysis/status`
    const planUrl = project?.isSandbox
      ? `/api/projects/${projectId}/legal-sandbox/plan`
      : `/api/projects/${projectId}/plan`
    Promise.all([
      fetch(stateUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(analysisUrl).then((r) => (r.ok ? r.json() : null)).then((d) => d?.hasAnalysis ?? d?.analysisCompleted ?? false).catch(() => false),
      fetch(planUrl).then((r) => r.ok).catch(() => false),
    ]).then(([state, analysis, plan]) => {
      setProjectState(state && (state.phases?.length || state.currentPhase) ? state : null)
      setHasAnalysis(!!analysis)
      setHasPlan(!!plan)
    })
  }, [projectId, project?.isSandbox])

  useEffect(() => {
    refetchPhaseStatus()
  }, [refetchPhaseStatus])

  // When user revisits the overview page (tab focus or navigation back), refetch phase status so it's up to date
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refetchPhaseStatus()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [refetchPhaseStatus])

  // Auto-run plan + sync so user can get to Develop without pressing buttons (smoother flow)
  // Skip for sandbox projects - they use their own plan flow
  const autoPlanRanRef = useRef<string | null>(null)
  useEffect(() => {
    if (!projectId || project?.isSandbox || !project?.repository?.owner || !project?.repository?.name) return
    if (autoPlanRanRef.current === projectId) return
    if (hasPlan === true && projectState?.phases?.length) return
    if (hasPlan === null) return
    autoPlanRanRef.current = projectId
    sonnerToast.info('Setting up your plan…', { description: 'Generating plan, build steps, and required files so you can go straight to Develop.' })
    const run = async () => {
      try {
        const planRes = await fetch(`/api/projects/${projectId}/plan`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        if (!planRes.ok) return
        refreshTokenUsage()
        const syncRes = await fetch(`/api/projects/${projectId}/plan/sync-state`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        if (!syncRes.ok) return
        const filesRes = await fetch(`/api/projects/${projectId}/files/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        const filesData = filesRes.ok ? await filesRes.json().catch(() => ({})) : {}
        const fileCount = filesData.successCount ?? filesData.generatedFiles?.filter((f: { success?: boolean }) => f.success).length ?? 0
        const [state] = await Promise.all([
          fetch(`/api/projects/${projectId}/state`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ])
        setProjectState(state && (state.phases?.length || state.currentPhase) ? state : null)
        setHasPlan(true)
        sonnerToast.success(
          'Plan ready',
          { description: fileCount > 0 ? `Phases and ${fileCount} file(s) created. Go to Develop to build with GRIP.` : 'You can go to Develop to start building with GRIP.' }
        )
      } catch {
        autoPlanRanRef.current = null
      }
    }
    run()
  }, [projectId, project?.repository?.owner, project?.repository?.name, hasPlan, projectState?.phases?.length])

  if (isLoading) {
    return <LoadingState message="Loading project information..." />
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

  // Format dates
  const createdDate = project?.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'
  const updatedDate = project?.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'N/A'

  const ideationFilled = Boolean(
    project?.ideation &&
    (project.ideation.goals?.trim() || project.ideation.targetAudience?.trim() ||
     project.ideation.keyFeatures?.trim() || project.ideation.technicalRequirements?.trim())
  )
  const hasRepo = Boolean(project?.repository?.owner && project?.repository?.name)
  const stepsComplete = [
    ideationFilled,
    hasRepo,
    hasAnalysis === true,
    hasPlan === true,
    Boolean(projectState?.phases?.length),
  ]
  const allPreChatStepsComplete = stepsComplete[0] && stepsComplete[1] && stepsComplete[2] && stepsComplete[3] && stepsComplete[4]
  const readyForDevelop = hasPlan === true || (projectState?.phases?.length ?? 0) > 0

  const handleCreateSandbox = async (title?: string, copyFiles: boolean = false) => {
    setCreatingSandbox(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/create-sandbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, copyFiles }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      const data = await res.json()
      sonnerToast.success('Sandbox experiment created', { description: `Created "${data.sandboxProject.title}"` })
      // Refresh sandboxes list
      const sandboxesRes = await fetch(`/api/projects/${projectId}/sandboxes`)
      if (sandboxesRes.ok) {
        const sandboxesData = await sandboxesRes.json()
        setSandboxes(sandboxesData.sandboxes || [])
      }
      // Optionally navigate to the new sandbox
      if (data.sandboxProject._id) {
        router.push(`/dashboard/projects/${data.sandboxProject._id}`)
      }
    } catch (e) {
      sonnerToast.error(e instanceof Error ? e.message : 'Failed to create sandbox')
    } finally {
      setCreatingSandbox(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Sandbox indicator banner - only show if it's a linked experiment */}
      {project?.isSandbox && project?.parentProjectId && (
        <Card className="border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-amber-500 text-white rounded-md text-sm font-semibold">
                  EXPERIMENT
                </div>
                <p className="text-sm text-text-secondary">
                  This is an experiment linked to a main project. Changes here do not affect the main project.
                  <Link href={`/dashboard/projects/${project.parentProjectId}`} className="ml-2 text-primary hover:underline">
                    View main project →
                  </Link>
                </p>
              </div>
              <Button
                onClick={async () => {
                  if (!confirm('Promote all files from this experiment to the main project? This will copy all sandbox files to your main project.')) {
                    return
                  }
                  try {
                    const res = await fetch(`/api/projects/${projectId}/promote-sandbox`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ overwrite: false }),
                    })
                    const data = await res.json()
                    if (res.ok) {
                      sonnerToast.success(
                        'Sandbox promoted',
                        {
                          description: `Promoted ${data.summary.promoted} file(s) to main project.${data.summary.skipped > 0 ? ` ${data.summary.skipped} file(s) skipped (already exist).` : ''}`,
                        }
                      )
                      // Navigate to main project
                      router.push(`/dashboard/projects/${project.parentProjectId}`)
                    } else {
                      throw new Error(data.error || 'Failed to promote')
                    }
                  } catch (e) {
                    sonnerToast.error(e instanceof Error ? e.message : 'Failed to promote sandbox')
                  }
                }}
                variant="default"
                size="sm"
                className="shrink-0"
              >
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                Promote to Main
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sandbox Experiments Section for main projects */}
      {project && project.isSandbox !== true && (
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-primary" />
                Sandbox Experiments
              </CardTitle>
              <CardDescription>
                Isolated environments for trying new features or refactors without affecting your main project. Uses clean-room code generation and legal-safe practices.
              </CardDescription>
            </div>
            <div className="flex flex-col xs:flex-row gap-2 shrink-0 w-full sm:w-auto">
              <Button
                variant="default"
                size="default"
                className="w-full sm:w-auto"
                disabled={creatingSandbox}
                onClick={() => handleCreateSandbox(undefined, false)}
              >
                {creatingSandbox ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {creatingSandbox ? 'Creating…' : 'Create new sandbox'}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="default" className="w-full sm:w-auto" disabled={creatingSandbox}>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Copy files instead
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => handleCreateSandbox(undefined, true)} disabled={creatingSandbox}>
                    <GitBranch className="w-4 h-4 mr-2" />
                    Create sandbox with a copy of this project&apos;s files
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* How to use — clear steps */}
            <div className="rounded-lg border border-border bg-background/50 p-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">How to get the best results</h4>
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-text-secondary">
                <li><strong className="text-foreground">Create a sandbox</strong> — Click &quot;Create new sandbox&quot; above (or &quot;Copy files instead&quot; to start from your current project files).</li>
                <li><strong className="text-foreground">Open Sandbox Develop</strong> — After it’s created, open the experiment and go to the <strong>Sandbox Develop</strong> tab to chat with GRIP and build in isolation.</li>
                <li><strong className="text-foreground">Promote when ready</strong> — When you’re happy with the result, use &quot;Promote to Main&quot; on the experiment to copy its files into this project.</li>
              </ol>
            </div>
            {/* Use cases */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-background/50 rounded-lg border border-border">
              <div className="flex items-start gap-3">
                <GitBranch className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-semibold mb-1">Architecture Experiments</h5>
                  <p className="text-xs text-text-secondary">
                    Try new patterns (e.g., move from pages/ to app/ routes) without breaking your main project.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-semibold mb-1">Risky Refactors</h5>
                  <p className="text-xs text-text-secondary">
                    Test major changes or new dependencies in isolation before committing to your main build.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-semibold mb-1">Legal-Safe Mode</h5>
                  <p className="text-xs text-text-secondary">
                    Strict clean-room generation—repo is reference only, all code is new. Perfect for compliance.
                  </p>
                </div>
              </div>
            </div>

            {/* List existing sandboxes */}
            {loadingSandboxes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
              </div>
            ) : sandboxes.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <FlaskConical className="w-4 h-4" />
                    Active Experiments ({sandboxes.length})
                  </h4>
                  <Link href={`/dashboard/projects/${sandboxes[0]._id}/sandbox-chat`}>
                    <Button variant="outline" size="sm" className="shrink-0">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Sandbox Develop
                    </Button>
                  </Link>
                </div>
                {sandboxes.map((sandbox) => (
                  <div
                    key={sandbox._id}
                    className="flex items-center justify-between p-4 bg-background border border-border rounded-lg hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded shrink-0">
                          EXPERIMENT
                        </span>
                        <Link
                          href={`/dashboard/projects/${sandbox._id}`}
                          className="font-semibold text-primary hover:underline truncate"
                        >
                          {sandbox.title}
                        </Link>
                      </div>
                      {sandbox.description && (
                        <p className="text-xs text-text-secondary line-clamp-2 mb-1">{sandbox.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        <span>Updated {new Date(sandbox.updatedAt).toLocaleDateString()}</span>
                        {sandbox.repository && (
                          <span className="flex items-center gap-1">
                            <Code className="w-3 h-3" />
                            {sandbox.repository.owner}/{sandbox.repository.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        onClick={async () => {
                          if (!confirm(`Promote all files from "${sandbox.title}" to the main project?`)) {
                            return
                          }
                          try {
                            const res = await fetch(`/api/projects/${sandbox._id}/promote-sandbox`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ overwrite: false }),
                            })
                            const data = await res.json()
                            if (res.ok) {
                              sonnerToast.success(
                                'Sandbox promoted',
                                {
                                  description: `Promoted ${data.summary.promoted} file(s) to main project.${data.summary.skipped > 0 ? ` ${data.summary.skipped} file(s) skipped.` : ''}`,
                                }
                              )
                              // Refresh page to show updated main project
                              refreshProject()
                            } else {
                              throw new Error(data.error || 'Failed to promote')
                            }
                          } catch (e) {
                            sonnerToast.error(e instanceof Error ? e.message : 'Failed to promote sandbox')
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                      >
                        <ArrowUpCircle className="w-4 h-4 mr-1" />
                        Promote
                      </Button>
                      <Link href={`/dashboard/projects/${sandbox._id}`}>
                        <Button variant="ghost" size="sm" className="shrink-0">
                          Open
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={async () => {
                          if (!confirm(`Permanently delete the experiment "${sandbox.title}" and all its data? This cannot be undone.`)) return
                          try {
                            const res = await fetch(`/api/projects/${sandbox._id}`, { method: 'DELETE' })
                            if (!res.ok) {
                              const data = await res.json().catch(() => ({}))
                              throw new Error(data.error || 'Delete failed')
                            }
                            sonnerToast.success('Experiment deleted')
                            setSandboxes(prev => prev.filter(s => s._id !== sandbox._id))
                          } catch (e) {
                            sonnerToast.error(e instanceof Error ? e.message : 'Failed to delete experiment')
                          }
                        }}
                        aria-label="Delete experiment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4 text-text-secondary border-2 border-dashed border-border rounded-lg">
                <FlaskConical className="w-8 h-8 mx-auto mb-2 text-text-muted" />
                <p className="text-sm font-medium text-foreground mb-1">No sandbox experiments yet</p>
                <p className="text-xs mb-4">Click &quot;Create new sandbox&quot; at the top of this card to create one.</p>
                <Button
                  variant="default"
                  size="sm"
                  disabled={creatingSandbox}
                  onClick={() => handleCreateSandbox(undefined, false)}
                >
                  {creatingSandbox ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create new sandbox
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Next step: Start chat with GRIP — show when plan or phases exist so user always sees what to do */}
      {readyForDevelop && (
        <Card className="border-2 border-primary bg-primary/10">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-primary">Your next step: Start building with GRIP</h2>
                <p className="text-sm text-text-secondary">
                  You’ve completed planning. Open <strong>Develop</strong> to chat with GRIP and implement your phases step by step.
                </p>
                <p className="text-xs text-text-muted border-l-2 border-primary/50 pl-3">
                  <strong>Before you go:</strong> GRIP works only on the current phase. When that phase is done, GRIP will route you back to this Overview page for next steps and realignment so you and GRIP stay in sync. Then you can start the next phase from here.
                </p>
              </div>
              <Link href={`/dashboard/projects/${projectId}/${project?.isSandbox ? 'sandbox-chat' : 'enhanced-chat'}`} className="shrink-0 mt-2 sm:mt-0">
                <Button size="lg" className="w-full sm:w-auto">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Go to Develop (chat with GRIP)
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sandbox Develop - show only when sandbox experiments exist */}
      {project && !project.isSandbox && sandboxes.length > 0 && (
        <Card className="border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <FlaskConical className="w-5 h-5" />
                  Sandbox Develop
                </h2>
                <p className="text-sm text-text-secondary">
                  You have {sandboxes.length} active experiment{sandboxes.length !== 1 ? 's' : ''}. Open <strong>Sandbox Develop</strong> to chat with GRIP in your sandbox environment.
                </p>
                <p className="text-xs text-text-muted border-l-2 border-amber-500/50 pl-3">
                  <strong>Note:</strong> Sandbox experiments are isolated from your main project. Changes here won't affect your main build until you promote them.
                </p>
              </div>
              <Link href={`/dashboard/projects/${sandboxes[0]._id}/sandbox-chat`} className="shrink-0 mt-2 sm:mt-0">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-amber-500 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Go to Sandbox Develop
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Get started: set up once; GRIP automates analysis, plan, code apply, and build */}
      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />
            Get started: set up once, GRIP automates the rest
          </CardTitle>
          <CardDescription>
            Set ideation and link a repo below. GRIP runs analysis and creates a plan automatically. In Develop chat, GRIP applies code to your project and runs the build automatically—no manual save or run steps. This checklist shows what&apos;s ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              {stepsComplete[0] ? <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />}
              <div>
                <span className="font-medium">1. Ideation</span> — Define goals, audience, features, and technical requirements (set when you created the project or in Settings).
                {!stepsComplete[0] && (
                  <Link href={`/dashboard/projects/${projectId}/settings`} className="ml-1 text-primary hover:underline text-sm">Set in Settings</Link>
                )}
              </div>
            </li>
            <li className="flex items-start gap-3">
              {stepsComplete[1] ? <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />}
              <div>
                <span className="font-medium">2. Repo</span> — Select and link a GitHub repository. GRIP uses it as reference only; all generated code is clean-room.
                {!stepsComplete[1] && (
                  <Link href={`/dashboard/projects/${projectId}/repo`} className="ml-1 text-primary hover:underline text-sm">Select repo</Link>
                )}
              </div>
            </li>
            <li className="flex items-start gap-3">
              {stepsComplete[2] ? <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />}
              <div>
                <span className="font-medium">3. Analysis</span> — GRIP analyzes the repo automatically (e.g. when you open Develop or run from Repo). Ensures GRIP understands the codebase before generating code.
                {!stepsComplete[2] && (
                  <Link href={`/dashboard/projects/${projectId}/repo`} className="ml-1 text-primary hover:underline text-sm">Run analysis from Repo</Link>
                )}
              </div>
            </li>
            <li className="flex items-start gap-3">
              {stepsComplete[3] ? <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />}
              <div>
                <span className="font-medium">4. Plan</span> — Development plan (phases and tasks) is created automatically when you link a repo.
                {!stepsComplete[3] && (
                  <span className="text-sm text-muted-foreground">Plan is created automatically when you link a repo.</span>
                )}
              </div>
            </li>
            <li className="flex items-start gap-3">
              {stepsComplete[4] ? <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />}
              <div>
                <span className="font-medium">5. Build progress</span> — Phases and steps below update automatically as GRIP saves files and runs the build in chat. Start or continue in Develop when ready.
                {!stepsComplete[4] && (
                  <span className="text-sm text-text-muted ml-1">Phases appear automatically once a plan exists (after linking a repo).</span>
                )}
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Build phases — start chat with GRIP from here */}
      <Card id="phases" className="border border-border scroll-mt-4">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-xl font-bold">Build phases</CardTitle>
              <CardDescription>
                Current phase and steps. Progress updates automatically as GRIP saves files and runs the build in Develop—no need to return here to confirm. Start or continue chat to build.
              </CardDescription>
            </div>
            {!project?.isSandbox && projectState?.phases?.length ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchPhaseStatus()
                  sonnerToast.success('Progress reconciled', { description: 'Phases updated from saved files.' })
                }}
                className="shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Reconcile progress
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {projectState?.phases?.length ? (
            <>
              <p className="text-sm text-text-secondary">
                Current phase: <strong>{projectState.currentPhase || projectState.phases[0]?.name || '—'}</strong>
              </p>
              <div className="space-y-3">
                {projectState.phases.map((phase, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-3">
                    <div className="font-medium flex items-center gap-2">
                      {phase.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-success" /> : phase.status === 'in_progress' ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Circle className="w-4 h-4 text-text-muted" />}
                      {phase.name}
                      <span className="text-xs font-normal text-text-muted">({phase.status})</span>
                    </div>
                    {phase.steps?.length > 0 && (
                      <ul className="mt-2 ml-6 space-y-1 text-sm text-text-secondary">
                        {phase.steps.map((step) => (
                          <li key={step.id} className="flex items-center gap-2">
                            {step.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" /> : <Circle className="w-3.5 h-3.5 text-text-muted shrink-0" />}
                            {step.title}
                            {step.result && <span className="text-xs text-text-muted">— {step.result}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-muted border-l-2 border-primary/50 pl-3">
                GRIP focuses on the current phase. Phases and steps sync automatically as you chat—when GRIP applies code and runs the build, progress updates here. You can check Overview anytime to see status; no need to return to &quot;confirm&quot; a phase.
              </p>
              <Link href={`/dashboard/projects/${projectId}/${project?.isSandbox ? 'sandbox-chat' : 'enhanced-chat'}`} className="mt-5 block">
                <Button className="w-full sm:w-auto" size="lg">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {allPreChatStepsComplete ? 'Start chat with GRIP' : 'Continue with GRIP'}
                </Button>
              </Link>
            </>
          ) : (
            <div className="text-sm text-text-secondary space-y-3">
              {hasPlan === true ? (
                <>
                  <p className="font-medium text-text-primary">Your next step: Start chat with GRIP.</p>
                  <p>Plan and files are ready. Go to <strong>Develop</strong> to build with GRIP. Code applies and the build runs automatically; phases and steps sync here as you work.</p>
                  <p className="text-xs text-text-muted border-l-2 border-primary/50 pl-3">
                    GRIP focuses on the current phase. Progress syncs automatically—no need to return to Overview to &quot;confirm&quot; before the next phase.
                  </p>
                  <Link href={`/dashboard/projects/${projectId}/${project?.isSandbox ? 'sandbox-chat' : 'enhanced-chat'}`} className="mt-5 block">
                    <Button size="lg">Go to Develop (chat with GRIP)</Button>
                  </Link>
                </>
              ) : (
                <>
                  <p>No phases yet. Link a repo so GRIP can create a plan and phases automatically, then go to Develop to start building.</p>
                  <Link href={`/dashboard/projects/${projectId}/${project?.isSandbox ? 'sandbox-chat' : 'enhanced-chat'}`}>
                    <Button variant="outline">Open Develop anyway</Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Summary Card */}
      <Card className="border border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold mb-2">Project Overview</CardTitle>
          <CardDescription>
            This dashboard provides all the information and tools you need to develop your project using G.R.I.P.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <p className="text-sm text-text-secondary mb-4">
            Use the tabs to move through the flow: <strong>Setup</strong> → <strong>Repo</strong> → <strong>Plan</strong> → <strong>Develop</strong> → <strong>Preview</strong>. In Develop, GRIP applies code and runs the build automatically; progress syncs here.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Project Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-muted">Created:</span>
                  <span>{createdDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Last Updated:</span>
                  <span>{updatedDate}</span>
                </div>
                {project?.repository && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Repository:</span>
                    <span>{project.repository.owner}/{project.repository.name}</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-primary">Next step</h3>
              <p className="text-sm text-text-secondary">
                Use the tabs to jump to Setup, Repo, Plan, or Develop. Build progress (phases and steps) syncs automatically as GRIP saves files and runs the build—no need to return here to confirm.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Project Ideation Summary */}
      <Card className="border border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold">Project Ideation</CardTitle>
          <CardDescription>
            A summary of your project goals and requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {project?.ideation ? (
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Goals</h3>
                <p className="whitespace-pre-line">{project.ideation.goals}</p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Target Audience</h3>
                <p className="whitespace-pre-line">{project.ideation.targetAudience}</p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Key Features</h3>
                <p className="whitespace-pre-line">{project.ideation.keyFeatures}</p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Technical Requirements</h3>
                <p className="whitespace-pre-line">{project.ideation.technicalRequirements}</p>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-text-muted">
              <p>No ideation information available. Consider enhancing your project details.</p>
              <Button variant="outline" className="mt-4">
                Update Project Details
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Generated files (saved to DB from Plan → Generate or save-from-chat) */}
      <Card id="generated-files" className="border border-border scroll-mt-4">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <FileCode className="w-5 h-5 text-primary" />
                Generated files
              </CardTitle>
              <CardDescription>
                Files GRIP creates or updates. Code blocks from Develop chat are applied automatically to the project and appear here.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" disabled={loadingFiles} onClick={refreshGeneratedFiles}>
              {loadingFiles ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingFiles ? (
            <p className="text-sm text-text-secondary">Loading...</p>
          ) : generatedFiles.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No generated files yet. Files are created with the plan or when you chat in Develop—GRIP applies code blocks automatically to the project and they appear here.
            </p>
          ) : (
            <ul className="space-y-2">
              {generatedFiles.slice(0, 15).map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-sm truncate min-w-0">
                    {f.path ? `${f.path}/` : ''}{f.filename}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {typeof f.size === 'number' && (
                      <span className="text-xs text-text-secondary">{Math.round(f.size / 1024 * 10) / 10} KB</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setViewingFile({
                        path: f.path || '',
                        filename: f.filename,
                        content: typeof f.content === 'string' ? f.content : '',
                        language: f.language,
                      })}
                    >
                      View
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {generatedFiles.length > 15 && (
            <p className="text-xs text-text-secondary mt-2">Showing 15 of {generatedFiles.length} files.</p>
          )}
        </CardContent>
      </Card>

      {/* How to Use G.R.I.P. */}
      <Card className="border border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold">How to Use G.R.I.P.</CardTitle>
          <CardDescription>
            Tips for getting the most out of your AI development assistant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="mr-3 mt-0.5">
                  <Zap className="text-amber-500 w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold">Be Specific</h4>
                  <p className="text-sm text-text-secondary">
                    Provide detailed instructions about what you want to build. The more specific you are, the better G.R.I.P. can assist you.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="mr-3 mt-0.5">
                  <Zap className="text-amber-500 w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold">Ask for Explanations</h4>
                  <p className="text-sm text-text-secondary">
                    If you&apos;re unsure about something, ask G.R.I.P. to explain concepts or code snippets in detail.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="mr-3 mt-0.5">
                  <Zap className="text-amber-500 w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold">Save Important Information</h4>
                  <p className="text-sm text-text-secondary">
                    Use the planning section to document and save important aspects of your project for future reference.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* See it run & ship it */}
      <Card id="see-it-run" className="border border-primary/20 bg-primary/5">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold">See it run & ship it</CardTitle>
          <CardDescription>
            Make this repo yours: explore every file, preview, export to GitHub, and deploy when ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {project?.completionStatus && (
            <p className="text-sm text-text-secondary">
              Status: <span className="font-medium capitalize">{project.completionStatus.replace(/_/g, ' ')}</span>
              {project.exportedRepoUrl && (
                <span className="ml-2">
                  · <a href={project.exportedRepoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Repo <ExternalLink className="h-3 w-3" /></a>
                </span>
              )}
              {project.deployedUrl && (
                <span className="ml-2">
                  · <a href={project.deployedUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Live <ExternalLink className="h-3 w-3" /></a>
                </span>
              )}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="default"
              className="h-auto p-4 justify-start"
              onClick={() => router.push(`/dashboard/projects/${projectId}/repo`)}
            >
              <div className="flex items-start">
                <Code className="w-5 h-5 mr-3 mt-0.5" />
                <div className="text-left">
                  <div className="font-semibold">Repo Explorer</div>
                  <p className="text-sm opacity-90">
                    Browse, search, and edit every file in your linked repo
                  </p>
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={() => router.push(`/dashboard/projects/${projectId}/preview`)}
            >
              <div className="flex items-start">
                <Zap className="w-5 h-5 mr-3 mt-0.5 text-amber-500" />
                <div className="text-left">
                  <div className="font-semibold">Preview</div>
                  <p className="text-sm text-text-secondary">
                    Paste a URL or open in StackBlitz to run in browser
                  </p>
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={handleExport}
              disabled={exporting || (!project?.repository && generatedFiles.length === 0)}
            >
              <div className="flex items-start">
                {exporting ? <Loader2 className="w-5 h-5 mr-3 mt-0.5 animate-spin" /> : <ArrowRight className="w-5 h-5 mr-3 mt-0.5" />}
                <div className="text-left">
                  <div className="font-semibold">Export to my GitHub</div>
                  <p className="text-sm text-text-secondary">
                    Create your own repo from this project
                  </p>
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 justify-start"
              onClick={handleDeploy}
              disabled={deploying || (!project?.repository && !project?.exportedRepoUrl)}
            >
              <div className="flex items-start">
                {deploying ? <Loader2 className="w-5 h-5 mr-3 mt-0.5 animate-spin" /> : <Zap className="w-5 h-5 mr-3 mt-0.5 text-success" />}
                <div className="text-left">
                  <div className="font-semibold">Deploy to Vercel</div>
                  <p className="text-sm text-text-secondary">
                    One-click deploy (repo must be linked to Vercel)
                  </p>
                </div>
              </div>
            </Button>
          </div>
          {project?.completionStatus === 'draft' && (
            <Button variant="ghost" size="sm" onClick={handleMarkReady}>
              Mark ready to export
            </Button>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-border">
            <span className="text-xs text-text-secondary">Project status:</span>
            <Button
              variant={(project?.status ?? 'active') === 'active' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleSetStatus('active')}
              disabled={(project?.status ?? 'active') === 'active'}
            >
              Active
            </Button>
            <Button
              variant={(project?.status ?? 'active') === 'completed' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleSetStatus('completed')}
              disabled={(project?.status ?? 'active') === 'completed'}
            >
              Completed
            </Button>
            <Button
              variant={(project?.status ?? 'active') === 'archived' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleSetStatus('archived')}
              disabled={(project?.status ?? 'active') === 'archived'}
            >
              Archived
            </Button>
            <span className="text-xs text-text-muted">
              (Also in Settings → General. Active = in progress; Completed = done; Archived = read-only.)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Resources and Documentation */}
      <Card className="border border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold">Resources & Documentation</CardTitle>
          <CardDescription>
            Helpful resources to support your development journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 justify-start"
              onClick={() => router.push('/docs')}
            >
              <div className="flex items-start">
                <Book className="w-5 h-5 mr-3 mt-0.5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">G.R.I.P. Documentation</div>
                  <p className="text-sm text-text-secondary">
                    Comprehensive guide to G.R.I.P.&apos;s features and capabilities
                  </p>
                </div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 justify-start"
              onClick={() => router.push('/docs')}
            >
              <div className="flex items-start">
                <Book className="w-5 h-5 mr-3 mt-0.5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Development Best Practices</div>
                  <p className="text-sm text-text-secondary">
                    Tips and techniques for efficient development workflow
                  </p>
                </div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 justify-start"
              onClick={() => router.push(`/dashboard/projects/${projectId}/${project?.isSandbox ? 'sandbox-chat' : 'enhanced-chat'}`)}
            >
              <div className="flex items-start">
                <ClipboardIcon className="w-5 h-5 mr-3 mt-0.5 text-accent-blue" />
                <div className="text-left">
                  <div className="font-semibold">Develop with GRIP</div>
                  <p className="text-sm text-text-secondary">
                    Open Develop to chat with GRIP; plan and files are in Show Context
                  </p>
                </div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 justify-start"
              onClick={() => window.open('https://github.com/GRIP-organization/GRIP/issues/new', '_blank')}
            >
              <div className="flex items-start">
                <HelpCircle className="w-5 h-5 mr-3 mt-0.5 text-success" />
                <div className="text-left">
                  <div className="font-semibold">Get Support</div>
                  <p className="text-sm text-text-secondary">
                    Open a support ticket or report an issue
                  </p>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* View generated file content */}
      <Modal
        isOpen={!!viewingFile}
        onClose={() => setViewingFile(null)}
        title={viewingFile ? `${viewingFile.path ? `${viewingFile.path}/` : ''}${viewingFile.filename}` : ''}
        size="2xl"
      >
        {viewingFile && (
          <ScrollArea className="flex-1 min-h-0 rounded border border-border p-3 max-h-[70vh]">
            <pre className="text-xs whitespace-pre-wrap break-words font-mono">
              {viewingFile.content || '(empty)'}
            </pre>
          </ScrollArea>
        )}
      </Modal>
    </div>
  )
}
