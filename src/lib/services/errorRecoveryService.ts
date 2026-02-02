import { Task, ITask } from '@/lib/models/Task'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { LoggingService } from './loggingService'
import { taskEvents } from './taskQueueService'
import { ProjectAutomationService } from './projectAutomationService'
import * as os from 'os'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * Error Recovery Service - Provides advanced error handling and recovery for failed tasks
 * This is part of Phase 5, Step 5 of the GRIP AI Assistant Enhancement Plan
 */
export class ErrorRecoveryService {
  // Error types for categorization
  static ErrorTypes = {
    COMMAND_NOT_FOUND: 'command_not_found',
    DEPENDENCY_MISSING: 'dependency_missing',
    PERMISSION_DENIED: 'permission_denied',
    TIMEOUT: 'timeout',
    RESOURCE_LIMIT: 'resource_limit',
    NETWORK_ERROR: 'network_error',
    BUILD_ERROR: 'build_error',
    TEST_FAILURE: 'test_failure',
    UNKNOWN: 'unknown'
  }

  // Recovery strategies
  static RecoveryStrategies = {
    RETRY: 'retry',
    RETRY_WITH_TIMEOUT: 'retry_with_timeout',
    RETRY_WITH_RESOURCES: 'retry_with_resources',
    CLEANUP_RETRY: 'cleanup_retry',
    FALLBACK_COMMAND: 'fallback_command',
    DEPENDENCY_INSTALL: 'dependency_install',
    CUSTOM_ACTION: 'custom_action',
    MANUAL_INTERVENTION: 'manual_intervention',
    ABORT: 'abort'
  }

  /**
   * Initialize the error recovery service
   */
  static initialize(): void {
    // Subscribe to task failed events
    taskEvents.on('task:failed', ErrorRecoveryService.handleFailedTask)
    console.log('Error Recovery Service initialized')
  }

  /**
   * Shutdown the error recovery service
   */
  static shutdown(): void {
    // Unsubscribe from task failed events
    taskEvents.off('task:failed', ErrorRecoveryService.handleFailedTask)
    console.log('Error Recovery Service shutdown')
  }

  /**
   * Handle a failed task
   * @param task The failed task
   */
  static async handleFailedTask(task: ITask): Promise<void> {
    try {
      // Get the task's build log to analyze the failure
      const buildLog = await ProjectAutomationService.getBuildLog(task._id.toString())
      
      if (!buildLog) {
        console.error(`Error Recovery: No build log found for task ${task._id}`)
        return
      }

      // Log the failure
      await LoggingService.logTaskMessage(
        buildLog.taskId,
        `Error Recovery Service analyzing failure: ${task.lastError || 'Unknown error'}`,
        LoggingService.LogLevel.INFO
      )

      // Analyze the error
      const errorType = ErrorRecoveryService.analyzeError(task, buildLog.output)
      
      // Log the error type
      await LoggingService.logTaskMessage(
        buildLog.taskId,
        `Error categorized as: ${errorType}`,
        LoggingService.LogLevel.INFO
      )

      // Determine recovery strategy
      const recoveryStrategy = ErrorRecoveryService.determineRecoveryStrategy(errorType, task)
      
      // Log the recovery strategy
      await LoggingService.logTaskMessage(
        buildLog.taskId,
        `Selected recovery strategy: ${recoveryStrategy}`,
        LoggingService.LogLevel.INFO
      )

      // Execute recovery strategy
      const recoverySuccess = await ErrorRecoveryService.executeRecoveryStrategy(task, recoveryStrategy, buildLog)
      
      if (recoverySuccess) {
        await LoggingService.logTaskMessage(
          buildLog.taskId,
          `Recovery strategy executed successfully. Task will be retried.`,
          LoggingService.LogLevel.INFO
        )
      } else {
        await LoggingService.logTaskMessage(
          buildLog.taskId,
          `Recovery strategy failed. Max retries may be reached or manual intervention required.`,
          LoggingService.LogLevel.WARNING
        )
      }
    } catch (error) {
      console.error(`Error in ErrorRecoveryService.handleFailedTask:`, error)
    }
  }

