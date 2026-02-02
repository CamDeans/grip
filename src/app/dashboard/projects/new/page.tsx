'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { RepoSelector } from '@/components/projects/RepoSelector'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { 
  PlusIcon, 
  ArrowPathIcon, 
  XMarkIcon,
  BookOpenIcon,
  UserGroupIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
  ArrowLeftIcon
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

  // Validate form whenever data changes
  useEffect(() => {
    const isValid = Boolean(
      formData.title.trim() &&
      formData.description.trim() &&
      formData.ideation.goals.trim() &&
      formData.ideation.targetAudience.trim() &&
      formData.ideation.keyFeatures.trim() &&
      formData.ideation.technicalRequirements.trim()
    )
    setIsFormValid(isValid)
  }, [formData])

  const handleNextStep = () => {
    // Validate first step fields
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields to continue.",
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
        description="Set up a new project with G.R.I.P."
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
              <h2 className="text-lg font-medium">Project Details</h2>
              <p className="text-sm text-text-secondary mt-1">Basic information about your project</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project-title">Project Title</Label>
                  <Input
                    id="project-title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter project title"
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
                    placeholder="Describe your project"
                    required
                  />
                </div>

                <div>
                  <Label>GitHub Repository</Label>
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
                  disabled={!formData.title.trim() || !formData.description.trim()}
                >
                  Continue
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="px-6 py-5 border-b border-border">
              <h2 className="text-lg font-medium">Project Context</h2>
              <p className="text-sm text-text-secondary mt-1">Help G.R.I.P. understand your project goals</p>
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
                  <textarea
                    id="project-goals"
                    value={formData.ideation.goals}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ideation: { ...prev.ideation, goals: e.target.value }
                    }))}
                    className="form-input mt-1 w-full"
                    rows={4}
                    placeholder="What are the main goals of this project?"
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
                  <textarea
                    id="target-audience"
                    value={formData.ideation.targetAudience}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ideation: { ...prev.ideation, targetAudience: e.target.value }
                    }))}
                    className="form-input mt-1 w-full"
                    rows={4}
                    placeholder="Who is this project for?"
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
                  <textarea
                    id="key-features"
                    value={formData.ideation.keyFeatures}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ideation: { ...prev.ideation, keyFeatures: e.target.value }
                    }))}
                    className="form-input mt-1 w-full"
                    rows={4}
                    placeholder="What are the main features?"
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
                  <textarea
                    id="technical-requirements"
                    value={formData.ideation.technicalRequirements}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ideation: { ...prev.ideation, technicalRequirements: e.target.value }
                    }))}
                    className="form-input mt-1 w-full"
                    rows={4}
                    placeholder="Specific technical requirements or constraints"
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
    </>
  )
}
