import { ProjectAutomationService } from './projectAutomationService'
import { IBuildLog } from '../models/BuildLog'
import fs from 'fs'
import path from 'path'
import os from 'os'

/**
 * LoggingService - Provides enhanced logging capabilities for build tasks
 * This is part of Phase 5, Step 4 of the GRIP AI Assistant Enhancement Plan
 */
export class LoggingService {
  /**
   * Log levels
   */
  static LogLevel = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL'
  }

  /**
   * Log a message to a build task
   * @param taskId - The task ID to log to
   * @param message - The message to log
   * @param level - Log level
   * @returns The updated build log or null if error occurred
   */
  static async logTaskMessage(
    taskId: string,
    message: string,
    level: string = LoggingService.LogLevel.INFO
  ): Promise<IBuildLog | null> {
    try {
      const timestamp = new Date().toISOString()
      const formattedMessage = `[${timestamp}] [${level}] ${message}\n`
      
      return await ProjectAutomationService.appendBuildLogOutput(
        taskId,
        formattedMessage
      )
    } catch (error) {
      console.error('Error logging task message:', error)
      return null
    }
  }

  /**
   * Log an error to a build task
   * @param taskId - The task ID to log to
   * @param error - The error to log
   * @returns The updated build log or null if error occurred
   */
  static async logTaskError(
    taskId: string,
    error: Error | string
  ): Promise<IBuildLog | null> {
    try {
      const errorObj = typeof error === 'string' ? new Error(error) : error
      const timestamp = new Date().toISOString()
      
      const formattedMessage = `[${timestamp}] [${LoggingService.LogLevel.ERROR}] ${errorObj.message}\n${errorObj.stack || ''}\n`
      
      return await ProjectAutomationService.appendBuildLogOutput(
        taskId,
        formattedMessage
      )
    } catch (error) {
      console.error('Error logging task error:', error)
      return null
    }
  }

  /**
   * Log system statistics to a build task
   * @param taskId - The task ID to log to
   * @returns The updated build log or null if error occurred
   */
  static async logSystemStats(taskId: string): Promise<IBuildLog | null> {
    try {
      const stats = {
        timestamp: new Date().toISOString(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem()
        },
        cpus: os.cpus().length,
        loadAvg: os.loadavg(),
        uptime: os.uptime(),
        platform: os.platform(),
        arch: os.arch()
      }
      
      const formattedMessage = `[${stats.timestamp}] [${LoggingService.LogLevel.INFO}] System Stats:
Memory: ${(stats.memory.used / 1024 / 1024).toFixed(2)}MB used of ${(stats.memory.total / 1024 / 1024).toFixed(2)}MB
CPUs: ${stats.cpus}
Load Average: ${stats.loadAvg.join(', ')}
Uptime: ${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m
Platform: ${stats.platform} (${stats.arch})
`
      
      return await ProjectAutomationService.appendBuildLogOutput(
        taskId,
        formattedMessage
      )
    } catch (error) {
      console.error('Error logging system stats:', error)
      return null
    }
  }

  /**
   * Export a build log to a file
   * @param taskId - The task ID to export
   * @param outputPath - The path to export to (defaults to temp directory)
   * @returns The path to the exported file or null if error occurred
   */
  static async exportBuildLog(
    taskId: string,
    outputPath?: string
  ): Promise<string | null> {
    try {
      const log = await ProjectAutomationService.getBuildLog(taskId)
      
      if (!log) {
        throw new Error(`Build log with task ID ${taskId} not found`)
      }
      
      const timestamp = new Date().toISOString().replace(/:/g, '-')
      const filename = `build_log_${taskId}_${timestamp}.log`
      const filePath = outputPath || path.join(os.tmpdir(), filename)
      
      // Create log header
      const header = `Build Log: ${taskId}
Project ID: ${log.projectId}
Task Type: ${log.taskType}
Command: ${log.command}
Status: ${log.status}
Start Time: ${log.startTime}
End Time: ${log.endTime || 'N/A'}
Duration: ${log.duration ? `${(log.duration / 1000).toFixed(2)}s` : 'N/A'}
Exit Code: ${log.exitCode !== undefined ? log.exitCode : 'N/A'}
Triggered By: ${log.metadata.triggeredBy}
Phase: ${log.metadata.phase || 'N/A'}
Step: ${log.metadata.step || 'N/A'}

========== OUTPUT ==========

`
      
      // Write to file
      fs.writeFileSync(filePath, header + log.output)
      
      return filePath
    } catch (error) {
      console.error('Error exporting build log:', error)
      return null
    }
  }

  /**
   * Get aggregated logs for a project
   * @param projectId - The project ID to get logs for
   * @param limit - Maximum number of logs to retrieve (default: 100)
   * @param filters - Optional filters for the logs
   * @returns Array of summarized build logs or empty array if error occurred
   */
  static async getProjectLogs(
    projectId: string,
    limit: number = 100,
    filters?: {
      taskType?: string;
      status?: string;
      phase?: string;
      step?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Array<{
    taskId: string;
    taskType: string;
    status: string;
    command: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    exitCode?: number;
    phase?: string;
    step?: string;
  }>> {
    try {
      const logs = await ProjectAutomationService.getBuildLogs(projectId, limit)
      
      return logs
        .filter(log => {
          if (!filters) return true
          
          let match = true
          
          if (filters.taskType && log.taskType !== filters.taskType) match = false
          if (filters.status && log.status !== filters.status) match = false
          if (filters.phase && log.metadata.phase !== filters.phase) match = false
          if (filters.step && log.metadata.step !== filters.step) match = false
          if (filters.startDate && log.startTime < filters.startDate) match = false
          if (filters.endDate && (log.endTime && log.endTime > filters.endDate)) match = false
          
          return match
        })
        .map(log => ({
          taskId: log.taskId,
          taskType: log.taskType,
          status: log.status,
          command: log.command,
          startTime: log.startTime,
          endTime: log.endTime,
          duration: log.duration,
          exitCode: log.exitCode,
          phase: log.metadata.phase,
          step: log.metadata.step
        }))
    } catch (error) {
      console.error('Error getting project logs:', error)
      return []
    }
  }

  /**
   * Monitor a task in real-time
   * @param taskId - The task ID to monitor
   * @param callback - Function to call when log output is updated
   * @param interval - Polling interval in milliseconds (default: 1000)
   * @returns Function to stop monitoring
   */
  static monitorTask(
    taskId: string,
    callback: (log: IBuildLog | null) => void,
    interval: number = 1000
  ): () => void {
    let lastOutput = ''
    let isRunning = true
    
    const checkLog = async () => {
      if (!isRunning) return
      
      try {
        const log = await ProjectAutomationService.getBuildLog(taskId)
        
        if (log && log.output !== lastOutput) {
          lastOutput = log.output
          callback(log)
        }
        
        // If task is complete, stop monitoring
        if (log && ['completed', 'failed', 'cancelled'].includes(log.status)) {
          isRunning = false
          callback(log)
          return
        }
        
        if (isRunning) {
          setTimeout(checkLog, interval)
        }
      } catch (error) {
        console.error('Error monitoring task:', error)
        callback(null)
        isRunning = false
      }
    }
    
    // Start monitoring
    checkLog()
    
    // Return function to stop monitoring
    return () => {
      isRunning = false
    }
  }
} 