  /**
   * Analyze an error from a failed task
   * @param task The failed task
   * @param output The task output
   * @returns The error type
   */
  static analyzeError(task: ITask, output: string): string {
    // Check for common error patterns in the output
    const outputLower = output.toLowerCase()
    const errorMessage = (task.lastError || '').toLowerCase()
    
    if (outputLower.includes('command not found') || errorMessage.includes('command not found') || 
        outputLower.includes('not recognized') || errorMessage.includes('not recognized')) {
      return ErrorRecoveryService.ErrorTypes.COMMAND_NOT_FOUND
    }
    
    if (outputLower.includes('cannot find module') || 
        outputLower.includes('module not found') || 
        outputLower.includes('dependency not found') ||
        outputLower.includes('failed to resolve')) {
      return ErrorRecoveryService.ErrorTypes.DEPENDENCY_MISSING
    }
    
    if (outputLower.includes('permission denied') || 
        outputLower.includes('access denied') || 
        errorMessage.includes('eacces')) {
      return ErrorRecoveryService.ErrorTypes.PERMISSION_DENIED
    }
    
    if (outputLower.includes('timeout') || 
        errorMessage.includes('timeout') || 
        errorMessage.includes('timed out')) {
      return ErrorRecoveryService.ErrorTypes.TIMEOUT
    }
    
    if (outputLower.includes('memory limit exceeded') || 
        outputLower.includes('out of memory') || 
        outputLower.includes('disk space') ||
        errorMessage.includes('resource limit')) {
      return ErrorRecoveryService.ErrorTypes.RESOURCE_LIMIT
    }
    
    if (outputLower.includes('network error') || 
        outputLower.includes('connection refused') || 
        outputLower.includes('unable to connect') ||
        errorMessage.includes('network')) {
      return ErrorRecoveryService.ErrorTypes.NETWORK_ERROR
    }
    
    if (outputLower.includes('build failed') || 
        outputLower.includes('compilation failed') || 
        outputLower.includes('syntax error')) {
      return ErrorRecoveryService.ErrorTypes.BUILD_ERROR
    }
    
    if (outputLower.includes('test failed') || 
        outputLower.includes('assertion failed') || 
        outputLower.includes('expect') && outputLower.includes('to equal')) {
      return ErrorRecoveryService.ErrorTypes.TEST_FAILURE
    }
    
    // If we can't categorize, return unknown
    return ErrorRecoveryService.ErrorTypes.UNKNOWN
  }

  /**
   * Determine the appropriate recovery strategy for an error
   * @param errorType The type of error
   * @param task The failed task
   * @returns The recovery strategy
   */
  static determineRecoveryStrategy(errorType: string, task: ITask): string {
    // Check if we've exceeded max retries
    if (task.retryCount >= task.maxRetries) {
      return ErrorRecoveryService.RecoveryStrategies.MANUAL_INTERVENTION
    }
    
    // Select strategy based on error type
    switch (errorType) {
      case ErrorRecoveryService.ErrorTypes.COMMAND_NOT_FOUND:
        return task.retryCount < 1 
          ? ErrorRecoveryService.RecoveryStrategies.DEPENDENCY_INSTALL 
          : ErrorRecoveryService.RecoveryStrategies.MANUAL_INTERVENTION
      
      case ErrorRecoveryService.ErrorTypes.DEPENDENCY_MISSING:
        return ErrorRecoveryService.RecoveryStrategies.DEPENDENCY_INSTALL
      
      case ErrorRecoveryService.ErrorTypes.PERMISSION_DENIED:
        return task.retryCount < 1
          ? ErrorRecoveryService.RecoveryStrategies.CLEANUP_RETRY
          : ErrorRecoveryService.RecoveryStrategies.MANUAL_INTERVENTION
      
      case ErrorRecoveryService.ErrorTypes.TIMEOUT:
        return ErrorRecoveryService.RecoveryStrategies.RETRY_WITH_TIMEOUT
      
      case ErrorRecoveryService.ErrorTypes.RESOURCE_LIMIT:
        return ErrorRecoveryService.RecoveryStrategies.RETRY_WITH_RESOURCES
      
      case ErrorRecoveryService.ErrorTypes.NETWORK_ERROR:
        // Network errors are often transient, retry with exponential backoff
        return ErrorRecoveryService.RecoveryStrategies.RETRY
      
      case ErrorRecoveryService.ErrorTypes.BUILD_ERROR:
        // Build errors usually indicate code issues, needs manual intervention
        return task.retryCount < 1
          ? ErrorRecoveryService.RecoveryStrategies.CLEANUP_RETRY
          : ErrorRecoveryService.RecoveryStrategies.MANUAL_INTERVENTION
      
      case ErrorRecoveryService.ErrorTypes.TEST_FAILURE:
        // Test failures usually indicate code issues, needs manual intervention
        return ErrorRecoveryService.RecoveryStrategies.MANUAL_INTERVENTION
      
      default:
        // For unknown errors, retry a few times then require manual intervention
        return task.retryCount < 2
          ? ErrorRecoveryService.RecoveryStrategies.RETRY
          : ErrorRecoveryService.RecoveryStrategies.MANUAL_INTERVENTION
    }
  }

