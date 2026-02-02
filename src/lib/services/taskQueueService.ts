import { ObjectId } from 'mongodb'
import { Task, ITask, ITaskData } from '@/lib/models/Task'
import { connectToDatabase } from '@/lib/mongodb'
import { EventEmitter } from 'events'
import TaskRunnerService from './taskRunnerService'

/**
 * Task Queue Service - Implements background task queue for automation
 * Part of Phase 5, Step 1 of the G.R.I.P. AI Assistant Enhancement Plan
 */

// Create a singleton event emitter for task events
export const taskEvents = new EventEmitter()

// Task queue status interface
export interface ITaskQueueStatus {
  queued: number;
  scheduled: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  totalActive: number;
  totalProcessed: number;
}

// Task creation parameters interface
export interface ICreateTaskParams {
  projectId: string;
  name: string;
  description: string;
  type: 'build' | 'test' | 'deploy' | 'generate' | 'analyze' | 'other';
  priority?: 'low' | 'normal' | 'high' | 'critical';
  command: string;
  args?: string[];
  workingDirectory?: string;
  scheduledFor?: Date;
  timeout?: number;
  maxRetries?: number;
  dependencies?: string[];
  metadata: {
    createdBy: string;
    phase?: string;
    step?: string;
    files?: string[];
    labels?: string[];
    environment?: Record<string, string>;
  };
}

// In-memory task tracking
const runningTasks = new Map<string, ITask>()
const processingLock = new Set<string>()
let isQueueRunning = false
let concurrencyLimit = 5

/**
 * Initialize the task queue and start processing
 * @param options Configuration options for the task queue
 */
export async function initializeTaskQueue(options?: { concurrency?: number }) {
  if (options?.concurrency) {
    concurrencyLimit = options.concurrency
  }

  if (!isQueueRunning) {
    isQueueRunning = true
    console.log(`Task queue initialized with concurrency limit of ${concurrencyLimit}`)
    
    // Register event listeners
    taskEvents.on('task:completed', handleTaskCompleted)
    taskEvents.on('task:failed', handleTaskFailed)
    
    // Start the queue processing
    setImmediate(processQueue)
  }
}

/**
 * Stop the task queue
 */
export function stopTaskQueue() {
  isQueueRunning = false
  console.log('Task queue stopped')
  
  // Remove event listeners
  taskEvents.removeListener('task:completed', handleTaskCompleted)
  taskEvents.removeListener('task:failed', handleTaskFailed)
}

/**
 * Process the next tasks in the queue
 */
async function processQueue() {
  if (!isQueueRunning) return
  
  try {
    await connectToDatabase()
    
    // Check how many slots are available
    const availableSlots = concurrencyLimit - runningTasks.size
    
    if (availableSlots <= 0) {
      // Queue is full, wait and check again
      setTimeout(processQueue, 1000)
      return
    }
    
    // Find eligible tasks with no pending dependencies
    const eligibleTasks = await findEligibleTasks(availableSlots)
    
    if (eligibleTasks.length === 0) {
      // No eligible tasks, wait and check again
      setTimeout(processQueue, 1000)
      return
    }
    
    // Process eligible tasks
    for (const task of eligibleTasks) {
      // Skip if task is already being processed
      if (processingLock.has(task._id.toString())) continue
      
      // Add to processing lock
      processingLock.add(task._id.toString())
      
      // Update task status to running
      task.status = 'running'
      task.startTime = new Date()
      await task.save()
      
      // Add to running tasks
      runningTasks.set(task._id.toString(), task)
      
      // Execute task asynchronously
      executeTask(task).catch(error => {
        console.error(`Error executing task ${task._id.toString()}:`, error)
      })
    }
    
    // Continue processing queue
    setImmediate(processQueue)
  } catch (error) {
    console.error('Error processing task queue:', error)
    
    // Retry after delay
    setTimeout(processQueue, 5000)
  }
}

/**
 * Find eligible tasks that can be executed
 * @param limit Maximum number of tasks to return
 * @returns Array of eligible tasks
 */
async function findEligibleTasks(limit: number): Promise<ITask[]> {
  try {
    // Find queued or scheduled tasks that are ready to run
    const now = new Date()
    
    const tasks = await Task.find({
      $or: [
        { status: 'queued' },
        { 
          status: 'scheduled',
          scheduledFor: { $lte: now }
        }
      ]
    })
    .sort({ priority: -1, scheduledFor: 1, createdAt: 1 })
    .limit(limit * 2) // Fetch extra tasks to account for dependency filtering
    
    // Filter tasks that have unmet dependencies
    const eligibleTasks: ITask[] = []
    
    for (const task of tasks) {
      // Skip if dependencies aren't met
      if (await hasPendingDependencies(task)) {
        continue
      }
      
      eligibleTasks.push(task)
      
      // Stop once we have enough tasks
      if (eligibleTasks.length >= limit) {
        break
      }
    }
    
    return eligibleTasks
  } catch (error) {
    console.error('Error finding eligible tasks:', error)
    return []
  }
}

