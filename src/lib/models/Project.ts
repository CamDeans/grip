import mongoose from 'mongoose'
import type { Document } from 'mongoose'

export interface IProject extends Document {
  title: string;
  description: string;
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
  goals: { 
    type: String, 
    required: true, 
    trim: true,
    validate: {
      validator: function(v: string) {
        return v.length > 0;
      },
      message: 'Goals cannot be empty'
    }
  },
  targetAudience: { 
    type: String, 
    required: true, 
    trim: true,
    validate: {
      validator: function(v: string) {
        return v.length > 0;
      },
      message: 'Target audience cannot be empty'
    }
  },
  keyFeatures: { 
    type: String, 
    required: true, 
    trim: true,
    validate: {
      validator: function(v: string) {
        return v.length > 0;
      },
      message: 'Key features cannot be empty'
    }
  },
  technicalRequirements: { 
    type: String, 
    required: true, 
    trim: true,
    validate: {
      validator: function(v: string) {
        return v.length > 0;
      },
      message: 'Technical requirements cannot be empty'
    }
  }
}, { _id: false })

const ProjectSchema = new mongoose.Schema<IProject>({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
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
    required: true,
    validate: {
      validator: function(v: any) {
        return v && v.goals && v.targetAudience && v.keyFeatures && v.technicalRequirements;
      },
      message: 'All ideation fields are required'
    }
  },
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

    // Initialize ideation if not set
    if (!this.ideation) {
      console.log('Initializing empty ideation object')
      this.ideation = {
        goals: '',
        targetAudience: '',
        keyFeatures: '',
        technicalRequirements: ''
      }
    }

    // Validate ideation fields
    if (!this.ideation.goals?.trim() || 
        !this.ideation.targetAudience?.trim() || 
        !this.ideation.keyFeatures?.trim() || 
        !this.ideation.technicalRequirements?.trim()) {
      const missingFields = []
      if (!this.ideation.goals?.trim()) missingFields.push('ideation.goals')
      if (!this.ideation.targetAudience?.trim()) missingFields.push('ideation.targetAudience')
      if (!this.ideation.keyFeatures?.trim()) missingFields.push('ideation.keyFeatures')
      if (!this.ideation.technicalRequirements?.trim()) missingFields.push('ideation.technicalRequirements')
      
      console.error('Missing ideation fields:', missingFields)
      throw new Error(`Missing ideation fields: ${missingFields.join(', ')}`)
    }

    // Ensure all ideation fields are strings and trimmed
    const originalIdeation = { ...this.ideation }
    this.ideation.goals = String(this.ideation.goals).trim()
    this.ideation.targetAudience = String(this.ideation.targetAudience).trim()
    this.ideation.keyFeatures = String(this.ideation.keyFeatures).trim()
    this.ideation.technicalRequirements = String(this.ideation.technicalRequirements).trim()

    if (JSON.stringify(originalIdeation) !== JSON.stringify(this.ideation)) {
      console.log('Ideation fields were trimmed:', {
        before: originalIdeation,
        after: this.ideation
      })
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