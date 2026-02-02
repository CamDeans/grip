import mongoose from 'mongoose'
import type { Document } from 'mongoose'
import { ObjectId } from 'mongodb'
import { Schema, model } from 'mongoose'

/**
 * TerminalSession model - Stores virtual terminal interactions
 * This is part of Phase 1, Step 5 of the GRIP AI Assistant Enhancement Plan
 */

// Base interface for client-side use
export interface ITerminalSessionData {
  projectId: ObjectId;
  sessionId: string;
  name: string;
  status: 'active' | 'inactive' | 'error' | 'connected' | 'disconnected';
  currentDirectory: string;
  environment: {
    [key: string]: string;
  };
  history: Array<{
    command: string;
    output: string;
    exitCode: number;
    timestamp: Date;
    duration: number; // in milliseconds
  }>;
  metadata: {
    createdBy: string;
    purpose: string;
    taskIds?: string[];
    relatedFiles?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  lastActive: Date;
  authenticated: boolean;
}

// Command history entry interface
export interface ICommandHistory {
  command: string;
  output: string;
  exitCode: number;
  timestamp: Date;
  duration: number;
}

// Server-side interface that extends Document
export interface ITerminalSession extends Document, ITerminalSessionData {}

const CommandHistorySchema = new mongoose.Schema({
  command: { 
    type: String, 
    required: true 
  },
  output: { 
    type: String, 
    required: true 
  },
  exitCode: { 
    type: Number, 
    required: true,
    default: 0
  },
  timestamp: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  duration: { 
    type: Number, 
    required: true,
    default: 0
  }
}, { _id: false });

const TerminalSessionSchema = new Schema<ITerminalSession>({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project',
    required: true,
    index: true,
    default: () => new ObjectId('000000000000000000000000') // Default ObjectId if none provided
  },
  sessionId: { 
    type: String, 
    required: true,
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['active', 'inactive', 'error', 'connected', 'disconnected'],
    default: 'disconnected',
    index: true
  },
  currentDirectory: { 
    type: String, 
    required: true,
    default: '/'
  },
  environment: {
    type: Map,
    of: String,
    default: {}
  },
  history: [CommandHistorySchema],
  metadata: {
    createdBy: { 
      type: String, 
      required: true 
    },
    purpose: { 
      type: String, 
      required: true 
    },
    taskIds: [String],
    relatedFiles: [String]
  },
  lastActive: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  authenticated: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true
});

// Create indexes
TerminalSessionSchema.index({ projectId: 1, status: 1 });
TerminalSessionSchema.index({ lastActive: -1 });

// Update lastActive timestamp on save
TerminalSessionSchema.pre('save', function(next) {
  try {
    // Update lastActive timestamp if status is changed to active or a command is added
    if (this.isModified('status') || this.isModified('history')) {
      if (this.status === 'active' || this.status === 'connected' || this.history?.length > 0) {
        this.lastActive = new Date();
      }
    }
    
    console.log('Saving terminal session:', {
      projectId: this.projectId,
      sessionId: this.sessionId,
      status: this.status
    });
    
    next();
  } catch (error) {
    console.error('Error during terminal session save:', error);
    next(error instanceof Error ? error : new Error('Unknown error during save'));
  }
});

// Add method to add command to history
TerminalSessionSchema.methods.addCommand = function(command: string, output: string, exitCode: number, duration: number) {
  this.history.push({
    command,
    output,
    exitCode,
    timestamp: new Date(),
    duration
  });
  
  this.lastActive = new Date();
  return this.save();
};

// Define expiration index (TTL) for inactive sessions
// Sessions inactive for more than 7 days will be automatically removed
TerminalSessionSchema.index(
  { lastActive: 1 }, 
  { expireAfterSeconds: 7 * 24 * 60 * 60 }
);

// Initialize the model
let TerminalSession: mongoose.Model<ITerminalSession>;

try {
  // Check if model exists
  TerminalSession = mongoose.models.TerminalSession;
  
  // If model doesn't exist, create it
  if (!TerminalSession) {
    TerminalSession = mongoose.model<ITerminalSession>('TerminalSession', TerminalSessionSchema);
  }
} catch (error) {
  console.error('Error initializing TerminalSession model:', error);
  // Fallback to creating the model
  TerminalSession = mongoose.model<ITerminalSession>('TerminalSession', TerminalSessionSchema);
}

export { TerminalSession };
export default TerminalSession; 