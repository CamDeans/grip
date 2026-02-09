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
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>()
  const pathname = usePathname()
  const projectId = params?.id || ''
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Determine active tab (order: Overview → Repo → Plan → Develop → Preview → Settings)
  const isOverviewTab = pathname === `/dashboard/projects/${projectId}`
  const isRepoTab = pathname === `/dashboard/projects/${projectId}/repo`
  const isPlanningTab = pathname === `/dashboard/projects/${projectId}/planning`
  const isDevelopTab = pathname === `/dashboard/projects/${projectId}/enhanced-chat`
  const isPreviewTab = pathname === `/dashboard/projects/${projectId}/preview`
  const isSettingsTab = pathname === `/dashboard/projects/${projectId}/settings`

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

  // Then after all hooks are declared, add the guard
  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p>Project ID is missing or invalid</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={isLoading ? 'Loading...' : project?.title || 'Project'}
        description={isLoading ? 'Loading project details...' : project?.description || 'No description available'}
      />

      <p className="mb-4 text-sm text-text-secondary">
        GRIP is your AI partner for this project. Start in <strong>Develop</strong> to build with chat, or explore <strong>Repo</strong> and <strong>Plan</strong> first.
      </p>
      
      <div className="mb-6 border-b border-border-default">
        <Tabs defaultValue={isOverviewTab ? 'overview' : isRepoTab ? 'repo' : isPlanningTab ? 'planning' : isDevelopTab ? 'develop' : isPreviewTab ? 'preview' : 'settings'} className="w-full">
          <TabsList className="w-full justify-start flex-wrap gap-1">
            <Link href={`/dashboard/projects/${projectId}`} className="flex-1 min-w-0 max-w-[120px]">
              <TabsTrigger value="overview" className="w-full">Overview</TabsTrigger>
            </Link>
            <Link href={`/dashboard/projects/${projectId}/repo`} className="flex-1 min-w-0 max-w-[120px]">
              <TabsTrigger value="repo" className="w-full">Repo</TabsTrigger>
            </Link>
            <Link href={`/dashboard/projects/${projectId}/planning`} className="flex-1 min-w-0 max-w-[120px]">
              <TabsTrigger value="planning" className="w-full">Plan</TabsTrigger>
            </Link>
            <Link href={`/dashboard/projects/${projectId}/enhanced-chat`} className="flex-1 min-w-0 max-w-[120px]">
              <TabsTrigger value="develop" className="w-full">Develop</TabsTrigger>
            </Link>
            <Link href={`/dashboard/projects/${projectId}/preview`} className="flex-1 min-w-0 max-w-[120px]">
              <TabsTrigger value="preview" className="w-full">Preview</TabsTrigger>
            </Link>
            <Link href={`/dashboard/projects/${projectId}/settings`} className="flex-1 min-w-0 max-w-[120px]">
              <TabsTrigger value="settings" className="w-full">Settings</TabsTrigger>
            </Link>
          </TabsList>
        </Tabs>
      </div>

      <div className="pb-20 min-w-0 overflow-x-hidden w-full max-w-full">
        {children}
      </div>
    </div>
  )
} 