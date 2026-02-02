import { connectToDatabase, clientPromise, DB_NAME } from '../mongodb'
import { Project, IProject } from '../models/Project'
import { ObjectId } from 'mongodb'
import mongoose from 'mongoose'
import type { ProjectAnalysis, ProjectIdeation, AnalysisStage } from './analysisService'

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const projectCache = new Map<string, { data: IProject | null; timestamp: number }>()

/**
 * ProjectService provides specialized access to projects and analyses collections
 * This is part of Phase 1 of the GRIP AI Assistant Enhancement Plan
 */
export class ProjectService {
  /**
   * Get a project by its ID with caching
   * @param projectId - The project ID to find
   * @returns The project document or null if not found
   */
  static async getProjectById(projectId: string): Promise<IProject | null> {
    try {
      // Check cache first
      const cached = projectCache.get(projectId)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`Cache hit for project ${projectId}`)
        return cached.data
      }

      console.log(`Fetching project ${projectId} from database`)
      await connectToDatabase()
      const project = await Project.findById(projectId)

      // Update cache
      projectCache.set(projectId, {
        data: project,
        timestamp: Date.now()
      })

      return project
    } catch (error) {
      console.error('Error fetching project by ID:', error)
      // Attempt recovery
      try {
        // Clear potentially corrupted cache entry
        projectCache.delete(projectId)
        // Retry once
        await connectToDatabase()
        return await Project.findById(projectId)
      } catch (retryError) {
        console.error('Recovery attempt failed:', retryError)
        throw error
      }
    }
  }

  /**
   * Get a project by user ID with rate limiting
   * @param userId - The user ID to find projects for
   * @returns Array of project documents
   */
  static async getProjectsByUserId(userId: string): Promise<IProject[]> {
    try {
      console.log(`Fetching projects for user ${userId}`)
      await connectToDatabase()
      
      // Add rate limiting check
      const rateLimitKey = `user_projects_${userId}`
      const lastRequest = projectCache.get(rateLimitKey)
      if (lastRequest && Date.now() - lastRequest.timestamp < 1000) { // 1 second rate limit
        throw new Error('Rate limit exceeded. Please wait before making another request.')
      }

      const projects = await Project.find({ userId })
      
      // Update rate limit timestamp
      projectCache.set(rateLimitKey, {
        data: null,
        timestamp: Date.now()
      })

      return projects
    } catch (error) {
      console.error('Error fetching projects by user ID:', error)
      // Attempt recovery with exponential backoff
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
        await connectToDatabase()
        return await Project.find({ userId })
      } catch (retryError) {
        console.error('Recovery attempt failed:', retryError)
        throw error
      }
    }
  }

  /**
   * Create a new project
   * @param projectData - The project data to create
   * @returns The created project document
   */
  static async createProject(projectData: Partial<IProject>): Promise<IProject> {
    try {
      await connectToDatabase()
      const project = new Project(projectData)
      await project.save()
      return project
    } catch (error) {
      console.error('Error creating project:', error)
      throw error
    }
  }

  /**
   * Update a project by ID
   * @param projectId - The project ID to update
   * @param updateData - The data to update
   * @returns The updated project document
   */
  static async updateProject(projectId: string, updateData: Partial<IProject>): Promise<IProject | null> {
    try {
      await connectToDatabase()
      const project = await Project.findByIdAndUpdate(
        projectId,
        { $set: updateData },
        { new: true, runValidators: true }
      )
      return project
    } catch (error) {
      console.error('Error updating project:', error)
      throw error
    }
  }

  /**
   * Delete a project by ID
   * @param projectId - The project ID to delete
   * @returns True if deleted, false if not found
   */
  static async deleteProject(projectId: string): Promise<boolean> {
    try {
      await connectToDatabase()
      const result = await Project.findByIdAndDelete(projectId)
      return !!result
    } catch (error) {
      console.error('Error deleting project:', error)
      throw error
    }
  }

  /**
   * Get analysis data for a project
   * @param projectId - The project ID to get analysis for
   * @returns The analysis document or null if not found
   */
  static async getProjectAnalysis(projectId: string): Promise<any | null> {
    try {
      const client = await clientPromise
      const db = client.db(DB_NAME)
      const analysisCollection = db.collection('analyses')
      
      const analysis = await analysisCollection.findOne({ 
        projectId: new ObjectId(projectId) 
      })
      
      return analysis
    } catch (error) {
      console.error('Error fetching project analysis:', error)
      throw error
    }
  }

  /**
   * Get related resources for a project (analyses, states, etc.)
   * @param projectId - The project ID to get related resources for
   * @returns Object containing related project resources
   */
  static async getProjectResources(projectId: string): Promise<{
    project: IProject | null,
    analysis: any | null,
    state: any | null
  }> {
    try {
      console.log(`Fetching resources for project ${projectId}`)
      await connectToDatabase()
      const client = await clientPromise
      const db = client.db(DB_NAME)
      
      // Convert string ID to ObjectId
      const objectId = new ObjectId(projectId)
      
      // Fetch project with caching
      const project = await this.getProjectById(projectId)
      
      // Fetch analysis with error handling
      let analysis = null
      try {
        const analysisCollection = db.collection('analyses')
        analysis = await analysisCollection.findOne({ projectId: objectId })
      } catch (analysisError) {
        console.error('Error fetching analysis:', analysisError)
        // Continue without analysis
      }
      
      // Fetch project state with error handling
      let state = null
      try {
        const stateCollection = db.collection('projectStates')
        state = await stateCollection.findOne({ projectId: objectId })
      } catch (stateError) {
        console.error('Error fetching state:', stateError)
        // Continue without state
      }
      
      return { project, analysis, state }
    } catch (error) {
      console.error('Error fetching project resources:', error)
      // Attempt partial recovery
      try {
        const project = await this.getProjectById(projectId)
        return { project, analysis: null, state: null }
      } catch (retryError) {
        console.error('Recovery attempt failed:', retryError)
        throw error
      }
    }
  }
}

export function generateInitialAnalysis(ideation: ProjectIdeation, projectIdString: string): ProjectAnalysis {
  const projectId = new ObjectId(projectIdString)
  
  const stages: AnalysisStage[] = [
    { name: 'Repository Cloning', status: 'pending', progress: 0 },
    { name: 'Code Structure Analysis', status: 'pending', progress: 0 },
    { name: 'Feature Mapping', status: 'pending', progress: 0 },
    { name: 'Integration Planning', status: 'pending', progress: 0 }
  ]
  
  return {
    projectId,
    stages,
    codeStructure: {
      fileCount: 0,
      directoryStructure: [] as string[],
      mainLanguages: {} as { [key: string]: number },
      components: [],
      features: []
    },
    dependencies: {},
    complexity: {
      linesOfCode: 0,
      averageFileSize: 0,
      cyclomaticComplexity: 0
    },
    featureMapping: {
      matchedFeatures: [],
      potentialIntegrations: [],
      technicalRequirements: []
    },
    securityIssues: [],
    recommendations: [
      `Based on the technical requirements (${ideation.technicalRequirements}), consider setting up:`,
      '- Development environment configuration',
      '- CI/CD pipeline',
      '- Testing framework',
      '- Documentation structure'
    ],
    chatContext: '',
    createdAt: new Date(),
    updatedAt: new Date()
  }
} 