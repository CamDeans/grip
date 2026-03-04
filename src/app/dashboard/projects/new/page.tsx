'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { RepoSelector } from '@/components/projects/RepoSelector'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/Label'
import { refreshTokenUsage } from '@/lib/tokenRefresh'
import { toast } from '@/components/ui/use-toast'
import { 
  PlusIcon, 
  ArrowPathIcon, 
  BookOpenIcon,
  UserGroupIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
  ArrowLeftIcon,
  QuestionMarkCircleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChartBarIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  PhotoIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { Rocket } from 'lucide-react'

interface ProjectFormData {
  title: string
  description: string
  repository: {
    owner: string
    name: string
  } | null
  ideation: {
    goals: string
    targetAudience: string
    keyFeatures: string
    technicalRequirements: string
  }
}

export default function NewProjectPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFormValid, setIsFormValid] = useState(false)
  const [currentStep, setCurrentStep] = useState<'details' | 'context'>('details')
  const [githubExplanationOpen, setGithubExplanationOpen] = useState(false)
  const [alignmentModalOpen, setAlignmentModalOpen] = useState(false)
  const [alignmentLoading, setAlignmentLoading] = useState(false)
  const [alignmentResult, setAlignmentResult] = useState<{
    alignmentPercent: number
    message: string
    suggestedProceed: boolean
  } | null>(null)
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    repository: null,
    ideation: {
      goals: '',
      targetAudience: '',
      keyFeatures: '',
      technicalRequirements: ''
    }
  })
  /** Files selected on Step 2 (uploads); sent to project after create */
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([])
  const uploadInputRef = useRef<HTMLInputElement>(null)

  // Validate form: title, description, and repo required to create. Ideation can be partial—user can add more in Settings.
  useEffect(() => {
    const isValid = Boolean(
      formData.title.trim() &&
      formData.description.trim() &&
      formData.repository
    )
    setIsFormValid(isValid)
  }, [formData])

  const handleNextStep = () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in title and description.",
        variant: "destructive"
      })
      return
    }
    if (!formData.repository) {
      toast({
        title: "GitHub repository required",
        description: "Select a GitHub repo so GRIP can analyze it and use its structure and patterns. Use Generate Keywords and Search above.",
        variant: "destructive"
      })
      return
    }
    setCurrentStep('context')
  }

  const handlePrevStep = () => {
    setCurrentStep('details')
  }

  /** In-flight overlay active from first "Create Project" click until redirect or "Choose different repo". Prevents refresh/back during alignment + create. */
  const inFlightActive = alignmentLoading || alignmentModalOpen || isLoading

  /** Run alignment check, then show result in in-flight overlay. On "Proceed" we call doCreateProject. */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) {
      toast({
        title: "Missing required fields",
        description: "Please enter a title, description, and select a GitHub repository.",
        variant: "destructive"
      })
      return
    }

    setAlignmentLoading(true)
    setAlignmentResult(null)
    try {
      const alignRes = await fetch('/api/projects/align-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          ideation: {
            goals: formData.ideation.goals.trim(),
            targetAudience: formData.ideation.targetAudience.trim(),
            keyFeatures: formData.ideation.keyFeatures.trim(),
            technicalRequirements: formData.ideation.technicalRequirements.trim()
          },
          repository: formData.repository ? {
            owner: formData.repository.owner.trim(),
            name: formData.repository.name.trim()
          } : null
        }),
        credentials: 'include'
      })
      const alignData = await alignRes.json().catch(() => ({}))
      if (!alignRes.ok) {
        // On error, still allow proceed with neutral result
        setAlignmentResult({
          alignmentPercent: 65,
          message: alignData.error || 'Alignment check unavailable. You can proceed with the build.',
          suggestedProceed: true
        })
      } else {
        setAlignmentResult({
          alignmentPercent: alignData.alignmentPercent ?? 65,
          message: alignData.message ?? 'You can proceed with the build.',
          suggestedProceed: alignData.suggestedProceed !== false
        })
        refreshTokenUsage()
      }
      setAlignmentModalOpen(true)
    } catch (error) {
      setAlignmentResult({
        alignmentPercent: 65,
        message: 'Alignment check failed. You can still proceed with the build.',
        suggestedProceed: true
      })
      setAlignmentModalOpen(true)
    } finally {
      setAlignmentLoading(false)
    }
  }

  /** Actually create the project and redirect (called from alignment modal "Proceed with build"). */
  const doCreateProject = async () => {
    if (!isFormValid || !formData.repository) return
    setAlignmentModalOpen(false)
    // Show in-flight modal immediately so user sees GRIP is working and doesn't refresh or back out (better UX)
    setIsLoading(true)
    try {
      const submissionData = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        repository: {
          owner: formData.repository.owner.trim(),
          name: formData.repository.name.trim()
        },
        ideation: {
          goals: (formData.ideation?.goals ?? '').trim(),
          targetAudience: (formData.ideation?.targetAudience ?? '').trim(),
          keyFeatures: (formData.ideation?.keyFeatures ?? '').trim(),
          technicalRequirements: (formData.ideation?.technicalRequirements ?? '').trim()
        }
      }

      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
        credentials: 'include'
      })

      let responseData: { project?: { _id: string; title?: string }; error?: string; details?: string } = {}
      try {
        responseData = await projectResponse.json()
      } catch {
        // 504 or proxy errors often return HTML; avoid "Unexpected token" by not parsing as JSON
      }
      if (!projectResponse.ok) {
        const message =
          responseData.error || responseData.details ||
          (projectResponse.status === 504
            ? 'The request took too long. Please try again.'
            : projectResponse.statusText || 'Failed to create project')
        throw new Error(message)
      }

      const { project } = responseData
      refreshTokenUsage()

      toast({
        title: "Project created successfully",
        description: `'${project.title}' has been created. Opening Overview…`,
      })

      // Redirect immediately so the user sees the Overview and in-flight modal right away.
      // Analysis and uploads are handled by the Overview pipeline (or fired in background).
      router.push(`/dashboard/projects/${project._id}`)

      // Fire analysis in background via same pipeline as Overview (analysis/refresh → analysis/run).
      if (project) {
        fetch(`/api/projects/${project._id}/analysis/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }).catch(() => {})
      }
      if (pendingUploadFiles.length > 0) {
        const formDataUpload = new FormData()
        pendingUploadFiles.forEach((file) => formDataUpload.append('files', file))
        fetch(`/api/projects/${project._id}/uploads`, {
          method: 'POST',
          body: formDataUpload,
          credentials: 'include'
        })
          .then((uploadRes) => {
            if (uploadRes.ok) {
              toast({ title: 'Uploads added', description: `${pendingUploadFiles.length} file(s) will be used by GRIP in the plan and build.` })
            }
          })
          .catch(() => {})
        setPendingUploadFiles([])
      }
    } catch (error) {
      console.error('Error creating project:', error)
      toast({
        title: "Project creation failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Create New Project"
        description="Tell G.R.I.P. your idea in plain language. You’ll fill in two short steps; no coding or technical experience required."
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/projects')}
            icon={<ArrowLeftIcon className="h-5 w-5" />}
          >
            Cancel
          </Button>
        }
      />


      <form onSubmit={handleSubmit} className="space-y-6">
        {currentStep === 'details' ? (
          <Card>
            <div className="px-6 py-5 border-b border-border">
              <h2 className="text-lg font-medium">Step 1: Project Details</h2>
              <p className="text-sm text-text-secondary mt-1">Basic information and a GitHub repo so GRIP can analyze it and use its structure and patterns</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-5">
                <div>
                  <Label htmlFor="project-title">Project Title</Label>
                  <Input
                    id="project-title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. My Recipe App"
                    className="mt-1.5"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="project-description">Description</Label>
                  <textarea
                    id="project-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="form-input mt-1.5 w-full"
                    rows={3}
                    placeholder="In a sentence or two: what is this project? e.g. A simple app where users can save and search their favorite recipes."
                    required
                  />
                </div>

                <div>
                  <Label>GitHub Repository</Label>
                  <div className="mt-3 mb-2 rounded-md border border-border overflow-hidden">
                    <button
                      type="button"
                      id="github-explanation-heading"
                      onClick={() => setGithubExplanationOpen((prev) => !prev)}
                      className="w-full px-4 pt-4 pb-3 flex items-center justify-between gap-2 text-left text-xs hover:bg-muted/50 transition-colors"
                      {...(githubExplanationOpen ? { 'aria-expanded': 'true' as const } : { 'aria-expanded': 'false' as const })}
                      aria-controls="github-explanation-content"
                    >
                      <span className="font-medium text-text-primary">What is a GitHub repo and how do I find one?</span>
                      <span className="flex items-center gap-1 shrink-0 text-text-secondary">
                        {githubExplanationOpen ? 'Collapse' : 'Expand'}
                        {githubExplanationOpen ? (
                          <ChevronUpIcon className="h-4 w-4" aria-hidden />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" aria-hidden />
                        )}
                      </span>
                    </button>
                    <div
                      id="github-explanation-content"
                      role="region"
                      aria-labelledby="github-explanation-heading"
                      className={githubExplanationOpen ? 'px-4 pt-4 pb-3 text-xs text-text-secondary border-t border-border' : 'hidden'}
                    >
                      <p>
                        A <strong>repository</strong> (repo) is a code project on GitHub. A repo is <strong>required</strong>: G.R.I.P. analyzes it and uses its structure and patterns to guide your build. You can use any public repo—you don&apos;t need to own it. G.R.I.P. never copies code; it uses the repo as reference only. To find a repo: fill in title and description above, then <strong>Generate Keywords</strong> → pick a keyword or <strong>Use Keywords</strong> → <strong>Search</strong>, then select one from the list. More in the <Link href="/#faq" className="text-primary hover:underline">FAQ on the home page</Link>.
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 p-3 rounded-md bg-primary/10 border border-primary/20 text-sm text-text-primary">
                    <strong>Full automation:</strong> After you create the project, you land on the project <strong>Overview</strong>. An <strong>in-flight modal</strong> opens right away and runs the full pipeline: Preparing → Analysis (when a repo is linked) → Plan → File generation (code for every file) → Build. Stay on the Overview so you can see each stage; the modal only closes when the build succeeds or if something fails. Run this before using Develop so you don’t waste tokens. In Develop, code from chat is applied and the build runs automatically.                   </div>
                  <div className="mt-5">
                    <RepoSelector
                      projectTitle={formData.title}
                      projectDescription={formData.description}
                      onSelect={(repo) => setFormData(prev => ({ ...prev, repository: repo }))}
                      onConfirmAndContinue={(repo) => {
                        setFormData((prev) => ({ ...prev, repository: repo }))
                        setCurrentStep('context')
                      }}
                      id="repo-selector"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/projects')}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleNextStep}
                  disabled={!formData.title.trim() || !formData.description.trim() || !formData.repository}
                >
                  Continue
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="px-6 py-5 border-b border-border">
              <h2 className="text-lg font-medium">Step 2: Project Context</h2>
              <p className="text-sm text-text-secondary mt-1">Help G.R.I.P. understand your project goals so it can plan and build with you</p>
              <div className="mt-3 p-3 rounded-md bg-primary/10 border border-primary/20 flex gap-2">
                <CheckCircleIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-text-primary">
                  <strong>Tips:</strong> Plain language works for everyone (e.g. &quot;simple to-do list&quot;, &quot;works on phones&quot;). For higher-level or technical projects, you can add stack preferences, architecture notes, or acceptance criteria here—G.R.I.P. uses both simple and detailed input. You can add or change details later in chat or in <strong>Settings</strong>. More in the <Link href="/#faq" className="text-primary hover:underline">FAQ on the home page</Link>.
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <Label 
                    htmlFor="project-goals"
                    className="flex items-center"
                  >
                    <BookOpenIcon className="h-4 w-4 mr-2 text-primary" />
                    Goals
                  </Label>
                  <p className="text-xs text-text-secondary mt-0.5 mb-1">What do you want this project to achieve?</p>
                  <textarea
                    id="project-goals"
                    value={formData.ideation.goals}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ideation: { ...prev.ideation, goals: e.target.value }
                    }))}
                    className="form-input mt-1.5 w-full"
                    rows={4}
                    placeholder="e.g. Help users save recipes and search by ingredient. Keep it simple so anyone can use it."
                  />
                </div>

                <div>
                  <Label 
                    htmlFor="target-audience"
                    className="flex items-center"
                  >
                    <UserGroupIcon className="h-4 w-4 mr-2 text-primary" />
                    Target Audience
                  </Label>
                  <p className="text-xs text-text-secondary mt-0.5 mb-1">Who will use it?</p>
                  <textarea
                    id="target-audience"
                    value={formData.ideation.targetAudience}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ideation: { ...prev.ideation, targetAudience: e.target.value }
                    }))}
                    className="form-input mt-1.5 w-full"
                    rows={4}
                    placeholder="e.g. Home cooks who want to organize recipes. Non-technical users who need a simple interface."
                  />
                </div>

                <div>
                  <Label 
                    htmlFor="key-features"
                    className="flex items-center"
                  >
                    <SparklesIcon className="h-4 w-4 mr-2 text-primary" />
                    Key Features
                  </Label>
                  <p className="text-xs text-text-secondary mt-0.5 mb-1">What should it do? List the main things.</p>
                  <textarea
                    id="key-features"
                    value={formData.ideation.keyFeatures}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ideation: { ...prev.ideation, keyFeatures: e.target.value }
                    }))}
                    className="form-input mt-1.5 w-full"
                    rows={4}
                    placeholder="e.g. Add and edit recipes. Search by name or ingredient. Save favorites. Print or share a recipe."
                  />
                </div>

                <div>
                  <Label 
                    htmlFor="technical-requirements"
                    className="flex items-center"
                  >
                    <WrenchScrewdriverIcon className="h-4 w-4 mr-2 text-primary" />
                    Technical Requirements
                  </Label>
                  <p className="text-xs text-text-secondary mt-0.5 mb-1">Any must-haves? Use plain language or technical details (e.g. stack, architecture, performance)</p>
                  <textarea
                    id="technical-requirements"
                    value={formData.ideation.technicalRequirements}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ideation: { ...prev.ideation, technicalRequirements: e.target.value }
                    }))}
                    className="form-input mt-1.5 w-full"
                    rows={4}
                    placeholder="e.g. Must work on phones. Fast loading. Simple design. Optional—add later in Settings if needed."
                  />
                </div>
              </div>

              {/* Uploads (optional): logos, branding, reference docs — GRIP uses in plan and build */}
              <div className="border-t border-border pt-6 space-y-3">
                <Label className="flex items-center gap-2">
                  <ArrowUpTrayIcon className="h-4 w-4 text-primary" />
                  Uploads (optional)
                </Label>
                <p className="text-xs text-text-secondary">
                  Add logos, branding images, or reference docs. GRIP will use them in the plan and build—e.g. logo in the header, hero image, favicon, or copy from your docs. Images go to <code className="text-xs bg-muted px-1 rounded">public/</code>; docs to <code className="text-xs bg-muted px-1 rounded">docs/</code>. You can add more later on the project Overview.
                </p>
                <p className="text-xs text-text-muted">
                  Allowed: PNG, JPEG, GIF, WebP, ICO, BMP (images); PDF, TXT, MD (reference docs). Max 4MB per file.
                </p>
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,image/x-icon,image/bmp,.png,.jpg,.jpeg,.gif,.webp,.ico,.bmp,application/pdf,text/plain,text/markdown,.pdf,.txt,.md"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files
                    if (!files?.length) return
                    const allowed = Array.from(files).filter((f) => {
                      const n = f.name.toLowerCase()
                      const ok = /\.(png|jpe?g|gif|webp|ico|bmp|pdf|txt|md|markdown)$/i.test(n)
                      if (!ok) return false
                      return f.size <= 4 * 1024 * 1024
                    })
                    setPendingUploadFiles((prev) => [...prev, ...allowed])
                    e.target.value = ''
                  }}
                  aria-label="Choose images or reference documents"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => uploadInputRef.current?.click()}
                    icon={<ArrowUpTrayIcon className="h-4 w-4" />}
                  >
                    Choose images or docs
                  </Button>
                </div>
                {pendingUploadFiles.length > 0 && (
                  <ul className="space-y-1.5 text-sm">
                    {pendingUploadFiles.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded bg-muted/50 border border-border">
                        <span className="truncate min-w-0 flex items-center gap-2">
                          {/\.(png|jpe?g|gif|webp|ico|bmp)$/i.test(f.name) ? <PhotoIcon className="h-4 w-4 shrink-0 text-primary" /> : <DocumentTextIcon className="h-4 w-4 shrink-0 text-primary" />}
                          {f.name}
                        </span>
                        <span className="text-xs text-text-muted shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                        <button
                          type="button"
                          onClick={() => setPendingUploadFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="shrink-0 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${f.name}`}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  type="button"
                >
                  Back
                </Button>
                <div className="space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard/projects')}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    type="submit"
                    disabled={isLoading || alignmentLoading || !isFormValid}
                    icon={(isLoading || alignmentLoading) ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <PlusIcon className="h-5 w-5" />}
                  >
                    {alignmentLoading ? 'Checking alignment...' : isLoading ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </form>

      {/* Alignment content is now inside the in-flight overlay above (one continuous modal from repo confirm through create) */}

      {/* In-flight modal: show from first "Create Project" click (repo confirmation) through alignment and creation so user doesn't refresh or back out */}
      {inFlightActive && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-background/80 backdrop-blur-sm"
          role="dialog"
          aria-live="polite"
          aria-label={isLoading ? 'Creating project' : alignmentResult ? 'Project alignment' : 'Checking alignment'}
        >
          <div className="min-h-[100dvh] flex items-center justify-center p-4">
            <div className="flex flex-col items-center gap-5 rounded-xl border-2 border-primary/20 bg-card p-8 shadow-xl text-center w-[min(90vw,28rem)] shrink-0">
              {isLoading ? (
                <>
                  <Rocket className="h-14 w-14 text-primary shrink-0 animate-pulse" aria-hidden />
                  <p className="text-lg font-semibold text-foreground">Creating project</p>
                  <p className="text-xs font-medium text-primary/90">Setting up your project…</p>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ll be redirected to the Overview where the full pipeline runs (Analysis → Plan → Files → Build). Please don&apos;t refresh or go back.
                  </p>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden />
                    <span className="text-sm">Creating…</span>
                  </div>
                </>
              ) : alignmentResult ? (
                <>
                  <ChartBarIcon className="h-14 w-14 text-primary shrink-0" aria-hidden />
                  <p className="text-lg font-semibold text-foreground">Project & repo alignment</p>
                  <div className="flex flex-col gap-3 w-full">
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4 text-left">
                      <p className="text-2xl font-semibold text-foreground">{alignmentResult.alignmentPercent}%</p>
                      <p className="text-sm text-text-secondary">{alignmentResult.message}</p>
                    </div>
                    {alignmentResult.suggestedProceed ? (
                      <p className="text-sm text-text-secondary text-left">
                        Good to proceed. Click <strong>Proceed with build</strong> to create the project and start the automated build.
                      </p>
                    ) : (
                      <p className="text-sm text-amber-600 dark:text-amber-400 text-left">
                        Consider <strong>Choose different repo</strong> to find a repo that better matches your project goals.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center w-full">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAlignmentModalOpen(false)
                        setAlignmentResult(null)
                        setCurrentStep('details')
                      }}
                      icon={<ArrowLeftIcon className="h-5 w-5" />}
                    >
                      Choose different repo
                    </Button>
                    <Button
                      variant="default"
                      onClick={doCreateProject}
                      disabled={isLoading}
                      icon={isLoading ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <PlusIcon className="h-5 w-5" />}
                    >
                      {isLoading ? 'Creating...' : 'Proceed with build'}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Rocket className="h-14 w-14 text-primary shrink-0 animate-pulse" aria-hidden />
                  <p className="text-lg font-semibold text-foreground">Checking alignment</p>
                  <p className="text-xs font-medium text-primary/90">Comparing your project with the selected repo…</p>
                  <p className="text-sm text-muted-foreground">You&apos;ll see alignment results next. Please don&apos;t refresh or go back.</p>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden />
                    <span className="text-sm">Checking…</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FAQ — link to home page FAQ; only 2 short page-specific answers here */}
      <Card className="mt-8">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-medium flex items-center gap-2">
            <QuestionMarkCircleIcon className="h-5 w-5 text-primary shrink-0" />
            Questions?
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Full FAQ (GitHub repo reference, steps, plans) is on the <Link href="/#faq" className="text-primary hover:underline">home page</Link>. Here, two quick answers:
          </p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-text-primary">What happens after I create the project?</h3>
            <p className="text-sm text-text-secondary mt-1">
              You land on the project <strong>Overview</strong>. Open <strong>Develop</strong> to chat with G.R.I.P.; it will write code, create files, and guide you. You can preview in StackBlitz without installing anything.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-text-primary">Can I change my project details later?</h3>
            <p className="text-sm text-text-secondary mt-1">
              Yes. Use <strong>Settings</strong> to edit title, description, goals, audience, features, and technical requirements. You can also tell G.R.I.P. in chat about new goals or features and it will update the plan with you.
            </p>
          </div>
        </div>
      </Card>
    </>
  )
}