  /**
   * Execute a recovery strategy
   * @param task The failed task
   * @param strategy The recovery strategy to execute
   * @param buildLog The build log of the failed task
   * @returns True if the recovery was successful
   */
  static async executeRecoveryStrategy(
    task: ITask, 
    strategy: string,
    buildLog: any
  ): Promise<boolean> {
    try {
      await connectToDatabase()
      
      // Log the recovery attempt
      await LoggingService.logTaskMessage(
        buildLog.taskId,
        `Executing recovery strategy: ${strategy}`,
        LoggingService.LogLevel.INFO
      )
      
      switch (strategy) {
        case ErrorRecoveryService.RecoveryStrategies.RETRY:
          return await ErrorRecoveryService.retryTask(task, buildLog.taskId)
        
        case ErrorRecoveryService.RecoveryStrategies.RETRY_WITH_TIMEOUT:
          return await ErrorRecoveryService.retryWithIncreasedTimeout(task, buildLog.taskId)
        
        case ErrorRecoveryService.RecoveryStrategies.RETRY_WITH_RESOURCES:
          return await ErrorRecoveryService.retryWithIncreasedResources(task, buildLog.taskId)
        
        case ErrorRecoveryService.RecoveryStrategies.CLEANUP_RETRY:
          return await ErrorRecoveryService.cleanupAndRetry(task, buildLog.taskId)
        
        case ErrorRecoveryService.RecoveryStrategies.DEPENDENCY_INSTALL:
          return await ErrorRecoveryService.installDependenciesAndRetry(task, buildLog.taskId)
        
        case ErrorRecoveryService.RecoveryStrategies.FALLBACK_COMMAND:
          return await ErrorRecoveryService.retryWithFallbackCommand(task, buildLog.taskId)
        
        case ErrorRecoveryService.RecoveryStrategies.MANUAL_INTERVENTION:
          return await ErrorRecoveryService.requestManualIntervention(task, buildLog.taskId)
        
        case ErrorRecoveryService.RecoveryStrategies.ABORT:
          return await ErrorRecoveryService.abortTask(task, buildLog.taskId)
        
        default:
          await LoggingService.logTaskMessage(
            buildLog.taskId,
            `Unknown recovery strategy: ${strategy}. Defaulting to standard retry.`,
            LoggingService.LogLevel.WARNING
          )
          return await ErrorRecoveryService.retryTask(task, buildLog.taskId)
      }
    } catch (error) {
      console.error(`Error executing recovery strategy ${strategy}:`, error)
      return false
    }
  }

  /**
   * Retry a task with standard settings
   * @param task The task to retry
   * @param logId The log ID for logging messages
   * @returns True if the retry was scheduled
   */
  static async retryTask(task: ITask, logId: string): Promise<boolean> {
    try {
      // Calculate exponential backoff delay
      const retryDelay = Math.pow(2, task.retryCount) * 1000
      
      await LoggingService.logTaskMessage(
        logId,
        `Scheduling retry with ${retryDelay}ms delay (attempt ${task.retryCount + 1}/${task.maxRetries})`,
        LoggingService.LogLevel.INFO
      )
      
      // Schedule task for retry
      setTimeout(async () => {
        try {
          const updatedTask = await Task.findById(task._id)
          if (!updatedTask) {
            console.error(`Task ${task._id} not found for retry`)
            return
          }
          
          updatedTask.status = 'queued'
          updatedTask.lastError = `Previous error: ${updatedTask.lastError}`
          await updatedTask.save()
          
          await LoggingService.logTaskMessage(
            logId,
            `Task requeued for retry`,
            LoggingService.LogLevel.INFO
          )
        } catch (retryError) {
          console.error(`Error scheduling retry for task ${task._id}:`, retryError)
        }
      }, retryDelay)
      
      return true
    } catch (error) {
      console.error(`Error in retryTask for ${task._id}:`, error)
      return false
    }
  }

