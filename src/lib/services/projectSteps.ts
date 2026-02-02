import { Project, ProjectStep } from '@/types'

export interface ProjectSteps {
  steps: ProjectStep[]
  currentStep: number
}

export function generateInitialSteps(project: Project): ProjectStep[] {
  const { ideation } = project
  if (!ideation) {
    return [
      {
        id: 1,
        title: 'Project Setup',
        status: 'pending',
        description: 'Initialize project and install core dependencies',
        dependencies: []
      }
    ]
  }

  // Basic steps that every project needs
  const steps: ProjectStep[] = [
    {
      id: 1,
      title: 'Project Setup',
      status: 'pending',
      description: 'Initialize project and install core dependencies',
      dependencies: []
    },
    {
      id: 2,
      title: 'Development Environment',
      status: 'pending',
      description: 'Configure development tools, linting, and TypeScript',
      dependencies: [1]
    },
    {
      id: 3,
      title: 'Project Structure',
      status: 'pending',
      description: 'Set up project architecture and file organization',
      dependencies: [2]
    }
  ]

  return steps
}

export function getNextStep(steps: ProjectStep[], currentStep: number): ProjectStep | null {
  const nextStep = steps.find(step => step.id === currentStep + 1)
  return nextStep || null
}

export function getTotalSteps(steps: ProjectStep[]): number {
  return steps.length
}

export function getStepProgress(steps: ProjectStep[]): number {
  const completed = steps.filter(step => step.status === 'completed').length
  return Math.round((completed / steps.length) * 100)
}

export function addStep(steps: ProjectStep[], newStep: Omit<ProjectStep, 'id'>): ProjectStep[] {
  const nextId = Math.max(...steps.map(s => s.id)) + 1
  return [...steps, { ...newStep, id: nextId }]
}

export function updateStep(steps: ProjectStep[], stepId: number, updates: Partial<ProjectStep>): ProjectStep[] {
  return steps.map(step => 
    step.id === stepId ? { ...step, ...updates } : step
  )
} 
