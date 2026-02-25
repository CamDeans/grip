'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProjectGrid } from '@/components/projects/ProjectGrid'
import { GradientTitle } from '@/components/ui/GradientTitle'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'
import { Coins } from 'lucide-react'
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
  archivedTabCount?: number;
  totalBuilds: number;
  terminalSessions: number;
}

const TIER_LABELS: Record<string, string> = {
  admin: 'Admin',
  starter: 'Starter',
  pro: 'Pro',
  team: 'Team',
  valued_tester: 'Valued Tester',
}

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [access, setAccess] = useState<{
    tier?: string
    tokenAllowance: number
    tokensUsedThisPeriod: number
    subscriptionPeriodEnd?: string | null
    isAdmin?: boolean
  } | null>(null)

  // Post-payment success: show toast and clean URL
  useEffect(() => {
    const sub = searchParams.get('subscription')
    if (sub === 'success') {
      toast({
        title: 'Welcome to GRIP',
        description: 'Your plan is active. You have full access to chat, code generation, and builds. Check your token usage in the sidebar.',
      })
      router.replace('/dashboard', { scroll: false })
    }
  }, [searchParams, router])

  const refetchAccess = useCallback(() => {
    // Cache-bust so refetch after token usage gets fresh data (Plan & token usage card stays in sync)
    fetch(`/api/me/access?t=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAccess(d))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refetchAccess()
  }, [refetchAccess])

  // Refetch when token usage is updated elsewhere (e.g. enhanced chat, plan, analyze) so card stays current
  useEffect(() => {
    const handler = () => refetchAccess()
    window.addEventListener('grip-token-update', handler)
    return () => window.removeEventListener('grip-token-update', handler)
  }, [refetchAccess])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch dashboard stats
        const statsResponse = await fetch('/api/dashboard/stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData)
        }

        // Fetch recent projects (active only — completed/archived show in Archived tab)
        const projectsResponse = await fetch('/api/projects?limit=10&sort=recent')
        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json()
          const active = (projectsData.projects || []).filter(
            (p: { status?: string }) => (p.status || 'active') === 'active'
          )
          setRecentProjects(active.slice(0, 3))
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
          title="Archived" 
          value={stats?.archivedTabCount ?? 0} 
          icon={<FolderIcon className="h-5 w-5 text-accent-teal" />} 
          loading={isLoading}
          color="teal"
          href="/dashboard/projects?status=archived"
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
                <div className="divide-y divide-border min-w-0">
                  {recentProjects.map((project) => (
                    <div 
                      key={project._id} 
                      className="py-3 flex flex-wrap items-center justify-between gap-2 cursor-pointer hover:bg-background-tertiary/50 px-3 rounded-md transition-colors min-w-0"
                      onClick={() => router.push(`/dashboard/projects/${project._id}`)}
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="bg-primary/10 p-2 rounded mr-3 shrink-0">
                          <FolderIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-text-primary truncate">{project.title}</p>
                          <p className="text-sm text-text-secondary line-clamp-2 break-words">{project.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center text-sm text-text-secondary shrink-0">
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
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                Plan & token usage
              </h2>
            </div>
            <div className="p-6">
              {access ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-primary">
                    {TIER_LABELS[access.tier || ''] || access.tier || 'Plan'}
                  </p>
                  {(access.tokenAllowance ?? 0) > 0 && (
                    <>
                      <p className="text-sm text-text-secondary">
                        {Math.max(0, (access.tokenAllowance ?? 0) - (access.tokensUsedThisPeriod ?? 0)).toLocaleString()} left of {(access.tokenAllowance ?? 0).toLocaleString()} tokens this period
                      </p>
                      {access.subscriptionPeriodEnd && (
                        <p className="text-xs text-text-muted">
                          Resets {new Date(access.subscriptionPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                      <div className="h-2 rounded-full bg-background-tertiary overflow-hidden mt-2">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${(access.tokenAllowance ?? 0) > 0 ? Math.min(100, Math.round(((access.tokensUsedThisPeriod ?? 0) / (access.tokenAllowance ?? 1)) * 100)) : 0}%`,
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Skeleton className="h-16 w-full" />
              )}
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
                  onClick={() => router.push('/docs')}
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
      className="cursor-pointer hover:border-primary/20 transition-colors min-w-0 overflow-hidden"
      onClick={() => href && router.push(href)}
    >
      <div className="p-6 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className={`p-2 rounded-lg shrink-0 ${colorVariants[color]}`}>
            {icon}
          </div>
          <h3 className="text-text-secondary text-sm font-medium truncate">{title}</h3>
        </div>
        <div className="mt-4 min-w-0">
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
