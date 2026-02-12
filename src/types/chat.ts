import { ObjectId } from 'mongodb'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    type?: string
    submissionIndex?: number
    source?: string
    /** Set when the backend ran the automated build after applying code */
    buildRan?: boolean
    buildSucceeded?: boolean
    runErrors?: string[]
  }
}

export interface AIMessage extends ChatMessage {
  role: 'assistant'
  stepContext?: StepContext
  code?: {
    language: string
    content: string
    path?: string
  }
}

export interface StepContext {
  phase: string
  stepId: number
  action: {
    type: string
    status: 'pending' | 'in_progress' | 'completed'
    message: string
  }
}

export interface Step {
  id: number
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  action: string
  dependencies: string[]
  buttons: string[]
  progress?: string
  result?: string
  completedAt?: Date
}

export interface Phase {
  name: string
  status: 'pending' | 'in_progress' | 'completed'
  steps: Step[]
  completedAt?: Date
}

export interface Project {
  id: string
  title: string
  description: string
  steps: Record<string, Record<number, {
    status: string
    completedAt?: Date
  }>>
}

export interface Analysis {
  id: string
  projectId: string
  content: string
  createdAt: Date
}

export interface StepAction {
  projectId: string
  phase: string
  stepId: number
  action: string
}

export interface StepResponse {
  message: string
  status: 'completed' | 'error'
}

export interface StepDetails {
  phase: string
  stepId: number
  projectName: string
  dependencies: string[]
  requirements: string[]
  estimatedTime: string
}

export interface ProjectState {
  _id?: ObjectId
  projectId: string | ObjectId
  currentPhase: string
  phases: Phase[]
  chatHistory: AIMessage[]
  createdAt: Date
  updatedAt: Date
}

export interface ErrorState {
  id: string
  message: string
  timestamp: Date
} 