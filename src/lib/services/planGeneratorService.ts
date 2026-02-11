import { ObjectId } from 'mongodb'
import { clientPromise } from '@/lib/mongodb'
import { Anthropic } from '@anthropic-ai/sdk'
import { getOrCreateProjectStructure } from './structureGeneratorService'
import { IProjectStructureData } from '@/lib/models/ProjectStructure'
import { getAnthropicApiKey, ANTHROPIC_MODEL_CHAT } from '@/lib/anthropicConfig'

/**
 * Plan Generator Service - Creates development plan with tasks
 * Part of Phase 3, Step 3 of the G.R.I.P. AI Assistant Enhancement Plan
 */

function getAnthropicClient() {
  const apiKey = getAnthropicApiKey()
  if (!apiKey) return null
  return new Anthropic({ apiKey })
}

interface TaskDependency {
  taskId: string
  type: 'blocking' | 'related'
}

interface ResourceRequirement {
  type: 'developer' | 'designer' | 'qa' | 'devops' | 'other'
  level: 'junior' | 'mid' | 'senior' | 'lead'
  hours: number
  skills: string[]
}

interface RiskAssessment {
  level: 'low' | 'medium' | 'high'
  description: string
  mitigation: string
  impact: string
}

interface TimelineEstimate {
  startDate: Date
  endDate: Date
  milestones: Array<{
    date: Date
    description: string
    tasks: string[]
  }>
}

interface TaskMetrics {
  estimatedHours: number
  actualHours?: number
  complexity: number
  dependencies: string[]
  blockers: string[]
  progress: number
  statusHistory: Array<{
    status: Task['status']
    date: Date
    notes?: string
  }>
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'critical'
  estimatedEffort: 'small' | 'medium' | 'large'
  dependencies: TaskDependency[]
  tags: string[]
  assignedTo?: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  resources: ResourceRequirement[]
  risks: RiskAssessment[]
  timeline: TimelineEstimate
  metrics: TaskMetrics
  validation: {
    requirements: string[]
    acceptanceCriteria: string[]
    testCases: string[]
  }
}

export interface Phase {
  id: string
  name: string
  description: string
  tasks: Task[]
  status: 'pending' | 'in_progress' | 'completed'
  order: number
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export interface DevelopmentPlan {
  _id?: ObjectId
  projectId: ObjectId
  name: string
  description: string
  phases: Phase[]
  status: 'draft' | 'active' | 'completed' | 'archived'
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export type GenerateDevelopmentPlanResult = { plan: DevelopmentPlan; totalTokens: number }

/**
 * Generate a development plan for a project
 */
export async function generateDevelopmentPlan(projectId: string): Promise<GenerateDevelopmentPlanResult> {
  try {
    console.log(`Generating development plan for project: ${projectId}`)
    const db = (await clientPromise).db()
    
    // Fetch project details
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId)
    })
    
    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }
    
    // Get project structure
    const structure = await getOrCreateProjectStructure(projectId)
    
    // Generate initial plan
    const { plan, totalTokens } = await createInitialPlan(projectId, project, structure)

    // Add resource requirements
    await addResourceRequirements(plan)
    
    // Add risk assessments
    await addRiskAssessments(plan)
    
    // Generate timeline estimates
    await generateTimelineEstimates(plan)
    
    // Add task metrics
    await addTaskMetrics(plan)
    
    // Add validation criteria
    await addValidationCriteria(plan)
    
    // Save plan to database
    const result = await db.collection('developmentPlans').insertOne(plan)

    if (!result.insertedId) {
      throw new Error('Failed to save development plan')
    }

    return { plan: { ...plan, _id: result.insertedId }, totalTokens }
  } catch (error) {
    console.error('Error generating development plan:', error)
    throw error
  }
}

/**
 * Create an initial development plan
 */
async function createInitialPlan(
  projectId: string,
  project: any,
  structure: IProjectStructureData
): Promise<{ plan: DevelopmentPlan; totalTokens: number }> {
  const phases: Phase[] = [
    createPhase('1', 'Setup', 'Project setup and configuration', 0),
    createPhase('2', 'Base Infrastructure', 'Core infrastructure and architecture', 1),
    createPhase('3', 'Feature Implementation', 'Implementation of key features', 2),
    createPhase('4', 'Testing & Refinement', 'Testing, bug fixing, and refinement', 3),
    createPhase('5', 'Deployment', 'Deployment preparation and launch', 4)
  ]

  const totalTokens = await addTasksToPhases(phases, project, structure)

  const plan: DevelopmentPlan = {
    projectId: new ObjectId(projectId),
    name: `${project.title} Development Plan`,
    description: `Development plan for ${project.title}`,
    phases,
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date()
  }
  return { plan, totalTokens }
}

