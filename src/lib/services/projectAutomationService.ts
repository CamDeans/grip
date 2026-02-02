import { connectToDatabase, clientPromise, DB_NAME } from '../mongodb'
import { ObjectId } from 'mongodb'
import { ProjectStructure, IProjectStructure } from '../models/ProjectStructure'
import { ProjectFile, IProjectFile } from '../models/ProjectFile'
import { BuildLog, IBuildLog } from '../models/BuildLog'
import { TerminalSession, ITerminalSession } from '../models/TerminalSession'
import { v4 as uuidv4 } from 'uuid'

/**
 * ProjectAutomationService - Provides methods for working with the project automation features
 * This service combines functionality for all the models created in Phase 1 of the GRIP AI Enhancement Plan
 */
export class ProjectAutomationService {
  
  /**
   * STRUCTURE METHODS
   * Methods for working with project structures
   */
  
  /**
   * Create a new project structure
   * @param projectId - The ID of the project to create structure for
   * @param name - Name of the structure
   * @param description - Description of the structure
   * @param rootDirectory - Root directory details
   * @returns The created project structure
   */
  static async createProjectStructure(
    projectId: string,
    name: string,
    description: string,
    rootDirectory: {
      name: string;
      path: string;
    }
  ): Promise<IProjectStructure> {
    try {
      await connectToDatabase()
      
      // Create root directory node
      const fileHierarchy = {
        type: 'directory',
        name: rootDirectory.name,
        path: rootDirectory.path,
        children: []
      }
      
      const projectStructure = new ProjectStructure({
        projectId: new ObjectId(projectId),
        name,
        description,
        fileHierarchy,
        dependencies: {},
        buildConfig: {
          commands: {},
          environment: {}
        }
      })
      
      await projectStructure.save()
      return projectStructure
    } catch (error) {
      console.error('Error creating project structure:', error)
      throw error
    }
  }
  
  /**
   * Get a project structure by project ID
   * @param projectId - The project ID to find structure for
   * @returns The project structure or null if not found
   */
  static async getProjectStructure(projectId: string): Promise<IProjectStructure | null> {
    try {
      await connectToDatabase()
      const structure = await ProjectStructure.findOne({ projectId: new ObjectId(projectId) })
      return structure
    } catch (error) {
      console.error('Error fetching project structure:', error)
      throw error
    }
  }
  
  /**
   * Update a project structure
   * @param projectId - The project ID to update structure for
   * @param updateData - The data to update
   * @returns The updated project structure
   */
  static async updateProjectStructure(
    projectId: string,
    updateData: Partial<IProjectStructure>
  ): Promise<IProjectStructure | null> {
    try {
      await connectToDatabase()
      const structure = await ProjectStructure.findOneAndUpdate(
        { projectId: new ObjectId(projectId) },
        { $set: updateData },
        { new: true, runValidators: true }
      )
      return structure
    } catch (error) {
      console.error('Error updating project structure:', error)
      throw error
    }
  }
  
  /**
   * FILE METHODS
   * Methods for working with project files
   */
  
  /**
   * Create a new project file
   * @param projectId - The ID of the project to create file for
   * @param fileData - The file data
   * @returns The created project file
   */
  static async createProjectFile(
    projectId: string,
    fileData: {
      path: string;
      filename: string;
      content: string;
      language: string;
      metadata: {
        generatedBy: string;
        purpose: string;
        dependencies?: string[];
        imports?: string[];
        exports?: string[];
      };
    }
  ): Promise<IProjectFile> {
    try {
      await connectToDatabase()
      
      // Calculate size
      const size = Buffer.byteLength(fileData.content, 'utf8')
      
      // Generate hash
      const hash = Buffer.from(fileData.content).toString('base64').substring(0, 16)
      
      const projectFile = new ProjectFile({
        projectId: new ObjectId(projectId),
        path: fileData.path,
        filename: fileData.filename,
        content: fileData.content,
        language: fileData.language,
        size,
        version: 1,
        hash,
        metadata: fileData.metadata,
        history: []
      })
      
      await projectFile.save()
      return projectFile
    } catch (error) {
      console.error('Error creating project file:', error)
      throw error
    }
  }
  
