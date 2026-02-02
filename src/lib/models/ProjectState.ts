import mongoose from 'mongoose'
import type { Document } from 'mongoose'
import { ObjectId } from 'mongodb'

// Base interface without Document extension for client-side use
export interface IProjectStateData {
  projectId: ObjectId;
  currentPhase: string;
  phases: Array<{
    name: string;
    status: 'pending' | 'in_progress' | 'completed';
    steps: Array<{
      id: number;
      title: string;
      status: 'pending' | 'in_progress' | 'completed';
      action: string;
      dependencies: string[];
      progress?: string;
      result?: string;
      completedAt?: Date;
    }>;
    completedAt?: Date;
  }>;
  chatHistory: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    stepContext?: {
      phase: string;
      stepId: number;
      action?: {
        type: string;
        status: string;
        message?: string;
      };
    };
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Server-side interface that extends Document
export interface IProjectState extends Document, IProjectStateData {}

const ProjectStateSchema = new mongoose.Schema<IProjectState>({
  projectId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  currentPhase: { type: String, required: true },
  phases: [{
    name: { type: String, required: true },
    status: { 
      type: String, 
      required: true,
      enum: ['pending', 'in_progress', 'completed']
    },
    steps: [{
      id: { type: Number, required: true },
      title: { type: String, required: true },
      status: { 
        type: String, 
        required: true,
        enum: ['pending', 'in_progress', 'completed']
      },
      action: { type: String, required: true },
      dependencies: [{ type: String }],
      progress: String,
      result: String,
      completedAt: Date
    }],
    completedAt: Date
  }],
  chatHistory: [{
    id: { type: String, required: true },
    role: { 
      type: String, 
      required: true,
      enum: ['user', 'assistant']
    },
    content: { type: String, required: true },
    timestamp: { type: Date, required: true },
    stepContext: {
      phase: String,
      stepId: Number,
      action: {
        type: String,
        status: String,
        message: String
      }
    }
  }]
}, {
  timestamps: true
})

export const ProjectState = mongoose.models.ProjectState || mongoose.model<IProjectState>('ProjectState', ProjectStateSchema) 