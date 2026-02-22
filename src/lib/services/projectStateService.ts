import { clientPromise, DB_NAME } from '../mongodb'
import { ObjectId } from 'mongodb'
import { AIMessage } from '@/types/chat'
import type { IProjectStateData } from '../models/ProjectState'
import type { DevelopmentPlan } from './planGeneratorService'
import { getDevelopmentPlan } from './planGeneratorService'

// Check if we're on the client side
const isClient = typeof window !== 'undefined'
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'

export async function initializeProjectState(projectId: string): Promise<void> {
  if (isClient) {
    console.warn('Cannot initialize project state from client-side')
    return
  }

  if (isDev) console.log('Initializing project state for project:', projectId)
  
  // Define default phases for project initialization
  const defaultPhases = [
    {
      name: 'Development Environment Setup',
      status: 'pending' as const,
      steps: [
        {
          id: 1,
          title: 'Project Setup',
          status: 'pending' as const,
          action: 'Initialize project setup',
          dependencies: [],
          progress: '0%'
        }
      ]
    }
  ]

  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)

    // Check if project state already exists
    const existingState = await db.collection('projectStates').findOne({
      projectId: new ObjectId(projectId)
    })

    if (existingState) {
      if (isDev) console.log('Project state already exists, skipping initialization')
      return
    }

    // Initialize new project state
    const success = await ensureProjectState(projectId, defaultPhases)
    if (!success) {
      throw new Error('Failed to initialize project state')
    }

    if (isDev) console.log('Project state initialized successfully')
  } catch (error) {
    console.error('Error initializing project state:', error)
    throw error
  }
}

export async function updateProjectState(
  projectId: string,
  updates: Partial<IProjectStateData>
) {
  if (isClient) {
    console.warn('Cannot update project state from client-side')
    return false
  }

  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)

    const updateResult = await db.collection('projectStates').updateOne(
      { projectId: new ObjectId(projectId) },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    )

    return updateResult.modifiedCount > 0
  } catch (error) {
    console.error('Error updating project state:', error)
    return false
  }
}

export async function addChatMessage(
  projectId: string,
  message: AIMessage
) {
  if (isClient) {
    console.warn('Cannot add chat message from client-side')
    return false
  }

  try {
    if (isDev) {
      console.log('addChatMessage: project:', projectId, 'message id:', message.id)
    }

    const client = await clientPromise
    const db = client.db(DB_NAME)

    // Insert message into chatHistory collection
    const result = await db.collection('chatHistory').insertOne({
      projectId: new ObjectId(projectId),
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp
    })

    if (isDev) console.log('Chat message insertion result:', result.acknowledged)
    return result.acknowledged
  } catch (error) {
    console.error('Error adding chat message:', error)
    return false
  }
}

export async function updateStepStatus(
  projectId: string,
  phase: string,
  stepId: number,
  status: 'pending' | 'in_progress' | 'completed',
  progress?: string,
  result?: string
) {
  if (isClient) {
    console.warn('Cannot update step status from client-side')
    return false
  }

  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)

    const projectState = await db.collection<IProjectStateData>('projectStates').findOne({
      projectId: new ObjectId(projectId)
    })

    if (!projectState) {
      throw new Error('Project state not found')
    }

    const phaseIndex = projectState.phases.findIndex((p: { name: string }) => p.name === phase)
    if (phaseIndex === -1) {
      throw new Error('Phase not found')
    }

    const stepIndex = projectState.phases[phaseIndex].steps.findIndex((s: { id: number }) => s.id === stepId)
    if (stepIndex === -1) {
      throw new Error('Step not found')
    }

    const updatePath = `phases.${phaseIndex}.steps.${stepIndex}`
    const updates: Record<string, any> = {
      [`${updatePath}.status`]: status,
      updatedAt: new Date()
    }

    if (status === 'completed') {
      updates[`${updatePath}.completedAt`] = new Date()
    }

    if (progress !== undefined) {
      updates[`${updatePath}.progress`] = progress
    }

    if (result !== undefined) {
      updates[`${updatePath}.result`] = result
    }

    // Check if all steps in phase are completed
    const allStepsCompleted = projectState.phases[phaseIndex].steps.every(
      (s: { status: string }, i: number) => (i === stepIndex ? status === 'completed' : s.status === 'completed')
    )

    if (allStepsCompleted) {
      updates[`phases.${phaseIndex}.status`] = 'completed'
      updates[`phases.${phaseIndex}.completedAt`] = new Date()

      // Move to next phase if available
      if (phaseIndex < projectState.phases.length - 1) {
        updates.currentPhase = projectState.phases[phaseIndex + 1].name
        updates[`phases.${phaseIndex + 1}.status`] = 'in_progress'
      }
    }

    const updateResult = await db.collection('projectStates').updateOne(
      { projectId: new ObjectId(projectId) },
      { $set: updates }
    )

    return updateResult.modifiedCount > 0
  } catch (error) {
    console.error('Error updating step status:', error)
    return false
  }
}

