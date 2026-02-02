'use client'

// Import polyfill first
import '@/lib/polyfill'
import { useCallback, useEffect, useState } from 'react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import ClientBuildLogViewer from '@/components/admin/ClientBuildLogViewer'
import ClientBuildStatusCard from '@/components/admin/ClientBuildStatusCard'
import ClientBuildTimelineCard from '@/components/admin/ClientBuildTimelineCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card/Card'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCwIcon } from 'lucide-react'
import { IBuildLogData } from '@/lib/models/clientModels/BuildLog'
import { ClientTime } from '@/components/ui/ClientOnly'
import { FileExplorer } from '@/components/admin/FileExplorer'

export default function BuildMonitorPage() {
  const [builds, setBuilds] = useState<IBuildLogData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [refreshTimestamp, setRefreshTimestamp] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<string>('logs');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(10000); // 10 seconds
  
  // Client-side only state to prevent hydration issues
  const [isClient, setIsClient] = useState(false);
  
  // Set isClient to true after hydration is complete
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Replace with a simpler interface instead of using Select
  const filterOptions = [
    { value: 'all', label: 'All Builds' },
    { value: 'successful', label: 'Successful' },
    { value: 'failed', label: 'Failed' },
    { value: 'running', label: 'Running' }
  ]

  // Load builds - stable callback so effects don't re-run every render
  const loadBuilds = useCallback(async () => {
    setIsLoading(true)
    try {
      let apiUrl = '/api/admin/builds';
      if (filter !== 'all') {
        const statusMap: Record<string, string> = {
          'successful': 'completed',
          'failed': 'failed',
          'running': 'running'
        };
        apiUrl += `?status=${statusMap[filter] || 'all'}`;
      }
      if (selectedProject !== 'all') {
        const separator = apiUrl.includes('?') ? '&' : '?';
        apiUrl += `${separator}projectId=${selectedProject}`;
      }
      const res = await fetch(apiUrl)
      const data = await res.json()
      setBuilds(data.builds || [])
    } catch (error) {
      console.error('Error loading builds:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filter, selectedProject])

  // Initial load and when filter/selectedProject change
  useEffect(() => {
    loadBuilds()
  }, [loadBuilds])

  // Auto-refresh builds at interval (only when autoRefresh is on)
  useEffect(() => {
    if (!autoRefresh) return
    const intervalId = setInterval(() => {
      setRefreshTimestamp(new Date())
      loadBuilds()
    }, refreshInterval)
    return () => clearInterval(intervalId)
  }, [autoRefresh, refreshInterval, loadBuilds])

  const handleRefresh = useCallback(() => {
    setRefreshTimestamp(new Date())
    loadBuilds()
  }, [loadBuilds])

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => !prev)
  }, [])

  // Get count of builds in different statuses
  const statusCounts = {
    running: builds.filter(build => build.status === 'running').length,
    completed: builds.filter(build => build.status === 'completed').length,
    failed: builds.filter(build => build.status === 'failed').length,
    total: builds.length
  };
  
  return (
    <AdminDashboardLayout>
      <div className="grid gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Build Monitor</h1>
            <p className="text-text-secondary mt-1">
              {statusCounts.running > 0 ? (
                <span className="text-primary font-medium">{statusCounts.running} builds currently running</span>
              ) : (
                <span>Monitor build processes and logs</span>
              )}
            </p>
          </div>
          
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <select 
              className="px-3 py-2 border border-border rounded-md text-black bg-white dark:text-white dark:bg-background-tertiary"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter builds"
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select 
              className="px-3 py-2 border border-border rounded-md text-black bg-white dark:text-white dark:bg-background-tertiary"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              aria-label="Select project"
            >
              <option value="all">All Projects</option>
              <option value="project1">Project 1</option>
              <option value="project2">Project 2</option>
            </select>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                className="relative"
              >
                <RefreshCwIcon className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={toggleAutoRefresh}
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                className={autoRefresh ? "bg-success hover:bg-success/90" : ""}
              >
                {autoRefresh ? "Auto" : "Manual"}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Status indicator for realtime updates - using ClientTime to prevent hydration errors */}
        <div className="text-xs text-text-secondary flex items-center justify-end">
          <div className={`w-2 h-2 rounded-full mr-1 ${autoRefresh ? 'bg-success' : 'bg-text-muted'}`}></div>
          <span>
            {autoRefresh 
              ? `Auto-refreshing every ${refreshInterval/1000}s` 
              : 'Auto-refresh disabled'}
          </span>
          <span className="ml-4">
            Last updated: <ClientTime time={refreshTimestamp} format="time" />
          </span>
        </div>
        
        {/* Dashboard stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ClientBuildStatusCard 
            projectId={selectedProject === 'all' ? undefined : selectedProject}
            key={`stats-${isClient ? refreshTimestamp.getTime() : 'server'}`}
            refreshInterval={autoRefresh ? refreshInterval : undefined}
          />
          <ClientBuildTimelineCard
            projectId={selectedProject === 'all' ? undefined : selectedProject}
            key={`timeline-${isClient ? refreshTimestamp.getTime() : 'server'}`}
            refreshInterval={autoRefresh ? refreshInterval : undefined}
          />
        </div>
        
        {/* Build logs and detailed view */}
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="logs">Build Logs</TabsTrigger>
            <TabsTrigger value="files">Project Files</TabsTrigger>
            <TabsTrigger value="system">System Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="logs">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Build Logs</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-10">
                    <div className="animate-spin h-6 w-6 border-t-2 border-primary rounded-full"></div>
                  </div>
                ) : builds.length === 0 ? (
                  <Card>
                    <CardContent className="py-10 text-center">
                      <p>No build logs available.</p>
                      <p className="text-text-secondary text-sm mt-1">
                        Build logs will appear here once you start running builds.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <ClientBuildLogViewer 
                    projectId={selectedProject === 'all' ? '' : selectedProject}
                    showFilters={true}
                    height="600px"
                    autoRefresh={autoRefresh}
                    refreshInterval={refreshInterval}
                    key={`logs-${isClient ? refreshTimestamp.getTime() : 'server'}`}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="files">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Project Files</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedProject === 'all' ? (
                  <div className="py-10 text-center">
                    <p>Please select a specific project to view files.</p>
                  </div>
                ) : (
                  <FileExplorer 
                    projectId={selectedProject}
                    height="600px"
                    key={`files-${isClient ? refreshTimestamp.getTime() : 'server'}`}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="system">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>System Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] flex items-center justify-center">
                  <div className="text-center text-text-secondary">
                    <p>System performance metrics will be displayed here.</p>
                    <p className="text-sm mt-2">Coming soon in future updates.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminDashboardLayout>
  )
} 