  /**
   * Get project files by project ID
   * @param projectId - The project ID to find files for
   * @returns Array of project files
   */
  static async getProjectFiles(projectId: string): Promise<IProjectFile[]> {
    try {
      await connectToDatabase()
      const files = await ProjectFile.find({ projectId: new ObjectId(projectId) })
      return files
    } catch (error) {
      console.error('Error fetching project files:', error)
      throw error
    }
  }
  
  /**
   * Get a specific project file
   * @param projectId - The project ID the file belongs to
   * @param path - The path of the file
   * @param filename - The filename
   * @returns The project file or null if not found
   */
  static async getProjectFile(
    projectId: string,
    path: string,
    filename: string
  ): Promise<IProjectFile | null> {
    try {
      await connectToDatabase()
      const file = await ProjectFile.findOne({
        projectId: new ObjectId(projectId),
        path,
        filename
      })
      return file
    } catch (error) {
      console.error('Error fetching project file:', error)
      throw error
    }
  }
  
  /**
   * Update a project file
   * @param projectId - The project ID the file belongs to
   * @param path - The path of the file
   * @param filename - The filename
   * @param content - The new content
   * @param changes - Description of changes
   * @returns The updated project file
   */
  static async updateProjectFile(
    projectId: string,
    path: string,
    filename: string,
    content: string,
    changes: string
  ): Promise<IProjectFile | null> {
    try {
      await connectToDatabase()
      
      // Find the file
      const file = await ProjectFile.findOne({
        projectId: new ObjectId(projectId),
        path,
        filename
      })
      
      if (!file) {
        throw new Error(`File ${path}/${filename} not found`)
      }
      
      // Add current content to history
      file.history.push({
        version: file.version,
        content: file.content,
        timestamp: new Date(),
        changes
      })
      
      // Update content and version
      file.content = content
      file.version += 1
      file.size = Buffer.byteLength(content, 'utf8')
      file.hash = Buffer.from(content).toString('base64').substring(0, 16)
      
      await file.save()
      return file
    } catch (error) {
      console.error('Error updating project file:', error)
      throw error
    }
  }
  
  /**
   * Delete a project file
   * @param projectId - The project ID the file belongs to
   * @param path - The path of the file
   * @param filename - The filename
   * @returns True if deleted, false if not found
   */
  static async deleteProjectFile(
    projectId: string,
    path: string,
    filename: string
  ): Promise<boolean> {
    try {
      await connectToDatabase()
      const result = await ProjectFile.findOneAndDelete({
        projectId: new ObjectId(projectId),
        path,
        filename
      })
      return !!result
    } catch (error) {
      console.error('Error deleting project file:', error)
      throw error
    }
  }
  
  /**
   * BUILD LOG METHODS
   * Methods for working with build logs
   */
  
  /**
   * Create a new build log
   * @param projectId - The ID of the project
   * @param taskData - The task data
   * @returns The created build log
   */
  static async createBuildLog(
    projectId: string,
    taskData: {
      taskType: 'build' | 'test' | 'deploy' | 'generate' | 'analyze' | 'other';
      command: string;
      triggeredBy: string;
      phase?: string;
      step?: string;
      files?: string[];
      dependencies?: string[];
      environment?: Record<string, string>;
    }
  ): Promise<IBuildLog> {
    try {
      await connectToDatabase()
      
      // Generate task ID
      const taskId = `task_${uuidv4()}`
      
      const buildLog = new BuildLog({
        projectId: new ObjectId(projectId),
        taskId,
        taskType: taskData.taskType,
        status: 'pending',
        command: taskData.command,
        startTime: new Date(),
        output: '',
        environment: taskData.environment || {},
        metadata: {
          triggeredBy: taskData.triggeredBy,
          phase: taskData.phase,
          step: taskData.step,
          files: taskData.files,
          dependencies: taskData.dependencies
        }
      })
      
      await buildLog.save()
      return buildLog
    } catch (error) {
      console.error('Error creating build log:', error)
      throw error
    }
  }
  
