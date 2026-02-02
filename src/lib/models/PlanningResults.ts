import mongoose from 'mongoose'
import type { Document } from 'mongoose'
import { ObjectId } from 'mongodb'

/**
 * PlanningResults model - Stores planning outputs for file hierarchies and code structures
 * This connects with repository analysis data to track project plans
 */

// Base interface for client-side use
export interface IPlanningResultsData {
  projectId: ObjectId;
  version: number;
  name: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  fileHierarchy: {
    rootDirectory: string;
    structure: Array<{
      path: string;
      type: 'file' | 'directory';
      description?: string;
      purpose?: string;
      dependsOn?: string[];
      technologies?: string[];
      status?: 'planned' | 'created' | 'modified' | 'completed';
    }>;
  };
  codeStructures: Array<{
    filePath: string;
    components: Array<{
      name: string;
      type: 'class' | 'function' | 'interface' | 'component' | 'module' | 'other';
      description: string;
      dependencies?: string[];
      props?: Record<string, any>;
      methods?: Array<{
        name: string;
        description: string;
        parameters?: Array<{
          name: string;
          type: string;
          description?: string;
        }>;
        returnType?: string;
      }>;
    }>;
  }>;
  technicalSpecifications: {
    frameworks: string[];
    libraries: string[];
    apis: string[];
    databases: string[];
    devOps: string[];
    patterns: string[];
  };
  planningNotes: string;
  approvedBy?: string;
  approvedAt?: Date;
  metadata: {
    source: 'user_input' | 'ai_generated' | 'hybrid';
    generatedFrom?: string; // ID of repository or analysis used
    generatedAt: Date;
    modifiedAt?: Date;
    modifiedBy?: string;
  };
  relatedRepositoryId?: ObjectId;
  relatedAnalysisId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Server-side interface that extends Document
export interface IPlanningResults extends Document, IPlanningResultsData {}

// File structure schema
const FileStructureSchema = new mongoose.Schema({
  path: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    required: true,
    enum: ['file', 'directory'] 
  },
  description: { 
    type: String 
  },
  purpose: { 
    type: String 
  },
  dependsOn: [{ 
    type: String 
  }],
  technologies: [{ 
    type: String 
  }],
  status: { 
    type: String,
    enum: ['planned', 'created', 'modified', 'completed'],
    default: 'planned'
  }
}, { _id: false });

// Method parameter schema
const MethodParameterSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  }
}, { _id: false });

// Component method schema
const ComponentMethodSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  parameters: [MethodParameterSchema],
  returnType: { 
    type: String 
  }
}, { _id: false });

// Component schema
const ComponentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    required: true,
    enum: ['class', 'function', 'interface', 'component', 'module', 'other']
  },
  description: { 
    type: String, 
    required: true 
  },
  dependencies: [{ 
    type: String 
  }],
  props: { 
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  methods: [ComponentMethodSchema]
}, { _id: false });

// Code structure schema
const CodeStructureSchema = new mongoose.Schema({
  filePath: { 
    type: String, 
    required: true 
  },
  components: [ComponentSchema]
}, { _id: false });

// Technical specifications schema
const TechnicalSpecificationsSchema = new mongoose.Schema({
  frameworks: [{ 
    type: String 
  }],
  libraries: [{ 
    type: String 
  }],
  apis: [{ 
    type: String 
  }],
  databases: [{ 
    type: String 
  }],
  devOps: [{ 
    type: String 
  }],
  patterns: [{ 
    type: String 
  }]
}, { _id: false });

// Main schema
const PlanningResultsSchema = new mongoose.Schema<IPlanningResults>({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project',
    required: true,
    index: true
  },
  version: { 
    type: Number, 
    required: true,
    default: 1
  },
  name: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['draft', 'in_progress', 'completed', 'archived'],
    default: 'draft'
  },
  fileHierarchy: { 
    rootDirectory: { 
      type: String, 
      required: true 
    },
    structure: [FileStructureSchema]
  },
  codeStructures: [CodeStructureSchema],
  technicalSpecifications: {
    type: TechnicalSpecificationsSchema,
    default: {}
  },
  planningNotes: { 
    type: String,
    default: ''
  },
  approvedBy: { 
    type: String 
  },
  approvedAt: { 
    type: Date 
  },
  metadata: {
    source: { 
      type: String, 
      required: true,
      enum: ['user_input', 'ai_generated', 'hybrid']
    },
    generatedFrom: { 
      type: String 
    },
    generatedAt: { 
      type: Date, 
      required: true,
      default: Date.now
    },
    modifiedAt: { 
      type: Date 
    },
    modifiedBy: { 
      type: String 
    }
  },
  relatedRepositoryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Repository',
  },
  relatedAnalysisId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'RepositoryAnalysis'
  },
}, {
  timestamps: true
});

// Create indexes
PlanningResultsSchema.index({ projectId: 1, version: 1 }, { unique: true });
PlanningResultsSchema.index({ 'metadata.generatedAt': -1 });
PlanningResultsSchema.index({ status: 1 });

// Helper method to create a new version
PlanningResultsSchema.methods.createNewVersion = async function() {
  // Get current version details
  const currentData = this.toObject();
  
  // Remove MongoDB specific fields
  delete currentData._id;
  delete currentData.createdAt;
  delete currentData.updatedAt;
  delete currentData.__v;
  
  // Set new version number
  currentData.version = this.version + 1;
  
  // Update metadata
  currentData.metadata.generatedAt = new Date();
  currentData.metadata.modifiedAt = null;
  currentData.metadata.modifiedBy = null;
  currentData.status = 'draft';
  
  try {
    // Use the model directly
    return await mongoose.model('PlanningResults').create(currentData);
  } catch (error) {
    console.error('Error creating new version:', error);
    throw error;
  }
};

// Helper method to update file structure status
PlanningResultsSchema.methods.updateFileStatus = function(filePath: string, status: 'planned' | 'created' | 'modified' | 'completed') {
  // Find the file in structure
  const fileEntry = this.fileHierarchy.structure.find((f: any) => f.path === filePath);
  
  if (fileEntry) {
    fileEntry.status = status;
    this.metadata.modifiedAt = new Date();
  }
  
  return this.save();
};

// Pre-save hook
PlanningResultsSchema.pre('save', function(next) {
  // If this is a modification and modifiedAt isn't set,
  // update the modifiedAt timestamp
  if (!this.isNew && this.isModified() && !this.metadata.modifiedAt) {
    this.metadata.modifiedAt = new Date();
  }
  
  next();
});

export const PlanningResults = mongoose.models.PlanningResults || 
  mongoose.model<IPlanningResults>('PlanningResults', PlanningResultsSchema); 