'use client'

import { useState, useEffect } from 'react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  PlayIcon, 
  PauseIcon, 
  RefreshCwIcon,
  SettingsIcon,
  AlertTriangleIcon
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'

export default function SystemManagementPage() {
  // Task worker state
  const [workerStatus, setWorkerStatus] = useState<string>('loading')
  const [concurrencyLimit, setConcurrencyLimit] = useState<number>(5)
  const [maxTasksPerProject, setMaxTasksPerProject] = useState<number>(10)
  const [taskPrioritization, setTaskPrioritization] = useState<string>('priority')
  const [errorHandlingMode, setErrorHandlingMode] = useState<string>('retry')
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false)
  
  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Fetch worker status on component mount
  useEffect(() => {
    fetchWorkerStatus()
  }, [])
  
  // Fetch worker status
  const fetchWorkerStatus = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/system/task-worker')
      if (!response.ok) throw new Error('Failed to fetch worker status')
      
      const data = await response.json()
      
      // Update state with worker status
      setWorkerStatus(data.status)
      setConcurrencyLimit(data.concurrencyLimit)
      setMaxTasksPerProject(data.maxTasksPerProject)
      setTaskPrioritization(data.taskPrioritization)
      setErrorHandlingMode(data.errorHandlingMode)
      setMaintenanceMode(data.maintenanceMode)
    } catch (error) {
      console.error('Error fetching worker status:', error)
      setError('Failed to fetch worker status. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Handle worker action (start/pause)
  const handleWorkerAction = async (action: 'start' | 'pause') => {
    setActionLoading(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      const response = await fetch('/api/admin/system/task-worker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${action} worker`)
      }
      
      const data = await response.json()
      
      // Update state with worker status
      setWorkerStatus(data.status)
      setSuccessMessage(data.message)
    } catch (error: any) {
      console.error(`Error ${action}ing worker:`, error)
      setError(error.message || `Failed to ${action} worker. Please try again.`)
    } finally {
      setActionLoading(false)
    }
  }
  
  // Handle settings update
  const handleUpdateSettings = async () => {
    setActionLoading(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      const response = await fetch('/api/admin/system/task-worker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update',
          settings: {
            concurrencyLimit,
            maxTasksPerProject,
            taskPrioritization,
            errorHandlingMode,
            maintenanceMode
          }
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update settings')
      }
      
      const data = await response.json()
      
      // Update state with worker status
      setWorkerStatus(data.status)
      setSuccessMessage(data.message)
    } catch (error: any) {
      console.error(`Error updating settings:`, error)
      setError(error.message || 'Failed to update settings. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-success'
      case 'paused': return 'bg-yellow-500'
      case 'loading': return 'bg-primary'
      default: return 'bg-text-muted'
    }
  }
  
  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h1 className="text-3xl font-bold">System Management</h1>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => fetchWorkerStatus()} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCwIcon className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCwIcon className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Error/Success messages */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-md text-destructive flex items-start">
            <AlertTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}
        
        {successMessage && (
          <div className="p-4 bg-success/10 border border-success/30 rounded-md text-success">
            {successMessage}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Task Worker Status */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Task Worker Status</CardTitle>
              <CardDescription>
                Current status of the background task processing system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(workerStatus)} mr-2`}></div>
                    <span className="text-lg font-medium capitalize">{workerStatus}</span>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {workerStatus === 'paused' && (
                      <Button
                        onClick={() => handleWorkerAction('start')}
                        variant="outline"
                        size="sm"
                        className="bg-success/10 border-success/30 text-success hover:bg-success/20"
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <RefreshCwIcon className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <PlayIcon className="h-4 w-4 mr-1" />
                        )}
                        Start
                      </Button>
                    )}
                    
                    {workerStatus === 'running' && (
                      <Button
                        onClick={() => handleWorkerAction('pause')}
                        variant="outline"
                        size="sm"
                        className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <RefreshCwIcon className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <PauseIcon className="h-4 w-4 mr-1" />
                        )}
                        Pause
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium mb-3">Current Configuration</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Concurrency Limit:</span>
                      <span className="font-medium">{concurrencyLimit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Tasks Per Project:</span>
                      <span className="font-medium">{maxTasksPerProject}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Task Prioritization:</span>
                      <span className="font-medium capitalize">{taskPrioritization}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Error Handling:</span>
                      <span className="font-medium capitalize">{errorHandlingMode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Maintenance Mode:</span>
                      <span className="font-medium">{maintenanceMode ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* System Settings */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Configure task worker and automation system settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="worker">
                <TabsList className="mb-4">
                  <TabsTrigger value="worker">Worker Settings</TabsTrigger>
                  <TabsTrigger value="tasks">Task Settings</TabsTrigger>
                  <TabsTrigger value="system">System Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="worker" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="concurrencyLimit">Concurrency Limit</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="concurrencyLimit"
                          type="number"
                          min={1}
                          max={20}
                          value={concurrencyLimit}
                          onChange={(e) => setConcurrencyLimit(parseInt(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Max: 20</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Number of tasks that can run in parallel
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="tasks" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxTasksPerProject">Max Tasks Per Project</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="maxTasksPerProject"
                          type="number"
                          min={1}
                          max={50}
                          value={maxTasksPerProject}
                          onChange={(e) => setMaxTasksPerProject(parseInt(e.target.value))}
                          className="w-full"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Max: 50</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Maximum number of tasks allowed per project
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="taskPrioritization">Task Prioritization</Label>
                      <select 
                        id="taskPrioritization"
                        value={taskPrioritization}
                        onChange={(e) => setTaskPrioritization(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
                        aria-label="Select task prioritization method"
                      >
                        <option value="fifo">First In, First Out (FIFO)</option>
                        <option value="priority">Priority-based</option>
                        <option value="deadline">Deadline-based</option>
                      </select>
                      <p className="text-xs text-muted-foreground">
                        How tasks are scheduled for execution
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="errorHandlingMode">Error Handling</Label>
                      <select 
                        id="errorHandlingMode"
                        value={errorHandlingMode}
                        onChange={(e) => setErrorHandlingMode(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
                        aria-label="Select error handling mode"
                      >
                        <option value="stop">Stop on Error</option>
                        <option value="continue">Continue Despite Errors</option>
                        <option value="retry">Retry on Failure</option>
                      </select>
                      <p className="text-xs text-muted-foreground">
                        How the system handles task failures
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="system" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between space-x-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                        <p className="text-xs text-muted-foreground">
                          When enabled, no new tasks will be started
                        </p>
                      </div>
                      <Switch
                        id="maintenanceMode"
                        checked={maintenanceMode}
                        onCheckedChange={setMaintenanceMode}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <div className="flex justify-end mt-6">
                  <Button 
                    onClick={handleUpdateSettings}
                    disabled={actionLoading}
                    className="flex items-center gap-2"
                  >
                    {actionLoading ? (
                      <RefreshCwIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <SettingsIcon className="h-4 w-4" />
                    )}
                    Update Settings
                  </Button>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminDashboardLayout>
  )
}

