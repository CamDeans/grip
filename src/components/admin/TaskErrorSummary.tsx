import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from '@/components/ui/card'
import { ErrorRecoveryService } from '@/lib/services/errorRecoveryService'
import { ITask } from '@/lib/models/Task'
import { LoggingService } from '@/lib/services/loggingService'

interface TaskErrorSummaryProps {
  task: ITask;
  onManualRecover?: () => void;
  onViewLog?: () => void;
}

export function TaskErrorSummary({ task, onManualRecover, onViewLog }: TaskErrorSummaryProps) {
  const [errorType, setErrorType] = useState<string>('unknown')
  const [recoveryStrategy, setRecoveryStrategy] = useState<string>('')
  const [logOutput, setLogOutput] = useState<string>('')
  
  // Get error analysis when task changes
  useEffect(() => {
    if (task && task.status === 'failed' && task.lastError) {
      // Analyze the error using ErrorRecoveryService
      analyzeError()
    }
  }, [task])
  
  // Analyze error to get type and recommended recovery strategy
  const analyzeError = async () => {
    try {
      // Get error type based on error message
      const errorMsg = task.lastError || ''
      
      // Use simplified analysis since we don't have full output here
      // In a real implementation, we would fetch the full log output
      let detectedErrorType = 'unknown'
      
      if (errorMsg.toLowerCase().includes('command not found') || 
          errorMsg.toLowerCase().includes('not recognized')) {
        detectedErrorType = 'command_not_found'
      } else if (errorMsg.toLowerCase().includes('module not found') || 
                errorMsg.toLowerCase().includes('dependency not found')) {
        detectedErrorType = 'dependency_missing'
      } else if (errorMsg.toLowerCase().includes('permission denied') || 
                errorMsg.toLowerCase().includes('access denied')) {
        detectedErrorType = 'permission_denied'
      } else if (errorMsg.toLowerCase().includes('timeout') || 
                errorMsg.toLowerCase().includes('timed out')) {
        detectedErrorType = 'timeout'
      } else if (errorMsg.toLowerCase().includes('memory') || 
                errorMsg.toLowerCase().includes('disk space')) {
        detectedErrorType = 'resource_limit'
      } else if (errorMsg.toLowerCase().includes('network') || 
                errorMsg.toLowerCase().includes('connection')) {
        detectedErrorType = 'network_error'
      } else if (errorMsg.toLowerCase().includes('build failed') || 
                errorMsg.toLowerCase().includes('compilation')) {
        detectedErrorType = 'build_error'
      } else if (errorMsg.toLowerCase().includes('test failed') || 
                errorMsg.toLowerCase().includes('assertion')) {
        detectedErrorType = 'test_failure'
      }
      
      setErrorType(detectedErrorType)
      
      // Determine recovery strategy
      let strategy = ''
      
      if (task.retryCount >= task.maxRetries) {
        strategy = 'manual_intervention'
      } else {
        switch (detectedErrorType) {
          case 'command_not_found':
            strategy = task.retryCount < 1 ? 'dependency_install' : 'manual_intervention'
            break
          case 'dependency_missing':
            strategy = 'dependency_install'
            break
          case 'permission_denied':
            strategy = task.retryCount < 1 ? 'cleanup_retry' : 'manual_intervention'
            break
          case 'timeout':
            strategy = 'retry_with_timeout'
            break
          case 'resource_limit':
            strategy = 'retry_with_resources'
            break
          case 'network_error':
            strategy = 'retry'
            break
          case 'build_error':
          case 'test_failure':
            strategy = task.retryCount < 1 ? 'cleanup_retry' : 'manual_intervention'
            break
          default:
            strategy = task.retryCount < 2 ? 'retry' : 'manual_intervention'
            break
        }
      }
      
      setRecoveryStrategy(strategy)
    } catch (error) {
      console.error('Error analyzing task failure:', error)
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
      case 'queued':
        return 'bg-yellow-500'
      case 'cancelled':
        return 'bg-text-muted'
      default:
        return 'bg-border'
    }
  }
  
  // Get error type display name
  const getErrorTypeDisplay = (type: string) => {
    switch (type) {
      case 'command_not_found':
        return 'Command Not Found'
      case 'dependency_missing':
        return 'Missing Dependency'
      case 'permission_denied':
        return 'Permission Denied'
      case 'timeout':
        return 'Execution Timeout'
      case 'resource_limit':
        return 'Resource Limit Exceeded'
      case 'network_error':
        return 'Network Error'
      case 'build_error':
        return 'Build Error'
      case 'test_failure':
        return 'Test Failure'
      default:
        return 'Unknown Error'
    }
  }
  
  // Get recovery strategy display name
  const getRecoveryStrategyDisplay = (strategy: string) => {
    switch (strategy) {
      case 'retry':
        return 'Automatic Retry'
      case 'retry_with_timeout':
        return 'Retry with Increased Timeout'
      case 'retry_with_resources':
        return 'Retry with Increased Resources'
      case 'cleanup_retry':
        return 'Cleanup and Retry'
      case 'dependency_install':
        return 'Install Dependencies and Retry'
      case 'fallback_command':
        return 'Retry with Fallback Command'
      case 'manual_intervention':
        return 'Manual Intervention Required'
      case 'abort':
        return 'Abort Task'
      default:
        return 'Unknown Strategy'
    }
  }
  
  // Handle manual recovery attempt
  const handleManualRecovery = () => {
    if (onManualRecover) {
      onManualRecover()
    }
  }
  
  // View task logs
  const handleViewLogs = () => {
    if (onViewLog) {
      onViewLog()
    }
  }
  
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Task Error Summary</CardTitle>
          <Badge className={getStatusColor(task.status)}>
            {task.status.toUpperCase()}
          </Badge>
        </div>
        <CardDescription>
          {task.name} {task.retryCount > 0 && `(Attempt ${task.retryCount}/${task.maxRetries})`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-sm text-text-muted">Command</h3>
            <p className="text-sm bg-background-tertiary p-2 rounded font-mono">
              {task.command} {task.args?.join(' ')}
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-sm text-text-muted">Error Message</h3>
            <p className="text-sm bg-destructive/10 text-destructive p-2 rounded">
              {task.lastError || 'Unknown error'}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-sm text-text-muted">Error Type</h3>
              <Badge variant="outline" className="mt-1">
                {getErrorTypeDisplay(errorType)}
              </Badge>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-text-muted">Recovery Strategy</h3>
              <Badge variant="outline" className="mt-1">
                {getRecoveryStrategyDisplay(recoveryStrategy)}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleViewLogs}>
          View Logs
        </Button>
        
        {recoveryStrategy === 'manual_intervention' && (
          <Button variant="default" onClick={handleManualRecovery}>
            Manually Recover
          </Button>
        )}
      </CardFooter>
    </Card>
  )
} 