/**
 * Create a new phase
 */
function createPhase(id: string, name: string, description: string, order: number): Phase {
  return {
    id,
    name,
    description,
    tasks: [],
    status: 'pending',
    order,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

/**
 * Add tasks to phases using AI
 */
async function addTasksToPhases(
  phases: Phase[],
  project: any,
  structure: IProjectStructureData
): Promise<number> {
  try {
    // Build prompt for AI
    const prompt = `
I'm creating a development plan for a software project. Please help me generate tasks for each phase.
Here's the project information:

Project Title: ${project.title}
Project Description: ${project.description}
${project.ideation ? `
Project Goals: ${project.ideation.goals}
Key Features: ${project.ideation.keyFeatures}
Technical Requirements: ${project.ideation.technicalRequirements}
` : ''}

Here are the phases I've defined:
${phases.map(phase => `- Phase ${phase.id}: ${phase.name} - ${phase.description}`).join('\n')}

For each phase, I need a list of specific tasks. Each task should include:
- A descriptive title
- A detailed description
- Priority (low, medium, high, critical)
- Estimated effort (small, medium, large)
- Dependencies (IDs of tasks that must be completed before this one)
- Tags (relevant categories or technologies)

Please output your response as a JSON object with this structure:
{
  "phases": [
    {
      "id": "1",
      "tasks": [
        {
          "id": "1.1",
          "title": "Task title",
          "description": "Detailed description",
          "priority": "medium",
          "estimatedEffort": "small",
          "dependencies": [],
          "tags": ["tag1", "tag2"]
        },
        ...more tasks
      ]
    },
    ...more phases
  ]
}

Base your recommendations on best practices for ${structure.fileHierarchy.name} development. The file structure for the project will be:
${JSON.stringify(structure.fileHierarchy, null, 2).substring(0, 1000)}...

For dependencies, use task IDs (e.g., "1.1", "2.3") to reference tasks that must be completed first.
`
    
    // Call Anthropic API
    const anthropic = getAnthropicClient()
    if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not set')
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_CHAT,
      max_tokens: 4000,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    })

    const totalTokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)
    
    const content = response?.content?.[0]?.text || '{}'
    
    // Extract JSON from content
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const jsonString = jsonMatch ? jsonMatch[0] : '{}'
    
    try {
      const planData = JSON.parse(jsonString)
      
      if (!planData.phases) {
        throw new Error('Invalid plan data: missing phases')
      }
      
      // Update phases with tasks
      for (const phaseData of planData.phases) {
        const phase = phases.find(p => p.id === phaseData.id)
        if (phase && phaseData.tasks) {
          phase.tasks = phaseData.tasks.map((task: any) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: 'pending',
            priority: task.priority || 'medium',
            estimatedEffort: task.estimatedEffort || 'medium',
            dependencies: Array.isArray(task.dependencies) 
              ? task.dependencies.map((depId: string) => ({ 
                  taskId: depId, 
                  type: 'blocking' 
                }))
              : [],
            tags: Array.isArray(task.tags) ? task.tags : [],
            createdAt: new Date(),
            updatedAt: new Date()
          }))
        }
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      
      // Fallback: create default tasks for each phase
      addDefaultTasks(phases)
    }
    return totalTokens
  } catch (error) {
    console.error('Error adding tasks to phases:', error)
    addDefaultTasks(phases)
    return 0
  }
}

/**
 * Add default tasks to phases (fallback)
 */
