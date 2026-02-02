export interface User {
  id: string
  email: string
  name?: string
}

export interface Project {
  id: string
  title: string
  description: string
  ideation?: string
  createdAt: Date
  updatedAt: Date
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
  stepContext?: {
    phase: string
    stepId: number
    action: {
      type: string
      status: 'pending' | 'in_progress' | 'completed'
      message: string
    }
  }
}

export interface Step {
  id: number
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  action: string
  dependencies: string[]
  progress?: string
  result?: string
  completedAt?: Date
  buttons: string[]
}

export interface Phase {
  name: string
  status: 'pending' | 'in_progress' | 'completed'
  steps: Step[]
  completedAt?: Date
}

export interface RepositoryAnalysis {
  projectId: string
  stages: AnalysisStage[]
  repositoryStructure: {
    totalFiles: number
    mainLanguages: {
      name: string
      count: number
    }[]
    directoryStructure: {
      path: string
      files: number
      subdirectories: number
    }[]
  }
  codeStructure: {
    fileCount: number
    mainLanguages: {
      name: string
      count: number
    }[]
    directoryStructure: {
      path: string
      files: number
      subdirectories: number
    }[]
  }
  recommendations?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface AnalysisStage {
  name: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress?: number
  error?: string
}

export interface ProjectState {
  projectId: string
  currentPhase: string
  phases: ProjectPhase[]
  createdAt: Date
  updatedAt: Date
}

export interface ProjectPhase {
  name: string
  steps: ProjectStep[]
  status: 'pending' | 'in_progress' | 'completed'
}

export interface ProjectStep {
  id: number
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  dependencies?: number[]
  completedAt?: Date
}

export interface StepContext {
  phase: string
  stepId: number
  action: {
    type: 'step_update'
    status: 'pending' | 'in_progress' | 'completed'
    message: string
  }
}

export interface ChatResponse {
  message: string
  stepContext?: StepContext
}

export interface ChatError {
  error: string
  status: number
}
