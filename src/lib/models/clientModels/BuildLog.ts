/**
 * Client-safe version of the BuildLog model
 * This version doesn't import or use any MongoDB-specific code
 * and is safe to use in client components.
 */

// Special type to replace ObjectId in client code
export type ClientId = string;

// Client-friendly data structure that matches server schema
export interface IBuildLogData {
  projectId: ClientId;
  taskId: string;
  taskType: 'build' | 'test' | 'deploy' | 'generate' | 'analyze' | 'other';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  command: string;
  startTime: Date | string;
  endTime?: Date | string;
  duration?: number; // in milliseconds
  output: string;
  exitCode?: number;
  environment: {
    [key: string]: string;
  };
  metadata: {
    triggeredBy: string;
    phase?: string;
    step?: string;
    files?: string[];
    dependencies?: string[];
  };
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Direct properties for easier access (extracted from metadata)
  phase?: string;
  step?: string;
}

// Factory function to create an empty build log (for client-side initialization)
export function createEmptyBuildLog(): Partial<IBuildLogData> {
  return {
    taskType: 'build',
    status: 'pending',
    command: '',
    startTime: new Date(),
    output: '',
    environment: {},
    metadata: {
      triggeredBy: 'user',
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Utility functions to work with build logs on the client
export const BuildLogUtils = {
  // Format duration nicely
  formatDuration: (duration?: number): string => {
    if (!duration) return 'N/A';
    
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  },
  
  // Get status color for UI
  getStatusColor: (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'running': return 'bg-blue-500';
      case 'pending': case 'queued': return 'bg-yellow-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-300';
    }
  },
  
  // Format relative time
  formatRelativeTime: (date: Date | string): string => {
    try {
      // Ensure we're working with a Date object
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Unknown';
      }
      
      const now = new Date();
      const diffMs = now.getTime() - dateObj.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffSecs < 60) return `${diffSecs} seconds ago`;
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays === 1) return 'yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return dateObj.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting relative time:', error);
      return 'Invalid date';
    }
  }
}; 