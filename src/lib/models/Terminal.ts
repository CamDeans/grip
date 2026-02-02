import mongoose from 'mongoose'
import type { Document } from 'mongoose'

export interface ITerminal extends Document {
  id: string;
  projectId: string;
  projectName: string;
  currentDirectory: string;
  steps: Array<{
    id: number;
    title: string;
    description: string[];
    commands: string[];
    success_criteria: string[];
    completed: boolean;
  }>;
  currentStep: number;
  history: Array<{
    command: string;
    output: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const TerminalSchema = new mongoose.Schema<ITerminal>({
  id: { type: String, required: true, unique: true },
  projectId: { type: String, required: true },
  projectName: { type: String, required: true },
  currentDirectory: { type: String, required: true },
  steps: [{
    id: { type: Number, required: true },
    title: { type: String, required: true },
    description: [{ type: String }],
    commands: [{ type: String }],
    success_criteria: [{ type: String }],
    completed: { type: Boolean, default: false }
  }],
  currentStep: { type: Number, default: 0 },
  history: [{
    command: { type: String, required: true },
    output: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
})

// Ensure id is set before saving
TerminalSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = `terminal-${this.projectId}`
  }
  next()
})

export const TerminalModel = mongoose.models.Terminal || mongoose.model<ITerminal>('Terminal', TerminalSchema) 