  /**
   * Retry a task with increased timeout
   * @param task The task to retry
   * @param logId The log ID for logging messages
   * @returns True if the retry was scheduled
   */
  static async retryWithIncreasedTimeout(task: ITask, logId: string): Promise<boolean> {
    try {
      // Increase timeout by 50% each retry
      const currentTimeout = task.timeout || 5 * 60 * 1000 // Default 5 minutes
      const newTimeout = Math.floor(currentTimeout * 1.5)
      
      await LoggingService.logTaskMessage(
        logId,
        `Increasing task timeout from ${currentTimeout}ms to ${newTimeout}ms`,
        LoggingService.LogLevel.INFO
      )
      
      // Update task with new timeout
      const updatedTask = await Task.findById(task._id)
      if (!updatedTask) {
        return false
      }
      
      updatedTask.timeout = newTimeout
      await updatedTask.save()
      
      // Schedule standard retry
      return await ErrorRecoveryService.retryTask(task, logId)
    } catch (error) {
      console.error(`Error in retryWithIncreasedTimeout for ${task._id}:`, error)
      return false
    }
  }

  /**
   * Retry a task with increased resource allocation
   * @param task The task to retry
   * @param logId The log ID for logging messages
   * @returns True if the retry was scheduled
   */
  static async retryWithIncreasedResources(task: ITask, logId: string): Promise<boolean> {
    try {
      // Currently we don't have direct resource allocation control
      // Just add environment variables to suggest higher resource usage
      await LoggingService.logTaskMessage(
        logId,
        `Adding resource-related environment variables to task`,
        LoggingService.LogLevel.INFO
      )
      
      // Update task with resource-related environment variables
      const updatedTask = await Task.findById(task._id)
      if (!updatedTask) {
        return false
      }
      
      // Environment might be undefined
      if (!updatedTask.metadata.environment) {
        updatedTask.metadata.environment = {}
      }
      
      // Add/update resource-related environment variables
      const env = updatedTask.metadata.environment
      env['NODE_OPTIONS'] = env['NODE_OPTIONS'] || ''
      env['NODE_OPTIONS'] += ' --max-old-space-size=4096' // Increase Node.js memory limit
      
      // For build systems that respect these variables
      env['MEMORY_LIMIT'] = '4G'
      env['CPU_LIMIT'] = '2'
      
      await updatedTask.save()
      
      // Schedule standard retry
      return await ErrorRecoveryService.retryTask(updatedTask, logId)
    } catch (error) {
      console.error(`Error in retryWithIncreasedResources for ${task._id}:`, error)
      return false
    }
  }

  /**
   * Clean up workspace and retry task
   * @param task The task to retry
   * @param logId The log ID for logging messages
   * @returns True if cleanup and retry was scheduled
   */
  static async cleanupAndRetry(task: ITask, logId: string): Promise<boolean> {
    try {
      await LoggingService.logTaskMessage(
        logId,
        `Performing workspace cleanup before retry`,
        LoggingService.LogLevel.INFO
      )
      
      // Get working directory
      const workDir = task.workingDirectory || os.tmpdir()
      
      // Check if directory exists
      try {
        await fs.access(workDir)
        
        // Clean up temporary files
        const files = await fs.readdir(workDir)
        
        for (const file of files) {
          // Only remove temporary files
          if (file.startsWith('temp') || file.startsWith('tmp') || file.endsWith('.tmp')) {
            try {
              const filePath = path.join(workDir, file)
              const stats = await fs.stat(filePath)
              
              if (stats.isFile()) {
                await fs.unlink(filePath)
                await LoggingService.logTaskMessage(
                  logId,
                  `Removed temporary file: ${file}`,
                  LoggingService.LogLevel.INFO
                )
              }
            } catch (cleanupError) {
              console.error(`Error cleaning up file ${file}:`, cleanupError)
            }
          }
        }
      } catch (dirError) {
        // Directory doesn't exist, create it
        await fs.mkdir(workDir, { recursive: true })
      }
      
      // Schedule standard retry
      return await ErrorRecoveryService.retryTask(task, logId)
    } catch (error) {
      console.error(`Error in cleanupAndRetry for ${task._id}:`, error)
      return false
    }
  }

