import mongoose from 'mongoose'
import type { Document } from 'mongoose'

/**
 * SystemState model - Stores automation system state and settings
 * This is part of Phase 7, Step 5 of the GRIP AI Assistant Enhancement Plan
 */

/**
 * SystemState interface - Defines the system state for automation controls
 */
export interface ISystemStateData {
  isRunning: boolean;
  concurrencyLimit: number;
  maxTasksPerProject: number;
  taskPrioritization: 'fifo' | 'priority' | 'deadline';
  errorHandlingMode: 'stop' | 'continue' | 'retry';
  logLevel: 'debug' | 'info' | 'warning' | 'error';
  allowHighPriorityOverride: boolean;
  maintenanceMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Server-side interface that extends Document
export interface ISystemState extends Document, ISystemStateData {
  _id: mongoose.Types.ObjectId;
}

const SystemStateSchema = new mongoose.Schema<ISystemState>({
  isRunning: {
    type: Boolean,
    required: true,
    default: true
  },
  concurrencyLimit: {
    type: Number,
    required: true,
    default: 5,
    min: 1,
    max: 20
  },
  maxTasksPerProject: {
    type: Number,
    required: true,
    default: 10,
    min: 1,
    max: 50
  },
  taskPrioritization: {
    type: String,
    required: true,
    enum: ['fifo', 'priority', 'deadline'],
    default: 'priority'
  },
  errorHandlingMode: {
    type: String,
    required: true,
    enum: ['stop', 'continue', 'retry'],
    default: 'retry'
  },
  logLevel: {
    type: String,
    required: true,
    enum: ['debug', 'info', 'warning', 'error'],
    default: 'info'
  },
  allowHighPriorityOverride: {
    type: Boolean,
    required: true,
    default: true
  },
  maintenanceMode: {
    type: Boolean,
    required: true,
    default: false
  }
}, {
  timestamps: true
});

// Ensure only one system state document exists
SystemStateSchema.statics.findOrCreate = async function() {
  let state = await this.findOne();
  
  if (!state) {
    state = await this.create({
      isRunning: true,
      concurrencyLimit: 5,
      maxTasksPerProject: 10,
      taskPrioritization: 'priority',
      errorHandlingMode: 'retry',
      logLevel: 'info',
      allowHighPriorityOverride: true,
      maintenanceMode: false
    });
  }
  
  return state;
};

export const SystemState = mongoose.models.SystemState || 
  mongoose.model<ISystemState>('SystemState', SystemStateSchema); 