import { useEffect, useState } from 'react'
import { IBuildLogData } from '@/lib/models/BuildLog'
import { LoggingService } from '@/lib/services/loggingService'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/Select'
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from '@/components/ui/Card'
import { RefreshCwIcon, DownloadIcon } from 'lucide-react'
import { ProjectAutomationService } from '@/lib/services/projectAutomationService'

interface BuildLogViewerProps {
  projectId: string;
  taskId?: string;
  showFilters?: boolean;
  height?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function BuildLogViewer({
  projectId,
  taskId,
  showFilters = true,
  height = '500px',
  autoRefresh = false,
  refreshInterval = 2000
}: BuildLogViewerProps) {
  // State
  const [logs, setLogs] = useState<IBuildLogData[]>([])
  const [selectedLogId, setSelectedLogId] = useState<string>(taskId || '')
  const [logContent, setLogContent] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [taskType, setTaskType] = useState<string>('all_types')
  const [status, setStatus] = useState<string>('all_statuses')
  const [phase, setPhase] = useState<string>('')
  const [step, setStep] = useState<string>('')
  const [searchText, setSearchText] = useState<string>('')
  
  // Stop auto-refresh function
  const [stopMonitoring, setStopMonitoring] = useState<(() => void) | null>(null)

  // Load logs on initial render
  useEffect(() => {
    fetchLogs()
    
    return () => {
      // Cleanup monitoring on unmount
      if (stopMonitoring) {
        stopMonitoring()
      }
    }
  }, [projectId])
  
  // Select first log if taskId is not provided
  useEffect(() => {
    if (!taskId && logs.length > 0 && !selectedLogId) {
      setSelectedLogId(logs[0].taskId)
    }
  }, [logs, taskId, selectedLogId])
  
  // Load log content when selectedLogId changes
  useEffect(() => {
    if (selectedLogId) {
      fetchLogContent(selectedLogId)
    }
  }, [selectedLogId])

  // Fetch logs based on filters
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create filters based on UI selections
      const filters: any = {};
      if (taskType && taskType !== 'all_types') {
        filters.taskType = taskType;
      }
      
      if (status && status !== 'all_statuses') {
        filters.status = status;
      }
      
      if (phase) {
        filters.phase = phase;
      }
      
      if (step) {
        filters.step = step;
      }
      
      // Get logs using the correct LoggingService method
      const logData = await LoggingService.getProjectLogs(projectId, 100, filters);
      
      // Apply text search filter if needed
      const filteredLogs = searchText 
        ? logData.filter(log => 
            log.command.toLowerCase().includes(searchText.toLowerCase()) ||
            (log.phase && log.phase.toLowerCase().includes(searchText.toLowerCase())) ||
            (log.step && log.step.toLowerCase().includes(searchText.toLowerCase()))
          )
        : logData;
      
      setLogs(filteredLogs as any);
    } catch (err: any) {
      setError('Failed to load logs');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch log content for a specific task
  const fetchLogContent = async (taskId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Clean up previous monitoring
      if (stopMonitoring) {
        stopMonitoring();
        setStopMonitoring(null);
      }
      
      // Get build log using ProjectAutomationService
      const log = await ProjectAutomationService.getBuildLog(taskId);
      
      if (!log) {
        throw new Error('Log not found');
      }
      
      setLogContent(log.output);
      
      // Start monitoring for active logs if autoRefresh is enabled
      if (autoRefresh && ['pending', 'running'].includes(log.status)) {
        const stopFn = LoggingService.monitorTask(
          taskId,
          (updatedLog) => {
            if (updatedLog) {
              setLogContent(updatedLog.output);
            }
          },
          refreshInterval
        );
        
        setStopMonitoring(() => stopFn);
      }
    } catch (err: any) {
      setError('Failed to load log content');
      console.error('Error fetching log content:', err);
    } finally {
      setLoading(false);
    }
  };

  // Export log to file
  const exportLog = async () => {
    if (!selectedLogId) return
    
    try {
      setLoading(true)
      const filePath = await LoggingService.exportBuildLog(selectedLogId)
      
      if (filePath) {
        // Create download link
        const link = document.createElement('a')
        link.href = `data:text/plain;charset=utf-8,${encodeURIComponent(logContent)}`
        link.download = `build_log_${selectedLogId}_${new Date().toISOString()}.log`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        throw new Error('Failed to export log')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to export log')
      console.error('Error exporting log:', err)
    } finally {
      setLoading(false)
    }
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success'
      case 'failed':
        return 'bg-destructive'
      case 'running':
        return 'bg-primary'
      case 'pending':
        return 'bg-yellow-500'
      case 'cancelled':
        return 'bg-text-muted'
      default:
        return 'bg-border'
    }
  }

  return (
    <div className="flex flex-col w-full">
      {showFilters && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle>Build Logs</CardTitle>
            <CardDescription>View and filter build logs for this project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Task Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_types">All Types</SelectItem>
                    <SelectItem value="build">Build</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="deploy">Deploy</SelectItem>
                    <SelectItem value="generate">Generate</SelectItem>
                    <SelectItem value="analyze">Analyze</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_statuses">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={fetchLogs} disabled={loading}>
                {loading ? <Spinner size="sm" className="mr-2" /> : null}
                Refresh Logs
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 overflow-y-auto" style={{ maxHeight: height }}>
          <div className="font-semibold mb-2">Task Logs</div>
          {logs.length === 0 && !loading ? (
            <div className="text-text-muted text-sm">No logs found</div>
          ) : (
            <ul className="space-y-2">
              {logs.map(log => (
                <li 
                  key={log.taskId}
                  className={`p-2 cursor-pointer rounded ${selectedLogId === log.taskId ? 'bg-background-tertiary' : ''}`}
                  onClick={() => setSelectedLogId(log.taskId)}
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm font-medium truncate" title={log.command}>
                      {log.command.split(' ')[0]}
                    </div>
                    <Badge className={`${getStatusColor(log.status)} text-white`}>
                      {log.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-text-muted">
                    {new Date(log.startTime).toLocaleString()}
                  </div>
                  {log.phase && (
                    <div className="text-xs text-text-muted">
                      Phase: {log.phase}, Step: {log.step || 'N/A'}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="md:col-span-3">
          <div className="flex justify-between items-center mb-2">
            <div className="font-semibold">Log Output</div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={exportLog}
              disabled={!selectedLogId || loading}
            >
              Export Log
            </Button>
          </div>
          
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner size="lg" />
            </div>
          ) : (
            <pre
              className="bg-background-tertiary text-text-primary p-4 rounded overflow-auto text-sm"
              style={{ height, maxHeight: height }}
            >
              {logContent || 'Select a log to view its content'}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
} 