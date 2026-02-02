'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  PlayIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  RefreshCwIcon,
  AlertCircleIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useWebSocket } from '@/hooks/useWebSocket'

// Phase 8, Step 2: Task Progress Indicator

interface Task {
  _id: string
  name: string
  description: string
  status: 'queued' | 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  type: string
  command: string
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
  output?: string
  projectId: string
}

interface TaskProgressIndicatorProps {
  projectId?: string;  // Make optional with fallback
  className?: string;
}

export function TaskProgressIndicator({ 
  projectId = '', // Default to empty string if not provided
  className 
}: TaskProgressIndicatorProps) {
  const [activeTasks, setActiveTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const { isConnected } = useWebSocket(projectId)
  const websocketRef = useRef<boolean>(false)
  const connectionAttemptedRef = useRef<boolean>(false)
  const { toast } = useToast()

  // Check if websocket is disabled via environment variable
  const [isWebsocketDisabled, setIsWebsocketDisabled] = useState<boolean>(false)
  
  useEffect(() => {
    // Run this check only once
    if (!connectionAttemptedRef.current) {
      connectionAttemptedRef.current = true;
      
      // Check console logs for "WebSocket connections are disabled" message
      const originalConsoleLog = console.log;
      console.log = function(...args) {
        if (args.length > 0 && typeof args[0] === 'string' && 
            args[0].includes('WebSocket connections are disabled')) {
          setIsWebsocketDisabled(true);
        }
        originalConsoleLog.apply(console, args);
      };
      
      // Restore after initial check
      setTimeout(() => {
        console.log = originalConsoleLog;
      }, 1000);
    }
  }, []);

  // Fetch active tasks
  const fetchActiveTasks = useCallback(async () => {
    // Don't try to fetch if websocket is disabled
    if (isWebsocketDisabled) return;
    
    if (!projectId) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tasks?projectId=${projectId}&status=active,running,queued`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }
      
      const data = await response.json();
      setActiveTasks(data);
    } catch (error: unknown) {
      console.error('Error fetching tasks:', error);
      
      // Only set error if it's not a WebSocket disabled or connection issue
      if (!isWebsocketDisabled) {
        setError(error instanceof Error ? error.message : 'Unknown error');
        
        // Show toast only for unexpected errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('WebSocket')) {
          toast({
            title: 'Error fetching tasks',
            description: errorMessage,
            variant: 'destructive'
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast, isWebsocketDisabled]);

  // Initial fetch
  useEffect(() => {
    if (projectId && !isWebsocketDisabled) {
      fetchActiveTasks();
    }
  }, [fetchActiveTasks, projectId, isWebsocketDisabled]);

  // Only render component if there are tasks or it's expanded
  // Also don't render if websocket is disabled
  if ((activeTasks.length === 0 && !expanded && !isLoading) || isWebsocketDisabled) {
    return null;
  }
  
  return (
    <div className={cn("", className)} data-testid="task-progress-indicator">
      <Card 
        className="border-t border-b-0 border-l-0 border-r-0 rounded-none shadow-none" 
        onClick={() => setExpanded(!expanded)}
      >
        <div className="px-2 py-1 flex items-center justify-between cursor-pointer hover:bg-accent/50">
          <div className="flex items-center gap-1">
            <RefreshCwIcon 
              className={cn(
                'h-3 w-3 text-primary',
                isLoading ? 'animate-spin' : ''
              )}
            />
            <span className="font-medium text-[10px] text-primary">
              {activeTasks.length > 0 
                ? `${activeTasks.length} active task${activeTasks.length > 1 ? 's' : ''}`
                : 'No active tasks'}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
              onClick={(e) => {
                e.stopPropagation()
                fetchActiveTasks()
              }}
            >
              <RefreshCwIcon className="h-2 w-2" />
              <span className="sr-only">Refresh</span>
            </Button>
            
            {expanded ? (
              <ChevronUpIcon className="h-3 w-3" />
            ) : (
              <ChevronDownIcon className="h-3 w-3" />
            )}
          </div>
        </div>
        
        {expanded && (
          <div className="p-1 space-y-1">
            {error && (
              <div className="bg-destructive/10 p-1 rounded text-[10px] text-destructive flex items-center gap-1">
                <AlertCircleIcon className="h-2 w-2" />
                {error}
              </div>
            )}
            
            {isLoading && activeTasks.length === 0 ? (
              <div className="py-0.5 flex justify-center items-center">
                <RefreshCwIcon className="h-2 w-2 animate-spin text-primary" />
                <span className="ml-1 text-[10px]">Loading tasks...</span>
              </div>
            ) : (
              <div className="space-y-1">
                {activeTasks.map((task) => (
                  <div key={task._id} className="border rounded overflow-hidden text-[10px]">
                    <div className="flex items-center justify-between p-0.5 bg-muted/30">
                      <div className="flex items-center gap-1">
                        {task.status === 'running' && <PlayIcon className="h-2 w-2 text-primary" />}
                        {task.status === 'completed' && <CheckCircleIcon className="h-2 w-2 text-success" />}
                        {task.status === 'failed' && <XCircleIcon className="h-2 w-2 text-destructive" />}
                        {(task.status === 'queued' || task.status === 'scheduled') && <ClockIcon className="h-2 w-2 text-accent-amber" />}
                        
                        <span className="font-medium text-[10px] truncate max-w-[100px]">{task.name}</span>
                      </div>
                      
                      <Badge
                        variant={
                          task.status === 'completed' ? 'success' :
                          task.status === 'failed' ? 'destructive' :
                          task.status === 'running' ? 'default' : 'secondary'
                        }
                        className="text-[8px] py-0 h-3 px-1"
                      >
                        {task.status}
                      </Badge>
                    </div>
                    
                    {task.status === 'running' && (
                      <Progress value={task.progress} className="h-0.5 mt-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="text-[8px] text-muted-foreground">
              <Link href="/dashboard/admin/tasks" className="text-primary hover:underline">View all tasks</Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
} 