/**
 * Terminal WebSocket Service
 * Part of Phase 5, Step 2 of G.R.I.P. Enhancement Plan
 * 
 * This service handles real-time updates for terminal commands
 * using WebSocket connections.
 */

import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { TerminalSession } from '@/lib/models/TerminalSession';
import { connectToDatabase } from '@/lib/mongodb';

// WebSocket message types
export type WebSocketMessageType = 
  | 'command_status'
  | 'command_output'
  | 'command_error'
  | 'command_cancel'
  | 'terminal_ready'
  | 'terminal_close';

// WebSocket message interface
export interface WebSocketMessage {
  type: WebSocketMessageType;
  terminalId: string;
  data: any;
}

class TerminalWebSocketService extends EventEmitter {
  private connections: Map<string, WebSocket>;
  private heartbeats: Map<string, NodeJS.Timeout>;
  private reconnectAttempts: Map<string, number>;
  
  constructor() {
    super();
    this.connections = new Map();
    this.heartbeats = new Map();
    this.reconnectAttempts = new Map();
  }

  /**
   * Register a new WebSocket connection
   */
  registerConnection(terminalId: string, ws: WebSocket): void {
    // Clear any existing connection
    this.closeConnection(terminalId);
    
    // Set up the new connection
    this.connections.set(terminalId, ws);
    
    // Set up heartbeat
    this.setupHeartbeat(terminalId, ws);
    
    // Set up event listeners
    this.setupEventListeners(terminalId, ws);
    
    // Reset reconnect attempts
    this.reconnectAttempts.set(terminalId, 0);
    
    // Send ready message
    this.sendMessage(terminalId, {
      type: 'terminal_ready',
      terminalId,
      data: { status: 'connected' }
    });
  }

  /**
   * Set up heartbeat for connection monitoring
   */
  private setupHeartbeat(terminalId: string, ws: WebSocket): void {
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        this.handleConnectionError(terminalId, new Error('Connection lost'));
      }
    }, 30000); // 30 second interval
    
    this.heartbeats.set(terminalId, interval);
  }

  /**
   * Set up WebSocket event listeners
   */
  private setupEventListeners(terminalId: string, ws: WebSocket): void {
    ws.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data) as WebSocketMessage;
        this.handleMessage(terminalId, message);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      this.handleConnectionClose(terminalId);
    });

    ws.on('error', (error) => {
      this.handleConnectionError(terminalId, error);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(terminalId: string, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case 'command_cancel':
        this.emit('command_cancel', terminalId, message.data);
        break;
      
      case 'terminal_close':
        await this.closeConnection(terminalId);
        break;
      
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle connection close
   */
  private handleConnectionClose(terminalId: string): void {
    this.clearConnection(terminalId);
    this.attemptReconnect(terminalId);
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(terminalId: string, error: Error): void {
    console.error(`WebSocket error for terminal ${terminalId}:`, error);
    this.clearConnection(terminalId);
    this.attemptReconnect(terminalId);
  }

  /**
   * Clear connection resources
   */
  private clearConnection(terminalId: string): void {
    const heartbeat = this.heartbeats.get(terminalId);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.heartbeats.delete(terminalId);
    }
    
    this.connections.delete(terminalId);
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(terminalId: string): void {
    const attempts = this.reconnectAttempts.get(terminalId) || 0;
    if (attempts < 5) { // Max 5 reconnect attempts
      this.reconnectAttempts.set(terminalId, attempts + 1);
      setTimeout(() => {
        this.emit('reconnect', terminalId);
      }, Math.min(1000 * Math.pow(2, attempts), 30000)); // Exponential backoff, max 30 seconds
    }
  }

  /**
   * Send a message through WebSocket
   */
  sendMessage(terminalId: string, message: WebSocketMessage): void {
    const ws = this.connections.get(terminalId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Update command status
   */
  updateCommandStatus(terminalId: string, status: string, progress: number): void {
    this.sendMessage(terminalId, {
      type: 'command_status',
      terminalId,
      data: { status, progress }
    });
  }

  /**
   * Send command output
   */
  sendCommandOutput(terminalId: string, output: string): void {
    this.sendMessage(terminalId, {
      type: 'command_output',
      terminalId,
      data: { output }
    });
  }

  /**
   * Send command error
   */
  sendCommandError(terminalId: string, error: string): void {
    this.sendMessage(terminalId, {
      type: 'command_error',
      terminalId,
      data: { error }
    });
  }

  /**
   * Close a connection
   */
  async closeConnection(terminalId: string): Promise<void> {
    const ws = this.connections.get(terminalId);
    if (ws) {
      ws.close();
      this.clearConnection(terminalId);
      
      // Update terminal session status
      try {
        await connectToDatabase();
        const session = await TerminalSession.findOne({ sessionId: terminalId });
        if (session) {
          session.status = 'disconnected';
          await session.save();
        }
      } catch (error) {
        console.error('Error updating terminal session status:', error);
      }
    }
  }

  /**
   * Close all connections
   */
  async closeAllConnections(): Promise<void> {
    const terminalIds = Array.from(this.connections.keys());
    await Promise.all(terminalIds.map(id => this.closeConnection(id)));
  }
}

// Export singleton instance
export const terminalWebSocketService = new TerminalWebSocketService();
export default terminalWebSocketService; 