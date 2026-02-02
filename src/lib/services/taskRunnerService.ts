import { exec, ExecOptions } from 'child_process'
import { promisify } from 'util'
import { ObjectId } from 'mongodb'
import { ITask, ITaskData, TaskMetadata } from '@/lib/models/Task'
import { taskEvents } from '@/lib/services/taskQueueService'
import { ProjectAutomationService } from '@/lib/services/projectAutomationService'
import { LoggingService } from '@/lib/services/loggingService'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

/**
 * Task Runner Service - Implements a system to execute commands in background
 * Part of Phase 5, Step 3 of the G.R.I.P. AI Assistant Enhancement Plan
 */

// Promisify exec for async/await usage
const execAsync = promisify(exec)

// Environment variables whitelist for tasks
const ALLOWED_ENV_VARS = [
  'NODE_ENV', 'PATH', 'HOME', 'USER', 'TEMP', 'TMP',
  'LANG', 'LC_ALL', 'LOGNAME', 'PWD', 'SHELL'
]

// Command whitelist to prevent security issues
const ALLOWED_COMMANDS = [
  'npm', 'yarn', 'pnpm', 'node', 'npx',
  'jest', 'eslint', 'tsc', 'next',
  'git', 'python', 'pip',
  'ls', 'dir', 'find', 'test',
]

// Max output size to prevent memory issues (1MB)
const MAX_OUTPUT_SIZE = 1024 * 1024

// Execution timeout (5 minutes)
const DEFAULT_TIMEOUT = 5 * 60 * 1000

// Result of task execution
export interface TaskExecutionResult {
  success: boolean;
  output: string;
  exitCode: number;
  duration: number;
  error?: string;
}

/**
 * Task Runner Class - Handles execution of individual tasks
 */
export class TaskRunner {
  private task: ITask;
  private output: string = '';
  private startTime: number = 0;
  private buildLogId?: string;
  private workDir: string;
  private isKilled: boolean = false;

  /**
   * Create a new TaskRunner
   * @param task Task to execute
   */
  constructor(task: ITask) {
    this.task = task;
    this.workDir = task.workingDirectory || os.tmpdir();
  }

  /**
   * Execute the task
   * @returns Task execution result
   */
  async execute(): Promise<TaskExecutionResult> {
    this.startTime = Date.now();
    let exitCode = 0;
    let error: Error | undefined;

    try {
      // Validate command for security
      this.validateCommand();

      // Create build log
      await this.createBuildLog();
      
      // Log system stats at the beginning
      if (this.buildLogId) {
        await LoggingService.logSystemStats(this.buildLogId);
        await LoggingService.logTaskMessage(
          this.buildLogId,
          `Starting task execution: ${this.task.command}`,
          LoggingService.LogLevel.INFO
        );
      }

      // Prepare working directory
      await this.prepareWorkingDirectory();

      // Execute command
      const result = await this.executeCommand();
      
      // Store result and return
      this.output = result.stdout;
      exitCode = 0;
      
      // Append output to build log
      await this.appendToLog(result.stdout);
      
      // Log successful completion
      if (this.buildLogId) {
        await LoggingService.logTaskMessage(
          this.buildLogId,
          `Task completed successfully in ${Date.now() - this.startTime}ms`,
          LoggingService.LogLevel.INFO
        );
        
        // Log final system stats
        await LoggingService.logSystemStats(this.buildLogId);
      }
      
      return {
        success: true,
        output: result.stdout,
        exitCode: 0,
        duration: Date.now() - this.startTime
      };
      
    } catch (err: any) {
      error = err;
      exitCode = err.code || 1;
      
      // Append error to output
      const errorOutput = err.message || 'Unknown error occurred';
      this.output += `\n${errorOutput}`;
      
      // Log error
      console.error(`Task execution error for task ${this.task._id}:`, err);
      
      // Log error using LoggingService
      if (this.buildLogId) {
        await LoggingService.logTaskError(this.buildLogId, err);
      }
      
      // Append error to build log
      await this.appendToLog(errorOutput);
      
      return {
        success: false,
        output: this.output,
        exitCode,
        error: errorOutput,
        duration: Date.now() - this.startTime
      };
    } finally {
      // Complete build log
      if (this.buildLogId) {
        await ProjectAutomationService.completeBuildLog(
          this.buildLogId,
          exitCode === 0,
          exitCode,
          error ? { message: error.message, stack: error.stack } : undefined
        );
      }
      
      // Cleanup if needed
      await this.cleanup();
    }
  }

