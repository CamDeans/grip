'use client'

import { useEffect, useState } from 'react'
import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Info } from 'lucide-react'

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

  // Determine active tab
  const isOverviewTab = pathname === `/dashboard/projects/${projectId}`
  const isChatTab = pathname === `/dashboard/projects/${projectId}/enhanced-chat`
  const isPlanningTab = pathname === `/dashboard/projects/${projectId}/planning`
  const isRepoTab = pathname === `/dashboard/projects/${projectId}/repo`
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

      <div className="mb-6 p-4 border rounded-md bg-primary/10 text-primary border-border">
        <div className="flex items-start">
          <Info className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Enhanced Chat Interface</h4>
            <p className="text-sm mt-1">
              The chat interface has been upgraded with context-aware features. All project chats now use the enhanced G.R.I.P. AI system with repository analysis.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mb-6 border-b border-border-default">
        <Tabs defaultValue={isOverviewTab ? 'overview' : isChatTab ? 'chat' : isPlanningTab ? 'planning' : isRepoTab ? 'repo' : isPreviewTab ? 'preview' : 'settings'} className="w-full">
          <TabsList className="w-full justify-start flex-wrap gap-1">
            <Link href={`/dashboard/projects/${projectId}`} className="flex-1 min-w-0 max-w-[140px]">
              <TabsTrigger value="overview" className="w-full">Overview</TabsTrigger>
            </Link>
            <Link href={`/dashboard/projects/${projectId}/enhanced-chat`} className="flex-1 min-w-0 max-w-[140px]">
              <TabsTrigger value="chat" className="w-full">Chat</TabsTrigger>
            </Link>
            <Link href={`/dashboard/projects/${projectId}/repo`} className="flex-1 min-w-0 max-w-[140px]">
              <TabsTrigger value="repo" className="w-full">Repo</TabsTrigger>
            </Link>
            <Link href={`/dashboard/projects/${projectId}/preview`} className="flex-1 min-w-0 max-w-[140px]">
              <TabsTrigger value="preview" className="w-full">Preview</TabsTrigger>
            </Link>
            <Link href={`/dashboard/projects/${projectId}/planning`} className="flex-1 min-w-0 max-w-[140px]">
              <TabsTrigger value="planning" className="w-full">Planning</TabsTrigger>
            </Link>
            <Link href={`/dashboard/projects/${projectId}/settings`} className="flex-1 min-w-0 max-w-[140px]">
              <TabsTrigger value="settings" className="w-full">Settings</TabsTrigger>
            </Link>
          </TabsList>
        </Tabs>
      </div>

      <div className="pb-20">
        {children}
      </div>
    </div>
  )
} 