export async function getProjectState(projectId: string): Promise<IProjectStateData | null> {
  if (isClient) {
    console.warn('Cannot get project state from client-side')
    return null
  }

  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)

    let objectId: ObjectId
    try {
      objectId = new ObjectId(projectId)
    } catch (err) {
      console.error('Invalid project ID format:', err)
      return null
    }

    // Get project state
    const projectState = await db.collection<IProjectStateData>('projectStates').findOne({
      projectId: objectId
    })

    if (!projectState) return null

    const chatHistory = await db.collection<AIMessage>('chatHistory')
      .find({ projectId: objectId })
      .sort({ timestamp: 1 })
      .toArray()

    return {
      ...projectState,
      chatHistory: chatHistory || []
    }
  } catch (error) {
    console.error('Error in getProjectState:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    return null
  }
}

/**
 * Record a file save/update from chat and advance the current step so planning stays aligned.
 * Called after save-from-chat or update-from-chat so phases/steps reflect what the user has done.
 */
export async function recordFileSaveAndAdvanceStep(
  projectId: string,
  filePath: string,
  filename: string
): Promise<boolean> {
  if (isClient) return false
  try {
    const state = await getProjectState(projectId)
    if (!state?.phases?.length) return false
    const currentPhaseName = state.currentPhase
    const phase = state.phases.find((p: { name: string }) => p.name === currentPhaseName)
    if (!phase?.steps?.length) return false
    const step = phase.steps.find(
      (s: { status: string }) => s.status === 'pending' || s.status === 'in_progress'
    )
    if (!step) return false
    const resultPath = filePath ? `${filePath}/${filename}` : filename
    return updateStepStatus(projectId, phase.name, step.id, 'completed', '100%', `Saved: ${resultPath}`)
  } catch (e) {
    console.warn('recordFileSaveAndAdvanceStep:', e)
    return false
  }
}

/**
 * Sync project state phases and steps from a development plan.
 * When project state already exists, we MERGE: preserve existing phase/step completion
 * so Overview and enhanced chat reflect what the user and GRIP have already completed.
 */
export async function syncProjectStateFromPlan(projectId: string, plan: DevelopmentPlan): Promise<boolean> {
  if (isClient) {
    console.warn('Cannot sync project state from client-side')
    return false
  }
  const planPhases = plan.phases?.map((phase, phaseIndex) => ({
    name: phase.name,
    status: (phaseIndex === 0 ? 'in_progress' : phase.status === 'completed' ? 'completed' : phase.status === 'in_progress' ? 'in_progress' : 'pending') as 'pending' | 'in_progress' | 'completed',
    steps: (phase.tasks || []).map((task, stepIndex) => ({
      id: stepIndex + 1,
      title: task.title,
      status: (task.status === 'completed' ? 'completed' : task.status === 'in_progress' ? 'in_progress' : 'pending') as 'pending' | 'in_progress' | 'completed',
      action: task.description || task.title,
      dependencies: [] as string[],
      progress: task.status === 'completed' ? '100%' : '0%'
    }))
  }))
  if (!planPhases?.length) return false
  const existing = await getProjectState(projectId)
  if (existing?.phases?.length) {
    // Merge: preserve existing phase status and step status so completed work is not overwritten
    const mergedPhases = planPhases.map((planPhase) => {
      const existingPhase = existing.phases.find((p: { name: string }) => p.name === planPhase.name)
      if (!existingPhase) return planPhase
      const mergedSteps = planPhase.steps.map((planStep) => {
        const existingStep = existingPhase.steps?.find((s: { id: number }) => s.id === planStep.id)
        if (!existingStep) return planStep
        return {
          ...planStep,
          status: existingStep.status,
          progress: existingStep.progress ?? planStep.progress,
          result: existingStep.result
        }
      })
      const allStepsCompleted = mergedSteps.every((s) => s.status === 'completed')
      const status = existingPhase.status === 'completed' || allStepsCompleted ? 'completed' : existingPhase.status
      return {
        name: planPhase.name,
        status: status as 'pending' | 'in_progress' | 'completed',
        steps: mergedSteps
      }
    })
    // Keep existing currentPhase if it still exists in merged phases; otherwise set to first non-completed phase
    let currentPhase = existing.currentPhase
    const hasCurrent = mergedPhases.some((p: { name: string }) => p.name === currentPhase)
    if (!hasCurrent || !currentPhase) {
      const firstIncomplete = mergedPhases.find((p: { status: string }) => p.status !== 'completed')
      currentPhase = firstIncomplete?.name ?? mergedPhases[0]?.name ?? ''
    }
    return updateProjectState(projectId, { phases: mergedPhases, currentPhase })
  }
  return ensureProjectState(projectId, planPhases)
}

/**
 * Reconcile project state with actual progress: infer completed steps from project file count
 * so Overview and GRIP show the right phase when state was never advanced (e.g. before API applied code).
 * Only advances (never downgrades) completed step count.
 */
