'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProjectGrid } from '@/components/projects/ProjectGrid'
import { Button } from '@/components/ui'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  FolderIcon
} from '@heroicons/react/24/outline'
import type { Project as ProjectGridProject } from '@/components/projects/ProjectGrid'

interface Project {
  _id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt?: string;
  repository?: {
    owner: string;
    name: string;
  };
  lastUpdated?: string;
  messageCount?: number;
  language?: string;
  languageColor?: string;
}

const sortOptions = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'A-Z', value: 'az' },
  { label: 'Z-A', value: 'za' },
] 

export default function ProjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentTab, setCurrentTab] = useState<'active' | 'archived'>('active')
  const [sortOrder, setSortOrder] = useState('newest')
  
  // Get status from URL if present (active = main dashboard; archived = completed + archived)
  useEffect(() => {
    const status = searchParams?.get('status')
    if (status === 'archived') {
      setCurrentTab('archived')
    } else {
      setCurrentTab('active')
    }
  }, [searchParams])

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/projects')
        if (response.ok) {
          const data = await response.json()
          setProjects(data.projects || [])
        } else {
          throw new Error('Failed to fetch projects')
        }
      } catch (error) {
        console.error('Error fetching projects:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [])

  // Count by status: active = open projects (main dashboard); archived = completed + archived (archived tab only)
  const activeCount = projects.filter(p => (p.status || 'active') === 'active').length
  const archivedCount = projects.filter(p => p.status === 'completed' || p.status === 'archived').length

  // Filter projects: main dashboard = active only; archived tab = completed + archived only
  useEffect(() => {
    let result = [...projects]
    
    if (currentTab === 'active') {
      result = result.filter(project => (project.status || 'active') === 'active')
    } else {
      result = result.filter(project => project.status === 'completed' || project.status === 'archived')
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(project => 
        project.title.toLowerCase().includes(term) || 
        project.description.toLowerCase().includes(term)
      )
    }
    
    // Sort projects
    result = sortProjects(result, sortOrder)
    
    setFilteredProjects(result)
  }, [projects, currentTab, searchTerm, sortOrder])

  const sortProjects = (projectList: Project[], sort: string) => {
    return [...projectList].sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'az':
          return a.title.localeCompare(b.title)
        case 'za':
          return b.title.localeCompare(a.title)
        default:
          return 0
      }
    })
  }

  const handleTabChange = (value: 'active' | 'archived') => {
    setCurrentTab(value)
    const params = new URLSearchParams(searchParams?.toString() || '')
    if (value === 'active') {
      params.delete('status')
    } else {
      params.set('status', 'archived')
    }
    router.replace(`/dashboard/projects?${params.toString()}`)
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description="Manage your AI-assisted projects"
        actions={
          <Button
            variant="default"
            onClick={() => router.push('/dashboard/projects/new')}
            icon={<PlusIcon className="h-5 w-5" />}
          >
            New Project
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Filters and search */}
        <Card className="p-4 min-w-0 overflow-hidden">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 gap-4 min-w-0">
            {/* Status filter: main dashboard = Active only; Archived tab = completed + archived only */}
            <Tabs value={currentTab} onValueChange={(v) => handleTabChange(v as 'active' | 'archived')} className="min-w-0 w-full md:w-auto">
              <TabsList className="flex flex-wrap w-full md:w-auto gap-1 p-1">
                <TabsTrigger value="active" className="flex-1 min-w-0 sm:flex-initial">Active ({activeCount})</TabsTrigger>
                <TabsTrigger value="archived" className="flex-1 min-w-0 sm:flex-initial">Archived ({archivedCount})</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0 flex-wrap gap-2 min-w-0">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Sort dropdown */}
              <div className="flex-shrink-0">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="form-input h-10 pl-3 pr-8 flex items-center appearance-none"
                  aria-label="Sort projects"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Projects grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ) : filteredProjects.length > 0 ? (
          <ProjectGrid 
            projects={filteredProjects.map(project => ({
              _id: project._id,
              title: project.title,
              description: project.description,
              repository: project.repository || { owner: '', name: '' },
              lastUpdated: project.updatedAt || project.createdAt,
              messageCount: project.messageCount || 0,
              language: project.language || 'TypeScript',
              languageColor: project.languageColor || '#3178c6',
              status: (project.status || 'active') as 'active' | 'completed' | 'archived',
            } as ProjectGridProject))} 
          />
        ) : (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-background-tertiary p-3">
              <FolderIcon className="h-6 w-6 text-text-secondary" />
            </div>
            <h3 className="mt-4 text-lg font-medium">No projects found</h3>
            <p className="mt-1 text-text-secondary max-w-md">
              {searchTerm
                ? 'No projects match your search criteria.'
                : currentTab === 'archived'
                  ? 'No completed or archived projects yet. Open a project and mark it Completed or Archived from Overview or Settings.'
                  : activeCount === 0 && projects.length > 0
                    ? 'No active projects. Mark a project as Active from its Overview or Settings.'
                    : 'Get started by creating your first project.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              {currentTab === 'archived' && (
                <Button
                  variant="outline"
                  onClick={() => handleTabChange('active')}
                >
                  View active projects
                </Button>
              )}
              <Button
                variant="default"
                onClick={() => router.push('/dashboard/projects/new')}
                icon={<PlusIcon className="h-5 w-5" />}
              >
                New Project
              </Button>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
