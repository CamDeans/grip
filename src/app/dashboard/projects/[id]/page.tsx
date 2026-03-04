'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoadingState } from '@/components/ui/LoadingState'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { CheckCircle2, Code, Lightbulb, MessageSquare, PenTool, PuzzleIcon, ChevronRight, ChevronDown, Book, ArrowRight, Zap, ClipboardIcon, HelpCircle, Loader2, ExternalLink, FileCode, Terminal, Circle, ListChecks, FlaskConical, GitBranch, Shield, ArrowUpCircle, Plus, RefreshCw, Trash2, Rocket, Folder, Bug } from 'lucide-react'
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
  const [openBuildPhases, setOpenBuildPhases] = useState(false)
  const [openIdeation, setOpenIdeation] = useState(false)
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
  const [setupStep, setSetupStep] = useState<null | 'preparing' | 'analysis' | 'plan' | 'files' | 'build' | 'done'>(null)
  /** Stages GRIP has validated/confirmed (for autonomous guidance and user visibility) */
  const [confirmedStages, setConfirmedStages] = useState<Array<'preparing' | 'analysis' | 'plan' | 'files' | 'build'>>([])
  /** Live preview: folders and files as they are generated (streaming from files/generate) */
  const [buildPreviewItems, setBuildPreviewItems] = useState<Array<{ type: 'folder' | 'file'; path: string; name?: string; success?: boolean; error?: string; version?: number; templateId?: string }>>([])
  const [buildPreviewTotal, setBuildPreviewTotal] = useState(0)
  /** When file generation returns buildArtifactAlignment and !ok, show this so user can fix in Develop or rerun */
  const [buildArtifactAlignmentWarning, setBuildArtifactAlignmentWarning] = useState<string | null>(null)
  /** When build fails, keep modal open and show this so user can retry or fix; GRIP must not close until build succeeds or user dismisses */
  const [buildFailureMessage, setBuildFailureMessage] = useState<string | null>(null)
  /** Last build error lines for debugging area (when run-build returns success: false) */
  const [buildErrorsList, setBuildErrorsList] = useState<string[]>([])
  /** When true, show expanded debugging area (failed files + build errors) */
  const [debugAreaExpanded, setDebugAreaExpanded] = useState(false)
  /** When non-null, GRIP is autonomously retrying N failed files; user sees progress only, no error details */
  const [retryingFilesCount, setRetryingFilesCount] = useState<number | null>(null)
  /** When true, GRIP is in the build fix loop; user sees "Fixing build…" only, no raw error dump */
  const [buildFixInProgress, setBuildFixInProgress] = useState(false)
  /** Pre-run: token risk warning — user may run out; show modal and allow "Continue anyway" (mandatory concrete rule) */
  const [showPreRunTokenModal, setShowPreRunTokenModal] = useState(false)
  const [preRunTokenRiskPayload, setPreRunTokenRiskPayload] = useState<{
    atRisk: boolean
    remainingTokens: number
    estimatedNeeded: number
    fileCount: number
    tier: string
    message?: string
    upgradeSuggestions: Array<{ action: 'upgrade' | 'add_tokens'; targetTier?: string; label: string }>
  } | null>(null)
  /** Out-of-tokens during run: GRIP pauses and shows add/upgrade modal; user can resume when ready */
  const [tokenExhaustedPaused, setTokenExhaustedPaused] = useState(false)
  const [tokenExhaustedStep, setTokenExhaustedStep] = useState<'plan' | 'files' | 'build' | null>(null)
  const [tokenExhaustedPayload, setTokenExhaustedPayload] = useState<{
    message?: string
    code?: string
    tier?: string
    upgradeSuggestions?: Array<{ action: string; targetTier?: string; label: string }>
  } | null>(null)
  const [uploads, setUploads] = useState<Array<{ path: string; filename: string; size: number; purpose: string }>>([])
  const [loadingUploads, setLoadingUploads] = useState(false)
  const [uploading, setUploading] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const inFlightToastRef = useRef<HTMLDivElement>(null)
  const inFlightCardRef = useRef<HTMLDivElement>(null)
  /** Prevent duplicate run (e.g. Strict Mode or double effect); only one plan→files→build at a time */
  const runInProgressRef = useRef(false)
  /** Expose run with options so pre-run and token-exhausted modals can continue or resume */
  const runWithOptionsRef = useRef<(opts?: { skipTokenRiskCheck?: boolean; startFromStep?: 'plan' | 'files' | 'build' }) => void>(() => {})
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

  const uploadsEndpoint = project?.isSandbox
    ? `/api/projects/${projectId}/legal-sandbox/uploads`
    : `/api/projects/${projectId}/uploads`
  const refreshUploads = useCallback(() => {
    if (!projectId) return
    setLoadingUploads(true)
    fetch(uploadsEndpoint)
      .then((r) => r.ok ? r.json() : { uploads: [] })
      .then((data) => setUploads(Array.isArray(data.uploads) ? data.uploads : []))
      .catch(() => setUploads([]))
      .finally(() => setLoadingUploads(false))
  }, [projectId, uploadsEndpoint])
  useEffect(() => {
    if (projectId && project != null) refreshUploads()
  }, [projectId, project, refreshUploads])
  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length || !projectId) return
    setUploading(true)
    const form = new FormData()
    Array.from(files).forEach((f) => form.append('files', f))
    try {
      const res = await fetch(uploadsEndpoint, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Upload failed')
      }
      await refreshUploads()
      sonnerToast.success('Uploaded. GRIP will use these in the build.')
    } catch (err) {
      sonnerToast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
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
      fetch(planUrl).then((r) => r.json()).then((d) => !!d?.plan).catch(() => false),
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

  // Rerun trigger: when user clicks "Rerun plan and build phase automation" we run the full flow again (skip the "already complete" check)
  const [rerunTrigger, setRerunTrigger] = useState(0)
  const autoPlanRanRef = useRef<string | null>(null)

  // Auto-run plan + sync + build only when plan/phases are not already complete (saves tokens on revisit). Skip for sandbox.
  useEffect(() => {
    if (!projectId || project?.isSandbox || !project?.repository?.owner || !project?.repository?.name) return
    if (autoPlanRanRef.current === projectId && rerunTrigger === 0) return

    type RunOptions = { skipTokenRiskCheck?: boolean; startFromStep?: 'plan' | 'files' | 'build' }
    const run = async (options?: RunOptions) => {
      if (runInProgressRef.current) return
      runInProgressRef.current = true
      setTokenExhaustedPaused(false)
      setTokenExhaustedStep(null)
      setTokenExhaustedPayload(null)
      try {
        const startFromStep = options?.startFromStep
        const skipTokenRiskCheck = options?.skipTokenRiskCheck === true

        // Mandatory: pre-run token risk — warn user and allow "Continue anyway"; if at risk and not accepted, pause
        if (!skipTokenRiskCheck && !startFromStep) {
          try {
            const riskRes = await fetch(`/api/projects/${projectId}/build-token-risk`, { credentials: 'include' })
            if (riskRes.ok) {
              const riskData = await riskRes.json().catch(() => ({}))
              if (riskData.atRisk && riskData.remainingTokens != null) {
                setPreRunTokenRiskPayload({
                  atRisk: true,
                  remainingTokens: riskData.remainingTokens ?? 0,
                  estimatedNeeded: riskData.estimatedNeeded ?? 0,
                  fileCount: riskData.fileCount ?? 0,
                  tier: riskData.tier ?? 'starter',
                  message: riskData.message,
                  upgradeSuggestions: Array.isArray(riskData.upgradeSuggestions) ? riskData.upgradeSuggestions : [],
                })
                setShowPreRunTokenModal(true)
                runInProgressRef.current = false
                return
              }
            }
          } catch (_) { /* ignore; proceed with run */ }
        }

        // Show in-flight modal immediately so user sees GRIP is working (concrete: start on trigger, don't wait for API)
        setSetupStep('preparing')
        setBuildFailureMessage(null)
        setConfirmedStages([])

        // If not a forced rerun and not resuming from a step, check whether plan and build phases are already complete — skip to save tokens
        if (rerunTrigger === 0 && !startFromStep) {
          const [stateRes, planRes] = await Promise.all([
            fetch(`/api/projects/${projectId}/state`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
            fetch(`/api/projects/${projectId}/plan`).then((r) => r.json()).then((d) => !!d?.plan).catch(() => false),
          ])
          const hasPlanAlready = !!planRes
          const hasPhasesAlready = !!(stateRes?.phases?.length)
          if (hasPlanAlready && hasPhasesAlready) {
            // No POST /plan or /files/generate — Anthropic is not called for this project load
            if (typeof console !== 'undefined' && console.info) {
              console.info('[GRIP Overview] Skipping plan + file automation (plan and phases already exist). No Anthropic API calls will be made. Use "Rerun plan and build" to run again.')
            }
            autoPlanRanRef.current = projectId
            setHasPlan(true)
            setProjectState(stateRes && (stateRes.phases?.length || stateRes.currentPhase) ? stateRes : null)
            setSetupStep(null)
            return
          }
        }
        autoPlanRanRef.current = projectId
        if (rerunTrigger > 0) setRerunTrigger(0)

        // When resuming from 'files' or 'build', skip preparing + analysis + plan
        if (startFromStep !== 'files' && startFromStep !== 'build') {
        // Stage 1: preparing — brief delay (modal already shown at start of run())
        await new Promise((resolve) => setTimeout(resolve, 1800))
        setConfirmedStages((prev) => (prev.includes('preparing') ? prev : [...prev, 'preparing']))
        sonnerToast.success('GRIP confirmed: Preparing complete', {
          description: 'Context loaded. Starting repository analysis.',
        })

        // Stage 2: analysis — do not advance to plan until analysis has completed successfully
        if (!hasAnalysis) {
          setSetupStep('analysis')
          const ANALYSIS_REFRESH_TIMEOUT_MS = 120_000 // 2 min so clone + tree-sitter can finish; avoid indefinite hang
          const ac = new AbortController()
          const timeoutId = setTimeout(() => ac.abort(), ANALYSIS_REFRESH_TIMEOUT_MS)
          let refreshRes: Response
          try {
            refreshRes = await fetch(`/api/projects/${projectId}/analysis/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: ac.signal,
            })
          } catch (fetchErr) {
            clearTimeout(timeoutId)
            const isTimeout = fetchErr instanceof Error && (fetchErr.name === 'AbortError' || fetchErr.message?.includes('abort'))
            console.warn('[GRIP Overview] Stage 2 (analysis) fetch failed:', fetchErr)
            if (isTimeout) {
              sonnerToast.error('Analysis is taking longer than expected', {
                description: 'Repository analysis timed out. Try again, or run analysis from the Repo tab. Large repos can take 1–2 minutes.',
              })
            } else {
              sonnerToast.error('Analysis failed', {
                description: fetchErr instanceof Error ? fetchErr.message : 'Network or server error. Try again or run analysis from the Repo tab.',
              })
            }
            setSetupStep(null)
            return
          }
          clearTimeout(timeoutId)
          if (!refreshRes.ok) {
            const errBody = await refreshRes.text().catch(() => '')
            let errData: { code?: string; message?: string; tier?: string; upgradeSuggestions?: Array<{ action: string; targetTier?: string; label: string }> } = {}
            try { errData = JSON.parse(errBody) } catch { /* ignore */ }
            if (refreshRes.status === 403 && errData?.code === 'TOKENS_EXHAUSTED') {
              setTokenExhaustedPaused(true)
              setTokenExhaustedStep('plan')
              setTokenExhaustedPayload({ message: errData.message, code: errData.code, tier: errData.tier, upgradeSuggestions: errData.upgradeSuggestions })
              runInProgressRef.current = false
              return
            }
            console.warn('[GRIP Overview] Stage 2 (analysis) failed: analysis/refresh returned', refreshRes.status, errBody)
            sonnerToast.error('Analysis failed', {
              description: refreshRes.status === 504 ? 'Server timed out. Try again or run analysis from the Repo tab.' : errBody || refreshRes.statusText,
            })
            setSetupStep(null)
            return
          }
          const analysisPollSeconds = 150 // run route maxDuration is 120s; poll long enough for it to finish
          let analysisDone = false
          for (let i = 0; i < analysisPollSeconds && !analysisDone; i++) {
            const r = await fetch(`/api/projects/${projectId}/analysis/status`)
            const d = r.ok ? await r.json().catch(() => ({})) : {}
            if (d?.hasAnalysis ?? d?.analysisCompleted) {
              setHasAnalysis(true)
              analysisDone = true
            } else {
              await new Promise((resolve) => setTimeout(resolve, 1000))
            }
          }
          if (!analysisDone) {
            console.warn(`[GRIP Overview] Stage 2 (analysis) did not complete within ${analysisPollSeconds}s. Stopping; do not advance to plan.`)
            sonnerToast.warning('Analysis did not finish in time', {
              description: `No result after ${analysisPollSeconds}s. Refresh the page to check status, or run analysis from the Repo tab.`,
            })
            setSetupStep(null)
            return
          }
          setConfirmedStages((prev) => (prev.includes('analysis') ? prev : [...prev, 'analysis']))
          sonnerToast.success('GRIP confirmed: Analysis complete', {
            description: 'Repository analyzed. Proceeding to plan.',
          })
        }

        // Stage 3: plan — do not advance to files until plan + sync-state both return success
        if (hasAnalysis) {
          setConfirmedStages((prev) => {
            const next = [...prev]
            if (!next.includes('preparing')) next.push('preparing')
            if (!next.includes('analysis')) next.push('analysis')
            return next
          })
        }
        setSetupStep('plan')
        const planPostRes = await fetch(`/api/projects/${projectId}/plan`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        if (!planPostRes.ok) {
          const errBody = await planPostRes.text()
          let errData: { code?: string; message?: string; tier?: string; upgradeSuggestions?: Array<{ action: string; targetTier?: string; label: string }> } = {}
          try { errData = JSON.parse(errBody) } catch { /* ignore */ }
          if (planPostRes.status === 403 && errData?.code === 'TOKENS_EXHAUSTED') {
            setTokenExhaustedPaused(true)
            setTokenExhaustedStep('plan')
            setTokenExhaustedPayload({ message: errData.message, code: errData.code, tier: errData.tier, upgradeSuggestions: errData.upgradeSuggestions })
            runInProgressRef.current = false
            return
          }
          console.warn('[GRIP Overview] Plan POST failed:', planPostRes.status, errBody || planPostRes.statusText, '— Anthropic plan phase was not run. Check server logs and ANTHROPIC_API_KEY.')
          setSetupStep(null)
          return
        }
        refreshTokenUsage()
        const syncRes = await fetch(`/api/projects/${projectId}/plan/sync-state`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        if (!syncRes.ok) {
          console.warn('[GRIP Overview] Stage 3 (plan) sync-state failed:', syncRes.status)
          setSetupStep(null)
          return
        }
        setConfirmedStages((prev) => (prev.includes('plan') ? prev : [...prev, 'plan']))
        sonnerToast.success('GRIP confirmed: Plan ready', {
          description: 'Development plan and phases set. Generating files.',
        })
        } // end: startFromStep !== 'files' && !== 'build'

        // Stage 4: files — do not advance to build until files/generate returns 200 and stream sends 'done'
        if (startFromStep !== 'build') {
        setSetupStep('files')
        setBuildPreviewItems([])
        setBuildPreviewTotal(0)
        // Set total from same source as files/generate so the modal shows the real count (e.g. 98 not a lower number)
        try {
          const countRes = await fetch(`/api/projects/${projectId}/files/to-generate-count`, { credentials: 'include' })
          if (countRes.ok) {
            const { count } = await countRes.json().catch(() => ({}))
            if (typeof count === 'number' && count > 0) setBuildPreviewTotal(count)
          }
        } catch (_) { /* ignore */ }
        const filesRes = await fetch(`/api/projects/${projectId}/files/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Stream-Progress': 'true' },
          body: JSON.stringify({})
        })
        if (!filesRes.ok) {
          const errBody = await filesRes.text()
          let errData: { code?: string; message?: string; tier?: string; upgradeSuggestions?: Array<{ action: string; targetTier?: string; label: string }> } = {}
          try { errData = JSON.parse(errBody) } catch { /* ignore */ }
          if (filesRes.status === 403 && errData?.code === 'TOKENS_EXHAUSTED') {
            setTokenExhaustedPaused(true)
            setTokenExhaustedStep('files')
            setTokenExhaustedPayload({ message: errData.message, code: errData.code, tier: errData.tier, upgradeSuggestions: errData.upgradeSuggestions })
            runInProgressRef.current = false
            return
          }
          console.warn('[GRIP Overview] Stage 4 (files) failed: files/generate returned', filesRes.status, errBody?.slice(0, 200))
          setSetupStep(null)
          return
        }
        let fileCount = 0
        let stage4Done = false
        let stage4ErrorCount = 0
        /** Paths that failed in this run; used for autonomous retry (user never sees raw errors) */
        let failedPathsFromStream: string[] = []
        if (filesRes.body) {
          const reader = filesRes.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() ?? ''
              for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed) continue
                try {
                  const event = JSON.parse(trimmed) as {
                    type: string
                    total?: number
                    path?: string
                    name?: string
                    success?: boolean
                    error?: string
                    successCount?: number
                    errorCount?: number
                    generatedFiles?: Array<{ success?: boolean; path?: string; name?: string }>
                    tokenUsage?: { tokenAllowance: number; tokensUsedThisPeriod: number }
                    buildArtifactAlignment?: { ok: boolean; errors?: string[]; suggestions?: string[]; missingDeps?: string[] }
                  }
                  if (event.type === 'start' && typeof event.total === 'number') {
                    setBuildPreviewTotal((prev) => Math.max(prev, event.total!))
                  } else                   if (event.type === 'folder' && event.path) {
                    setBuildPreviewItems((prev) => [...prev, { type: 'folder', path: event.path! }])
                  } else if (event.type === 'file' && event.path) {
                    const version = (event as { version?: number }).version
                    const templateId = (event as { templateId?: string }).templateId
                    setBuildPreviewItems((prev) => {
                      const rest = prev.filter((x) => !(x.type === 'file' && x.path === event.path))
                      return [...rest, { type: 'file' as const, path: event.path!, name: event.name, success: event.success, error: event.error, version, templateId }]
                    })
                  } else if (event.type === 'done') {
                    stage4Done = true
                    fileCount = event.successCount ?? event.generatedFiles?.filter((f) => f.success).length ?? 0
                    stage4ErrorCount = event.errorCount ?? event.generatedFiles?.filter((f) => !f.success).length ?? 0
                    failedPathsFromStream = (event.generatedFiles || [])
                      .filter((f) => !f.success)
                      .map((f) => {
                        const p = String(f.path ?? '').trim()
                        const n = String(f.name ?? '').trim()
                        if (!p && !n) return ''
                        if (p && n && !p.endsWith(n)) return p.replace(/\/$/, '') + '/' + n
                        return p || n
                      })
                      .filter(Boolean)
                    if (event.tokenUsage) refreshTokenUsage(event.tokenUsage)
                    if (event.buildArtifactAlignment && !event.buildArtifactAlignment.ok) {
                      const msg = event.buildArtifactAlignment.errors?.length
                        ? event.buildArtifactAlignment.errors.join(' ')
                        : 'Package.json may not match generated code (e.g. missing deps or script mismatch).'
                      setBuildArtifactAlignmentWarning(msg)
                    }
                  } else if (event.type === 'error') {
                    throw new Error((event as { error?: string }).error ?? 'File generation failed')
                  }
                } catch (parseErr) {
                  if (parseErr instanceof Error && parseErr.message.includes('File generation')) throw parseErr
                  // ignore JSON parse or other line errors
                }
              }
            }
          } finally {
            reader.releaseLock()
          }
        } else {
          const filesData = await filesRes.json().catch(() => ({}))
          stage4Done = true
          fileCount = filesData.skipped ? (filesData.fileCount ?? 0) : (filesData.successCount ?? filesData.generatedFiles?.filter((f: { success?: boolean }) => f.success).length ?? 0)
          stage4ErrorCount = filesData.errorCount ?? (filesData.generatedFiles?.filter((f: { success?: boolean }) => !f.success).length ?? 0)
          const genFiles = (filesData.generatedFiles || []) as Array<{ success?: boolean; path?: string; name?: string }>
          failedPathsFromStream = genFiles
            .filter((f) => !f.success)
            .map((f) => {
              const p = String(f.path ?? '').trim()
              const n = String(f.name ?? '').trim()
              if (!p && !n) return ''
              if (p && n && !p.endsWith(n)) return p.replace(/\/$/, '') + '/' + n
              return p || n
            })
            .filter(Boolean)
          if (filesData.tokenUsage) refreshTokenUsage(filesData.tokenUsage)
        }
        if (!stage4Done) {
          console.warn('[GRIP Overview] Stage 4 (files) stream ended without done event. Stopping; do not advance to build.')
          setSetupStep(null)
          return
        }
        // Mandatory: when any file failed, GRIP autonomously retries (user sees progress only, no error details).
        const MAX_FILE_RETRY_ATTEMPTS = 3
        let pathsToRetry = failedPathsFromStream
        if (stage4ErrorCount > 0 && pathsToRetry.length > 0) {
          setSetupStep('files')
          for (let attempt = 1; attempt <= MAX_FILE_RETRY_ATTEMPTS; attempt++) {
            setRetryingFilesCount(pathsToRetry.length)
            sonnerToast.info('GRIP is fixing ' + pathsToRetry.length + ' file(s)…', {
              description: 'Updating code to meet mandatory rules. No action needed.',
            })
            const retryRes = await fetch(`/api/projects/${projectId}/files/retry-failed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paths: pathsToRetry }),
            })
            if (!retryRes.ok && retryRes.status === 403) {
              const retryErrBody = await retryRes.text().catch(() => '')
              let retryErrData: { code?: string; message?: string; tier?: string; upgradeSuggestions?: Array<{ action: string; targetTier?: string; label: string }> } = {}
              try { retryErrData = JSON.parse(retryErrBody) } catch { /* ignore */ }
              if (retryErrData?.code === 'TOKENS_EXHAUSTED') {
                setTokenExhaustedPaused(true)
                setTokenExhaustedStep('files')
                setTokenExhaustedPayload({ message: retryErrData.message, code: retryErrData.code, tier: retryErrData.tier, upgradeSuggestions: retryErrData.upgradeSuggestions })
                runInProgressRef.current = false
                return
              }
            }
            const retryData = await retryRes.json().catch(() => ({ successCount: 0, errorCount: pathsToRetry.length, results: [] as Array<{ path: string; success: boolean; error?: string }> }))
            const results = (retryData.results || []) as Array<{ path: string; success: boolean; error?: string }>
            setBuildPreviewItems((prev) =>
              prev.map((item) => {
                if (item.type !== 'file' || !item.path) return item
                const r = results.find((x) => x.path === item.path)
                if (!r) return item
                return { ...item, success: r.success, error: r.error }
              })
            )
            if (retryData.errorCount === 0) {
              stage4ErrorCount = 0
              fileCount += retryData.successCount
              setRetryingFilesCount(null)
              break
            }
            pathsToRetry = results.filter((r) => !r.success).map((r) => r.path)
            if (pathsToRetry.length === 0) {
              stage4ErrorCount = 0
              setRetryingFilesCount(null)
              break
            }
          }
          setRetryingFilesCount(null)
          if (stage4ErrorCount > 0) {
            console.warn('[GRIP Overview] Stage 4: still', pathsToRetry.length, 'failed after', MAX_FILE_RETRY_ATTEMPTS, 'retries.')
            setDebugAreaExpanded(true)
            sonnerToast.warning('GRIP couldn\'t complete ' + pathsToRetry.length + ' file(s).', {
              description: 'You can dismiss or rerun plan and build.',
            })
            refreshTokenUsage()
            return
          }
        }
        setConfirmedStages((prev) => (prev.includes('files') ? prev : [...prev, 'files']))
        sonnerToast.success('GRIP confirmed: Files generated', {
          description: `${fileCount} file(s) created. Running build.`,
        })
        refreshTokenUsage()
        const state = await fetch(`/api/projects/${projectId}/state`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
        setProjectState(state && (state.phases?.length || state.currentPhase) ? state : null)
        setHasPlan(true)
        } // end: startFromStep !== 'build'

        // Stage 5: build — do not advance to done until run-build returns success (mandatory: GRIP autonomously fixes and re-runs until clean build)
        const MAX_BUILD_FIX_ATTEMPTS = (await import('@/lib/constants/overviewBuild')).MAX_BUILD_FIX_ATTEMPTS
        setSetupStep('build')
        setBuildFailureMessage(null)
        let buildSucceeded = false
        let lastBuildData: { success?: boolean; errors?: string[]; output?: string } = {}
        for (let attempt = 1; attempt <= MAX_BUILD_FIX_ATTEMPTS && !buildSucceeded; attempt++) {
          const buildRes = await fetch(`/api/projects/${projectId}/run-build`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
          if (!buildRes.ok) {
            const buildErrBody = await buildRes.text().catch(() => '')
            let buildErrData: { code?: string; message?: string; tier?: string; upgradeSuggestions?: Array<{ action: string; targetTier?: string; label: string }> } = {}
            try { buildErrData = JSON.parse(buildErrBody) } catch { /* ignore */ }
            if (buildRes.status === 403 && buildErrData?.code === 'TOKENS_EXHAUSTED') {
              setTokenExhaustedPaused(true)
              setTokenExhaustedStep('build')
              setTokenExhaustedPayload({ message: buildErrData.message, code: buildErrData.code, tier: buildErrData.tier, upgradeSuggestions: buildErrData.upgradeSuggestions })
              runInProgressRef.current = false
              return
            }
            console.warn('[GRIP Overview] Stage 5 (build) failed: run-build returned', buildRes.status)
            setSetupStep(null)
            return
          }
          const buildData = await buildRes.json().catch(() => ({ success: false, errors: ['Build response invalid'] }))
          lastBuildData = buildData
          const errLines = Array.isArray(buildData.errors) ? buildData.errors : (buildData.output ? [buildData.output] : [])
          setBuildErrorsList(errLines)
          if (buildData.success) {
            buildSucceeded = true
            setBuildErrorsList([])
            setBuildFixInProgress(false)
            break
          }
          // Build failed: autonomously fix and retry (mandatory — user sees progress only, no raw errors)
          if (attempt < MAX_BUILD_FIX_ATTEMPTS) {
            setBuildFixInProgress(true)
            setBuildFailureMessage(`Fixing build… (attempt ${attempt} of ${MAX_BUILD_FIX_ATTEMPTS})`)
            const fixResRaw = await fetch(`/api/projects/${projectId}/fix-build`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ errors: buildData.errors ?? [], output: buildData.output ?? '' }),
            })
            if (!fixResRaw.ok && fixResRaw.status === 403) {
              const fixErrBody = await fixResRaw.text().catch(() => '')
              let fixErrData: { code?: string; message?: string; tier?: string; upgradeSuggestions?: Array<{ action: string; targetTier?: string; label: string }> } = {}
              try { fixErrData = JSON.parse(fixErrBody) } catch { /* ignore */ }
              if (fixErrData?.code === 'TOKENS_EXHAUSTED') {
                setTokenExhaustedPaused(true)
                setTokenExhaustedStep('build')
                setTokenExhaustedPayload({ message: fixErrData.message, code: fixErrData.code, tier: fixErrData.tier, upgradeSuggestions: fixErrData.upgradeSuggestions })
                runInProgressRef.current = false
                return
              }
            }
            const fixRes = fixResRaw.ok ? await fixResRaw.json().catch(() => ({})) : {}
            if (!fixRes.fixed) {
              console.warn('[GRIP Overview] fix-build could not fix', fixRes.error)
              setBuildFixInProgress(false)
              setBuildFailureMessage('Build failed. GRIP could not auto-fix this attempt.')
              setBuildErrorsList(errLines)
              sonnerToast.error('Build failed', { description: 'GRIP tried to fix. You can dismiss or fix in Develop.' })
              return
            }
            // Fixed; loop will run build again (user sees only "Fixing build…", no error dump)
            continue
          }
        }
        setBuildFixInProgress(false)
        if (!buildSucceeded) {
          const errLines = (lastBuildData.errors as string[] | undefined) ?? []
          setBuildErrorsList(errLines)
          const errText = errLines.join('\n').slice(0, 500)
          const isSandboxEnv = /sbx_user|ENOENT.*mkdir|\/home\/sbx_/i.test(errText)
          const message = isSandboxEnv
            ? 'Build failed after auto-fix attempts. StackBlitz/sandbox can fail—try Export to GitHub and run locally.'
            : 'Build failed after auto-fix attempts. You can dismiss or fix in Develop.'
          setBuildFailureMessage(message)
          sonnerToast.error('Build failed', { description: message })
          return
        }
        setConfirmedStages((prev) => (prev.includes('build') ? prev : [...prev, 'build']))
        sonnerToast.success('GRIP confirmed: Build successful', {
          description: 'Project builds cleanly. Automation complete.',
        })
        setBuildFailureMessage(null)
        setSetupStep('done')
        refetchPhaseStatus()
        refreshGeneratedFiles()
        refreshTokenUsage()
        sonnerToast.success(
          'Automation complete',
          {
            description: fileCount > 0 ? `Phases, ${fileCount} file(s), and build finished. Go to Develop or Preview.` : 'Plan and build finished. Go to Develop or Preview.',
          }
        )
      } catch {
        autoPlanRanRef.current = null
        setSetupStep(null)
      } finally {
        runInProgressRef.current = false
      }
    }
    runWithOptionsRef.current = run
    run()
  }, [projectId, project?.repository?.owner, project?.repository?.name, hasAnalysis, rerunTrigger])

  // Clear build preview, alignment warning, and confirmed stages when modal is dismissed so next run shows fresh state
  useEffect(() => {
    if (setupStep === null) {
      setBuildPreviewItems([])
      setBuildPreviewTotal(0)
      setBuildArtifactAlignmentWarning(null)
      setBuildFailureMessage(null)
      setBuildErrorsList([])
      setDebugAreaExpanded(false)
      setConfirmedStages([])
      setRetryingFilesCount(null)
      setBuildFixInProgress(false)
      setTokenExhaustedPaused(false)
      setTokenExhaustedStep(null)
      setTokenExhaustedPayload(null)
    }
  }, [setupStep])

  const failedFileItems = buildPreviewItems.filter((x): x is typeof x & { error?: string } => x.type === 'file' && x.success === false)
  const hasFileErrors = failedFileItems.length > 0
  const hasBuildErrors = buildErrorsList.length > 0
  /** Hide error details when GRIP is autonomously fixing (user sees progress only) */
  const showDebugArea = (hasFileErrors || hasBuildErrors) && retryingFilesCount === null && !buildFixInProgress

  // Keep in-flight toast in view: allow scroll inside overlay, bring card into view when toast appears
  useEffect(() => {
    if (setupStep != null) {
      document.body.style.overflow = 'hidden'
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
      // After paint, scroll the overlay so the toast card is in view (handles zoom / small viewport)
      const t = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          inFlightCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
        })
      })
      return () => {
        cancelAnimationFrame(t)
        document.body.style.overflow = ''
      }
    }
    document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [setupStep])

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

  const setupStepLabel =
    setupStep === 'preparing'
      ? 'Preparing your project…'
      : setupStep === 'analysis'
        ? 'Analyzing repository…'
        : setupStep === 'plan'
          ? 'Generating plan…'
          : setupStep === 'files'
            ? 'Generating files…'
            : setupStep === 'build'
              ? (buildFailureMessage ? 'Build failed' : 'Running build…')
              : setupStep === 'done'
                ? 'Automation completed'
                : ''

  const setupStepStage =
    setupStep === 'preparing' ? 1
      : setupStep === 'analysis' ? 2
        : setupStep === 'plan' ? 3
          : setupStep === 'files' ? 4
            : setupStep === 'build' ? 5
              : setupStep === 'done' ? 6 : 0
  const setupStepDetail =
    setupStep === 'preparing'
      ? 'Initializing automation and loading your repository context.'
      : setupStep === 'analysis'
        ? 'Scanning repo structure, entrypoints, and patterns to guide the build.'
        : setupStep === 'plan'
          ? 'Creating development phases and tasks from your ideation and repo.'
          : setupStep === 'files'
            ? 'Generating code for each file in the plan; build runs next.'
              : setupStep === 'build'
              ? (buildFailureMessage ? 'Fix errors below or in Develop, then retry. GRIP stays here until build succeeds or you close.' : 'Running npm install and npm run build to validate the project.')
              : ''

  return (
    <div className="space-y-8">
      {/* Pre-run token risk: mandatory — warn user and allow "Continue anyway" so GRIP can build; if they run out mid-build, show add/upgrade modal and resume */}
      {showPreRunTokenModal && preRunTokenRiskPayload && (
        <Modal
          isOpen={true}
          onClose={() => { setShowPreRunTokenModal(false); setPreRunTokenRiskPayload(null) }}
          title="Token usage notice"
        >
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {preRunTokenRiskPayload.message ?? 'This build may use more tokens than you have left. You may run out and need to add tokens or upgrade to complete the build.'}
            </p>
            <p className="text-sm text-muted-foreground">
              You have <strong>{preRunTokenRiskPayload.remainingTokens.toLocaleString()}</strong> tokens remaining (estimated need: {preRunTokenRiskPayload.estimatedNeeded.toLocaleString()} for plan + {preRunTokenRiskPayload.fileCount} files + build). GRIP will continue and loop until the build is done; if you run out, GRIP will pause and show an option to add tokens or upgrade, then resume when ready.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={() => {
                  setShowPreRunTokenModal(false)
                  setPreRunTokenRiskPayload(null)
                  runWithOptionsRef.current?.({ skipTokenRiskCheck: true })
                }}
              >
                Continue anyway
              </Button>
              <Button variant="outline" asChild>
                <Link href="/plans">Add tokens / Upgrade</Link>
              </Button>
              {preRunTokenRiskPayload.upgradeSuggestions?.slice(0, 2).map((s, i) => (
                <Button key={i} variant="outline" size="sm" asChild>
                  <Link href={s.action === 'add_tokens' ? '/plans' : '/plans'}>{s.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Out-of-tokens during run: GRIP pauses; user adds tokens or upgrades, then clicks "Resume when ready" (above in-flight overlay) */}
      {tokenExhaustedPaused && tokenExhaustedStep && (
        <div className="relative z-[60]">
        <Modal
          isOpen={true}
          onClose={() => {}}
          title="Out of tokens — add more or upgrade"
        >
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {tokenExhaustedPayload?.message ?? "You've run out of tokens for this period. GRIP has paused. Add more tokens or upgrade to continue; then click Resume and GRIP will continue from where it stopped."}
            </p>
            <p className="text-sm text-muted-foreground">
              GRIP will resume from the <strong>{tokenExhaustedStep}</strong> step when you're ready.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                onClick={async () => {
                  setTokenExhaustedPaused(false)
                  setTokenExhaustedPayload(null)
                  const step = tokenExhaustedStep
                  setTokenExhaustedStep(null)
                  refreshTokenUsage()
                  runWithOptionsRef.current?.({ skipTokenRiskCheck: true, startFromStep: step })
                }}
              >
                Resume when ready
              </Button>
              <Button variant="outline" asChild>
                <Link href="/plans">Add tokens / Upgrade</Link>
              </Button>
              {tokenExhaustedPayload?.upgradeSuggestions?.slice(0, 2).map((s, i) => (
                <Button key={i} variant="outline" size="sm" asChild>
                  <Link href="/plans">{s.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        </Modal>
        </div>
      )}

      {/* In-flight toast: stay within viewport on all screen sizes; flex/wrap and horizontal + vertical scroll when needed */}
      {setupStep != null && (
        <div
          ref={inFlightToastRef}
          className="fixed inset-0 z-50 overflow-auto max-h-[100dvh] max-w-[100vw] bg-background/80 backdrop-blur-sm overscroll-contain"
          role="dialog"
          aria-live="polite"
          aria-label="Build automation in progress"
        >
          <div className="flex min-h-full min-w-0 max-w-full items-center justify-center p-4">
            <div
              ref={inFlightCardRef}
              className="flex flex-col items-center gap-5 rounded-xl border-2 border-primary/20 bg-card p-6 sm:p-8 shadow-xl text-center w-full max-w-[min(90vw,28rem)] min-w-0 max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-auto shrink-0"
            >
            {setupStep === 'done' ? (
              <>
                <CheckCircle2 className="h-14 w-14 text-success" aria-hidden />
                <p className="text-xl font-semibold text-foreground">Automation completed</p>
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-success font-medium" role="status">
                  {['Preparing', 'Analysis', 'Plan', 'Files', 'Build', 'Done'].map((label, i) => (
                    <span key={label}>{i + 1}. {label} ✓</span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  The automated build process is complete. You can now move to <strong>Develop</strong> or <strong>Preview</strong>.
                </p>
                {buildArtifactAlignmentWarning && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-3 py-2 rounded-md w-full text-left">
                    {buildArtifactAlignmentWarning} Fix in Develop or rerun automation.
                  </p>
                )}
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <Button
                    variant="default"
                    onClick={() => {
                      setSetupStep(null)
                      router.push(`/dashboard/projects/${projectId}/enhanced-chat`)
                    }}
                  >
                    Develop
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSetupStep(null)
                      router.push(`/dashboard/projects/${projectId}/preview`)
                    }}
                  >
                    Preview
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSetupStep(null)}>
                    Dismiss
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Rocket className="h-14 w-14 text-primary shrink-0 animate-pulse" aria-hidden />
                <p className="text-lg font-semibold text-foreground">{setupStepLabel}</p>
                <p className="text-xs font-medium text-primary/90">
                  Stage {setupStepStage} of 6 · Build automation
                </p>
                {/* Step progress: GRIP confirmations so user and context stay in order */}
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground" role="status" aria-label="Automation step progress">
                  {(['preparing', 'analysis', 'plan', 'files', 'build'] as const).map((stage, i) => {
                    const confirmed = confirmedStages.includes(stage)
                    const isCurrent = setupStep === stage
                    const label = stage === 'preparing' ? 'Prepare' : stage === 'analysis' ? 'Analysis' : stage === 'plan' ? 'Plan' : stage === 'files' ? 'Files' : 'Build'
                    return (
                      <span key={stage} className={confirmed ? 'text-success font-medium' : isCurrent ? 'text-primary font-medium' : ''}>
                        {i + 1}. {label} {confirmed ? '✓' : isCurrent ? '…' : '·'}
                      </span>
                    )
                  })}
                  <span className={setupStep === 'done' ? 'text-success font-medium' : ''}>6. Done{setupStep === 'done' ? ' ✓' : ''}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {setupStepDetail}
                </p>
                {setupStep === 'build' && buildFailureMessage && (
                  <div className="w-full text-left space-y-2">
                    <p className="text-xs font-medium text-destructive">
                      {buildFailureMessage.startsWith('Fixing build') ? buildFailureMessage : 'Build error (GRIP could not fix after retries):'}
                    </p>
                    {!buildFailureMessage.startsWith('Fixing build') && (
                      <pre className="text-xs bg-muted rounded p-2 max-h-24 overflow-y-auto overflow-x-auto whitespace-pre-wrap break-words">
                        {buildFailureMessage}
                      </pre>
                    )}
                    {!buildFailureMessage.startsWith('Fixing build') && (
                      <div className="flex flex-wrap gap-2 justify-center pt-1">
                        <Button variant="outline" size="sm" onClick={() => { setSetupStep(null); setBuildFailureMessage(null) }}>
                          Close and fix in Develop
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {/* Build preview: view the build through GRIP's eyes (folders + files as they're generated); horizontal + vertical scroll so user can read long paths */}
                {(setupStep === 'files' || setupStep === 'build' || setupStep === 'done' || buildPreviewItems.length > 0) && (
                  <div className="w-full text-left border border-border rounded-lg bg-muted/30 overflow-hidden">
                    <p className="text-xs font-semibold text-muted-foreground px-3 py-2 border-b border-border">
                      Build preview
                    </p>
                    <div className="h-[min(12rem,40vh)] w-full overflow-auto overflow-x-auto overflow-y-auto">
                      <ul className="p-2 space-y-0.5 font-mono text-xs min-w-max">
                        {buildPreviewItems.length === 0 && setupStep === 'files' && (
                          <li className="text-muted-foreground py-1">Preparing file list…</li>
                        )}
                        {buildPreviewItems.map((item, i) => (
                          <li key={`${item.type}-${item.path}-${i}`} className="flex items-center gap-2 py-0.5">
                            {item.type === 'folder' ? (
                              <>
                                <Folder className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                                <span className="text-muted-foreground whitespace-nowrap">{item.path}</span>
                              </>
                            ) : (
                              <>
                                <FileCode className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                                <span className="flex-1 min-w-0 whitespace-nowrap" title={item.path}>{item.path}</span>
                                {item.success === true && (
                                  <span className="shrink-0 text-success flex items-center gap-1.5" aria-label="Success">
                                    <span>✓</span>
                                    {item.version != null && item.version > 1 && (
                                      <span className="text-muted-foreground font-normal" title="Updated version">v{item.version}</span>
                                    )}
                                    {item.version === 1 && <span className="text-muted-foreground font-normal" title="Created">new</span>}
                                    {item.templateId && (
                                      <span className="text-muted-foreground/80 font-normal truncate max-w-[6rem]" title={`Template: ${item.templateId}`}>
                                        {item.templateId}
                                      </span>
                                    )}
                                  </span>
                                )}
                                {item.success === false && (
                                  <span className="shrink-0 text-destructive flex items-center gap-1" title={item.error} aria-label="Error">
                                    <span>✗</span>
                                    {item.templateId && <span className="text-muted-foreground/80 truncate max-w-[5rem]">{item.templateId}</span>}
                                  </span>
                                )}
                              </>
                            )}
                          </li>
                        ))}
                        {buildPreviewTotal > 0 && buildPreviewItems.filter((x) => x.type === 'file').length > 0 && setupStep === 'files' && (
                          <li className="text-muted-foreground py-1">
                            {buildPreviewItems.filter((x) => x.type === 'file').length} of {buildPreviewTotal} files…
                          </li>
                        )}
                        {setupStep === 'done' && (() => {
                          const failed = buildPreviewItems.filter((x) => x.type === 'file' && x.success === false)
                          return failed.length > 0 ? (
                            <li className="text-destructive/90 text-xs py-2 px-2 border-t border-border mt-1">
                              {failed.length} file(s) failed. Hover ✗ on each for the error. Fix in Develop or rerun automation.
                            </li>
                          ) : null
                        })()}
                      </ul>
                    </div>
                  </div>
                )}
                {/* Debug / errors area: failed file creation + build errors for easier tracking */}
                {showDebugArea && (setupStep === 'files' || setupStep === 'build' || setupStep === 'done') && (
                  <div className="w-full text-left border border-destructive/30 rounded-lg bg-destructive/5 overflow-hidden mt-2">
                    <button
                      type="button"
                      onClick={() => setDebugAreaExpanded((e) => !e)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-destructive/10 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Bug className="h-4 w-4 text-destructive" aria-hidden />
                        Debug / errors
                        {hasFileErrors && (
                          <span className="text-destructive text-xs font-normal">
                            {failedFileItems.length} file(s) failed
                          </span>
                        )}
                        {hasBuildErrors && (
                          <span className="text-destructive text-xs font-normal">
                            {buildErrorsList.length} build error(s)
                          </span>
                        )}
                      </span>
                      <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${debugAreaExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {debugAreaExpanded && (
                      <div className="border-t border-destructive/20 px-3 py-2 space-y-3 text-xs font-mono max-h-[14rem] overflow-auto">
                        {hasFileErrors && (
                          <div>
                            <p className="font-semibold text-destructive mb-1">File creation errors (fix or retry before build)</p>
                            <ul className="space-y-1 list-none">
                              {failedFileItems.map((item, i) => (
                                <li key={`failed-${item.path}-${i}`} className="text-muted-foreground">
                                  <span className="text-foreground break-all">{item.path}</span>
                                  {item.error && <span className="block text-destructive mt-0.5 pl-2 border-l-2 border-destructive/50">{item.error}</span>}
                                </li>
                              ))}
                            </ul>
                            {failedFileItems.some((item) => (item.path || '').includes('layout.tsx')) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={async () => {
                                  const layoutPaths = failedFileItems.map((item) => item.path).filter((p): p is string => !!p && p.includes('layout.tsx'))
                                  if (!layoutPaths.length || !projectId) return
                                  try {
                                    const res = await fetch(`/api/projects/${projectId}/files/retry-failed`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ paths: layoutPaths }),
                                    })
                                    const data = await res.json().catch(() => ({}))
                                    const results = (data.results || []) as Array<{ path: string; success: boolean }>
                                    setBuildPreviewItems((prev) =>
                                      prev.map((item) => {
                                        if (item.type !== 'file' || !item.path) return item
                                        const r = results.find((x) => x.path === item.path)
                                        if (!r?.success) return item
                                        return { ...item, success: true, error: undefined }
                                      })
                                    )
                                    if (results.some((r) => r.success)) sonnerToast.success('Layout fixed. You can run build now.')
                                  } catch {
                                    sonnerToast.error('Could not fix layout.')
                                  }
                                }}
                              >
                                Fix layout (use default)
                              </Button>
                            )}
                          </div>
                        )}
                        {hasBuildErrors && (
                          <div>
                            <p className="font-semibold text-destructive mb-1">Build errors</p>
                            <ul className="space-y-0.5 list-none text-muted-foreground whitespace-pre-wrap break-words">
                              {buildErrorsList.slice(0, 25).map((line, i) => (
                                <li key={`build-err-${i}`}>{line}</li>
                              ))}
                              {buildErrorsList.length > 25 && (
                                <li className="text-muted-foreground/80">… and {buildErrorsList.length - 25} more</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {setupStep === 'files' && retryingFilesCount !== null && (
                  <p className="text-xs text-muted-foreground mt-2 px-1">
                    GRIP is fixing {retryingFilesCount} file(s)… No action needed.
                  </p>
                )}
                {setupStep === 'files' && hasFileErrors && retryingFilesCount === null && (
                  <p className="text-xs text-muted-foreground mt-2 px-1">
                    GRIP couldn&apos;t complete some files after retries. You can dismiss or rerun plan and build.
                  </p>
                )}
              </>
            )}
            </div>
          </div>
        </div>
      )}
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
            Set ideation and link a repo below. <strong>Analysis runs when you create the project or link a repo.</strong> When you open this Overview, GRIP runs <strong>plan → file generation → build</strong> here first (so you don&apos;t waste tokens in chat). After that, use Develop for fixes and next steps. This checklist shows what&apos;s ready.
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
                <span className="font-medium">3. Analysis</span> — GRIP analyzes the repo when you create the project or link a repo (or from Repo tab). Ensures GRIP understands the codebase before plan and file generation.
                {!stepsComplete[2] && (
                  <Link href={`/dashboard/projects/${projectId}/repo`} className="ml-1 text-primary hover:underline text-sm">Run analysis from Repo</Link>
                )}
              </div>
            </li>
            <li className="flex items-start gap-3">
              {stepsComplete[3] ? <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />}
              <div>
                <span className="font-medium">4. Plan</span> — Development plan (phases and tasks) is created on <strong>Overview</strong> when you have a linked repo—plan and file generation run here before you use Develop.
                {!stepsComplete[3] && (
                  <span className="text-sm text-muted-foreground">Plan is created automatically when you link a repo.</span>
                )}
              </div>
            </li>
            <li className="flex items-start gap-3">
              {stepsComplete[4] ? <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />}
              <div>
                <span className="font-medium">5. Build progress</span> — After Overview runs plan → file generation → build, phases and steps below update as GRIP saves files and runs the build (in Develop). Open Develop only after plan and files are ready to avoid wasting tokens.
                {!stepsComplete[4] && (
                  <span className="text-sm text-text-muted ml-1">Phases appear automatically once a plan exists (after linking a repo).</span>
                )}
              </div>
            </li>
          </ol>
          {!project?.isSandbox && hasPlan === true && (projectState?.phases?.length ?? 0) > 0 && (
            <div className="pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSetupStep('preparing')
                  setRerunTrigger((t) => t + 1)
                }}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Rerun plan and build phase automation
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Run analysis, plan generation, file generation, and build again. Use when you want to regenerate the full scope (uses tokens).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Build phases — start chat with GRIP from here (collapsible, default collapsed) */}
      <Card id="phases" className="border border-border scroll-mt-4">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setOpenBuildPhases((o) => !o)}
              className="flex flex-wrap items-center justify-between gap-2 w-full text-left rounded-md hover:bg-muted/50 -mx-2 px-2 py-1"
            >
              <div className="flex items-center gap-2">
                {openBuildPhases ? <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />}
                <div>
                  <CardTitle className="text-xl font-bold">Build phases</CardTitle>
                  <CardDescription>
                    Current phase and steps. Progress updates automatically as GRIP saves files and runs the build in Develop—no need to return here to confirm. Start or continue chat to build.
                  </CardDescription>
                </div>
              </div>
            </button>
            {openBuildPhases && !project?.isSandbox && projectState?.phases?.length ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
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
        {openBuildPhases && (
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
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/dashboard/projects/${projectId}/${project?.isSandbox ? 'sandbox-chat' : 'enhanced-chat'}?implementCurrentPhase=1`} className="shrink-0">
                  <Button className="w-full sm:w-auto" size="lg">
                    <Zap className="w-4 h-4 mr-2" />
                    Implement current phase in Develop
                  </Button>
                </Link>
                <Link href={`/dashboard/projects/${projectId}/${project?.isSandbox ? 'sandbox-chat' : 'enhanced-chat'}`} className="shrink-0">
                  <Button variant="outline" className="w-full sm:w-auto" size="lg">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {allPreChatStepsComplete ? 'Start chat with GRIP' : 'Continue with GRIP'}
                  </Button>
                </Link>
              </div>
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
                  <p>Complete setup on <strong>Overview</strong> first. Plan and file generation run here (automatically when you have a linked repo)—not in Develop. That way GRIP has full context and you don&apos;t waste tokens. After plan and files are ready, use Develop to fix errors or add features.</p>
                  <p className="text-xs text-text-muted mt-2">Link a repo in Settings, then stay on Overview so GRIP can run analysis → plan → file generation → build. When that finishes, &quot;Go to Develop&quot; will appear above.</p>
                </>
              )}
            </div>
          )}
        </CardContent>
        )}
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
            Use the tabs in order: <strong>Settings</strong> (ideation, repo link) → <strong>Overview</strong> (plan + file generation + build run here first—do this before Develop to avoid wasting tokens) → <strong>Develop</strong> (chat for fixes and next steps; code applies and build runs automatically) → <strong>Preview</strong>. Progress syncs here as GRIP saves files and runs the build.
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
                Use the tabs to jump to Settings, Repo, Develop, or Preview. Build progress (phases and steps) syncs automatically as GRIP saves files and runs the build—no need to return here to confirm.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Project Ideation Summary (collapsible, default collapsed) */}
      <Card className="border border-border">
        <CardHeader className="pb-4">
          <button
            type="button"
            onClick={() => setOpenIdeation((o) => !o)}
            className="flex items-center gap-2 w-full text-left rounded-md hover:bg-muted/50 -mx-2 px-2 py-1"
          >
            {openIdeation ? <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />}
            <div>
              <CardTitle className="text-2xl font-bold">Project Ideation</CardTitle>
              <CardDescription>
                A summary of your project goals and requirements
              </CardDescription>
            </div>
          </button>
        </CardHeader>
        {openIdeation && (
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
        )}
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

      {/* Your uploads: images and reference docs for GRIP to use in the plan, build, and chat */}
      <Card id="your-uploads" className="border border-primary/20 bg-primary/5 scroll-mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-primary" />
            Your uploads
          </CardTitle>
          <CardDescription>
            Add logos, branding, hero images, favicons, or reference docs (specs, copy, PDFs). GRIP uses them in the plan, file generation, and Develop chat—image paths in code, docs for requirements or copy. You can add uploads during project creation (Step 2) or here. All uploads are included in GRIP context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/x-icon,image/bmp,.png,.jpg,.jpeg,.gif,.webp,.ico,.bmp,application/pdf,text/plain,text/markdown,.pdf,.txt,.md"
              multiple
              className="hidden"
              onChange={handleUploadFiles}
              aria-label="Upload images or reference documents for GRIP"
            />
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={uploading}
              onClick={() => uploadInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <ArrowUpCircle className="h-4 w-4 mr-1.5" />}
              {uploading ? 'Uploading...' : 'Choose images or docs'}
            </Button>
            <Button variant="outline" size="sm" disabled={loadingUploads} onClick={refreshUploads}>
              {loadingUploads ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <span className="text-xs text-text-muted">Images → public/; docs → docs/. Max 4MB per file.</span>
          </div>
          {loadingUploads ? (
            <p className="text-sm text-text-secondary">Loading uploads...</p>
          ) : uploads.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No uploads yet. Add logos, branding, or reference docs above; GRIP will use them in the plan, build, and Develop chat.
            </p>
          ) : (
            <ul className="space-y-2">
              {uploads.map((u, i) => (
                <li key={`${u.path}/${u.filename}-${i}`} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/50 last:border-0 text-sm">
                  <span className="truncate min-w-0">
                    {u.path ? `${u.path}/` : ''}{u.filename}
                  </span>
                  <span className="text-xs text-text-muted shrink-0">
                    {u.purpose === 'image' ? 'Image' : 'Doc'} · {Math.round((u.size || 0) / 1024 * 10) / 10} KB
                  </span>
                </li>
              ))}
            </ul>
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
