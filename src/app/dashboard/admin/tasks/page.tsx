'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { 
  PlayIcon, 
  StopCircleIcon, 
  RefreshCwIcon, 
  FilterIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  AlertCircleIcon
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ITaskData } from '@/lib/models/Task'
import { useToast } from '@/components/ui/use-toast'

// Extended task interface for client-side with string IDs
interface TaskClientData extends Omit<ITaskData, 'projectId' | '_id'> {
  _id: string;
  projectId: string;
}

export default function TaskManagerPage() {
  const [tasks, setTasks] = useState<TaskClientData[]>([])
  const [selectedTask, setSelectedTask] = useState<TaskClientData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<string>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [projectId, setProjectId] = useState<string>('')
  const [projects, setProjects] = useState<Array<{id: string, title: string}>>([])
  const [error, setError] = useState<string | null>(null)
  
  // Task action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  
  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({
    open: false,
    title: '',
    message: '',
    action: async () => {}
  })
  
  // Task creation dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    type: 'build',
    priority: 'normal',
    command: '',
    phase: '',
    step: ''
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  
  // Toast notifications
  const { toast } = useToast()
  
  // Load projects for the selector
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch('/api/projects')
        if (!response.ok) throw new Error('Failed to load projects')
        
        const data = await response.json()
        setProjects(data.projects || [])
        
        // Get projectId from URL if available
        const urlParams = new URLSearchParams(window.location.search)
        const urlProjectId = urlParams.get('projectId')
        if (urlProjectId) {
          setProjectId(urlProjectId)
        } else if (data.projects && data.projects.length > 0) {
          // Select first project as default if none specified
          setProjectId(data.projects[0].id)
        }
      } catch (error) {
        console.error('Error loading projects:', error)
      }
    }
    
    loadProjects()
  }, [])
  
  // Fetch tasks when projectId, filter, or sort changes
  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Construct query params
      let url = '/api/admin/tasks?'
      if (filter !== 'all') {
        url += `status=${filter}&`
      }
      
      // Add project ID if available - this will be useful to filter tasks by project
      if (projectId) {
        url += `projectId=${projectId}&`
      }
      
      url += `sort=${sortField}&order=${sortDirection}`
      
      const response = await fetch(url)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch tasks')
      }
      
      const data = await response.json()
      setTasks(data.tasks || [])
      
      // Select first task if none selected
      if (data.tasks?.length > 0 && !selectedTask) {
        setSelectedTask(data.tasks[0])
      } else if (data.tasks?.length === 0) {
        setSelectedTask(null)
      }
    } catch (error: any) {
      console.error('Error fetching tasks:', error)
      setError(error.message || 'Failed to fetch tasks. Please try again.')
      toast({
        title: "Error",
        description: error.message || 'Failed to fetch tasks',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [filter, projectId, sortField, sortDirection, selectedTask, toast]);
  
  // Fetch tasks when projectId, filter, or sort changes
  useEffect(() => {
    if (projectId) {
      fetchTasks()
    }
  }, [projectId, fetchTasks]);
  
  // Show confirmation dialog for destructive actions
  const confirmTaskAction = (taskId: string, action: 'start' | 'stop' | 'cancel' | 'retry') => {
    const task = tasks.find(t => t._id === taskId)
    if (!task) return
    
    let title = '';
    let message = '';
    
    switch (action) {
      case 'start':
        title = 'Start Task'
        message = `Are you sure you want to start the task "${task.name}"?`
        break
      case 'stop':
        title = 'Stop Task'
        message = `Are you sure you want to stop the task "${task.name}"? This action cannot be undone.`
        break
      case 'cancel':
        title = 'Cancel Task'
        message = `Are you sure you want to cancel the task "${task.name}"? This action cannot be undone.`
        break
      case 'retry':
        title = 'Retry Task'
        message = `Are you sure you want to retry the task "${task.name}"?`
        break
    }
    
    setConfirmDialog({
      open: true,
      title,
      message,
      action: async () => {
        await handleTaskAction(taskId, action)
        setConfirmDialog(prev => ({ ...prev, open: false }))
      }
    })
  }
  
  // Handle task action (start, stop, cancel)
  const handleTaskAction = async (taskId: string, action: 'start' | 'stop' | 'cancel' | 'retry') => {
    if (actionLoading) return // Prevent multiple actions at once
    
    setActionLoading(taskId)
    setActionError(null)
    
    try {
      const response = await fetch(`/api/admin/tasks/${taskId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${action} task`)
      }
      
      // Refresh tasks after action
      fetchTasks()
      
      // Show success message
      toast({
        title: 'Success',
        description: `Task ${action} successful`,
        variant: 'default'
      })
    } catch (error: any) {
      console.error(`Error ${action}ing task:`, error)
      setActionError(error.message || `Failed to ${action} task. Please try again.`)
      toast({
        title: 'Error',
        description: error.message || `Failed to ${action} task`,
        variant: 'destructive'
      })
    } finally {
      setActionLoading(null)
    }
  }
  
  // Handle sort change
  const handleSortChange = (field: string) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to descending
      setSortField(field)
      setSortDirection('desc')
    }
  }
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success'
      case 'failed': return 'bg-destructive'
      case 'running': return 'bg-primary'
      case 'queued': return 'bg-yellow-500'
      case 'scheduled': return 'bg-accent-blue'
      case 'cancelled': return 'bg-text-muted'
      default: return 'bg-border'
    }
  }
  
  // Get priority label
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge className="bg-destructive">Critical</Badge>
      case 'high': return <Badge className="bg-accent-amber">High</Badge>
      case 'normal': return <Badge className="bg-primary">Normal</Badge>
      case 'low': return <Badge className="bg-success">Low</Badge>
      default: return <Badge className="bg-text-muted">Unknown</Badge>
    }
  }
  
  // Format date
  const formatDate = (date?: Date | string) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString()
  }
  
  // Handle task creation
  const createTask = async () => {
    if (!projectId) {
      setCreateError('Please select a project first')
      return
    }
    
    if (!newTask.name || !newTask.command) {
      setCreateError('Name and command are required')
      return
    }
    
    setIsCreating(true)
    setCreateError(null)
    
    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newTask,
          projectId,
          metadata: {
            createdBy: 'admin',
            phase: newTask.phase || undefined,
            step: newTask.step || undefined
          }
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create task')
      }

      const data = await response.json()
      
      // Reset form
      setNewTask({
        name: '',
        description: '',
        type: 'build',
        priority: 'normal',
        command: '',
        phase: '',
        step: ''
      })
      
      // Close dialog and refresh tasks
      setShowCreateDialog(false)
      fetchTasks()
      
      // Show success toast
      toast({
        title: 'Success',
        description: 'Task created successfully',
        variant: 'default'
      })
    } catch (error: any) {
      console.error('Error creating task:', error)
      setCreateError(error.message || 'Failed to create task')
      toast({
        title: 'Error',
        description: error.message || 'Failed to create task',
        variant: 'destructive'
      })
    } finally {
      setIsCreating(false)
    }
  }
  
  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h1 className="text-3xl font-bold">Task Manager</h1>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Project selector */}
            <select
              className="px-3 py-2 border border-border rounded-md text-black bg-white dark:text-white dark:bg-background-tertiary"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              aria-label="Select project"
            >
              <option key="all-projects" value="">All Projects</option>
              {projects.map((project, index) => (
                <option key={project.id || `project-${index}`} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            
            {/* Status filter */}
            <select
              className="px-3 py-2 border border-border rounded-md text-black bg-white dark:text-white dark:bg-background-tertiary"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter tasks"
            >
              <option key="all" value="all">All Tasks</option>
              <option key="queued" value="queued">Queued</option>
              <option key="scheduled" value="scheduled">Scheduled</option>
              <option key="running" value="running">Running</option>
              <option key="completed" value="completed">Completed</option>
              <option key="failed" value="failed">Failed</option>
              <option key="cancelled" value="cancelled">Cancelled</option>
            </select>
            
            <Button
              onClick={() => fetchTasks()} 
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
            
            {projectId && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                variant="default"
                size="sm"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Create Task
              </Button>
            )}
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-md text-destructive flex items-center">
            <AlertCircleIcon className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}
        
        {/* Create Task Dialog */}
        {showCreateDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Create New Task</h2>
                
                {createError && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
                    {createError}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="taskName" className="block text-sm font-medium mb-1">
                      Task Name *
                    </label>
                    <Input
                      id="taskName"
                      value={newTask.name}
                      onChange={(e) => setNewTask({...newTask, name: e.target.value})}
                      placeholder="Build Project"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="taskDescription" className="block text-sm font-medium mb-1">
                      Description
                    </label>
                    <Input
                      id="taskDescription"
                      value={newTask.description}
                      onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                      placeholder="Build the project using webpack"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="taskType" className="block text-sm font-medium mb-1">
                        Type
                      </label>
                      <select
                        id="taskType"
                        className="w-full px-3 py-2 border border-border rounded-md text-black bg-white dark:text-white dark:bg-background-tertiary"
                        value={newTask.type}
                        onChange={(e) => setNewTask({...newTask, type: e.target.value})}
                      >
                        <option key="build" value="build">Build</option>
                        <option key="test" value="test">Test</option>
                        <option key="deploy" value="deploy">Deploy</option>
                        <option key="generate" value="generate">Generate</option>
                        <option key="analyze" value="analyze">Analyze</option>
                        <option key="other" value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="taskPriority" className="block text-sm font-medium mb-1">
                        Priority
                      </label>
                      <select
                        id="taskPriority"
                        className="w-full px-3 py-2 border border-border rounded-md text-black bg-white dark:text-white dark:bg-background-tertiary"
                        value={newTask.priority}
                        onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                      >
                        <option key="low" value="low">Low</option>
                        <option key="normal" value="normal">Normal</option>
                        <option key="high" value="high">High</option>
                        <option key="critical" value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="taskCommand" className="block text-sm font-medium mb-1">
                      Command *
                    </label>
                    <Input
                      id="taskCommand"
                      value={newTask.command}
                      onChange={(e) => setNewTask({...newTask, command: e.target.value})}
                      placeholder="npm run build"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="taskPhase" className="block text-sm font-medium mb-1">
                        Phase
                      </label>
                      <Input
                        id="taskPhase"
                        value={newTask.phase}
                        onChange={(e) => setNewTask({...newTask, phase: e.target.value})}
                        placeholder="deployment"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="taskStep" className="block text-sm font-medium mb-1">
                        Step
                      </label>
                      <Input
                        id="taskStep"
                        value={newTask.step}
                        onChange={(e) => setNewTask({...newTask, step: e.target.value})}
                        placeholder="build"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    onClick={createTask}
                    disabled={isCreating || !newTask.name || !newTask.command}
                  >
                    {isCreating ? (
                      <span className="flex items-center">
                        <RefreshCwIcon className="h-4 w-4 mr-1 animate-spin" />
                        Creating...
                      </span>
                    ) : (
                      "Create Task"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle>Task Queue</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center p-10">
                    <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full"></div>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="p-6 text-center text-text-secondary">
                    No tasks found. Tasks will appear here when they are created.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {/* Table header */}
                    <div className="grid grid-cols-12 px-4 py-2 bg-background-secondary text-sm font-medium">
                      <div className="col-span-6 flex items-center cursor-pointer" onClick={() => handleSortChange('name')}>
                        Task
                        {sortField === 'name' && (
                          sortDirection === 'asc' ? <ChevronUpIcon className="h-4 w-4 ml-1" /> : <ChevronDownIcon className="h-4 w-4 ml-1" />
                        )}
                      </div>
                      <div className="col-span-3 flex items-center cursor-pointer" onClick={() => handleSortChange('status')}>
                        Status
                        {sortField === 'status' && (
                          sortDirection === 'asc' ? <ChevronUpIcon className="h-4 w-4 ml-1" /> : <ChevronDownIcon className="h-4 w-4 ml-1" />
                        )}
                      </div>
                      <div className="col-span-3 flex items-center cursor-pointer" onClick={() => handleSortChange('createdAt')}>
                        Created
                        {sortField === 'createdAt' && (
                          sortDirection === 'asc' ? <ChevronUpIcon className="h-4 w-4 ml-1" /> : <ChevronDownIcon className="h-4 w-4 ml-1" />
                        )}
                      </div>
                    </div>
                    
                    {/* Task list */}
                    <div className="max-h-[600px] overflow-y-auto">
                      {tasks.map((task, index) => (
                        <div 
                          key={task._id || `task-${index}`} 
                          className={`grid grid-cols-12 px-4 py-3 hover:bg-background-elevated cursor-pointer transition-colors
                            ${selectedTask?._id === task._id ? 'bg-background-elevated' : ''}`}
                          onClick={() => setSelectedTask(task)}
                        >
                          <div className="col-span-6">
                            <div className="font-medium truncate">{task.name}</div>
                            <div className="text-xs text-text-secondary truncate">{task.command}</div>
                          </div>
                          <div className="col-span-3 flex items-center">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)} mr-2`}></div>
                            <span className="text-sm capitalize">{task.status}</span>
                          </div>
                          <div className="col-span-3 text-sm text-text-secondary">
                            {new Date(task.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            {selectedTask ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{selectedTask.name}</CardTitle>
                      <div className="text-sm text-text-secondary mt-1">{selectedTask.description}</div>
                    </div>
                    <div className="flex gap-2">
                      {/* Task Actions */}
                      <div className="mt-4 space-x-2">
                        {selectedTask && selectedTask.status === 'queued' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => confirmTaskAction(selectedTask._id, 'start')}
                            disabled={actionLoading === selectedTask._id}
                          >
                            {actionLoading === selectedTask._id ? (
                              <RefreshCwIcon className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <PlayIcon className="h-4 w-4 mr-1" />
                            )}
                            Start
                          </Button>
                        )}
                        
                        {selectedTask && selectedTask.status === 'running' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => confirmTaskAction(selectedTask._id, 'stop')}
                            disabled={actionLoading === selectedTask._id}
                          >
                            {actionLoading === selectedTask._id ? (
                              <RefreshCwIcon className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <StopCircleIcon className="h-4 w-4 mr-1" />
                            )}
                            Stop
                          </Button>
                        )}
                        
                        {selectedTask && (selectedTask.status === 'queued' || selectedTask.status === 'scheduled') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => confirmTaskAction(selectedTask._id, 'cancel')}
                            disabled={actionLoading === selectedTask._id}
                          >
                            Cancel
                          </Button>
                        )}
                        
                        {selectedTask && selectedTask.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => confirmTaskAction(selectedTask._id, 'retry')}
                            disabled={actionLoading === selectedTask._id}
                          >
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Error message display */}
                  {actionError && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
                      {actionError}
                    </div>
                  )}
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <h4 className="text-sm font-medium text-text-secondary">Status</h4>
                        <div>
                          <Badge className={`${getStatusColor(selectedTask.status)} text-white`}>
                            {selectedTask.status.charAt(0).toUpperCase() + selectedTask.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-text-secondary">Priority</h4>
                        <div>
                          {getPriorityLabel(selectedTask.priority)}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-text-secondary">Type</h4>
                        <div className="capitalize">{selectedTask.type}</div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-text-secondary">Created By</h4>
                        <div>{selectedTask.metadata.createdBy}</div>
                      </div>
                      
                      {selectedTask.metadata.phase && (
                        <div>
                          <h4 className="text-sm font-medium text-text-secondary">Phase</h4>
                          <div>{selectedTask.metadata.phase}</div>
                        </div>
                      )}
                      
                      {selectedTask.metadata.step && (
                        <div>
                          <h4 className="text-sm font-medium text-text-secondary">Step</h4>
                          <div>{selectedTask.metadata.step}</div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-1">Command</h4>
                      <code className="block bg-background-tertiary p-2 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                        {selectedTask.command}
                      </code>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-text-secondary">Started</h4>
                        <div>{formatDate(selectedTask.startTime)}</div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-text-secondary">Completed</h4>
                        <div>{formatDate(selectedTask.endTime)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="text-lg font-medium mb-2">No Task Selected</div>
                  <p className="text-text-secondary">
                    Select a task from the list to view details
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-2">{confirmDialog.title}</h2>
            <p className="mb-6 text-text-secondary">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => confirmDialog.action()}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminDashboardLayout>
  )
} 