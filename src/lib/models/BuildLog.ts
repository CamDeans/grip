import mongoose from 'mongoose'
import type { Document } from 'mongoose'
import { ObjectId } from 'mongodb'

/**
 * BuildLog model - Tracks automation task execution
 * This is part of Phase 1, Step 4 of the GRIP AI Assistant Enhancement Plan
 */

// Base interface for client-side use
export interface IBuildLogData {
  projectId: ObjectId;
  taskId: string;
  taskType: 'build' | 'test' | 'deploy' | 'generate' | 'analyze' | 'other';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  command: string;
  startTime: Date;
  endTime?: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

// Server-side interface that extends Document
export interface IBuildLog extends Document, IBuildLogData {}

const BuildLogSchema = new mongoose.Schema<IBuildLog>({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project',
    required: true,
    index: true
  },
  taskId: { 
    type: String, 
    required: true,
    unique: true 
  },
  taskType: { 
    type: String, 
    required: true,
    enum: ['build', 'test', 'deploy', 'generate', 'analyze', 'other'],
    index: true
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  command: { 
    type: String, 
    required: true 
  },
  startTime: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  endTime: { 
    type: Date
  },
  duration: { 
    type: Number
  },
  output: { 
    type: String, 
    required: true,
    default: ''
  },
  exitCode: { 
    type: Number
  },
  environment: {
    type: Map,
    of: String,
    default: {}
  },
  metadata: {
    triggeredBy: { 
      type: String, 
      required: true 
    },
    phase: String,
    step: String,
    files: [String],
    dependencies: [String]
  },
  error: {
    message: String,
    stack: String,
    code: String
  }
}, {
  timestamps: true
});

// Create compound indexes
BuildLogSchema.index({ projectId: 1, taskType: 1, status: 1 });
BuildLogSchema.index({ startTime: -1 });

// Update duration and status on save
BuildLogSchema.pre('save', function(next) {
  try {
    // Calculate duration if endTime exists
    if (this.endTime && this.startTime) {
      this.duration = this.endTime.getTime() - this.startTime.getTime();
    }
    
    // Validate status transitions
    if (this.isModified('status')) {
      const validTransitions: Record<string, string[]> = {
        'pending': ['running', 'cancelled'],
        'running': ['completed', 'failed', 'cancelled'],
        'completed': [],  // Terminal state
        'failed': [],     // Terminal state
        'cancelled': []   // Terminal state
      };
      
      const oldStatus = this.get('status', String, { getters: false });
      const newStatus = this.status;
      
      if (oldStatus && !validTransitions[oldStatus].includes(newStatus)) {
        throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
      }
      
      // Set endTime if transitioning to a terminal state
      if (['completed', 'failed', 'cancelled'].includes(newStatus) && !this.endTime) {
        this.endTime = new Date();
        this.duration = this.endTime.getTime() - this.startTime.getTime();
      }
    }
    
    console.log('Saving build log:', {
      projectId: this.projectId,
      taskId: this.taskId,
      status: this.status
    });
    
    next();
  } catch (error) {
    console.error('Error during build log save:', error);
    next(error instanceof Error ? error : new Error('Unknown error during save'));
  }
});

export const BuildLog = mongoose.models.BuildLog || 
  mongoose.model<IBuildLog>('BuildLog', BuildLogSchema); 