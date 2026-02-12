'use client'

import { useEffect, useState } from 'react'
import { ProjectCard } from './ProjectCard'
import { DashboardGrid } from '../dashboard/DashboardGrid'
import { useSession } from 'next-auth/react'

export interface Project {
  _id: string
  title: string
  description: string
  repository: {
    owner: string
    name: string
  }
  lastUpdated: string
  messageCount: number
  language?: string
  languageColor?: string
  status?: 'active' | 'completed' | 'archived'
  isSandbox?: boolean
}

const sampleProject = {
  _id: 'sample',
  title: 'Sample Project',
  description: 'A sample project to help you get started with G.R.I.P.',
  repository: {
    owner: 'example',
    name: 'sample-repo'
  },
  lastUpdated: new Date().toISOString(),
  messageCount: 0,
  language: 'TypeScript',
  languageColor: '#3178c6'
}

interface ProjectGridProps {
  columns?: 1 | 2 | 3 | 4
  projects?: Project[]
  onDelete?: (projectId: string) => void
}

export function ProjectGrid({ columns = 3, projects: projectsProp, onDelete }: ProjectGridProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(!projectsProp)
  const { data: session } = useSession()

  useEffect(() => {
    // If projects are passed directly, use them
    if (projectsProp) {
      setProjects(projectsProp)
      setIsLoading(false)
      return
    }

    // Otherwise fetch projects
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects')
        if (response.ok) {
          const data = await response.json()
          if (data.projects && data.projects.length > 0) {
            setProjects(data.projects)
          } else {
            setProjects([sampleProject])
          }
        } else {
          setProjects([sampleProject])
        }
      } catch (error) {
        console.error('Error fetching projects:', error)
        setProjects([sampleProject])
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user) {
      fetchProjects()
    }
  }, [session, projectsProp])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border-default bg-background-secondary">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-text-secondary">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardGrid columns={columns}>
      {projects.map((project) => (
        <ProjectCard key={project._id} {...project} isSandbox={project.isSandbox} onDelete={onDelete} />
      ))}
    </DashboardGrid>
  )
}
