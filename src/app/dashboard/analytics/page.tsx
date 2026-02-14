'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GradientTitle } from '@/components/ui/GradientTitle'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ChartBarIcon, 
  ClockIcon, 
  CodeBracketIcon, 
  CommandLineIcon 
} from '@heroicons/react/24/outline'
import styles from './analytics.module.css'

interface Analytics {
  totalProjects: number
  projectGrowth: {
    percentage: number
    direction: 'up' | 'down'
  }
  activityData: Array<{
    date: string
    count: number
  }>
  distributionData: Array<{
    label: string
    value: number
  }>
  buildData: Array<{
    status: string
    count: number
  }>
  buildDataByTaskType?: Array<{ taskType: string; count: number }>
  buildSummary?: { totalBuilds: number; avgDurationMs: number | null }
  chatSummary?: { totalChatMessages: number; chatActivityInPeriod: number }
  planSummary?: { projectsWithPlan: number; totalStepsCompleted: number }
  repoAnalysesCount?: number
  languageData: Array<{
    language: string
    count: number
    color: string
  }>
  timeData: {
    total: number
    average: number
    peak: string
    activeDays?: number
  }
  projectsDetail?: Array<{
    id: unknown
    title?: string
    description?: string
    status?: string
    createdAt?: string
  }>
  filesGenerated?: number
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('7d')

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/analytics?timeframe=${timeframe}`)
        if (!response.ok) throw new Error('Failed to fetch analytics')
        const data = await response.json()
        setAnalytics(data)
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [timeframe])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Insights into your development activity"
      />

      {/* Time period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Overview</h2>
        <Tabs value={timeframe} onValueChange={setTimeframe}>
          <TabsList>
            <TabsTrigger value="24h">24h</TabsTrigger>
            <TabsTrigger value="7d">7d</TabsTrigger>
            <TabsTrigger value="30d">30d</TabsTrigger>
            <TabsTrigger value="90d">90d</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Projects"
          value={analytics?.totalProjects}
          change={analytics?.projectGrowth}
          icon={<ChartBarIcon className="h-5 w-5 text-primary" />}
          loading={isLoading}
          color="blue"
        />
        <StatCard
          title="Active days"
          value={analytics?.timeData?.activeDays ?? 0}
          icon={<ClockIcon className="h-5 w-5 text-accent-blue" />}
          loading={isLoading}
          color="purple"
        />
        <StatCard
          title="Code Generated"
          value={analytics?.filesGenerated ?? 0}
          suffix="files"
          icon={<CodeBracketIcon className="h-5 w-5 text-success" />}
          loading={isLoading}
          color="green"
        />
        <StatCard
          title="Activity"
          value={analytics?.activityData?.reduce((acc, curr) => acc + curr.count, 0) ?? 0}
          icon={<CommandLineIcon className="h-5 w-5 text-accent-amber" />}
          loading={isLoading}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Activity Timeline</h3>
                <p className="text-sm text-text-muted mb-3">File saves and builds per period. Chat with GRIP and run builds to see activity.</p>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <div className="h-64 flex items-end space-x-2">
                  {analytics?.activityData.map((item, index) => {
                    const maxCount = Math.max(1, ...(analytics?.activityData?.map(d => d.count) ?? [0]))
                    const heightPx = Math.max(4, (item.count / maxCount) * 200)
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className={`w-full bg-primary rounded-t ${styles.activityBar}`}
                          style={{ ['--bar-height' as string]: `${heightPx}px` }}
                        />
                        <span className="text-xs text-text-secondary mt-2">{formatDate(item.date)}</span>
                      </div>
                    )
                  })}
                </div>
                {analytics?.activityData?.every(d => d.count === 0) && (
                  <p className="text-sm text-text-secondary mt-2 text-center">No file or build activity in this period. Chat with GRIP, save files, or run builds to see activity.</p>
                )}
              </>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Language Distribution</h3>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="h-64 flex items-center">
                <div className="w-full grid grid-cols-2 gap-4">
                  {analytics?.languageData.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div 
                        className={`h-3 w-3 rounded-full ${styles.languageDot}`}
                        style={{ ['--dot-color' as string]: item.color }}
                      />
                      <span className="text-sm">{item.language}</span>
                      <div className="flex-1 h-2 bg-background-tertiary rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${styles.languageBarFill}`}
                          style={{ 
                            ['--bar-pct' as string]: `${(item.count / analytics.languageData.reduce((acc, curr) => acc + curr.count, 0) * 100)}%`,
                            ['--bar-color' as string]: item.color
                          }}
                        />
                      </div>
                      <span className="text-sm text-text-secondary">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Your Projects - full details */}
      {analytics?.projectsDetail && analytics.projectsDetail.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium mb-4">Your Projects</h3>
            <ul className="space-y-3">
              {analytics.projectsDetail.map((p) => (
                <li key={String(p.id)} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{p.title ?? 'Untitled'}</p>
                    {p.description && <p className="text-sm text-text-secondary truncate">{p.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs capitalize text-muted-foreground">{p.status ?? 'active'}</span>
                    <a href={`/dashboard/projects/${p.id}`} className="text-sm text-primary hover:underline">View</a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {/* Build Status — what we track: outcomes, total, avg duration, task type */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Build Status</h3>
          <p className="text-sm text-text-muted mb-3">What we track: outcome (success / failed / pending / canceled), total builds, average duration, and task type (install, build, test, etc.). Build logs and outcomes from auto build runs in Develop are shown in the chat after each run.</p>
          {!isLoading && analytics?.buildSummary && (
            <div className="flex flex-wrap items-center gap-4 mb-3 text-sm text-text-secondary">
              <span>Total builds: <strong className="text-text-primary">{analytics.buildSummary.totalBuilds}</strong></span>
              <span>Avg duration: <strong className="text-text-primary">
                {analytics.buildSummary.avgDurationMs != null
                  ? (analytics.buildSummary.avgDurationMs >= 1000
                      ? `${(analytics.buildSummary.avgDurationMs / 1000).toFixed(1)}s`
                      : `${Math.round(analytics.buildSummary.avgDurationMs)}ms`)
                  : '—'}
              </strong></span>
            </div>
          )}
          {!isLoading && (analytics?.buildDataByTaskType?.length ?? 0) > 0 && (
            <div className="mb-3 text-sm text-text-secondary">
              <span className="font-medium">By task type: </span>
              {analytics.buildDataByTaskType?.map((item, i) => (
                <span key={item.taskType}>
                  {i > 0 && ' · '}
                  <strong className="text-text-primary capitalize">{item.taskType}</strong> {item.count}
                </span>
              ))}
            </div>
          )}
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="flex items-center h-20">
              <div className="w-full h-8 flex rounded-full overflow-hidden">
                {analytics?.buildData.map((item, index) => {
                  const colors: Record<string, string> = {
                    success: 'bg-success',
                    failed: 'bg-destructive',
                    pending: 'bg-yellow-500',
                    canceled: 'bg-text-muted',
                  }
                  const total = analytics.buildData.reduce((acc, curr) => acc + curr.count, 0)
                  const percentage = total > 0 ? (item.count / total) * 100 : 0
                  
                  return (
                    <div 
                      key={index}
                      className={`h-full ${colors[item.status] || 'bg-primary'} ${styles.buildSegment}`}
                      style={{ ['--segment-pct' as string]: `${percentage}%` }}
                      title={`${item.status}: ${item.count} (${percentage.toFixed(1)}%)`}
                    />
                  )
                })}
              </div>
            </div>
          )}
          
          {/* Legend */}
          {!isLoading && (
            <>
              <div className="mt-4 flex items-center justify-center space-x-6">
                {analytics?.buildData.map((item, index) => {
                  const colors: Record<string, string> = {
                    success: 'bg-success',
                    failed: 'bg-destructive',
                    pending: 'bg-yellow-500',
                    canceled: 'bg-text-muted',
                  }
                  
                  return (
                    <div key={index} className="flex items-center space-x-2">
                      <div className={`h-3 w-3 rounded-full ${colors[item.status] || 'bg-primary'}`} />
                      <span className="text-sm capitalize">{item.status}</span>
                      <span className="text-sm text-text-secondary">({item.count})</span>
                    </div>
                  )
                })}
              </div>
              {analytics?.buildData?.every(b => b.count === 0) && (
                <p className="text-sm text-text-secondary mt-3 text-center">No builds in this period. Run builds from your project to see status here.</p>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Development Patterns — what we track: active days, chat, analyses, files, plans, project status, terminal (once) */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Development Patterns</h3>
          <p className="text-sm text-text-muted mb-3">What we track: active days, chat messages &amp; chat-active projects, repo analyses, files created, plan steps, project status (Active / Completed / Archived), and terminal usage (shown once below).</p>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-background-tertiary/50">
                  <h4 className="text-xs text-text-secondary mb-1">Active days</h4>
                  <p className="text-xl font-semibold">{analytics?.timeData?.activeDays ?? 0}</p>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-background-tertiary/50">
                  <h4 className="text-xs text-text-secondary mb-1">Chat messages</h4>
                  <p className="text-xl font-semibold">{analytics?.chatSummary?.totalChatMessages ?? 0}</p>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-background-tertiary/50">
                  <h4 className="text-xs text-text-secondary mb-1">Chat active (period)</h4>
                  <p className="text-xl font-semibold">{analytics?.chatSummary?.chatActivityInPeriod ?? 0}</p>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-background-tertiary/50">
                  <h4 className="text-xs text-text-secondary mb-1">Repo analyses</h4>
                  <p className="text-xl font-semibold">{analytics?.repoAnalysesCount ?? 0}</p>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-background-tertiary/50">
                  <h4 className="text-xs text-text-secondary mb-1">Files created</h4>
                  <p className="text-xl font-semibold">{analytics?.filesGenerated ?? 0}</p>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-background-tertiary/50">
                  <h4 className="text-xs text-text-secondary mb-1">Plans / steps</h4>
                  <p className="text-xl font-semibold">{analytics?.planSummary?.projectsWithPlan ?? 0} / {analytics?.planSummary?.totalStepsCompleted ?? 0}</p>
                </div>
              </div>
              {/* Project status — previously tracked but not displayed */}
              {analytics?.distributionData && analytics.distributionData.some(d => d.value > 0) && (
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  <span className="text-text-secondary font-medium">Project status:</span>
                  {analytics.distributionData.map((d) => (
                    <span key={d.label} className="text-text-secondary">
                      <strong className="text-text-primary">{d.label}</strong> {d.value}
                    </span>
                  ))}
                </div>
              )}
              {/* Terminal shown once only */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-text-secondary">
                  <strong>Terminal</strong> (tracked when used in a project): {(analytics?.timeData?.total ?? 0)} hrs total
                  {(analytics?.timeData?.total ?? 0) > 0 && (
                    <span className="ml-2">· peak hour {analytics?.timeData?.peak ?? '--'}</span>
                  )}
                </p>
              </div>
              {(analytics?.timeData?.activeDays ?? 0) === 0 && (analytics?.chatSummary?.totalChatMessages ?? 0) === 0 && (analytics?.timeData?.total ?? 0) === 0 && (
                <p className="text-sm text-text-secondary mt-3 text-center">Chat with GRIP, save files, or run builds to see activity. Terminal hours appear here when you use the Terminal in a project.</p>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

interface StatCardProps {
  title: string;
  value?: number;
  suffix?: string;
  change?: {
    percentage: number;
    direction: 'up' | 'down';
  };
  icon: React.ReactNode;
  loading: boolean;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

function StatCard({ title, value, suffix = '', change, icon, loading, color }: StatCardProps) {
  const colorVariants = {
    blue: 'bg-primary/10 text-primary border-primary/20',
    green: 'bg-success/10 text-success border-success/20',
    purple: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
    orange: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
    red: 'bg-destructive/10 text-destructive border-destructive/20',
  }
  
  return (
    <Card>
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
            <div className="flex items-baseline">
              <p className="text-3xl font-bold text-text-primary">
                {value ?? 0}
                {suffix && <span className="text-lg ml-1">{suffix}</span>}
              </p>
              {change && (
                <span 
                  className={`ml-2 text-sm ${
                    change.direction === 'up' 
                      ? 'text-success' 
                      : 'text-destructive'
                  }`}
                >
                  {change.direction === 'up' ? '↑' : '↓'} {change.percentage}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
