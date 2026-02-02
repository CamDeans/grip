import mongoose from 'mongoose'
import type { Document } from 'mongoose'
import { ObjectId } from 'mongodb'

/**
 * ProjectStructure model - Stores the generated project structure
 * This is part of Phase 1, Step 2 of the GRIP AI Assistant Enhancement Plan
 */

// Base interface for client-side use
export interface IProjectStructureData {
  projectId: ObjectId;
  name: string;
  description: string;
  fileHierarchy: {
    type: 'directory' | 'file';
    name: string;
    path: string;
    language?: string;
    children?: IFileNode[];
  };
  dependencies: {
    [key: string]: string; // name: version
  };
  buildConfig: {
    commands: {
      [key: string]: string; // e.g., "build": "npm run build"
    };
    environment: {
      [key: string]: string; // environment variables
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Interface for file/directory node in hierarchy
export interface IFileNode {
  type: 'directory' | 'file';
  name: string;
  path: string;
  language?: string;
  size?: number; // in bytes for files
  children?: IFileNode[]; // for directories
  description?: string; // purpose of this file
  dependencies?: string[]; // other files this depends on
}

// Server-side interface that extends Document
export interface IProjectStructure extends Document, IProjectStructureData {}

const FileNodeSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true,
    enum: ['directory', 'file']
  },
  name: { type: String, required: true },
  path: { type: String, required: true },
  language: String,
  size: Number,
  children: { type: [mongoose.Schema.Types.Mixed], default: [] }, // Recursive schema
  description: String,
  dependencies: [String]
}, { _id: false });

// Handle the recursive nature of the schema
FileNodeSchema.add({ children: [FileNodeSchema] });

const ProjectStructureSchema = new mongoose.Schema<IProjectStructure>({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project',
    required: true,
    index: true,
    unique: true
  },
  name: { type: String, required: true },
  description: { type: String, required: true },
  fileHierarchy: {
    type: FileNodeSchema,
    required: true
  },
  dependencies: {
    type: Map,
    of: String,
    default: {}
  },
  buildConfig: {
    commands: {
      type: Map,
      of: String,
      default: {}
    },
    environment: {
      type: Map,
      of: String,
      default: {}
    }
  }
}, {
  timestamps: true
});

// Pre-save middleware
ProjectStructureSchema.pre('save', function(next) {
  try {
    console.log('Saving project structure:', {
      projectId: this.projectId,
      name: this.name
    });
    next();
  } catch (error) {
    console.error('Error during project structure save:', error);
    next(error instanceof Error ? error : new Error('Unknown error during save'));
  }
});

export const ProjectStructure = mongoose.models.ProjectStructure || 
  mongoose.model<IProjectStructure>('ProjectStructure', ProjectStructureSchema); 