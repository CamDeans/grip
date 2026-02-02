'use client';

import '@/lib/polyfill'
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/Select';
import { RefreshCwIcon, DownloadIcon } from 'lucide-react';

// Import client-safe models
import { IBuildLogData, BuildLogUtils } from '@/lib/models/clientModels/BuildLog';
import { ClientLoggingService } from '@/lib/services/clientLoggingService';
import { ClientTime } from '@/components/ui/ClientOnly';

// Define props interface
interface BuildLogViewerProps {
  projectId: string;
  taskId?: string;
  showFilters?: boolean;
  height?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Completely client-side implementation that doesn't use MongoDB directly
const ClientBuildLogViewer = (props: BuildLogViewerProps) => {
  const { 
    projectId, 
    taskId, 
    showFilters = true, 
    height = '500px',
    autoRefresh = false,
    refreshInterval = 2000
  } = props;
  
  // State
  const [logs, setLogs] = useState<IBuildLogData[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string>(taskId || '');
  const [logContent, setLogContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [taskType, setTaskType] = useState<string>('all_types');
  const [status, setStatus] = useState<string>('all_statuses');
  const [phase, setPhase] = useState<string>('');
  const [step, setStep] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  
  // Stop auto-refresh function
  const [stopMonitoring, setStopMonitoring] = useState<(() => void) | null>(null);
  
  // Client-side only state to prevent hydration issues
  const [isClient, setIsClient] = useState(false);

  // Apply polyfill on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Ensure process.emitWarning exists as a fallback
      if (!window.process) {
        window.process = {} as any;
      }
      
      if (!window.process.emitWarning) {
        window.process.emitWarning = function(warning: any, options: any) {
          console.warn('[ClientBuildLogViewer Warning]:', warning, options);
        };
      }
      
      console.log('ClientBuildLogViewer polyfills applied');
      
      // Mark as client-side rendered
      setIsClient(true);
    }
  }, []);
  
  // Load logs on initial render
  useEffect(() => {
    fetchLogs();
    
    return () => {
      // Cleanup monitoring on unmount
      if (stopMonitoring) {
        stopMonitoring();
      }
    };
  }, [projectId]);
  
  // Select first log if taskId is not provided
  useEffect(() => {
    if (!taskId && logs.length > 0 && !selectedLogId) {
      setSelectedLogId(logs[0].taskId);
    }
  }, [logs, taskId, selectedLogId]);
  
  // Load log content when selectedLogId changes
  useEffect(() => {
    if (selectedLogId) {
      fetchLogContent(selectedLogId);
    }
  }, [selectedLogId]);
  
  // Set up auto-refresh for active logs
  useEffect(() => {
    if (!autoRefresh || !selectedLogId) return;
    
    const intervalId = setInterval(() => {
      if (selectedLogId) {
        fetchLogContent(selectedLogId, false);
      }
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [autoRefresh, selectedLogId, refreshInterval]);

  // Fetch logs for the project
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch logs with filters
      const filters: any = {};
      if (taskType && taskType !== 'all_types') filters.taskType = taskType;
      if (status && status !== 'all_statuses') filters.status = status;
      if (phase) filters.phase = phase;
      if (step) filters.step = step;
      
      const logData = await ClientLoggingService.getProjectLogs(projectId, 100, filters);
      
      // Apply text search filter if needed
      const filteredLogs = searchText 
        ? logData.filter(log => 
            log.command.toLowerCase().includes(searchText.toLowerCase()) ||
            (log.phase && log.phase.toLowerCase().includes(searchText.toLowerCase())) ||
            (log.step && log.step.toLowerCase().includes(searchText.toLowerCase()))
          )
        : logData;
      
      setLogs(filteredLogs);
      
      // If we have logs but no selected log ID, select the first one
      if (filteredLogs.length > 0 && !selectedLogId) {
        setSelectedLogId(filteredLogs[0].taskId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load logs');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch log content for a specific task
  const fetchLogContent = async (taskId: string, showLoading = true) => {
    try {
      if (!taskId || taskId === '') {
        // Don't attempt to fetch logs for empty task IDs
        setLogContent('Please select a log to view details');
        return;
      }
      
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      // Clean up previous monitoring
      if (stopMonitoring) {
        stopMonitoring();
        setStopMonitoring(null);
      }
      
      // Fetch log
      const log = await ClientLoggingService.getBuildLog(taskId);
      
      if (!log) {
        console.warn(`Log not found for taskId: ${taskId}`);
        setError('Log not found or has been removed');
        setLogContent('The requested log was not found. It may have been deleted or never existed.');
        return;
      }
      
      // Set the log content even if it's an error response from the service
      // The service now returns a valid IBuildLogData object with appropriate error message
      setLogContent(log.output || 'No output available');
      
      // Start monitoring for active logs if autoRefresh is enabled
      if (autoRefresh && ['pending', 'running'].includes(log.status)) {
        const stopFn = ClientLoggingService.monitorTask(
          taskId,
          (updatedLog) => {
            if (updatedLog) {
              setLogContent(updatedLog.output || 'No output available');
            }
          },
          refreshInterval
        );
        
        setStopMonitoring(() => stopFn);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load log content');
      setLogContent('Error loading log content. Please try again later.');
      console.error('Error fetching log content:', err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Export log to file
  const exportLog = async () => {
    if (!selectedLogId) return;
    
    try {
      setLoading(true);
      await ClientLoggingService.exportBuildLog(selectedLogId);
    } catch (err: any) {
      setError(err.message || 'Failed to export log');
      console.error('Error exporting log:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchLogs();
    if (selectedLogId) {
      fetchLogContent(selectedLogId);
    }
  };
  
  // Get status badge color using the utility
  const getStatusColor = BuildLogUtils.getStatusColor;

  return (
    <div className="flex flex-col w-full">
      {showFilters && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Build Logs</CardTitle>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCwIcon className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
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
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {logs.length === 0 ? (
                <div className="col-span-4 text-center py-4 text-text-secondary">
                  No logs found with the current filters
                </div>
              ) : (
                <>
                  <div className="col-span-1 border-r overflow-y-auto" style={{ maxHeight: height }}>
                    <div className="space-y-2 pr-2">
                      {logs.map(log => (
                        <div
                          key={log.taskId}
                          className={`p-2 cursor-pointer rounded-md transition-colors ${
                            selectedLogId === log.taskId 
                              ? 'bg-background-secondary border-primary' 
                              : 'hover:bg-background-secondary/50'
                          }`}
                          onClick={() => setSelectedLogId(log.taskId)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate">{log.command}</span>
                            <Badge className={getStatusColor(log.status)}>
                              {log.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-text-secondary mt-1">
                            <ClientTime time={log.startTime} format="datetime" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="col-span-3">
                    {selectedLogId ? (
                      <div className="h-full flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-lg font-medium">Log Details</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={exportLog}
                            disabled={!logContent}
                          >
                            <DownloadIcon className="h-4 w-4 mr-1" />
                            Export
                          </Button>
                        </div>
                        
                        <div 
                          className="flex-1 bg-black text-white font-mono text-sm p-4 rounded-md overflow-auto whitespace-pre-wrap" 
                          style={{ minHeight: '300px', maxHeight: height }}
                        >
                          {loading ? (
                            <div className="flex justify-center items-center h-full">
                              <Spinner size="lg" />
                            </div>
                          ) : error ? (
                            <div className="text-destructive">{error}</div>
                          ) : !logContent ? (
                            <div className="text-text-muted">No output available</div>
                          ) : (
                            logContent
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-text-secondary">
                        Select a log to view details
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientBuildLogViewer; 