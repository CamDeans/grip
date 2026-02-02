import mongoose from 'mongoose'
import type { Document } from 'mongoose'
import { ObjectId } from 'mongodb'
import { server, wss } from '@/lib/websocket'

/**
 * Task model - Stores automation tasks for the build queue
 * This is part of Phase 5, Step 1 of the GRIP AI Assistant Enhancement Plan
 */

/**
 * TaskMetadata interface - Defines metadata for automation tasks
 */
export interface TaskMetadata {
  createdBy: string;
  phase?: string;
  step?: string;
  files?: string[];
  labels?: string[];
  environment?: Record<string, string>;
  exportLogs?: boolean;
}

// Base interface for client-side use
export interface ITaskData {
  projectId: ObjectId;
  name: string;
  description: string;
  type: 'build' | 'test' | 'deploy' | 'generate' | 'analyze' | 'other';
  status: 'queued' | 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'critical';
  command: string;
  args?: string[];
  workingDirectory?: string;
  scheduledFor?: Date;
  startTime?: Date;
  endTime?: Date;
  timeout?: number; // in milliseconds
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  output?: string;
  dependencies: string[]; // IDs of tasks that must complete before this task
  metadata: TaskMetadata;
  createdAt: Date;
  updatedAt: Date;
}

// Server-side interface that extends Document
export interface ITask extends Document, ITaskData {
  _id: ObjectId;
}

const TaskSchema = new mongoose.Schema<ITask>({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project',
    required: true,
    index: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  },
  type: { 
    type: String, 
    required: true,
    enum: ['build', 'test', 'deploy', 'generate', 'analyze', 'other'],
    index: true
  },
  status: { 
    type: String, 
    required: true,
    enum: ['queued', 'scheduled', 'running', 'completed', 'failed', 'cancelled'],
    default: 'queued',
    index: true
  },
  priority: { 
    type: String, 
    required: true,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal',
    index: true
  },
  command: { 
    type: String, 
    required: true,
    trim: true
  },
  args: {
    type: [String],
    default: []
  },
  workingDirectory: {
    type: String,
    trim: true
  },
  scheduledFor: {
    type: Date
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  timeout: {
    type: Number,
    min: 0
  },
  retryCount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  maxRetries: {
    type: Number,
    required: true,
    default: 3,
    min: 0
  },
  lastError: {
    type: String
  },
  output: {
    type: String
  },
  dependencies: {
    type: [String],
    default: []
  },
  metadata: {
    createdBy: { 
      type: String, 
      required: true 
    },
    phase: String,
    step: String,
    files: [String],
    labels: [String],
    environment: {
      type: Map,
      of: String,
      default: {}
    },
    exportLogs: Boolean
  }
}, {
  timestamps: true
});

// Create indexes for performance
TaskSchema.index({ projectId: 1, status: 1 });
TaskSchema.index({ projectId: 1, type: 1, status: 1 });
TaskSchema.index({ status: 1, priority: -1, scheduledFor: 1 });
TaskSchema.index({ dependencies: 1 });

// Pre-save hook to validate state transitions
TaskSchema.pre('save', async function(next) {
  try {
    // Validate status transitions
    if (this.isModified('status')) {
      const validTransitions: Record<string, string[]> = {
        'queued': ['scheduled', 'running', 'cancelled'],
        'scheduled': ['running', 'cancelled'],
        'running': ['completed', 'failed', 'cancelled'],
        'completed': [], // Terminal state
        'failed': ['queued'], // Can retry
        'cancelled': [] // Terminal state
      };
      
      const oldStatus = this.get('status', String, { getters: false });
      const newStatus = this.status;
      
      // Skip validation if status hasn't actually changed
      if (oldStatus === newStatus) {
        console.log(`Status unchanged: ${oldStatus} -> ${newStatus}, skipping validation`);
      }
      // Otherwise validate the transition is allowed
      else if (oldStatus && !validTransitions[oldStatus].includes(newStatus)) {
        throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
      }
      
      // Set timestamps for state changes
      if (newStatus === 'running' && !this.startTime) {
        this.startTime = new Date();
      }
      
      if (['completed', 'failed', 'cancelled'].includes(newStatus) && !this.endTime) {
        this.endTime = new Date();
      }

      // Reset retry counter if transitioning back to queued
      if (newStatus === 'queued' && oldStatus === 'failed') {
        this.retryCount += 1;
        
        // Validate against max retries
        if (this.retryCount > this.maxRetries) {
          throw new Error(`Task has exceeded maximum retry count of ${this.maxRetries}`);
        }
      }
    }
    
    console.log('Saving task:', {
      projectId: this.projectId,
      name: this.name,
      status: this.status,
      priority: this.priority
    });
    
    next();
    
    // After save hook - emit a WebSocket event for real-time updates
    if (wss && wss.clients.size > 0) {
      // Convert the document to a plain object
      const taskObj = this.toObject();
      
      // Emit a task update event
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'task_update',
            projectId: taskObj.projectId.toString(),
            task: taskObj
          }));
        }
      });
    }
  } catch (error) {
    console.error('Error during task save:', error);
    next(error instanceof Error ? error : new Error('Unknown error during save'));
  }
});

export const Task = mongoose.models.Task || 
  mongoose.model<ITask>('Task', TaskSchema); 