function addDefaultTasks(phases: Phase[]): void {
  const defaultTasks: Record<string, Array<Partial<Task>>> = {
    '1': [ // Setup
      {
        id: '1.1',
        title: 'Project Repository Setup',
        description: 'Initialize the project repository and set up version control',
        priority: 'high',
        estimatedEffort: 'small',
        tags: ['setup', 'git']
      },
      {
        id: '1.2',
        title: 'Development Environment Setup',
        description: 'Set up local development environment and install dependencies',
        priority: 'high',
        estimatedEffort: 'small',
        tags: ['setup', 'environment']
      },
      {
        id: '1.3',
        title: 'Project Configuration',
        description: 'Configure build tools, linters, and other project settings',
        priority: 'medium',
        estimatedEffort: 'medium',
        dependencies: [{ taskId: '1.2', type: 'blocking' }],
        tags: ['setup', 'configuration']
      }
    ],
    '2': [ // Base Infrastructure
      {
        id: '2.1',
        title: 'Core Architecture Setup',
        description: 'Set up the core application architecture and structure',
        priority: 'high',
        estimatedEffort: 'medium',
        dependencies: [{ taskId: '1.3', type: 'blocking' }],
        tags: ['architecture', 'structure']
      },
      {
        id: '2.2',
        title: 'Database Schema Design',
        description: 'Design and implement the database schema',
        priority: 'high',
        estimatedEffort: 'medium',
        dependencies: [{ taskId: '2.1', type: 'blocking' }],
        tags: ['database', 'schema']
      },
      {
        id: '2.3',
        title: 'Authentication System',
        description: 'Implement user authentication and authorization',
        priority: 'high',
        estimatedEffort: 'large',
        dependencies: [{ taskId: '2.1', type: 'blocking' }],
        tags: ['auth', 'security']
      }
    ],
    '3': [ // Feature Implementation
      {
        id: '3.1',
        title: 'Core Features Implementation',
        description: 'Implement the core features of the application',
        priority: 'high',
        estimatedEffort: 'large',
        dependencies: [{ taskId: '2.1', type: 'blocking' }],
        tags: ['features', 'core']
      },
      {
        id: '3.2',
        title: 'UI Components Development',
        description: 'Develop reusable UI components',
        priority: 'medium',
        estimatedEffort: 'medium',
        dependencies: [{ taskId: '2.1', type: 'blocking' }],
        tags: ['ui', 'components']
      },
      {
        id: '3.3',
        title: 'API Integration',
        description: 'Integrate with necessary APIs and services',
        priority: 'medium',
        estimatedEffort: 'medium',
        dependencies: [{ taskId: '2.1', type: 'blocking' }],
        tags: ['api', 'integration']
      }
    ],
    '4': [ // Testing & Refinement
      {
        id: '4.1',
        title: 'Unit Testing',
        description: 'Write and run unit tests for components and functions',
        priority: 'high',
        estimatedEffort: 'medium',
        dependencies: [{ taskId: '3.1', type: 'blocking' }],
        tags: ['testing', 'unit-tests']
      },
      {
        id: '4.2',
        title: 'Integration Testing',
        description: 'Perform integration testing across the application',
        priority: 'medium',
        estimatedEffort: 'medium',
        dependencies: [{ taskId: '4.1', type: 'blocking' }],
        tags: ['testing', 'integration-tests']
      },
      {
        id: '4.3',
        title: 'Performance Optimization',
        description: 'Identify and fix performance bottlenecks',
        priority: 'medium',
        estimatedEffort: 'medium',
        dependencies: [{ taskId: '3.1', type: 'blocking' }],
        tags: ['optimization', 'performance']
      }
    ],
    '5': [ // Deployment
      {
        id: '5.1',
        title: 'Deployment Configuration',
        description: 'Set up deployment configuration and environments',
        priority: 'high',
        estimatedEffort: 'medium',
        dependencies: [{ taskId: '4.2', type: 'blocking' }],
        tags: ['deployment', 'configuration']
      },
      {
        id: '5.2',
        title: 'CI/CD Pipeline Setup',
        description: 'Configure continuous integration and deployment pipeline',
        priority: 'medium',
        estimatedEffort: 'medium',
        dependencies: [{ taskId: '5.1', type: 'blocking' }],
        tags: ['ci-cd', 'automation']
      },
      {
        id: '5.3',
        title: 'Production Deployment',
        description: 'Deploy the application to production',
        priority: 'high',
        estimatedEffort: 'medium',
        dependencies: [
          { taskId: '5.1', type: 'blocking' },
          { taskId: '5.2', type: 'blocking' }
        ],
        tags: ['deployment', 'production']
      }
    ]
  }
  
  // Apply default tasks to each phase
  phases.forEach(phase => {
    const defaultPhaseTasks = defaultTasks[phase.id]
    if (defaultPhaseTasks) {
      phase.tasks = defaultPhaseTasks.map(task => ({
        ...task,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      } as Task))
    }
  })
}