  /**
   * Validate command for security
   * @throws Error if command is not allowed
   */
  private validateCommand(): void {
    const commandParts = this.task.command.split(' ');
    const baseCommand = commandParts[0].toLowerCase();
    
    // Check command against whitelist
    if (!ALLOWED_COMMANDS.includes(baseCommand)) {
      throw new Error(`Command not allowed: ${baseCommand}`);
    }
    
    // Additional security checks
    if (this.task.command.includes('&&') || 
        this.task.command.includes('||') || 
        this.task.command.includes(';') ||
        this.task.command.includes('|')) {
      throw new Error('Command chaining is not allowed');
    }
  }

  /**
   * Create a build log record for this task
   */
  private async createBuildLog(): Promise<void> {
    try {
      const buildLog = await ProjectAutomationService.createBuildLog(
        this.task.projectId.toString(),
        {
          taskType: this.task.type,
          command: this.task.command + (this.task.args?.length ? ` ${this.task.args.join(' ')}` : ''),
          triggeredBy: this.task.metadata.createdBy,
          phase: this.task.metadata.phase,
          step: this.task.metadata.step,
          files: this.task.metadata.files,
          dependencies: this.task.dependencies,
          environment: this.task.metadata.environment
        }
      );
      
      if (buildLog && buildLog._id) {
        this.buildLogId = buildLog._id.toString();
      }
    } catch (error) {
      console.error('Error creating build log:', error);
      // Continue execution even if build log creation fails
    }
  }

  /**
   * Prepare the working directory
   */
  private async prepareWorkingDirectory(): Promise<void> {
    // If workingDirectory is specified, ensure it exists
    if (this.task.workingDirectory) {
      try {
        await fs.mkdir(this.task.workingDirectory, { recursive: true });
      } catch (error) {
        throw new Error(`Failed to create working directory: ${error}`);
      }
    }
  }

  /**
   * Execute command in subprocess
   */
  private async executeCommand(): Promise<{ stdout: string; stderr: string }> {
    // Define timeout
    const timeout = this.task.timeout || DEFAULT_TIMEOUT;
    
    // Prepare environment
    const env = this.prepareEnvironment();
    
    // Prepare command
    const command = this.task.command;
    const args = this.task.args || [];
    const fullCommand = [command, ...args].join(' ');
    
    // Define options
    const options: ExecOptions = {
      cwd: this.workDir,
      env: env as NodeJS.ProcessEnv,
      timeout,
      maxBuffer: MAX_OUTPUT_SIZE
    };

    // Log command execution start
    if (this.buildLogId) {
      await LoggingService.logTaskMessage(
        this.buildLogId,
        `Executing command: ${fullCommand}`,
        LoggingService.LogLevel.INFO
      );
    }

    // Execute command
    return await execAsync(fullCommand, options);
  }

  /**
   * Prepare environment for task execution
   * @returns Environment variables for task
   */
  private prepareEnvironment(): NodeJS.ProcessEnv {
    // Start with clean environment
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PATH: process.env.PATH || '',
      HOME: process.env.HOME || os.homedir(),
      TEMP: process.env.TEMP || os.tmpdir(),
      TMP: process.env.TMP || os.tmpdir()
    };

    // Add allowed environment variables from process
    for (const key of ALLOWED_ENV_VARS) {
      if (process.env[key]) {
        env[key] = process.env[key];
      }
    }

