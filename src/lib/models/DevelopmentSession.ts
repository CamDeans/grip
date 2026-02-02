import mongoose from 'mongoose'
import type { Document } from 'mongoose'
import { ObjectId } from 'mongodb'

/**
 * DevelopmentSession model - Records development phase work
 * This tracks coding sessions, implementations, and generated code
 */

// Base interface for client-side use
export interface IDevelopmentSessionData {
  projectId: ObjectId;
  sessionId: string;
  name: string;
  sessionType: 'implementation' | 'refactoring' | 'feature' | 'bugfix' | 'testing';
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  phase: string;
  step: number;
  createdFiles: Array<{
    path: string;
    content: string;
    description: string;
    purpose: string;
    language: string;
    status: 'pending' | 'created' | 'modified' | 'completed' | 'error';
    createdAt: Date;
    updatedAt: Date;
  }>;
  modifiedFiles: Array<{
    path: string;
    originalContent: string;
    newContent: string;
    description: string;
    changeType: 'add' | 'update' | 'delete';
    language: string;
    status: 'pending' | 'created' | 'modified' | 'completed' | 'error';
    modifiedAt: Date;
  }>;
  dependencies: Array<{
    name: string;
    version: string;
    type: 'dev' | 'prod' | 'peer';
    purpose: string;
    status: 'pending' | 'installed' | 'error';
  }>;
  consoleOutput: Array<{
    command: string;
    output: string;
    exitCode: number;
    timestamp: Date;
  }>;
  sessionNotes: string;
  metadata: {
    startedAt: Date;
    endedAt?: Date;
    duration: number; // in milliseconds
    completionPercentage: number;
    relatedPlanningId?: ObjectId;
    userInitiated: boolean;
    aiGenerated: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Server-side interface that extends Document
export interface IDevelopmentSession extends Document, IDevelopmentSessionData {}

// Created file schema
const CreatedFileSchema = new mongoose.Schema({
  path: { 
    type: String, 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  purpose: { 
    type: String, 
    required: true 
  },
  language: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'created', 'modified', 'completed', 'error'],
    default: 'pending'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { _id: false });

// Modified file schema
const ModifiedFileSchema = new mongoose.Schema({
  path: { 
    type: String, 
    required: true 
  },
  originalContent: { 
    type: String, 
    required: true 
  },
  newContent: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  changeType: { 
    type: String, 
    required: true,
    enum: ['add', 'update', 'delete']
  },
  language: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'created', 'modified', 'completed', 'error'],
    default: 'pending'
  },
  modifiedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { _id: false });

// Dependency schema
const DependencySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  version: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    required: true,
    enum: ['dev', 'prod', 'peer']
  },
  purpose: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'installed', 'error'],
    default: 'pending'
  }
}, { _id: false });

// Console output schema
const ConsoleOutputSchema = new mongoose.Schema({
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
    default: Date.now 
  }
}, { _id: false });

// Main schema
const DevelopmentSessionSchema = new mongoose.Schema<IDevelopmentSession>({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project',
    required: true,
    index: true
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
  sessionType: { 
    type: String, 
    required: true,
    enum: ['implementation', 'refactoring', 'feature', 'bugfix', 'testing']
  },
  status: { 
    type: String, 
    required: true,
    enum: ['active', 'paused', 'completed', 'abandoned'],
    default: 'active'
  },
  phase: { 
    type: String, 
    required: true 
  },
  step: { 
    type: Number, 
    required: true 
  },
  createdFiles: [CreatedFileSchema],
  modifiedFiles: [ModifiedFileSchema],
  dependencies: [DependencySchema],
  consoleOutput: [ConsoleOutputSchema],
  sessionNotes: { 
    type: String,
    default: ''
  },
  metadata: {
    startedAt: { 
      type: Date, 
      required: true,
      default: Date.now
    },
    endedAt: { 
      type: Date 
    },
    duration: { 
      type: Number, 
      required: true,
      default: 0
    },
    completionPercentage: { 
      type: Number, 
      required: true,
      default: 0
    },
    relatedPlanningId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'PlanningResults' 
    },
    userInitiated: { 
      type: Boolean, 
      required: true,
      default: false
    },
    aiGenerated: { 
      type: Boolean, 
      required: true,
      default: true
    }
  }
}, {
  timestamps: true
});

// Create indexes
DevelopmentSessionSchema.index({ projectId: 1, status: 1 });
DevelopmentSessionSchema.index({ 'metadata.startedAt': -1 });

// Pre-save hook
DevelopmentSessionSchema.pre('save', function(next) {
  // Calculate session duration if a session is completed
  if (this.status === 'completed' && !this.metadata.endedAt) {
    this.metadata.endedAt = new Date();
    this.metadata.duration = this.metadata.endedAt.getTime() - this.metadata.startedAt.getTime();
  }
  
  // Calculate completion percentage based on files
  const totalFiles = this.createdFiles.length + this.modifiedFiles.length;
  
  if (totalFiles > 0) {
    const completedCreatedFiles = this.createdFiles.filter((f: any) => 
      f.status === 'created' || f.status === 'completed').length;
    
    const completedModifiedFiles = this.modifiedFiles.filter((f: any) => 
      f.status === 'modified' || f.status === 'completed').length;
    
    this.metadata.completionPercentage = Math.round(
      ((completedCreatedFiles + completedModifiedFiles) / totalFiles) * 100
    );
  }
  
  next();
});

// Method to add console output
DevelopmentSessionSchema.methods.addConsoleOutput = function(
  command: string, 
  output: string,
  exitCode: number = 0
) {
  this.consoleOutput.push({
    command,
    output,
    exitCode,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to add created file
DevelopmentSessionSchema.methods.addCreatedFile = function(
  path: string,
  content: string,
  description: string,
  purpose: string,
  language: string
) {
  this.createdFiles.push({
    path,
    content,
    description,
    purpose,
    language,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return this.save();
};

// Method to update file status
DevelopmentSessionSchema.methods.updateFileStatus = function(
  path: string,
  status: 'pending' | 'created' | 'modified' | 'completed' | 'error'
) {
  // Check created files
  const createdFile = this.createdFiles.find((f: any) => f.path === path);
  if (createdFile) {
    createdFile.status = status;
    createdFile.updatedAt = new Date();
  }
  
  // Check modified files
  const modifiedFile = this.modifiedFiles.find((f: any) => f.path === path);
  if (modifiedFile) {
    modifiedFile.status = status;
  }
  
  return this.save();
};

export const DevelopmentSession = mongoose.models.DevelopmentSession || 
  mongoose.model<IDevelopmentSession>('DevelopmentSession', DevelopmentSessionSchema); 