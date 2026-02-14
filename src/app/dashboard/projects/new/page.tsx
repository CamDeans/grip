'use client'

import { useState, useEffect } from 'react'
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
  ChevronUpIcon
} from '@heroicons/react/24/outline'

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

  // Validate form whenever data changes (repo required)
  useEffect(() => {
    const isValid = Boolean(
      formData.title.trim() &&
      formData.description.trim() &&
      formData.repository &&
      formData.ideation.goals.trim() &&
      formData.ideation.targetAudience.trim() &&
      formData.ideation.keyFeatures.trim() &&
      formData.ideation.technicalRequirements.trim()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) {
      toast({
        title: "Incomplete form",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      // Prepare the data with proper formatting
      const submissionData = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        repository: formData.repository ? {
          owner: formData.repository.owner.trim(),
          name: formData.repository.name.trim()
        } : null,
        ideation: {
          goals: formData.ideation.goals.trim(),
          targetAudience: formData.ideation.targetAudience.trim(),
          keyFeatures: formData.ideation.keyFeatures.trim(),
          technicalRequirements: formData.ideation.technicalRequirements.trim()
        }
      }

      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
        credentials: 'include'
      })

      const responseData = await projectResponse.json()

      if (!projectResponse.ok) {
        throw new Error(responseData.error || responseData.details || 'Failed to create project')
      }

      const { project } = responseData
      refreshTokenUsage()

      // Show toast notification for successful project creation
      toast({
        title: "Project created successfully",
        description: `'${project.title}' has been created.`,
      })

      if (project && formData.repository) {
        // Start repository analysis in the background
        toast({
          title: "Analysis started",
          description: "Repository analysis is running in the background.",
        })

        const analysisResponse = await fetch(`/api/projects/${project._id}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repository: formData.repository,
            ideation: formData.ideation
          }),
          credentials: 'include'
        })

        if (!analysisResponse.ok) {
          const analysisError = await analysisResponse.json()
          toast({
            title: "Analysis warning",
            description: "Repository analysis encountered some issues, but your project was created.",
            variant: "destructive"
          })
        } else {
          refreshTokenUsage()
        }
      }

      router.push(`/dashboard/projects/${project._id}`)
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
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project-title">Project Title</Label>
                  <Input
                    id="project-title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. My Recipe App"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="project-description">Description</Label>
                  <textarea
                    id="project-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="form-input mt-1 w-full"
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
                      aria-expanded={githubExplanationOpen ? 'true' : 'false'}
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
                    <strong>Full automation:</strong> After you create the project, G.R.I.P. runs analysis, generates the plan, and writes code for each file in one run. All files are built with code automatically. In Develop, code you get from chat is applied to the project and the build runs automatically—no manual save or run steps. Progress (phases and steps) syncs on the Overview tab.
                  </div>
                  <div className="mt-1">
                    <RepoSelector
                      projectTitle={formData.title}
                      projectDescription={formData.description}
                      onSelect={(repo) => setFormData(prev => ({ ...prev, repository: repo }))}
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
                    className="form-input mt-1 w-full"
                    rows={4}
                    placeholder="e.g. Help users save recipes and search by ingredient. Keep it simple so anyone can use it."
                    required
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
                    className="form-input mt-1 w-full"
                    rows={4}
                    placeholder="e.g. Home cooks who want to organize recipes. Non-technical users who need a simple interface."
                    required
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
                    className="form-input mt-1 w-full"
                    rows={4}
                    placeholder="e.g. Add and edit recipes. Search by name or ingredient. Save favorites. Print or share a recipe."
                    required
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
                    className="form-input mt-1 w-full"
                    rows={4}
                    placeholder="e.g. Must work on phones. Fast loading. Simple design. Or leave blank if you're not sure."
                    required
                  />
                </div>
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
                    disabled={isLoading || !isFormValid}
                    icon={isLoading ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <PlusIcon className="h-5 w-5" />}
                  >
                    {isLoading ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </form>

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
