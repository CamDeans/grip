import { TerminalSession } from '@/lib/models/TerminalSession'
import { dbConnect } from '@/lib/db'
import { WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'

/**
 * Terminal-Chat Bridge Service
 * Handles all terminal-chat bridge operations including:
 * - Real-time command sharing
 * - Command execution from chat
 * - State synchronization
 * - WebSocket management
 */
export class TerminalChatBridgeService {
  private static wsConnections: Map<string, WebSocket> = new Map()
  private static commandHandlers: Map<string, (command: string) => Promise<void>> = new Map()

  /**
   * Initialize WebSocket connection for a terminal session
   */
  static async initializeWebSocket(terminalId: string, ws: WebSocket) {
    try {
      const { success, error } = await dbConnect()
      if (!success) {
        throw error
      }
      
      // Store the WebSocket connection
      this.wsConnections.set(terminalId, ws)
      
      // Set up WebSocket event handlers
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString())
          
          switch (message.type) {
            case 'command':
              await this.handleCommand(terminalId, message.command)
              break
            case 'status':
              await this.updateStatus(terminalId, message.status)
              break
            case 'output':
              await this.broadcastOutput(terminalId, message.output)
              break
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error)
          ws.send(JSON.stringify({ error: 'Failed to process message' }))
        }
      })
      
      ws.on('close', () => {
        this.wsConnections.delete(terminalId)
      })
      
      // Send initial connection confirmation
      ws.send(JSON.stringify({ 
        type: 'connected',
        terminalId,
        timestamp: new Date()
      }))
    } catch (error) {
      console.error('Error initializing WebSocket:', error)
      ws.close()
    }
  }

  /**
   * Handle incoming command from WebSocket
   */
  private static async handleCommand(terminalId: string, command: string) {
    try {
      const handler = this.commandHandlers.get(terminalId)
      if (!handler) {
        throw new Error('No command handler registered for this terminal')
      }
      
      await handler(command)
      
      // Broadcast command execution confirmation
      this.broadcastCommand(terminalId, {
        type: 'command_executed',
        command,
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Error handling command:', error)
      this.broadcastCommand(terminalId, {
        type: 'error',
        error: 'Failed to execute command',
        command,
        timestamp: new Date()
      })
    }
  }

  /**
   * Share a terminal command with the chat
   */
  static async shareCommand(params: {
    terminalId: string
    projectId: string
    command: string
    output: string
    exitCode?: number
    userId: string
  }) {
    try {
      const { success, error } = await dbConnect()
      if (!success) {
        throw error
      }
      
      const { terminalId, projectId, command, output, exitCode, userId } = params
      
      // Get the terminal session
      const terminalSession = await TerminalSession.findOne({ sessionId: terminalId })
      if (!terminalSession) {
        throw new Error('Terminal session not found')
      }
      
      // Add metadata to link this command with the chat
      const updatedMetadata = {
        ...terminalSession.metadata,
        sharedWithChat: true,
        chatReference: {
          projectId,
          timestamp: new Date(),
          userId
        }
      }
      
      // Update the terminal session
      await TerminalSession.updateOne(
        { sessionId: terminalId },
        { 
          $set: { 
            metadata: updatedMetadata,
            lastChatInteraction: new Date()
          }
        }
      )
      
      // Broadcast the command to all connected clients
      this.broadcastCommand(terminalId, {
        command,
        output,
        exitCode,
        timestamp: new Date()
      })
      
      return {
        success: true,
        message: 'Command shared with chat',
        terminalId,
        timestamp: new Date()
      }
    } catch (error) {
      console.error('Error sharing command:', error)
      throw error
    }
  }

  /**
   * Execute a command from the chat interface
   */
  static async executeCommand(params: {
    terminalId: string
    command: string
    userId: string
  }): Promise<{
    success: boolean
    command: string
    terminalId: string
    timestamp: Date
    output: string
    exitCode: number
  }> {
    try {
      const { success, error } = await dbConnect()
      if (!success) {
        throw error
      }
      
      const { terminalId, command, userId } = params
      
      // Get the terminal session
      const terminalSession = await TerminalSession.findOne({ sessionId: terminalId })
      if (!terminalSession) {
        throw new Error('Terminal session not found')
      }
      
      // Get the command handler for this terminal
      const handler = this.commandHandlers.get(terminalId)
      if (!handler) {
        throw new Error('No command handler registered for this terminal')
      }
      
      // Execute the command
      await handler(command)
      
      // Update metadata
      await TerminalSession.updateOne(
        { sessionId: terminalId },
        { 
          $set: { 
            'metadata.lastExecutedFromChat': new Date(),
            'metadata.chatTriggered': true,
            'metadata.lastChatUser': userId
          }
        }
      )
      
      return {
        success: true,
        command,
        terminalId,
        timestamp: new Date(),
        output: '', // Placeholder for actual command output
        exitCode: 0 // Placeholder for actual exit code
      }
    } catch (error) {
      console.error('Error executing command:', error)
      throw error
    }
  }

  /**
   * Register a command handler for a terminal
   */
  static registerCommandHandler(terminalId: string, handler: (command: string) => Promise<void>) {
    this.commandHandlers.set(terminalId, handler)
  }

  /**
   * Unregister a command handler
   */
  static unregisterCommandHandler(terminalId: string) {
    this.commandHandlers.delete(terminalId)
  }

  /**
   * Broadcast a command to all connected clients
   */
  private static broadcastCommand(terminalId: string, data: any) {
    const ws = this.wsConnections.get(terminalId)
    if (ws) {
      ws.send(JSON.stringify({
        type: 'command',
        data,
        timestamp: new Date()
      }))
    }
  }

  /**
   * Broadcast output to all connected clients
   */
  private static broadcastOutput(terminalId: string, output: string) {
    const ws = this.wsConnections.get(terminalId)
    if (ws) {
      ws.send(JSON.stringify({
        type: 'output',
        output,
        timestamp: new Date()
      }))
    }
  }

  /**
   * Update terminal status
   */
  private static async updateStatus(terminalId: string, status: string) {
    try {
      const { success, error } = await dbConnect()
      if (!success) {
        throw error
      }
      
      await TerminalSession.updateOne(
        { sessionId: terminalId },
        { $set: { status } }
      )
      
      // Broadcast status update
      const ws = this.wsConnections.get(terminalId)
      if (ws) {
        ws.send(JSON.stringify({
          type: 'status',
          status,
          timestamp: new Date()
        }))
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }
} 