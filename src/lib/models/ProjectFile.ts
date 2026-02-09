import mongoose from 'mongoose'
import type { Document } from 'mongoose'
import { ObjectId } from 'mongodb'

/**
 * ProjectFile model - Stores the generated code files
 * This is part of Phase 1, Step 3 of the GRIP AI Assistant Enhancement Plan
 */

// Base interface for client-side use
export interface IProjectFileData {
  projectId: ObjectId;
  path: string;
  filename: string;
  content: string;
  language: string;
  size: number;
  version: number;
  hash: string;
  metadata: {
    generatedBy: string;
    purpose: string;
    dependencies?: string[];
    imports?: string[];
    exports?: string[];
  };
  history: Array<{
    version: number;
    content: string;
    timestamp: Date;
    changes?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Server-side interface that extends Document
export interface IProjectFile extends Document, IProjectFileData {}

const FileHistorySchema = new mongoose.Schema({
  version: { type: Number, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, required: true, default: Date.now },
  changes: String
}, { _id: false });

const ProjectFileSchema = new mongoose.Schema<IProjectFile>({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project',
    required: true
  },
  path: { 
    type: String, 
    required: true,
    index: true
  },
  filename: { 
    type: String, 
    required: true,
    index: true
  },
  content: { 
    type: String, 
    required: true
  },
  language: { 
    type: String, 
    required: true,
    index: true
  },
  size: { 
    type: Number, 
    required: true
  },
  version: { 
    type: Number, 
    required: true,
    default: 1
  },
  hash: { 
    type: String, 
    required: true
  },
  metadata: {
    generatedBy: { type: String, required: true },
    purpose: { type: String, required: true },
    dependencies: [String],
    imports: [String],
    exports: [String]
  },
  history: [FileHistorySchema]
}, {
  timestamps: true,
  collection: 'projectFiles'
});

// Create compound index
ProjectFileSchema.index({ projectId: 1, path: 1, filename: 1 }, { unique: true });

// Generate file hash from content
ProjectFileSchema.pre('save', function(next) {
  try {
    // If this is a new version, save the current content to history
    if (this.isModified('content') && !this.isNew) {
      const previousVersion = this.version;
      this.version += 1;
      
      // Add previous content to history
      this.history.push({
        version: previousVersion,
        content: this.content,
        timestamp: new Date(),
        changes: 'File updated'
      });
    }
    
    // Update file size
    if (this.isModified('content')) {
      this.size = Buffer.byteLength(this.content, 'utf8');
      
      // Generate hash using Buffer's toString('base64') method
      this.hash = Buffer.from(this.content).toString('base64').substring(0, 16);
    }
    
    console.log('Saving project file:', {
      projectId: this.projectId,
      path: this.path,
      filename: this.filename,
      version: this.version
    });
    
    next();
  } catch (error) {
    console.error('Error during project file save:', error);
    next(error instanceof Error ? error : new Error('Unknown error during save'));
  }
});

export const ProjectFile = mongoose.models.ProjectFile || 
  mongoose.model<IProjectFile>('ProjectFile', ProjectFileSchema); 