/**
 * Get development plan for a project
 */
export async function getDevelopmentPlan(projectId: string): Promise<DevelopmentPlan | null> {
  try {
    const db = (await clientPromise).db()
    
    // Find existing plan
    const plan = await db.collection('developmentPlans').findOne<DevelopmentPlan>({
      projectId: new ObjectId(projectId)
    })
    
    return plan
  } catch (error) {
    console.error('Error getting development plan:', error)
    throw error
  }
}

/**
 * Get or create development plan for a project
 */
export async function getOrCreateDevelopmentPlan(projectId: string): Promise<DevelopmentPlan> {
  try {
    const existingPlan = await getDevelopmentPlan(projectId)
    if (existingPlan) return existingPlan
    const { plan } = await generateDevelopmentPlan(projectId)
    return plan
  } catch (error) {
    console.error('Error getting or creating development plan:', error)
    throw error
  }
}

/**
 * Update task status in development plan
 */
export async function updateTaskStatus(
  projectId: string,
  phaseId: string,
  taskId: string,
  status: Task['status']
): Promise<boolean> {
  try {
    const db = (await clientPromise).db()
    
    // Find plan
    const plan = await getDevelopmentPlan(projectId)
    
    if (!plan) {
      throw new Error(`Development plan not found for project: ${projectId}`)
    }
    
    // Find phase and task
    const phase = plan.phases.find(p => p.id === phaseId)
    if (!phase) {
      throw new Error(`Phase not found: ${phaseId}`)
    }
    
    const taskIndex = phase.tasks.findIndex(t => t.id === taskId)
    if (taskIndex === -1) {
      throw new Error(`Task not found: ${taskId}`)
    }
    
    // Update task status
    await db.collection('developmentPlans').updateOne(
      { 
        projectId: new ObjectId(projectId),
        'phases.id': phaseId,
        'phases.tasks.id': taskId
      },
      { 
        $set: {
          'phases.$[phase].tasks.$[task].status': status,
          'phases.$[phase].tasks.$[task].updatedAt': new Date(),
          updatedAt: new Date()
        }
      },
      {
        arrayFilters: [
          { 'phase.id': phaseId },
          { 'task.id': taskId }
        ]
      }
    )
    
    // If task is completed, set completedAt
    if (status === 'completed') {
      await db.collection('developmentPlans').updateOne(
        { 
          projectId: new ObjectId(projectId),
          'phases.id': phaseId,
          'phases.tasks.id': taskId
        },
        { 
          $set: {
            'phases.$[phase].tasks.$[task].completedAt': new Date()
          }
        },
        {
          arrayFilters: [
            { 'phase.id': phaseId },
            { 'task.id': taskId }
          ]
        }
      )
    }
    
    // Update phase status
    await updatePhaseStatus(projectId, phaseId)
    
    return true
  } catch (error) {
    console.error('Error updating task status:', error)
    throw error
  }
}

/**
 * Update phase status based on task statuses
 */
async function updatePhaseStatus(projectId: string, phaseId: string): Promise<void> {
  try {
    const db = (await clientPromise).db()
    
    // Get current plan
    const plan = await getDevelopmentPlan(projectId)
    
    if (!plan) {
      throw new Error(`Development plan not found for project: ${projectId}`)
    }
    
    // Find phase
    const phase = plan.phases.find(p => p.id === phaseId)
    if (!phase) {
      throw new Error(`Phase not found: ${phaseId}`)
    }
    
    // Determine phase status based on tasks
    let newStatus: Phase['status'] = 'pending'
    const completedTasks = phase.tasks.filter(t => t.status === 'completed').length
    const totalTasks = phase.tasks.length
    
    if (completedTasks === totalTasks && totalTasks > 0) {
      newStatus = 'completed'
    } else if (completedTasks > 0) {
      newStatus = 'in_progress'
    }
    
    // Update phase status
    await db.collection('developmentPlans').updateOne(
      { 
        projectId: new ObjectId(projectId),
        'phases.id': phaseId
      },
      { 
        $set: {
          'phases.$[phase].status': newStatus,
          'phases.$[phase].updatedAt': new Date(),
          updatedAt: new Date()
        }
      },
      {
        arrayFilters: [
          { 'phase.id': phaseId }
        ]
      }
    )
    
    // If phase is completed, set completedAt
    if (newStatus === 'completed') {
      await db.collection('developmentPlans').updateOne(
        { 
          projectId: new ObjectId(projectId),
          'phases.id': phaseId
        },
        { 
          $set: {
            'phases.$[phase].completedAt': new Date()
          }
        },
        {
          arrayFilters: [
            { 'phase.id': phaseId }
          ]
        }
      )
    }
    
    // Update plan status
    await updatePlanStatus(projectId)
  } catch (error) {
    console.error('Error updating phase status:', error)
    throw error
  }
}