  /**
   * Get build logs by project ID
   * @param projectId - The project ID to find logs for
   * @param limit - Maximum number of logs to return
   * @returns Array of build logs
   */
  static async getBuildLogs(projectId: string, limit: number = 100): Promise<IBuildLog[]> {
    try {
      await connectToDatabase()
      const logs = await BuildLog.find({ projectId: new ObjectId(projectId) })
        .sort({ startTime: -1 })
        .limit(limit)
      return logs
    } catch (error) {
      console.error('Error fetching build logs:', error)
      throw error
    }
  }
  
  /**
   * Get a build log by task ID
   * @param taskId - The task ID to find
   * @returns The build log or null if not found
   */
  static async getBuildLog(taskId: string): Promise<IBuildLog | null> {
    try {
      await connectToDatabase()
      const log = await BuildLog.findOne({ taskId })
      return log
    } catch (error) {
      console.error('Error fetching build log:', error)
      throw error
    }
  }
  
  /**
   * Update a build log
   * @param taskId - The task ID to update
   * @param updateData - The data to update
   * @returns The updated build log
   */
  static async updateBuildLog(
    taskId: string,
    updateData: Partial<IBuildLog>
  ): Promise<IBuildLog | null> {
    try {
      await connectToDatabase()
      const log = await BuildLog.findOneAndUpdate(
        { taskId },
        { $set: updateData },
        { new: true, runValidators: true }
      )
      return log
    } catch (error) {
      console.error('Error updating build log:', error)
      throw error
    }
  }
  
  /**
   * Append output to a build log
   * @param taskId - The task ID to append output to
   * @param output - The output to append
   * @returns The updated build log
   */
  static async appendBuildLogOutput(
    taskId: string,
    output: string
  ): Promise<IBuildLog | null> {
    try {
      await connectToDatabase()
      const log = await BuildLog.findOneAndUpdate(
        { taskId },
        { $set: { output: { $concat: ['$output', output] } } },
        { new: true }
      )
      return log
    } catch (error) {
      console.error('Error appending build log output:', error)
      throw error
    }
  }
  
  /**
   * Complete a build log
   * @param taskId - The task ID to complete
   * @param success - Whether the task was successful
   * @param exitCode - The exit code of the task
   * @param errorInfo - Error information if the task failed
   * @returns The updated build log
   */
  static async completeBuildLog(
    taskId: string,
    success: boolean,
    exitCode: number = 0,
    errorInfo?: { message: string; stack?: string; code?: string }
  ): Promise<IBuildLog | null> {
    try {
      await connectToDatabase()
      
      const endTime = new Date()
      const log = await BuildLog.findOne({ taskId })
      
      if (!log) {
        throw new Error(`Build log with task ID ${taskId} not found`)
      }
      
      // Calculate duration
      const duration = endTime.getTime() - log.startTime.getTime()
      
      // Update log
      log.status = success ? 'completed' : 'failed'
      log.endTime = endTime
      log.duration = duration
      log.exitCode = exitCode
      
      if (errorInfo && !success) {
        log.error = errorInfo
      }
      
      await log.save()
      return log
    } catch (error) {
      console.error('Error completing build log:', error)
      throw error
    }
  }
  
  /**
   * TERMINAL SESSION METHODS
   * Methods for working with terminal sessions
   */
  