export async function reconcileProjectStateFromFiles(projectId: string): Promise<boolean> {
  if (isClient) return false
  try {
    const state = await getProjectState(projectId)
    if (!state?.phases?.length) return false

    const plan = await getDevelopmentPlan(projectId)
    if (!plan?.phases?.length) return false

    const client = await clientPromise
    const db = client.db(DB_NAME)
    const fileCount = await db.collection('projectFiles').countDocuments({
      projectId: new ObjectId(projectId),
    })

    const totalSteps = state.phases.reduce(
      (sum: number, p: { steps?: unknown[] }) => sum + (p.steps?.length ?? 0),
      0
    )
    const currentCompleted = state.phases.reduce(
      (sum: number, p: { steps?: { status: string }[] }) =>
        sum + (p.steps?.filter((s) => s.status === 'completed').length ?? 0),
      0
    )
    const inferredCompleted = Math.min(fileCount, totalSteps)
    const newCompleted = Math.max(currentCompleted, inferredCompleted)
    if (newCompleted <= currentCompleted && currentCompleted > 0) return false

    let stepIndex = 0
    const newPhases = state.phases.map((phase: { name: string; steps: Array<{ id: number; title: string; status: string; action?: string; dependencies?: string[]; progress?: string; result?: string }> }) => {
      const steps = (phase.steps || []).map((step) => {
        const isCompleted = stepIndex < newCompleted
        const isInProgress = stepIndex === newCompleted
        stepIndex++
        return {
          ...step,
          status: (isCompleted ? 'completed' : isInProgress ? 'in_progress' : 'pending') as 'pending' | 'in_progress' | 'completed',
          progress: isCompleted ? '100%' : step.progress ?? '0%',
        }
      })
      const allCompleted = steps.every((s) => s.status === 'completed')
      const hasInProgress = steps.some((s) => s.status === 'in_progress')
      const phaseStatus = (allCompleted ? 'completed' : hasInProgress ? 'in_progress' : 'pending') as 'pending' | 'in_progress' | 'completed'
      return {
        name: phase.name,
        status: phaseStatus,
        steps,
      }
    })

    let currentPhase = state.currentPhase
    const firstIncomplete = newPhases.find((p: { status: string }) => p.status !== 'completed')
    if (firstIncomplete) currentPhase = firstIncomplete.name
    else if (newPhases.length > 0) currentPhase = newPhases[newPhases.length - 1].name

    return updateProjectState(projectId, { phases: newPhases, currentPhase })
  } catch (e) {
    console.warn('reconcileProjectStateFromFiles:', e)
    return false
  }
}

export async function ensureProjectState(projectId: string, phases: IProjectStateData['phases']): Promise<boolean> {
  if (isClient) {
    console.warn('Cannot ensure project state from client-side')
    return false
  }

  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)

    let objectId: ObjectId
    try {
      objectId = new ObjectId(projectId)
    } catch (err) {
      console.error('Invalid project ID format:', err)
      return false
    }

    const existingState = await db.collection('projectStates').findOne({
      projectId: objectId
    })

    if (!existingState) {
      if (isDev) console.log('ensureProjectState: initializing new state for', projectId)
      
      // Initialize project state with phases
      const newState = {
        projectId: objectId,
        currentPhase: phases[0].name,
        phases: phases.map(phase => ({
          name: phase.name,
          status: phase.name === phases[0].name ? 'in_progress' : 'pending',
          steps: phase.steps.map(step => ({
            id: step.id,
            title: step.title,
            status: 'pending',
            action: step.action,
            dependencies: step.dependencies || [],
            progress: '0%'
          }))
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      try {
        // Create welcome message
        const welcomeMessage: AIMessage = {
          id: 'initial',
          role: 'assistant',
          content: 'Welcome! I am G.R.I.P., your GitHub Repo-Analysis Intellectual Partner. I have analyzed your requirements and I am ready to help you build your project. What would you like to work on first?',
          timestamp: new Date()
        }

        const stateResult = await db.collection('projectStates').insertOne(newState)
        const chatResult = await db.collection('chatHistory').insertOne({
          projectId: objectId,
          ...welcomeMessage
        })

        if (!stateResult.acknowledged || !chatResult.acknowledged) {
          throw new Error('Failed to initialize project state or chat history')
        }
        if (isDev) console.log('ensureProjectState: initialized project state for', projectId)
        return true
      } catch (error) {
        console.error('Error during state initialization:', error)
        // Clean up if the operation failed
        try {
          await db.collection('projectStates').deleteOne({ projectId: objectId })
          await db.collection('chatHistory').deleteOne({ projectId: objectId })
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError)
        }
        return false
      }
    }
    
    if (isDev) console.log('ensureProjectState: project state already exists')
    return true
  } catch (error) {
    console.error('Error ensuring project state:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    return false
  }
} 