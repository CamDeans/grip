'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState } from '@/components/ui/LoadingState'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { CheckCircle2, Code, Lightbulb, MessageSquare, PenTool, PuzzleIcon, ChevronRight, Book, ArrowRight, Zap, ClipboardIcon, HelpCircle, Loader2, ExternalLink, FileCode, Terminal, Circle, ListChecks } from 'lucide-react'
import { toast as sonnerToast } from 'sonner'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { ScrollArea } from '@/components/ui/scroll-area'

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

  const refreshGeneratedFiles = () => {
    if (!projectId) return
    setLoadingFiles(true)
    fetch(`/api/project-files?projectId=${projectId}&limit=100`)
      .then(async (r) => {
        if (!r.ok) return []
        const data = await r.json()
        return Array.isArray(data) ? data : []
      })
      .then((list: Array<{ id: string; path: string; filename: string; size?: number; content?: string; language?: string }>) => setGeneratedFiles(list))
      .catch(() => setGeneratedFiles([]))
      .finally(() => setLoadingFiles(false))
  }

  useEffect(() => {
    if (!projectId) return
    refreshGeneratedFiles()
  }, [projectId])

  // Fetch project state (phases), analysis status, and plan for Get started + Phases
  useEffect(() => {
    if (!projectId) return
    const stateUrl = `/api/projects/${projectId}/state`
    const analysisUrl = `/api/projects/${projectId}/analysis/status`
    const planUrl = `/api/projects/${projectId}/plan`
    Promise.all([
      fetch(stateUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(analysisUrl).then((r) => (r.ok ? r.json() : null)).then((d) => d?.hasAnalysis ?? d?.analysisCompleted ?? false).catch(() => false),
      fetch(planUrl).then((r) => r.ok).catch(() => false),
    ]).then(([state, analysis, plan]) => {
      setProjectState(state && (state.phases?.length || state.currentPhase) ? state : null)
      setHasAnalysis(!!analysis)
      setHasPlan(!!plan)
    })
  }, [projectId])

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

  return (
    <div className="space-y-8">
      {/* Next step: Start chat with GRIP — show when plan or phases exist so user always sees what to do */}
      {readyForDevelop && (
        <Card className="border-2 border-primary bg-primary/10">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-primary">Your next step: Start building with GRIP</h2>
                <p className="text-sm text-text-secondary mt-1">
                  You’ve completed planning. Open <strong>Develop</strong> to chat with GRIP and implement your phases step by step.
                </p>
                <p className="text-xs text-text-muted mt-2 border-l-2 border-primary/50 pl-3">
                  <strong>Before you go:</strong> GRIP works only on the current phase. When that phase is done, GRIP will route you back to this Overview page for next steps and realignment so you and GRIP stay in sync. Then you can start the next phase from here.
                </p>
              </div>
              <Link href={`/dashboard/projects/${projectId}/enhanced-chat`} className="shrink-0">
                <Button size="lg" className="w-full sm:w-auto">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Go to Develop (chat with GRIP)
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Get started: follow these steps first so GRIP has full context */}
      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />
            Get started: follow these steps
          </CardTitle>
          <CardDescription>
            Complete each step in order so GRIP is equipped with all data before chat and code generation. Then review the build phases and start chat with GRIP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              {stepsComplete[0] ? <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />}
              <div>
                <span className="font-medium">1. Ideation</span> — Define goals, audience, features, and technical requirements (set when you created the project or in Settings).
                {!stepsComplete[0] && (
                  <Link href={`/dashboard/projects/${projectId}/settings`} className="ml-1 text-primary hover:underline text-sm">Complete in Settings</Link>
                )}
              </div>
            </li>
            <li className="flex items-start gap-3">
              {stepsComplete[1] ? <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />}
              <div>
                <span className="font-medium">2. Repo</span> — Select and link a GitHub repository.
                {!stepsComplete[1] && (
                  <Link href={`/dashboard/projects/${projectId}/repo`} className="ml-1 text-primary hover:underline text-sm">Select repo</Link>
                )}
              </div>
            </li>
            <li className="flex items-start gap-3">
              {stepsComplete[2] ? <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />}
              <div>
                <span className="font-medium">3. Analysis</span> — Run analysis on the repo so GRIP understands the codebase.
                {!stepsComplete[2] && (
                  <Link href={`/dashboard/projects/${projectId}/repo`} className="ml-1 text-primary hover:underline text-sm">Run analysis from Repo</Link>
                )}
              </div>
            </li>
            <li className="flex items-start gap-3">
              {stepsComplete[3] ? <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />}
              <div>
                <span className="font-medium">4. Plan</span> — Generate a development plan (phases and tasks).
                {!stepsComplete[3] && (
                  <Link href={`/dashboard/projects/${projectId}/planning`} className="ml-1 text-primary hover:underline text-sm">Generate plan in Planning</Link>
                )}
              </div>
            </li>
            <li className="flex items-start gap-3">
              {stepsComplete[4] ? <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />}
              <div>
                <span className="font-medium">5. Review phases</span> — Review the build phases below. When ready, start chat with GRIP; GRIP will use the current phase as the starting point.
                {!stepsComplete[4] && (
                  <span className="text-sm text-text-muted ml-1">Generate a plan first, then sync phases from Planning if needed.</span>
                )}
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Build phases — start chat with GRIP from here */}
      <Card id="phases" className="border border-border scroll-mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">Build phases</CardTitle>
          <CardDescription>
            Current phase and steps. When you and GRIP agree a phase is done, return here to confirm and begin the next phase. Then start chat to continue.
          </CardDescription>
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
                GRIP works only on the current phase. When the phase is complete, GRIP will route you back to this Overview page for next steps and realignment; then you can start the next phase from here so you and GRIP stay in sync.
              </p>
              <Link href={`/dashboard/projects/${projectId}/enhanced-chat`}>
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
                  <p>Plan and files are ready. Go to <strong>Develop</strong> to build with GRIP. Phases will sync as you work.</p>
                  <p className="text-xs text-text-muted border-l-2 border-primary/50 pl-3">
                    GRIP works only on the current phase and will always route you back to this Overview page for next steps and realignment before the next phase.
                  </p>
                  <Link href={`/dashboard/projects/${projectId}/enhanced-chat`}>
                    <Button size="lg">Go to Develop (chat with GRIP)</Button>
                  </Link>
                </>
              ) : (
                <>
                  <p>No phases yet. Generate a plan in <Link href={`/dashboard/projects/${projectId}/planning`} className="text-primary hover:underline">Planning</Link>, then return here. Sync build steps in Planning if needed so phases appear.</p>
                  <Link href={`/dashboard/projects/${projectId}/enhanced-chat`}>
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
            Use the tabs above to move through the flow: <strong>Setup</strong> → <strong>Repo</strong> → <strong>Plan</strong> → <strong>Develop</strong> → <strong>Preview</strong>. Chat and task progress are saved.
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
                Use the tabs at the top to go where you need to go. After you and GRIP finish a phase, return here to confirm and start the next phase.
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
                Files created by GRIP (e.g. from Plan → Generate files). Code in chat is stored in chat history only; these are files saved to the project.
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
              No generated files yet. Generate files from the <Link href={`/dashboard/projects/${projectId}/planning`} className="text-primary hover:underline">Plan</Link> tab, or get code from <Link href={`/dashboard/projects/${projectId}/enhanced-chat`} className="text-primary hover:underline">Develop</Link> (code in chat is in message history).
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
              onClick={() => router.push(`/dashboard/projects/${projectId}/planning`)}
            >
              <div className="flex items-start">
                <ClipboardIcon className="w-5 h-5 mr-3 mt-0.5 text-accent-blue" />
                <div className="text-left">
                  <div className="font-semibold">Project Planning Tools</div>
                  <p className="text-sm text-text-secondary">
                    Access planning tools and templates for your project
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