/**
 * Check if a task has pending dependencies
 * @param task Task to check dependencies for
 * @returns True if the task has pending dependencies
 */
async function hasPendingDependencies(task: ITask): Promise<boolean> {
  if (!task.dependencies || task.dependencies.length === 0) {
    return false
  }
  
  try {
    // Count incomplete dependency tasks
    const pendingCount = await Task.countDocuments({
      _id: { $in: task.dependencies },
      status: { $nin: ['completed'] }
    })
    
    return pendingCount > 0
  } catch (error) {
    console.error(`Error checking dependencies for task ${task._id.toString()}:`, error)
    return true // Assume dependencies are pending in case of error
  }
}

/**
 * Execute a task
 * @param task Task to execute
 */
async function executeTask(task: ITask): Promise<void> {
  try {
    console.log(`Executing task ${task._id.toString()} (${task.name})`)
    
    // Execute task using the TaskRunnerService instead of simulation
    const result = await TaskRunnerService.executeTask(task)
    
    // Complete or fail task based on the result
    if (result.success) {
      await completeTask(task, result.output)
    } else {
      await failTask(task, result.error || `Task execution failed with exit code ${result.exitCode}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await failTask(task, errorMessage)
  } finally {
    // Remove from processing lock
    processingLock.delete(task._id.toString())
  }
}

/**
 * Complete a task successfully
 * @param task Task to complete
 * @param output Task output
 */
async function completeTask(task: ITask, output: string): Promise<void> {
  try {
    // Update task details
    task.status = 'completed'
    task.endTime = new Date()
    task.output = output
    
    await task.save()
    
    // Remove from running tasks
    runningTasks.delete(task._id.toString())
    
    // Emit event
    taskEvents.emit('task:completed', task)
    
    console.log(`Task ${task._id.toString()} completed successfully`)
  } catch (error) {
    console.error(`Error completing task ${task._id.toString()}:`, error)
  }
}

/**
 * Mark a task as failed
 * @param task Task to fail
 * @param errorMessage Error message
 */
async function failTask(task: ITask, errorMessage: string): Promise<void> {
  try {
    // Update task details
    task.status = 'failed'
    task.endTime = new Date()
    task.lastError = errorMessage
    
    await task.save()
    
    // Remove from running tasks
    runningTasks.delete(task._id.toString())
    
    // Emit event
    taskEvents.emit('task:failed', task)
    
    console.log(`Task ${task._id.toString()} failed: ${errorMessage}`)
    
    // Check if task should be retried
    if (task.retryCount < task.maxRetries) {
      console.log(`Scheduling retry for task ${task._id.toString()} (attempt ${task.retryCount + 1}/${task.maxRetries})`)
      
      // Retry with exponential backoff
      const retryDelay = Math.pow(2, task.retryCount) * 1000 // Exponential backoff
      
      setTimeout(async () => {
        try {
          task.status = 'queued'
          task.lastError = `Previous error: ${task.lastError}`
          await task.save()
        } catch (retryError) {
          console.error(`Error scheduling retry for task ${task._id.toString()}:`, retryError)
        }
      }, retryDelay)
    }
  } catch (error) {
    console.error(`Error failing task ${task._id.toString()}:`, error)
  }
}

/**
 * Handler for task completed event
 * @param task Completed task
 */
function handleTaskCompleted(task: ITask): void {
  // Check if any tasks were waiting on this one
  checkDependentTasks(task._id.toString())
}

/**
 * Handler for task failed event
 * @param task Failed task
 */
function handleTaskFailed(task: ITask): void {
  // If max retries exceeded, cancel dependent tasks
  if (task.retryCount >= task.maxRetries) {
    cancelDependentTasks(task._id.toString())
  }
  
  // The error recovery service will handle the task failure independently
  // through its own task:failed event handler
}

/**
 * Check and potentially unblock tasks that depend on a completed task
 * @param taskId ID of the completed task
 */
async function checkDependentTasks(taskId: string): Promise<void> {
  try {
    // Find tasks that depend on this one
    const dependentTasks = await Task.find({
      dependencies: taskId,
      status: { $nin: ['completed', 'failed', 'cancelled'] }
    })
    
    for (const task of dependentTasks) {
      // Check if all dependencies are now met
      if (!(await hasPendingDependencies(task))) {
        console.log(`Task ${task._id.toString()} dependencies met, ready to run`)
        
        // Task can now run (if scheduled, it will be picked up by the queue)
        if (task.status === 'queued') {
          // It's already queued, nothing to do
        } else {
          task.status = 'queued'
          await task.save()
        }
      }
    }
  } catch (error) {
    console.error(`Error checking dependent tasks for ${taskId}:`, error)
  }
}

/**
 * Cancel tasks that depend on a failed task
 * @param taskId ID of the failed task
 */
async function cancelDependentTasks(taskId: string): Promise<void> {
  try {
    // Find tasks that depend on this one
    const dependentTasks = await Task.find({
      dependencies: taskId,
      status: { $nin: ['completed', 'failed', 'cancelled'] }
    })
    
    for (const task of dependentTasks) {
      console.log(`Cancelling task ${task._id.toString()} due to failed dependency ${taskId}`)
      
      task.status = 'cancelled'
      task.lastError = `Cancelled due to failed dependency: ${taskId}`
      task.endTime = new Date()
      await task.save()
      
      // Cascade cancellation to tasks that depend on this one
      await cancelDependentTasks(task._id.toString())
    }
  } catch (error) {
    console.error(`Error cancelling dependent tasks for ${taskId}:`, error)
  }
}

/**
 * Create a new task
 * @param params Task creation parameters
 * @returns Created task or null if error
 */
export async function createTask(params: ICreateTaskParams): Promise<ITask | null> {
  try {
    console.log(`Creating task: ${params.name} (${params.type})`)
    await connectToDatabase()
    
    const task = new Task({
      projectId: new ObjectId(params.projectId),
      name: params.name,
      description: params.description,
      type: params.type,
      status: 'queued',
      priority: params.priority || 'normal',
      command: params.command,
      args: params.args || [],
      workingDirectory: params.workingDirectory,
      scheduledFor: params.scheduledFor,
      timeout: params.timeout,
      retryCount: 0,
      maxRetries: params.maxRetries || 3,
      dependencies: params.dependencies || [],
      metadata: params.metadata
    })
    
    await task.save()
    
    // Emit event for task creation
    taskEvents.emit('task:created', task)
    
    return task
  } catch (error) {
    console.error('Error creating task:', error)
    return null
  }
}

/**
 * Get tasks for a project
 * @param projectId Project ID
 * @param options Filtering options
 * @returns Array of tasks
 */
export async function getProjectTasks(
  projectId: string,
  options?: {
    status?: string[];
    type?: string[];
    limit?: number;
    skip?: number;
  }
): Promise<ITask[]> {
  try {
    console.log(`Getting tasks for project ${projectId}`)
    await connectToDatabase()
    
    const query: any = { projectId: new ObjectId(projectId) }
    
    if (options?.status && options.status.length > 0) {
      query.status = { $in: options.status }
    }
    
    if (options?.type && options.type.length > 0) {
      query.type = { $in: options.type }
    }
    
    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .skip(options?.skip || 0)
      .limit(options?.limit || 100)
    
    return tasks
  } catch (error) {
    console.error(`Error getting tasks for project ${projectId}:`, error)
    return []
  }
}

/**
 * Get a task by ID
 * @param taskId Task ID
 * @returns Task or null if not found
 */
export async function getTaskById(taskId: string): Promise<ITask | null> {
  try {
    console.log(`Getting task ${taskId}`)
    await connectToDatabase()
    
    const task = await Task.findById(taskId)
    return task
  } catch (error) {
    console.error(`Error getting task ${taskId}:`, error)
    return null
  }
}

/**
 * Cancel a task
 * @param taskId Task ID
 * @param reason Cancellation reason
 * @returns True if successful, false otherwise
 */
export async function cancelTask(taskId: string, reason: string): Promise<boolean> {
  try {
    console.log(`Cancelling task ${taskId}: ${reason}`)
    await connectToDatabase()
    
    const task = await Task.findById(taskId)
    if (!task) {
      console.error(`Task ${taskId} not found`)
      return false
    }
    
    // Only allow cancellation of non-terminal states
    if (['completed', 'failed', 'cancelled'].includes(task.status)) {
      console.error(`Cannot cancel task ${taskId} in state ${task.status}`)
      return false
    }
    
    // Update task status
    task.status = 'cancelled'
    task.lastError = `Cancelled: ${reason}`
    task.endTime = new Date()
    
    await task.save()
    
    // If task was running, remove from running tasks
    if (runningTasks.has(taskId)) {
      runningTasks.delete(taskId)
    }
    
    // Cancel dependent tasks
    await cancelDependentTasks(taskId)
    
    return true
  } catch (error) {
    console.error(`Error cancelling task ${taskId}:`, error)
    return false
  }
}

/**
 * Get the current status of the task queue
 * @returns Task queue status
 */
export async function getQueueStatus(): Promise<ITaskQueueStatus> {
  try {
    await connectToDatabase()
    
    // Count tasks by status
    const queuedCount = await Task.countDocuments({ status: 'queued' })
    const scheduledCount = await Task.countDocuments({ status: 'scheduled' })
    const runningCount = await Task.countDocuments({ status: 'running' })
    const completedCount = await Task.countDocuments({ status: 'completed' })
    const failedCount = await Task.countDocuments({ status: 'failed' })
    const cancelledCount = await Task.countDocuments({ status: 'cancelled' })
    
    return {
      queued: queuedCount,
      scheduled: scheduledCount,
      running: runningCount,
      completed: completedCount,
      failed: failedCount,
      cancelled: cancelledCount,
      totalActive: queuedCount + scheduledCount + runningCount,
      totalProcessed: completedCount + failedCount + cancelledCount
    }
  } catch (error) {
    console.error('Error getting queue status:', error)
    return {
      queued: 0,
      scheduled: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      totalActive: 0,
      totalProcessed: 0
    }
  }
} 