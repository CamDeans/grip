import { connectToDatabase } from '@/lib/mongodb'
import { randomUUID } from 'crypto'
import { ObjectId } from 'mongodb'

import {
  DevelopmentProgress,
  PlanningResults,
  DevelopmentSession,
  TestingResults
} from '@/lib/models'

/**
 * InteractionTrackingService - Service for tracking user interactions with the G.R.I.P. console
 * This service provides methods to track progress through development phases, button selections,
 * planning results, and more.
 */
export const InteractionTrackingService = {
  /**
   * Tracks a user's progress through the development process
   */
  async trackDevelopmentProgress(
    projectId: string,
    userId: string,
    phase: string,
    step: number,
    action: string,
    status: 'started' | 'in_progress' | 'completed' | 'skipped' = 'started'
  ) {
    try {
      await connectToDatabase()
      
      // Find or create progress document
      let progress = await DevelopmentProgress.findOne({
        projectId: new ObjectId(projectId),
        userId
      })
      
      if (!progress) {
        progress = new DevelopmentProgress({
          projectId: new ObjectId(projectId),
          userId,
          currentPhase: phase,
          currentStep: step,
          phaseHistory: [],
          buttonSelections: [],
          userPrompts: [],
          metadata: {
            totalTimeSpent: 0,
            lastInteractionAt: new Date(),
            completionPercentage: 0
          }
        })
      }
      
      // Record the phase transition
      await progress.recordPhaseTransition(phase, step, action, status)
      
      return progress
    } catch (error) {
      console.error('Error tracking development progress:', error)
      throw error
    }
  },
  
  /**
   * Tracks a button selection in the UI
   */
  async trackButtonSelection(
    projectId: string,
    userId: string,
    phase: string,
    step: number,
    buttonText: string,
    context: string
  ) {
    try {
      await connectToDatabase()
      
      // Find or create progress document
      let progress = await DevelopmentProgress.findOne({
        projectId: new ObjectId(projectId),
        userId
      })
      
      if (!progress) {
        progress = new DevelopmentProgress({
          projectId: new ObjectId(projectId),
          userId,
          currentPhase: phase,
          currentStep: step,
          phaseHistory: [],
          buttonSelections: [],
          userPrompts: [],
          metadata: {
            totalTimeSpent: 0,
            lastInteractionAt: new Date(),
            completionPercentage: 0
          }
        })
      }
      
      // Record the button selection
      await progress.recordButtonSelection(phase, step, buttonText, context)
      
      return progress
    } catch (error) {
      console.error('Error tracking button selection:', error)
      throw error
    }
  },
  
  /**
   * Tracks a user prompt
   */
  async trackUserPrompt(
    projectId: string,
    userId: string,
    phase: string,
    step: number,
    prompt: string
  ) {
    try {
      await connectToDatabase()
      
      // Find or create progress document
      let progress = await DevelopmentProgress.findOne({
        projectId: new ObjectId(projectId),
        userId
      })
      
      if (!progress) {
        progress = new DevelopmentProgress({
          projectId: new ObjectId(projectId),
          userId,
          currentPhase: phase,
          currentStep: step,
          phaseHistory: [],
          buttonSelections: [],
          userPrompts: [],
          metadata: {
            totalTimeSpent: 0,
            lastInteractionAt: new Date(),
            completionPercentage: 0
          }
        })
      }
      
      // Add the user prompt
      progress.userPrompts.push({
        phase,
        step,
        prompt,
        timestamp: new Date()
      })
      
      await progress.save()
      
      return progress
    } catch (error) {
      console.error('Error tracking user prompt:', error)
      throw error
    }
  },
  
  /**
   * Records planning results from the Plan & Design phase
   */
  async recordPlanningResults(
    projectId: string,
    name: string,
    fileHierarchy: {
      rootDirectory: string;
      structure: Array<{
        path: string;
        type: 'file' | 'directory';
        description?: string;
        purpose?: string;
        dependsOn?: string[];
        technologies?: string[];
      }>;
    },
    technicalSpecifications: {
      frameworks: string[];
      libraries: string[];
      apis: string[];
      databases: string[];
      devOps: string[];
      patterns: string[];
    },
    planningNotes: string,
    repositoryId?: string,
    analysisId?: string,
    source: 'user_input' | 'ai_generated' | 'hybrid' = 'ai_generated'
  ) {
    try {
      await connectToDatabase()
      
      // Create planning results document
      const planningResults = new PlanningResults({
        projectId: new ObjectId(projectId),
        version: 1,
        name,
        status: 'draft',
        fileHierarchy,
        codeStructures: [],
        technicalSpecifications,
        planningNotes,
        metadata: {
          source,
          generatedAt: new Date()
        },
        relatedRepositoryId: repositoryId ? new ObjectId(repositoryId) : undefined,
        relatedAnalysisId: analysisId ? new ObjectId(analysisId) : undefined
      })
      
      await planningResults.save()
      
      return planningResults
    } catch (error) {
      console.error('Error recording planning results:', error)
      throw error
    }
  },
  
  /**
   * Creates a new development session
   */
  async createDevelopmentSession(
    projectId: string,
    name: string,
    sessionType: 'implementation' | 'refactoring' | 'feature' | 'bugfix' | 'testing',
    phase: string,
    step: number,
    planningId?: string,
    userInitiated: boolean = false
  ) {
    try {
      await connectToDatabase()
      
      // Create a new development session
      const session = new DevelopmentSession({
        projectId: new ObjectId(projectId),
        sessionId: randomUUID(),
        name,
        sessionType,
        status: 'active',
        phase,
        step,
        createdFiles: [],
        modifiedFiles: [],
        dependencies: [],
        consoleOutput: [],
        sessionNotes: '',
        metadata: {
          startedAt: new Date(),
          duration: 0,
          completionPercentage: 0,
          relatedPlanningId: planningId ? new ObjectId(planningId) : undefined,
          userInitiated,
          aiGenerated: !userInitiated
        }
      })
      
      await session.save()
      
      return session
    } catch (error) {
      console.error('Error creating development session:', error)
      throw error
    }
  },
  
  /**
   * Creates a new test run
   */
  async createTestRun(
    projectId: string,
    name: string,
    testType: 'unit' | 'integration' | 'e2e' | 'performance' | 'security' | 'accessibility',
    framework: string,
    testFiles: string[],
    testCommand: string,
    environment: string,
    coverage: boolean = false,
    developmentSessionId?: string,
    userInitiated: boolean = false
  ) {
    try {
      await connectToDatabase()
      
      // Create a new test run
      const testRun = new TestingResults({
        projectId: new ObjectId(projectId),
        testRunId: randomUUID(),
        name,
        testType,
        status: 'pending',
        framework,
        configuration: {
          testFiles,
          testCommand,
          environment,
          coverage,
          timeout: 5000,
          retries: 0
        },
        testSuites: [],
        consoleOutput: '',
        refinements: [],
        metadata: {
          startedAt: new Date(),
          duration: 0,
          relatedDevelopmentSessionId: developmentSessionId ? new ObjectId(developmentSessionId) : undefined,
          userInitiated,
          automatedRun: !userInitiated
        }
      })
      
      await testRun.save()
      
      return testRun
    } catch (error) {
      console.error('Error creating test run:', error)
      throw error
    }
  },
  
  /**
   * Gets the current development progress for a project/user
   */
  async getDevelopmentProgress(projectId: string, userId: string) {
    try {
      await connectToDatabase()
      
      const progress = await DevelopmentProgress.findOne({
        projectId: new ObjectId(projectId),
        userId
      })
      
      return progress
    } catch (error) {
      console.error('Error getting development progress:', error)
      throw error
    }
  },
  
  /**
   * Gets the latest planning results for a project
   */
  async getLatestPlanningResults(projectId: string) {
    try {
      await connectToDatabase()
      
      const planningResults = await PlanningResults.findOne({
        projectId: new ObjectId(projectId)
      }).sort({ version: -1 })
      
      return planningResults
    } catch (error) {
      console.error('Error getting latest planning results:', error)
      throw error
    }
  },
  
  /**
   * Gets active development sessions for a project
   */
  async getActiveDevelopmentSessions(projectId: string) {
    try {
      await connectToDatabase()
      
      const sessions = await DevelopmentSession.find({
        projectId: new ObjectId(projectId),
        status: 'active'
      }).sort({ 'metadata.startedAt': -1 })
      
      return sessions
    } catch (error) {
      console.error('Error getting active development sessions:', error)
      throw error
    }
  },
  
  /**
   * Gets test runs for a project
   */
  async getTestRuns(projectId: string, limit: number = 10) {
    try {
      await connectToDatabase()
      
      const testRuns = await TestingResults.find({
        projectId: new ObjectId(projectId)
      })
      .sort({ 'metadata.startedAt': -1 })
      .limit(limit)
      
      return testRuns
    } catch (error) {
      console.error('Error getting test runs:', error)
      throw error
    }
  }
} 