    // Add task-specific environment variables
    if (this.task.metadata.environment) {
      for (const [key, value] of Object.entries(this.task.metadata.environment)) {
        env[key] = value;
      }
    }

    return env;
  }

  /**
   * Append output to build log
   */
  private async appendToLog(output: string): Promise<void> {
    if (this.buildLogId) {
      try {
        await ProjectAutomationService.appendBuildLogOutput(this.buildLogId, output);
      } catch (error) {
        console.error('Error appending to build log:', error);
      }
    }
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    // Nothing to cleanup for now
    // This would be used for temporary files or resources
  }

  /**
   * Kill the running task (called externally)
   */
  kill(): void {
    this.isKilled = true;
    // In a real implementation, we would find and kill the process
  }
}

/**
 * Task Runner Service - Manages task execution
 */
export class TaskRunnerService {
  private static runners = new Map<string, TaskRunner>();
  private static isInitialized = false;

  /**
   * Initialize the task runner service
   */
  static initialize(): void {
    if (this.isInitialized) return;
    
    // Listen for task events
    taskEvents.on('task:created', this.onTaskCreated);
    taskEvents.on('task:completed', this.onTaskCompleted);
    taskEvents.on('task:failed', this.onTaskFailed);
    
    this.isInitialized = true;
    console.log('Task Runner Service initialized');
  }

  /**
   * Shutdown the task runner service
   */
  static shutdown(): void {
    if (!this.isInitialized) return;
    
    console.log('Shutting down TaskRunnerService...');
    
    // Remove listeners
    taskEvents.off('taskCreated', this.onTaskCreated);
    taskEvents.off('taskCompleted', this.onTaskCompleted);
    taskEvents.off('taskFailed', this.onTaskFailed);
    
    // Cancel all running tasks
    const runnerIds = Array.from(this.runners.keys());
    for (const id of runnerIds) {
      const runner = this.runners.get(id);
      if (runner) {
        runner.kill();
      }
    }
    
    this.runners.clear();
    this.isInitialized = false;
  }

  /**
   * Handle task created event
   */
  private static onTaskCreated(task: ITask): void {
    console.log(`Task created: ${task._id} (${task.name})`);
    // We don't need to do anything on creation, the task queue will schedule it
  }

  /**
   * Handle task completed event
   */
  private static onTaskCompleted(task: ITask): void {
    console.log(`Task completed: ${task._id} (${task.name})`);
    this.runners.delete(task._id.toString());
  }

  /**
   * Handle task failed event
   */
  private static onTaskFailed(task: ITask): void {
    console.log(`Task failed: ${task._id} (${task.name})`);
    this.runners.delete(task._id.toString());
  }

  /**
   * Execute a task
   * @param task The task to execute
   * @returns Task execution result
   */
  static async executeTask(task: ITask): Promise<TaskExecutionResult> {
    const runner = new TaskRunner(task);
    const taskId = task._id.toString();
    TaskRunnerService.runners.set(taskId, runner);
    
    try {
      const result = await runner.execute();
      
      // Export build log to file if configured in metadata
      if (task.metadata?.exportLogs === true && result.success) {
        const buildLog = await ProjectAutomationService.getBuildLog(taskId);
        if (buildLog) {
          await LoggingService.exportBuildLog(buildLog.taskId);
        }
      }
      
      TaskRunnerService.runners.delete(taskId);
      return result;
    } catch (error) {
      TaskRunnerService.runners.delete(taskId);
      throw error;
    }
  }

  /**
   * Cancel a running task
   * @param taskId Task ID to cancel
   * @returns True if task was cancelled, false otherwise
   */
  static cancelTask(taskId: string): boolean {
    const runner = this.runners.get(taskId);
    if (!runner) return false;
    
    runner.kill();
    this.runners.delete(taskId);
    return true;
  }
}

// Export the main service object and classes
export default TaskRunnerService; 