import mongoose from 'mongoose'
import type { Document } from 'mongoose'

export interface IProject extends Document {
  title: string;
  description: string;
  status?: 'active' | 'completed' | 'archived';
  repository?: {
    owner: string;
    name: string;
  };
  ideation: {
    goals: string;
    targetAudience: string;
    keyFeatures: string;
    technicalRequirements: string;
  };
  /** Optional: instructions for GRIP to do web research (e.g. public figure, client, company) and use real data in the build. */
  researchInstructions?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const RepositorySchema = new mongoose.Schema({
  owner: { 
    type: String, 
    required: true, 
    trim: true,
    validate: {
      validator: function(v: string) {
        return v.length > 0;
      },
      message: 'Repository owner cannot be empty'
    }
  },
  name: { 
    type: String, 
    required: true, 
    trim: true,
    validate: {
      validator: function(v: string) {
        return v.length > 0;
      },
      message: 'Repository name cannot be empty'
    }
  }
}, { _id: false })

const IdeationSchema = new mongoose.Schema({
  goals: { type: String, default: '', trim: true },
  targetAudience: { type: String, default: '', trim: true },
  keyFeatures: { type: String, default: '', trim: true },
  technicalRequirements: { type: String, default: '', trim: true }
}, { _id: false })

const ProjectSchema = new mongoose.Schema<IProject>({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active',
  },
  repository: { 
    type: RepositorySchema,
    required: false,
    validate: {
      validator: function(v: any) {
        // If repository is present, ensure it has both owner and name
        return !v || (v.owner && v.name);
      },
      message: 'Repository must have both owner and name if present'
    }
  },
  ideation: {
    type: IdeationSchema,
    required: false,
    default: () => ({ goals: '', targetAudience: '', keyFeatures: '', technicalRequirements: '' })
  },
  researchInstructions: { type: String, required: false, trim: true },
  userId: { type: String, required: true, trim: true }
}, {
  timestamps: true,
  strict: true,
  strictQuery: true
})

// Add pre-save middleware to ensure all required fields are set
ProjectSchema.pre('save', function(next) {
  try {
    console.log('Project pre-save validation:', {
      userId: this.userId,
      title: this.title,
      description: this.description,
      repository: this.repository,
      ideation: this.ideation
    })

    // Check required fields
    if (!this.userId || !this.title || !this.description) {
      const missingFields = []
      if (!this.userId) missingFields.push('userId')
      if (!this.title) missingFields.push('title')
      if (!this.description) missingFields.push('description')
      
      console.error('Missing required fields:', missingFields)
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
    }

    // Normalize ideation: ensure object and all four keys exist (default ''). Allow partial/empty so project creation always succeeds and user can add more in Settings.
    if (!this.ideation || typeof this.ideation !== 'object') {
      this.ideation = { goals: '', targetAudience: '', keyFeatures: '', technicalRequirements: '' }
    } else {
      this.ideation.goals = String(this.ideation.goals ?? '').trim()
      this.ideation.targetAudience = String(this.ideation.targetAudience ?? '').trim()
      this.ideation.keyFeatures = String(this.ideation.keyFeatures ?? '').trim()
      this.ideation.technicalRequirements = String(this.ideation.technicalRequirements ?? '').trim()
    }

    // Validate repository if present
    if (this.repository) {
      console.log('Validating repository:', this.repository)
      if (!this.repository.owner?.trim() || !this.repository.name?.trim()) {
        const missingFields = []
        if (!this.repository.owner?.trim()) missingFields.push('repository.owner')
        if (!this.repository.name?.trim()) missingFields.push('repository.name')
        
        console.error('Missing repository fields:', missingFields)
        throw new Error(`Missing repository fields: ${missingFields.join(', ')}`)
      }

      const originalRepo = { ...this.repository }
      this.repository.owner = String(this.repository.owner).trim()
      this.repository.name = String(this.repository.name).trim()

      if (JSON.stringify(originalRepo) !== JSON.stringify(this.repository)) {
        console.log('Repository fields were trimmed:', {
          before: originalRepo,
          after: this.repository
        })
      }
    }

    console.log('Project validation passed successfully')
    next()
  } catch (error) {
    console.error('Project validation failed:', error)
    next(error instanceof Error ? error : new Error('Unknown validation error'))
  }
})

export const Project = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema) 