/**
 * Update plan status based on phase statuses
 */
async function updatePlanStatus(projectId: string): Promise<void> {
  try {
    const db = (await clientPromise).db()
    
    // Get current plan
    const plan = await getDevelopmentPlan(projectId)
    
    if (!plan) {
      throw new Error(`Development plan not found for project: ${projectId}`)
    }
    
    // Determine plan status based on phases
    let newStatus: DevelopmentPlan['status'] = 'draft'
    const completedPhases = plan.phases.filter(p => p.status === 'completed').length
    const totalPhases = plan.phases.length
    
    if (completedPhases === totalPhases && totalPhases > 0) {
      newStatus = 'completed'
    } else if (completedPhases > 0) {
      newStatus = 'active'
    }
    
    // Update plan status
    await db.collection('developmentPlans').updateOne(
      { projectId: new ObjectId(projectId) },
      { 
        $set: {
          status: newStatus,
          updatedAt: new Date()
        }
      }
    )
    
    // If plan is completed, set completedAt
    if (newStatus === 'completed') {
      await db.collection('developmentPlans').updateOne(
        { projectId: new ObjectId(projectId) },
        { 
          $set: {
            completedAt: new Date()
          }
        }
      )
    }
  } catch (error) {
    console.error('Error updating plan status:', error)
    throw error
  }
}

/**
 * Add resource requirements to tasks
 */
async function addResourceRequirements(plan: DevelopmentPlan): Promise<void> {
  for (const phase of plan.phases) {
    for (const task of phase.tasks) {
      // Determine resource requirements based on task type and complexity
      const resources: ResourceRequirement[] = []
      
      // Add developer resource
      resources.push({
        type: 'developer',
        level: task.estimatedEffort === 'large' ? 'senior' : 'mid',
        hours: task.estimatedEffort === 'large' ? 40 : task.estimatedEffort === 'medium' ? 20 : 8,
        skills: getRequiredSkills(task)
      })
      
      // Add QA resource for testing tasks
      if ((task.tags || []).includes('testing')) {
        resources.push({
          type: 'qa',
          level: 'mid',
          hours: task.estimatedEffort === 'large' ? 20 : task.estimatedEffort === 'medium' ? 10 : 4,
          skills: ['testing', 'automation']
        })
      }
      
      task.resources = resources
    }
  }
}

/**
 * Add risk assessments to tasks
 */
async function addRiskAssessments(plan: DevelopmentPlan): Promise<void> {
  for (const phase of plan.phases) {
    for (const task of phase.tasks) {
      const risks: RiskAssessment[] = []
      
      // Add technical risks
      const tags = task.tags || []
      if (tags.includes('architecture') || tags.includes('integration')) {
        risks.push({
          level: 'high',
          description: 'Technical complexity may impact timeline',
          mitigation: 'Early prototyping and technical review',
          impact: 'Schedule delay'
        })
      }

      // Add dependency risks
      const deps = task.dependencies || []
      if (deps.length > 0) {
        risks.push({
          level: 'medium',
          description: 'Dependent tasks may delay progress',
          mitigation: 'Regular dependency status updates',
          impact: 'Task blocking'
        })
      }
      
      task.risks = risks
    }
  }
}

/**
 * Generate timeline estimates for tasks
 */
