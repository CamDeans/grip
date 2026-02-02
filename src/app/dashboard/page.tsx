'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectGrid } from '@/components/projects/ProjectGrid'
import { GradientTitle } from '@/components/ui/GradientTitle'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  PlusIcon, 
  ChartBarIcon, 
  FolderIcon, 
  ClockIcon,
  CommandLineIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  BookOpenIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

interface DashboardStats {
  activeProjects: number;
  completedProjects: number;
  totalBuilds: number;
  terminalSessions: number;
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [recentProjects, setRecentProjects] = useState<any[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch dashboard stats
        const statsResponse = await fetch('/api/dashboard/stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData)
        }

        // Fetch recent projects
        const projectsResponse = await fetch('/api/projects?limit=3&sort=recent')
        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json()
          setRecentProjects(projectsData.projects || [])
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <GradientTitle>Dashboard</GradientTitle>
          <p className="text-text-secondary mt-1">
            Welcome to your G.R.I.P. AI-assisted development workspace
          </p>
        </div>
        <Button
          variant="default"
          onClick={() => router.push('/dashboard/projects/new')}
          icon={<PlusIcon className="h-5 w-5 mr-1.5" />}
        >
          New Project
        </Button>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Active Projects" 
          value={stats?.activeProjects} 
          icon={<FolderIcon className="h-5 w-5 text-primary" />} 
          loading={isLoading}
          color="primary"
          href="/dashboard/projects"
        />
        <StatCard 
          title="Completed Projects" 
          value={stats?.completedProjects} 
          icon={<FolderIcon className="h-5 w-5 text-accent-teal" />} 
          loading={isLoading}
          color="teal"
          href="/dashboard/projects?status=completed"
        />
        <StatCard 
          title="Build Sessions" 
          value={stats?.totalBuilds} 
          icon={<ChartBarIcon className="h-5 w-5 text-accent-blue" />} 
          loading={isLoading}
          color="blue"
          href="/dashboard/analytics"
        />
        <StatCard 
          title="Terminal Sessions" 
          value={stats?.terminalSessions} 
          icon={<CommandLineIcon className="h-5 w-5 text-accent-amber" />} 
          loading={isLoading}
          color="amber"
          href="/dashboard/terminal"
        />
      </div>

      {/* Recent activity section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="px-6 py-5 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Recent Projects</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/projects')}
                >
                  View All
                </Button>
              </div>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : recentProjects.length > 0 ? (
                <div className="divide-y divide-border">
                  {recentProjects.map((project) => (
                    <div 
                      key={project._id} 
                      className="py-3 flex items-center justify-between cursor-pointer hover:bg-background-tertiary/50 px-3 rounded-md transition-colors"
                      onClick={() => router.push(`/dashboard/projects/${project._id}`)}
                    >
                      <div className="flex items-center">
                        <div className="bg-primary/10 p-2 rounded mr-3">
                          <FolderIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">{project.title}</p>
                          <p className="text-sm text-text-secondary">{project.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-text-secondary">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        <span>
                          {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-text-secondary">No recent projects</p>
                  <Button
                    variant="default"
                    className="mt-4"
                    onClick={() => router.push('/dashboard/projects/new')}
                  >
                    Create Your First Project
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div>
          <Card>
            <div className="px-6 py-5 border-b border-border">
              <h2 className="text-lg font-medium">Quick Actions</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/projects/new')}
                  icon={<PlusIcon className="h-5 w-5 mr-1.5" />}
                >
                  Create New Project
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/terminal')}
                  icon={<CommandLineIcon className="h-5 w-5 mr-1.5" />}
                >
                  Open Terminal
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/analytics')}
                  icon={<ChartBarIcon className="h-5 w-5 mr-1.5" />}
                >
                  View Analytics
                </Button>
              </div>
            </div>
          </Card>
          
          <Card className="mt-6">
            <div className="px-6 py-5 border-b border-border">
              <h2 className="text-lg font-medium">Help & Resources</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <Button 
                  variant="link"
                  className="flex items-center w-full justify-start p-0 h-auto text-text-secondary hover:text-primary"
                  onClick={() => router.push('/docs')}
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  <span className="text-sm">Documentation</span>
                </Button>
                <Button 
                  variant="link"
                  className="flex items-center w-full justify-start p-0 h-auto text-text-secondary hover:text-primary"
                  onClick={() => router.push('/docs/api')}
                >
                  <CodeBracketIcon className="h-4 w-4 mr-2" />
                  <span className="text-sm">API Reference</span>
                </Button>
                <Button 
                  variant="link"
                  className="flex items-center w-full justify-start p-0 h-auto text-text-secondary hover:text-primary"
                  onClick={() => router.push('/docs/getting-started')}
                >
                  <BookOpenIcon className="h-4 w-4 mr-2" />
                  <span className="text-sm">Getting Started Guide</span>
                </Button>
                <Button 
                  variant="link"
                  className="flex items-center w-full justify-start p-0 h-auto text-text-secondary hover:text-primary"
                  onClick={() => window.open('https://github.com/GRIP-organization/GRIP/issues/new', '_blank')}
                >
                  <ExclamationCircleIcon className="h-4 w-4 mr-2" />
                  <span className="text-sm">Report an Issue</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Projects section */}
      <div className="hidden">
        <ProjectGrid />
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string;
  value?: number;
  icon: React.ReactNode;
  loading: boolean;
  color: 'primary' | 'teal' | 'blue' | 'amber' | 'red';
  href?: string;
}

function StatCard({ title, value, icon, loading, color, href }: StatCardProps) {
  const router = useRouter()
  
  const colorVariants = {
    primary: 'bg-primary/10 text-primary border border-primary/20',
    teal: 'bg-accent-teal/10 text-accent-teal border border-accent-teal/20',
    blue: 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20',
    amber: 'bg-accent-amber/10 text-accent-amber border border-accent-amber/20',
    red: 'bg-danger/10 text-danger border border-danger/20',
  }
  
  return (
    <Card 
      className="cursor-pointer hover:border-primary/20 transition-colors"
      onClick={() => href && router.push(href)}
    >
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${colorVariants[color]}`}>
            {icon}
          </div>
          <h3 className="text-text-secondary text-sm font-medium">{title}</h3>
        </div>
        <div className="mt-4">
          {loading ? (
            <Skeleton className="h-10 w-20" />
          ) : (
            <p className="text-3xl font-bold text-text-primary">{value ?? 0}</p>
          )}
        </div>
      </div>
    </Card>
  )
}
