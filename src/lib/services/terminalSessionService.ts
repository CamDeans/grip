import { TerminalSession } from '@/lib/models/TerminalSession'
import { ObjectId } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import { mongoMonitorService } from './mongoMonitorService'
import mongoose from 'mongoose'

/**
 * Terminal Session Service
 * Handles all terminal session operations including:
 * - Session creation and management
 * - Session state tracking
 * - Session persistence
 * - Session cleanup
 */
export class TerminalSessionService {
  private static instance: TerminalSessionService
  private eventEmitter: EventEmitter
  private isInitialized: boolean = false

  private constructor() {
    this.eventEmitter = new EventEmitter()
  }

  public static getInstance(): TerminalSessionService {
    if (!TerminalSessionService.instance) {
      TerminalSessionService.instance = new TerminalSessionService()
    }
    return TerminalSessionService.instance
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      try {
        // Ensure model is registered
        if (!mongoose.models.TerminalSession) {
          await import('@/lib/models/TerminalSession')
        }
        this.isInitialized = true
      } catch (error) {
        console.error('Error initializing TerminalSessionService:', error)
        throw error
      }
    }
  }

  /**
   * Create a new terminal session
   */
  public async createSession(params: {
    projectId: string;
    name?: string;
    environment?: Record<string, string>;
    metadata?: {
      createdBy: string;
      purpose: string;
      taskIds?: string[];
      relatedFiles?: string[];
    };
  }): Promise<{
    sessionId: string;
    name: string;
    status: string;
    currentDirectory: string;
  }> {
    try {
      await this.ensureInitialized()

      const sessionId = `term_${uuidv4()}`
      const terminalSession = new TerminalSession({
        sessionId,
        name: params.name || `Terminal ${sessionId.substring(0, 8)}`,
        status: 'active',
        currentDirectory: '/',
        projectId: new ObjectId(params.projectId),
        environment: params.environment || {},
        history: [],
        metadata: params.metadata || {
          createdBy: 'system',
          purpose: 'User terminal session'
        },
        lastActive: new Date(),
        authenticated: true
      })

      await terminalSession.save()

      return {
        sessionId,
        name: terminalSession.name,
        status: terminalSession.status,
        currentDirectory: terminalSession.currentDirectory
      }
    } catch (error) {
      console.error('Error creating terminal session:', error)
      throw error
    }
  }

  /**
   * Get session details
   */
  public async getSession(sessionId: string): Promise<{
    id: string;
    name: string;
    status: string;
    currentDirectory: string;
    environment: Record<string, string>;
    history: Array<{
      command: string;
      output: string;
      exitCode: number;
      timestamp: Date;
      duration: number;
    }>;
    metadata: {
      createdBy: string;
      purpose: string;
      taskIds?: string[];
      relatedFiles?: string[];
    };
    lastActive: Date;
  }> {
    try {
      await this.ensureInitialized()

      const session = await TerminalSession.findOne({ sessionId })
      if (!session) {
        throw new Error('Session not found')
      }

      return {
        id: session.sessionId,
        name: session.name,
        status: session.status,
        currentDirectory: session.currentDirectory,
        environment: session.environment,
        history: session.history,
        metadata: session.metadata,
        lastActive: session.lastActive
      }
    } catch (error) {
      console.error('Error getting terminal session:', error)
      throw error
    }
  }

  /**
   * Update session state
   */
  public async updateSession(
    sessionId: string,
    updates: {
      status?: 'active' | 'inactive' | 'error' | 'connected' | 'disconnected';
      currentDirectory?: string;
      environment?: Record<string, string>;
      metadata?: {
        taskIds?: string[];
        relatedFiles?: string[];
      };
    }
  ): Promise<void> {
    try {
      await this.ensureInitialized()

      const session = await TerminalSession.findOne({ sessionId })
      if (!session) {
        throw new Error('Session not found')
      }

      if (updates.status) session.status = updates.status
      if (updates.currentDirectory) session.currentDirectory = updates.currentDirectory
      if (updates.environment) session.environment = updates.environment
      if (updates.metadata) {
        session.metadata = {
          ...session.metadata,
          ...updates.metadata
        }
      }

      session.lastActive = new Date()
      await session.save()
    } catch (error) {
      console.error('Error updating terminal session:', error)
      throw error
    }
  }

  /**
   * Add command to session history
   */
  public async addCommandToHistory(
    sessionId: string,
    command: string,
    output: string,
    exitCode: number,
    duration: number
  ): Promise<void> {
    try {
      await this.ensureInitialized()

      const session = await TerminalSession.findOne({ sessionId })
      if (!session) {
        throw new Error('Session not found')
      }

      // Add command to history using the schema method
      session.history.push({
        command,
        output,
        exitCode,
        timestamp: new Date(),
        duration
      })

      session.lastActive = new Date()
      await session.save()

      // Emit event for command execution
      this.eventEmitter.emit('commandExecuted', sessionId, command, output)
    } catch (error) {
      console.error('Error adding command to history:', error)
      throw error
    }
  }

  /**
   * List all sessions for a project
   */
  public async listSessions(projectId: string): Promise<Array<{
    id: string;
    name: string;
    status: string;
    lastActive: Date;
  }>> {
    try {
      await this.ensureInitialized()

      const sessions = await TerminalSession.find({ projectId: new ObjectId(projectId) })
        .sort({ lastActive: -1 })
        .select('sessionId name status lastActive')
        .lean()

      return sessions.map(session => ({
        id: session.sessionId,
        name: session.name,
        status: session.status,
        lastActive: session.lastActive
      }))
    } catch (error) {
      console.error('Error listing terminal sessions:', error)
      throw error
    }
  }

  /**
   * Delete a session
   */
  public async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.ensureInitialized()

      await TerminalSession.findOneAndDelete({ sessionId })
    } catch (error) {
      console.error('Error deleting terminal session:', error)
      throw error
    }
  }

  /**
   * Cleanup inactive sessions
   */
  public async cleanupInactiveSessions(): Promise<void> {
    try {
      await this.ensureInitialized()

      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 7) // 7 days ago

      await TerminalSession.deleteMany({
        lastActive: { $lt: cutoff },
        status: { $ne: 'active' }
      })
    } catch (error) {
      console.error('Error cleaning up inactive sessions:', error)
      throw error
    }
  }

  /**
   * Event emitter methods
   */
  public onSessionUpdate(callback: (sessionId: string, updates: any) => void): void {
    this.eventEmitter.on('sessionUpdate', callback)
  }

  public onSessionDelete(callback: (sessionId: string) => void): void {
    this.eventEmitter.on('sessionDelete', callback)
  }

  public onCommandExecuted(callback: (sessionId: string, command: string, output: string) => void): void {
    this.eventEmitter.on('commandExecuted', callback)
  }
}

export const terminalSessionService = TerminalSessionService.getInstance() 