  /**
   * Install missing dependencies and retry task
   * @param task The task to retry
   * @param logId The log ID for logging messages
   * @returns True if dependency installation and retry was scheduled
   */
  static async installDependenciesAndRetry(task: ITask, logId: string): Promise<boolean> {
    try {
      await LoggingService.logTaskMessage(
        logId,
        `Attempting to install missing dependencies before retry`,
        LoggingService.LogLevel.INFO
      )
      
      // Determine the package manager and dependencies based on the task
      let installCommand = ''
      const workDir = task.workingDirectory || os.tmpdir()
      
      // Try to detect the package manager
      if (task.command.startsWith('npm') || task.command.includes('npx')) {
        installCommand = 'npm install'
      } else if (task.command.startsWith('yarn')) {
        installCommand = 'yarn install'
      } else if (task.command.startsWith('pnpm')) {
        installCommand = 'pnpm install'
      } else if (task.command.startsWith('pip') || task.command.startsWith('python')) {
        installCommand = 'pip install -r requirements.txt'
      }
      
      if (installCommand) {
        // Create a dependency installation task
        const dependencyTask = new Task({
          projectId: task.projectId,
          name: `Install Dependencies for ${task.name}`,
          description: `Automatically created to install dependencies for failed task ${task._id}`,
          type: 'build',
          priority: 'high',
          command: installCommand,
          workingDirectory: workDir,
          retryCount: 0,
          maxRetries: 1,
          dependencies: [],
          metadata: {
            createdBy: 'ErrorRecoveryService',
            phase: task.metadata.phase,
            step: task.metadata.step,
            files: task.metadata.files,
            environment: task.metadata.environment
          }
        })
        
        await dependencyTask.save()
        
        await LoggingService.logTaskMessage(
          logId,
          `Created dependency installation task: ${dependencyTask._id}`,
          LoggingService.LogLevel.INFO
        )
        
        // Make the original task depend on the new task
        const updatedTask = await Task.findById(task._id)
        if (!updatedTask) {
          return false
        }
        
        updatedTask.dependencies.push(dependencyTask._id.toString())
        updatedTask.status = 'queued'
        await updatedTask.save()
        
        return true
      } else {
        await LoggingService.logTaskMessage(
          logId,
          `Could not determine appropriate package manager for dependency installation`,
          LoggingService.LogLevel.WARNING
        )
        
        // Fall back to standard retry
        return await ErrorRecoveryService.retryTask(task, logId)
      }
    } catch (error) {
      console.error(`Error in installDependenciesAndRetry for ${task._id}:`, error)
      return false
    }
  }

  /**
   * Retry with a fallback command
   * @param task The task to retry
   * @param logId The log ID for logging messages
   * @returns True if fallback retry was scheduled
   */
  static async retryWithFallbackCommand(task: ITask, logId: string): Promise<boolean> {
    try {
      // Attempt to generate a fallback command based on the original command
      let fallbackCommand = ''
      
      // Check common command patterns and provide alternatives
      if (task.command.includes('npm run build')) {
        fallbackCommand = 'npm run build -- --no-lint'
      } else if (task.command.includes('npm run test')) {
        fallbackCommand = 'npm run test -- --no-watch'
      } else if (task.command.includes('npm run dev')) {
        fallbackCommand = 'npm run build'
      } else if (task.command.includes('yarn build')) {
        fallbackCommand = 'yarn build --no-lint'
      } else if (task.command.includes('next build')) {
        fallbackCommand = 'next build --no-lint'
      }
      
      if (fallbackCommand) {
        await LoggingService.logTaskMessage(
          logId,
          `Using fallback command: ${fallbackCommand}`,
          LoggingService.LogLevel.INFO
        )
        
        // Update task with fallback command
        const updatedTask = await Task.findById(task._id)
        if (!updatedTask) {
          return false
        }
        
        updatedTask.command = fallbackCommand
        await updatedTask.save()
        
        // Schedule standard retry
        return await ErrorRecoveryService.retryTask(updatedTask, logId)
      } else {
        await LoggingService.logTaskMessage(
          logId,
          `No fallback command available for: ${task.command}`,
          LoggingService.LogLevel.WARNING
        )
        
        // Fall back to standard retry
        return await ErrorRecoveryService.retryTask(task, logId)
      }
    } catch (error) {
      console.error(`Error in retryWithFallbackCommand for ${task._id}:`, error)
      return false
    }
  }

