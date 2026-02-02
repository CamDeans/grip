import mongoose from 'mongoose'
import type { Document } from 'mongoose'
import { ObjectId } from 'mongodb'

/**
 * DevelopmentProgress model - Tracks user progress through development phases
 * This stores all user interactions with the development workflow
 */

// Base interface for client-side use
export interface IDevelopmentProgressData {
  projectId: ObjectId;
  userId: string;
  currentPhase: string;
  currentStep: number;
  phaseHistory: Array<{
    phase: string;
    step: number;
    action: string;
    userInput?: string;
    result?: string;
    status: 'started' | 'in_progress' | 'completed' | 'skipped';
    startedAt: Date;
    completedAt?: Date;
  }>;
  buttonSelections: Array<{
    phase: string;
    step: number;
    buttonText: string;
    context: string;
    timestamp: Date;
  }>;
  userPrompts: Array<{
    phase: string;
    step: number;
    prompt: string;
    timestamp: Date;
  }>;
  metadata: {
    totalTimeSpent: number; // in milliseconds
    lastInteractionAt: Date;
    completionPercentage: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Server-side interface that extends Document
export interface IDevelopmentProgress extends Document, IDevelopmentProgressData {}

// Phase history schema
const PhaseHistorySchema = new mongoose.Schema({
  phase: { 
    type: String, 
    required: true 
  },
  step: { 
    type: Number, 
    required: true 
  },
  action: { 
    type: String, 
    required: true 
  },
  userInput: { 
    type: String 
  },
  result: { 
    type: String 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['started', 'in_progress', 'completed', 'skipped'],
    default: 'started'
  },
  startedAt: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  completedAt: { 
    type: Date 
  }
}, { _id: false });

// Button selection schema
const ButtonSelectionSchema = new mongoose.Schema({
  phase: { 
    type: String, 
    required: true 
  },
  step: { 
    type: Number, 
    required: true 
  },
  buttonText: { 
    type: String, 
    required: true 
  },
  context: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    required: true,
    default: Date.now
  }
}, { _id: false });

// User prompt schema
const UserPromptSchema = new mongoose.Schema({
  phase: { 
    type: String, 
    required: true 
  },
  step: { 
    type: Number, 
    required: true 
  },
  prompt: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    required: true,
    default: Date.now
  }
}, { _id: false });

// Main schema
const DevelopmentProgressSchema = new mongoose.Schema<IDevelopmentProgress>({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project',
    required: true,
    index: true
  },
  userId: { 
    type: String, 
    required: true,
    index: true
  },
  currentPhase: { 
    type: String, 
    required: true,
    default: 'initialization' 
  },
  currentStep: { 
    type: Number, 
    required: true,
    default: 0
  },
  phaseHistory: [PhaseHistorySchema],
  buttonSelections: [ButtonSelectionSchema],
  userPrompts: [UserPromptSchema],
  metadata: {
    totalTimeSpent: { 
      type: Number, 
      required: true,
      default: 0
    },
    lastInteractionAt: { 
      type: Date, 
      required: true,
      default: Date.now
    },
    completionPercentage: { 
      type: Number, 
      required: true,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Create indexes
DevelopmentProgressSchema.index({ projectId: 1, userId: 1 }, { unique: true });
DevelopmentProgressSchema.index({ 'metadata.lastInteractionAt': -1 });

// Pre-save hook to update lastInteractionAt
DevelopmentProgressSchema.pre('save', function(next) {
  this.metadata.lastInteractionAt = new Date();
  next();
});

// Add method to track phase transition
DevelopmentProgressSchema.methods.recordPhaseTransition = function(
  phase: string, 
  step: number, 
  action: string, 
  status: 'started' | 'in_progress' | 'completed' | 'skipped' = 'started'
) {
  // Update current phase and step
  this.currentPhase = phase;
  this.currentStep = step;
  
  // Add to phase history
  this.phaseHistory.push({
    phase,
    step,
    action,
    status,
    startedAt: new Date()
  });
  
  return this.save();
};

// Add method to record button selection
DevelopmentProgressSchema.methods.recordButtonSelection = function(
  phase: string,
  step: number,
  buttonText: string,
  context: string
) {
  this.buttonSelections.push({
    phase,
    step,
    buttonText,
    context, 
    timestamp: new Date()
  });
  
  return this.save();
};

// Add method to record completion
DevelopmentProgressSchema.methods.recordCompletion = function(
  phase: string,
  step: number,
  result?: string
) {
  // Find the last matching phase entry
  const phaseEntry = [...this.phaseHistory]
    .reverse()
    .find(entry => entry.phase === phase && entry.step === step);
  
  if (phaseEntry) {
    phaseEntry.status = 'completed';
    phaseEntry.completedAt = new Date();
    if (result) phaseEntry.result = result;
  }
  
  // Calculate completion percentage
  // This is simplified and should be customized based on your phases
  const totalPhases = this.phaseHistory.length;
  const completedPhases = this.phaseHistory.filter((p: any) => p.status === 'completed').length;
  this.metadata.completionPercentage = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0;
  
  return this.save();
};

export const DevelopmentProgress = mongoose.models.DevelopmentProgress || 
  mongoose.model<IDevelopmentProgress>('DevelopmentProgress', DevelopmentProgressSchema); 