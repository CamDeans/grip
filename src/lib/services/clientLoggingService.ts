'use client';

import { IBuildLogData } from '../models/clientModels/BuildLog';

/**
 * Client-side logging service that fetches data from API routes
 * instead of directly accessing MongoDB
 */
export const ClientLoggingService = {
  /**
   * Get build logs for a project
   */
  getProjectLogs: async (projectId: string, limit = 100, filters?: any): Promise<IBuildLogData[]> => {
    try {
      let url = `/api/admin/buildlogs?projectId=${projectId}`;
      if (limit) url += `&limit=${limit}`;
      
      // Add filters if provided
      if (filters) {
        if (filters.taskType) url += `&taskType=${filters.taskType}`;
        if (filters.status) url += `&status=${filters.status}`;
        if (filters.phase) url += `&phase=${filters.phase}`;
        if (filters.step) url += `&step=${filters.step}`;
      }
      
      const response = await fetch(url);
      
      // Handle 404 errors gracefully
      if (response.status === 404) {
        console.warn('No logs found for the specified project');
        return [];
      }
      
      if (!response.ok) {
        throw new Error(`Error fetching logs: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.logs || [];
    } catch (error) {
      console.error('Error fetching project logs from API:', error);
      return [];
    }
  },
  
  /**
   * Get a single build log by ID
   */
  getBuildLog: async (taskId: string): Promise<IBuildLogData | null> => {
    try {
      if (!taskId || taskId === '') {
        console.warn('Attempted to fetch build log with empty taskId');
        return null;
      }
      
      // Attempt to fetch the log
      const response = await fetch(`/api/admin/buildlogs?taskId=${taskId}`);
      
      // Handle 404 errors gracefully with a useful message
      if (response.status === 404) {
        console.warn(`Build log not found for taskId: ${taskId}`);
        return {
          taskId,
          projectId: '',
          taskType: 'other' as const,
          status: 'failed' as const,
          command: 'Unknown command',
          output: 'Log data not found or has been removed from the database.',
          startTime: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          environment: {},
          metadata: {
            triggeredBy: 'system',
            phase: 'error',
            step: 'retrieval'
          }
        };
      }
      
      if (!response.ok) {
        throw new Error(`Error fetching log: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching build log from API:', error);
      // Return a fallback error message
      return {
        taskId,
        projectId: '',
        taskType: 'other' as const,
        status: 'failed' as const,
        command: 'Unknown command',
        output: 'Error connecting to log service. Please try again later.',
        startTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        environment: {},
        metadata: {
          triggeredBy: 'system',
          phase: 'error',
          step: 'network'
        }
      };
    }
  },
  
  /**
   * Monitor a task in real-time
   * This client-side version uses polling to update the log data
   */
  monitorTask: (
    taskId: string,
    callback: (log: IBuildLogData | null) => void,
    interval: number = 1000
  ): (() => void) => {
    let isRunning = true;
    
    const checkLog = async () => {
      if (!isRunning) return;
      
      try {
        const log = await ClientLoggingService.getBuildLog(taskId);
        
        if (log) {
          callback(log);
          
          // If task is complete, stop monitoring
          if (['completed', 'failed', 'cancelled'].includes(log.status)) {
            isRunning = false;
            return;
          }
        }
        
        if (isRunning) {
          setTimeout(checkLog, interval);
        }
      } catch (error) {
        console.error('Error monitoring task:', error);
        callback(null);
        isRunning = false;
      }
    };
    
    // Start monitoring
    checkLog();
    
    // Return function to stop monitoring
    return () => {
      isRunning = false;
    };
  },
  
  /**
   * Export a build log to a file
   */
  exportBuildLog: async (taskId: string): Promise<string | null> => {
    try {
      const log = await ClientLoggingService.getBuildLog(taskId);
      
      if (!log) {
        throw new Error('Log not found');
      }
      
      // Create a Blob with the log content
      const blob = new Blob([log.output || ''], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `buildlog_${taskId}_${new Date().toISOString().replace(/:/g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      return url;
    } catch (error) {
      console.error('Error exporting build log:', error);
      return null;
    }
  }
}; 