async function generateTimelineEstimates(plan: DevelopmentPlan): Promise<void> {
  let currentDate = new Date()
  
  for (const phase of plan.phases) {
    for (const task of phase.tasks) {
      const startDate = new Date(currentDate)
      const endDate = new Date(startDate)
      
      // Calculate duration based on effort
      const days = task.estimatedEffort === 'large' ? 5 : task.estimatedEffort === 'medium' ? 3 : 1
      endDate.setDate(endDate.getDate() + days)
      
      // Add milestones
      const milestones = []
      const midPoint = new Date(startDate)
      midPoint.setDate(midPoint.getDate() + Math.floor(days / 2))
      
      milestones.push({
        date: midPoint,
        description: 'Mid-point review',
        tasks: [task.id]
      })
      
      task.timeline = {
        startDate,
        endDate,
        milestones
      }
      
      // Update current date for next task
      currentDate = new Date(endDate)
      currentDate.setDate(currentDate.getDate() + 1)
    }
  }
}

/**
 * Add task metrics
 */
async function addTaskMetrics(plan: DevelopmentPlan): Promise<void> {
  for (const phase of plan.phases) {
    for (const task of phase.tasks) {
      const deps = task.dependencies || []
      const metrics: TaskMetrics = {
        estimatedHours: calculateEstimatedHours(task),
        complexity: calculateTaskComplexity(task),
        dependencies: deps.map((d: { taskId?: string } | string) => typeof d === 'object' && d && 'taskId' in d ? (d as { taskId: string }).taskId : String(d)),
        blockers: [],
        progress: 0,
        statusHistory: [{
          status: task.status,
          date: task.createdAt
        }]
      }
      
      task.metrics = metrics
    }
  }
}

/**
 * Add validation criteria to tasks
 */
async function addValidationCriteria(plan: DevelopmentPlan): Promise<void> {
  for (const phase of plan.phases) {
    for (const task of phase.tasks) {
      const validation = {
        requirements: generateRequirements(task),
        acceptanceCriteria: generateAcceptanceCriteria(task),
        testCases: generateTestCases(task)
      }
      
      task.validation = validation
    }
  }
}

// Helper functions
function getRequiredSkills(task: Task): string[] {
  const skills = new Set<string>()
  const tags = task.tags || []

  if (tags.includes('frontend')) {
    skills.add('react')
    skills.add('typescript')
  }

  if (tags.includes('backend')) {
    skills.add('nodejs')
    skills.add('mongodb')
  }

  if (tags.includes('testing')) {
    skills.add('jest')
    skills.add('cypress')
  }
  
  return Array.from(skills)
}

function calculateEstimatedHours(task: Task): number {
  const baseHours = task.estimatedEffort === 'large' ? 40 : task.estimatedEffort === 'medium' ? 20 : 8
  return baseHours * (task.priority === 'high' ? 1.2 : task.priority === 'critical' ? 1.5 : 1)
}

function calculateTaskComplexity(task: Task): number {
  let complexity = 1
  
  if (task.estimatedEffort === 'large') complexity += 2
  if (task.estimatedEffort === 'medium') complexity += 1
  
  if (task.priority === 'critical') complexity += 2
  if (task.priority === 'high') complexity += 1

  complexity += (task.dependencies || []).length

  return complexity
}

function generateRequirements(task: Task): string[] {
  const requirements = []
  
  // Add basic requirements
  requirements.push(`Implement ${task.title}`)
  requirements.push('Follow project coding standards')
  requirements.push('Include proper documentation')
  
  // Add specific requirements based on task type
  if ((task.tags || []).includes('testing')) {
    requirements.push('Include unit tests')
    requirements.push('Include integration tests')
  }
  
  return requirements
}

function generateAcceptanceCriteria(task: Task): string[] {
  const criteria = []
  
  // Add basic criteria
  criteria.push('Code is functional and meets requirements')
  criteria.push('All tests pass')
  criteria.push('Code is reviewed and approved')
  
  // Add specific criteria based on task type
  if ((task.tags || []).includes('performance')) {
    criteria.push('Performance metrics meet targets')
  }
  
  return criteria
}

function generateTestCases(task: Task): string[] {
  const testCases = []
  
  // Add basic test cases
  testCases.push('Verify basic functionality')
  testCases.push('Verify error handling')
  testCases.push('Verify edge cases')
  
  // Add specific test cases based on task type
  if ((task.tags || []).includes('api')) {
    testCases.push('Verify API endpoints')
    testCases.push('Verify request/response formats')
  }
  
  return testCases
} 