  /**
   * Request manual intervention for a failed task
   * @param task The task that needs manual intervention
   * @param logId The log ID for logging messages
   * @returns True if intervention request was logged
   */
  static async requestManualIntervention(task: ITask, logId: string): Promise<boolean> {
    try {
      await LoggingService.logTaskMessage(
        logId,
        `Task requires manual intervention after ${task.retryCount} failed attempts`,
        LoggingService.LogLevel.WARNING
      )
      
      // Update task status to require manual intervention
      const updatedTask = await Task.findById(task._id)
      if (!updatedTask) {
        return false
      }
      
      updatedTask.status = 'failed'
      
      // Add metadata to indicate manual intervention is required
      if (!updatedTask.metadata.labels) {
        updatedTask.metadata.labels = []
      }
      
      if (!updatedTask.metadata.labels.includes('requires_intervention')) {
        updatedTask.metadata.labels.push('requires_intervention')
      }
      
      await updatedTask.save()
      
      // Create notification (in future, this could send email/slack/etc.)
      await LoggingService.logTaskMessage(
        logId,
        `MANUAL INTERVENTION REQUIRED: Task ${task._id} (${task.name}) has failed ${task.retryCount} times and requires manual intervention. Last error: ${task.lastError}`,
        LoggingService.LogLevel.CRITICAL
      )
      
      return true
    } catch (error) {
      console.error(`Error in requestManualIntervention for ${task._id}:`, error)
      return false
    }
  }

  /**
   * Abort a task completely
   * @param task The task to abort
   * @param logId The log ID for logging messages
   * @returns True if task was successfully aborted
   */
  static async abortTask(task: ITask, logId: string): Promise<boolean> {
    try {
      await LoggingService.logTaskMessage(
        logId,
        `Aborting task after ${task.retryCount} failed attempts`,
        LoggingService.LogLevel.WARNING
      )
      
      // Update task status to cancelled
      const updatedTask = await Task.findById(task._id)
      if (!updatedTask) {
        return false
      }
      
      updatedTask.status = 'cancelled'
      updatedTask.lastError = `Task aborted after ${task.retryCount} failed attempts. Last error: ${task.lastError}`
      
      await updatedTask.save()
      
      // Cancel dependent tasks
      const dependentTasks = await Task.find({
        dependencies: task._id.toString(),
        status: { $nin: ['completed', 'failed', 'cancelled'] }
      })
      
      for (const dependentTask of dependentTasks) {
        dependentTask.status = 'cancelled'
        dependentTask.lastError = `Cancelled because dependent task ${task._id} was aborted`
        await dependentTask.save()
        
        await LoggingService.logTaskMessage(
          logId,
          `Cancelled dependent task: ${dependentTask._id} (${dependentTask.name})`,
          LoggingService.LogLevel.INFO
        )
      }
      
      return true
    } catch (error) {
      console.error(`Error in abortTask for ${task._id}:`, error)
      return false
    }
  }

  /**
   * Checks if a task is eligible for recovery
   * @param task The task to check
   * @returns True if the task is eligible for recovery
   */
  static isEligibleForRecovery(task: ITask): boolean {
    // Check if task is already in a terminal state
    if (['completed', 'cancelled'].includes(task.status)) {
      return false
    }
    
    // Check if max retries exceeded
    if (task.retryCount >= task.maxRetries) {
      return false
    }
    
    return true
  }
} 