  /**
   * Create a new terminal session
   * @param projectId - The ID of the project
   * @param sessionData - The session data
   * @returns The created terminal session
   */
  static async createTerminalSession(
    projectId: string,
    sessionData: {
      name: string;
      currentDirectory: string;
      createdBy: string;
      purpose: string;
      environment?: Record<string, string>;
    }
  ): Promise<ITerminalSession> {
    try {
      await connectToDatabase()
      
      // Generate session ID
      const sessionId = `term_${uuidv4()}`
      
      const terminalSession = new TerminalSession({
        projectId: new ObjectId(projectId),
        sessionId,
        name: sessionData.name,
        status: 'active',
        currentDirectory: sessionData.currentDirectory,
        environment: sessionData.environment || {},
        history: [],
        metadata: {
          createdBy: sessionData.createdBy,
          purpose: sessionData.purpose
        },
        lastActive: new Date()
      })
      
      await terminalSession.save()
      return terminalSession
    } catch (error) {
      console.error('Error creating terminal session:', error)
      throw error
    }
  }
  
  /**
   * Get terminal sessions by project ID
   * @param projectId - The project ID to find sessions for
   * @returns Array of terminal sessions
   */
  static async getTerminalSessions(projectId: string): Promise<ITerminalSession[]> {
    try {
      await connectToDatabase()
      const sessions = await TerminalSession.find({ 
        projectId: new ObjectId(projectId),
        status: { $ne: 'inactive' }
      }).sort({ lastActive: -1 })
      return sessions
    } catch (error) {
      console.error('Error fetching terminal sessions:', error)
      throw error
    }
  }
  
  /**
   * Get a terminal session by ID
   * @param sessionId - The session ID to find
   * @returns The terminal session or null if not found
   */
  static async getTerminalSession(sessionId: string): Promise<ITerminalSession | null> {
    try {
      await connectToDatabase()
      const session = await TerminalSession.findOne({ sessionId })
      return session
    } catch (error) {
      console.error('Error fetching terminal session:', error)
      throw error
    }
  }
  
  /**
   * Execute a command in a terminal session
   * @param sessionId - The session ID to execute command in
   * @param command - The command to execute
   * @param output - The output of the command
   * @param exitCode - The exit code of the command
   * @param duration - The duration of the command execution in milliseconds
   * @returns The updated terminal session
   */
  static async executeCommand(
    sessionId: string,
    command: string,
    output: string,
    exitCode: number = 0,
    duration: number = 0
  ): Promise<ITerminalSession | null> {
    try {
      await connectToDatabase()
      
      const session = await TerminalSession.findOne({ sessionId })
      
      if (!session) {
        throw new Error(`Terminal session with ID ${sessionId} not found`)
      }
      
      // Add command to history
      session.history.push({
        command,
        output,
        exitCode,
        timestamp: new Date(),
        duration
      })
      
      // Update last active time
      session.lastActive = new Date()
      
      await session.save()
      return session
    } catch (error) {
      console.error('Error executing command in terminal session:', error)
      throw error
    }
  }
  
  /**
   * Update a terminal session
   * @param sessionId - The session ID to update
   * @param updateData - The data to update
   * @returns The updated terminal session
   */
  static async updateTerminalSession(
    sessionId: string,
    updateData: Partial<ITerminalSession>
  ): Promise<ITerminalSession | null> {
    try {
      await connectToDatabase()
      const session = await TerminalSession.findOneAndUpdate(
        { sessionId },
        { $set: updateData },
        { new: true, runValidators: true }
      )
      return session
    } catch (error) {
      console.error('Error updating terminal session:', error)
      throw error
    }
  }
  
  /**
   * Close a terminal session
   * @param sessionId - The session ID to close
   * @returns The updated terminal session
   */
  static async closeTerminalSession(sessionId: string): Promise<ITerminalSession | null> {
    try {
      await connectToDatabase()
      const session = await TerminalSession.findOneAndUpdate(
        { sessionId },
        { $set: { status: 'inactive' } },
        { new: true }
      )
      return session
    } catch (error) {
      console.error('Error closing terminal session:', error)
      throw error
    }
  }
} 