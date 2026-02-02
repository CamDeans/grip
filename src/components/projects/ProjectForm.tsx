'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RepoSelector } from './RepoSelector'
import { Button } from '@/components/ui'

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

interface ProjectFormProps {
  owner?: string
  repo?: string
}

export function ProjectForm({ owner, repo }: ProjectFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    repository: owner && repo ? { owner, name: repo } : null,
    ideation: {
      goals: '',
      targetAudience: '',
      keyFeatures: '',
      technicalRequirements: ''
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // First create the project
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!projectResponse.ok) throw new Error('Failed to create project')
      const { project } = await projectResponse.json()

      // If there's a repository, trigger analysis
      if (formData.repository) {
        const analysisResponse = await fetch(`/api/projects/${project.id}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repository: formData.repository,
            ideation: formData.ideation
          })
        })

        if (!analysisResponse.ok) {
          console.error('Analysis failed but project was created')
        }
      }

      router.push(`/dashboard/projects/${project.id}`)
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label 
            htmlFor="project-title"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Project Title
          </label>
          <input
            id="project-title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="form-input"
            placeholder="Enter project title"
            aria-label="Project title"
            required
          />
        </div>

        <div>
          <label 
            htmlFor="project-description"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            Description
          </label>
          <textarea
            id="project-description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="form-input"
            rows={3}
            placeholder="Describe your project"
            aria-label="Project description"
            required
          />
        </div>

        <div>
          <label 
            htmlFor="github-repo"
            className="block text-sm font-medium text-text-secondary mb-1"
          >
            GitHub Repository
          </label>
          <RepoSelector
            id="github-repo"
            onSelect={(repo) => setFormData(prev => ({ ...prev, repository: repo }))}
          />
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">Project Context</h3>
          
          <div className="space-y-4">
            <div>
              <label 
                htmlFor="project-goals"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                Goals
              </label>
              <textarea
                id="project-goals"
                value={formData.ideation.goals}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  ideation: { ...prev.ideation, goals: e.target.value }
                }))}
                className="form-input"
                rows={2}
                placeholder="What are the main goals of this project?"
                aria-label="Project goals"
                required
              />
            </div>

            <div>
              <label 
                htmlFor="target-audience"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                Target Audience
              </label>
              <input
                id="target-audience"
                type="text"
                value={formData.ideation.targetAudience}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  ideation: { ...prev.ideation, targetAudience: e.target.value }
                }))}
                className="form-input"
                placeholder="Who is this project for?"
                aria-label="Target audience"
                required
              />
            </div>

            <div>
              <label 
                htmlFor="key-features"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                Key Features
              </label>
              <textarea
                id="key-features"
                value={formData.ideation.keyFeatures}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  ideation: { ...prev.ideation, keyFeatures: e.target.value }
                }))}
                className="form-input"
                rows={3}
                placeholder="List the main features of your project"
                aria-label="Key features"
                required
              />
            </div>

            <div>
              <label 
                htmlFor="technical-requirements"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                Technical Requirements
              </label>
              <textarea
                id="technical-requirements"
                value={formData.ideation.technicalRequirements}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  ideation: { ...prev.ideation, technicalRequirements: e.target.value }
                }))}
                className="form-input"
                rows={2}
                placeholder="Specify technical requirements and constraints"
                aria-label="Technical requirements"
                required
              />
            </div>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        isLoading={isLoading}
        className="w-full"
      >
        Create Project
      </Button>
    </form>
  )
}
