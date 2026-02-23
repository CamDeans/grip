'use client'

import { useEffect, useState } from 'react'
import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Project {
  _id: string
  title: string
  description: string
  repository?: { owner: string; name: string }
}

/** Tab order: Overview, Settings, Repo, Develop, Preview. All tabs always visible. Sandbox uses sandbox-chat for Develop. */
const STEP_CONFIG = [
  { id: 'overview', path: '', label: 'Overview', pathMatch: (base: string) => base === '' },
  { id: 'setup', path: '/settings', label: 'Settings', pathMatch: (base: string) => base === 'settings' },
  { id: 'repo', path: '/repo', label: 'Repos', pathMatch: (base: string) => base === 'repo' },
  { id: 'develop', path: '/enhanced-chat', label: 'Develop', pathMatch: (base: string) => base === 'enhanced-chat' || base === 'sandbox-chat' },
  { id: 'preview', path: '/preview', label: 'Preview', pathMatch: (base: string) => base === 'preview' },
] as const

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>()
  const pathname = usePathname()
  const projectId = params?.id || ''
  const [project, setProject] = useState<Project | null>(null)
  const [hasAnalysis, setHasAnalysis] = useState<boolean | null>(null)
  const [hasPlan, setHasPlan] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const basePath = `/dashboard/projects/${projectId}`
  const pathSuffix = pathname?.startsWith(basePath) ? pathname.slice(basePath.length).replace(/^\//, '') : ''
  const pathSegment = pathSuffix.split('/')[0] || ''

  const hasRepo = Boolean(project?.repository?.owner && project?.repository?.name)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        if (!response.ok) throw new Error('Failed to fetch project')
        const data = await response.json()
        setProject(data)
      } catch (error) {
        console.error('Error fetching project:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId || !project) return
    const planUrl = project.isSandbox 
      ? `/api/projects/${projectId}/legal-sandbox/plan`
      : `/api/projects/${projectId}/plan`
    Promise.all([
      fetch(`/api/projects/${projectId}/analysis/status`).then((r) => (r.ok ? r.json() : null)).then((d) => d?.hasAnalysis ?? d?.analysisCompleted ?? false).catch(() => false),
      fetch(planUrl).then((r) => r.json()).then((d) => !!d?.plan).catch(() => false),
    ]).then(([analysis, plan]) => {
      setHasAnalysis(!!analysis)
      setHasPlan(!!plan)
    })
  }, [projectId, project])

  // Which step is current (from pathname)
  const currentStepIndex = STEP_CONFIG.findIndex((s) => {
    if (s.id === 'overview') return pathSegment === ''
    if (s.id === 'setup') return pathSegment === 'settings'
    if (s.id === 'repo') return pathSegment === 'repo'
    if (s.id === 'develop') return pathSegment === 'enhanced-chat' || pathSegment === 'sandbox-chat'
    if (s.id === 'preview') return pathSegment === 'preview'
    return false
  })
  const currentStep = currentStepIndex >= 0 ? STEP_CONFIG[currentStepIndex] : STEP_CONFIG[0]

  // Next step = where user should go (depends on progress)
  const getNextStep = (): typeof STEP_CONFIG[number] | null => {
    if (currentStep.id === 'preview') return null
    if (currentStep.id === 'overview') {
      if (!hasRepo) return STEP_CONFIG[1] // Setup
      if (hasPlan === true) {
        // Use sandbox-chat for sandbox projects, enhanced-chat for main projects
        const developPath = project?.isSandbox ? '/sandbox-chat' : '/enhanced-chat'
        return { ...STEP_CONFIG[3], path: developPath }
      }
      return STEP_CONFIG[2] // Repo
    }
    if (currentStep.id === 'setup') return STEP_CONFIG[2] // Repo
    if (currentStep.id === 'repo') {
      // Use sandbox-chat for sandbox projects, enhanced-chat for main projects
      const developPath = project?.isSandbox ? '/sandbox-chat' : '/enhanced-chat'
      return { ...STEP_CONFIG[3], path: developPath }
    }
    if (currentStep.id === 'develop') return STEP_CONFIG[4] // Preview
    return null
  }
  const nextStep = getNextStep()

  // Always show all tabs: Overview, Setup (Settings), Repo, Develop, Preview
  const orderedVisible = [...STEP_CONFIG]

  if (!projectId) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p>Project ID is missing or invalid</p>
        </div>
      </div>
    )
  }

  const activeValue =
    pathSegment === '' ? 'overview' :
    pathSegment === 'settings' ? 'setup' :
    pathSegment === 'repo' ? 'repo' :
    (pathSegment === 'enhanced-chat' || pathSegment === 'sandbox-chat') ? 'develop' :
    pathSegment === 'preview' ? 'preview' : 'overview'

  return (
    <div>
      <PageHeader
        title={isLoading ? 'Loading...' : project?.title || 'Project'}
        description={isLoading ? 'Loading project...' : project?.description || 'No description'}
      />

      <p className="mb-4 text-sm text-text-secondary">
        You are here: <strong>{currentStep.label}</strong>
        {nextStep && (
          <> · Next: <Link href={`${basePath}${nextStep.path}`} className="text-primary hover:underline">{nextStep.label}</Link></>
        )}
      </p>

      <div className="mb-6 border-b border-border-default">
        <Tabs value={activeValue} className="w-full">
          <TabsList className="w-full justify-start flex-wrap gap-1">
            {orderedVisible.map((step) => {
              // Use sandbox-chat for sandbox projects, enhanced-chat for main projects
              const stepPath = step.id === 'develop' && project?.isSandbox
                ? '/sandbox-chat'
                : step.path
              return (
                <Link
                  key={step.id}
                  href={`${basePath}${stepPath}`}
                  className="flex-1 min-w-0 max-w-[120px]"
                >
                  <TabsTrigger value={step.id} className="w-full">
                    {step.label}
                  </TabsTrigger>
                </Link>
              )
            })}
          </TabsList>
        </Tabs>
      </div>

      <div className="pb-20 min-w-0 overflow-x-hidden w-full max-w-full">
        {children}
      </div>
    </div>
  )
}
