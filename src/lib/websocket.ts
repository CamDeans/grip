import { WebSocketServer, WebSocket as WS } from 'ws'
import { createServer } from 'http'

// Singleton instances
let wss: WebSocketServer | null = null
let server: ReturnType<typeof createServer> | null = null
let isInitialized = false

interface WebSocketMessage {
  type: 'new_step' | 'execute_command' | 'update_step' | 'next_step' | 'task_update' | 'error';
  projectId?: string;
  step?: {
    title: string;
    description: string[];
    commands: string[];
    success_criteria: string[];
  };
  command?: string;
  stepId?: number;
  updates?: Partial<{
    title: string;
    description: string[];
    commands: string[];
    success_criteria: string[];
    completed: boolean;
  }>;
  task?: {
    _id: string;
    name: string;
    status: string;
    progress?: number;
    [key: string]: any;
  };
  message?: string;
}

/**
 * Get or create the WebSocket server
 * True singleton implementation that only initializes once per Node.js process
 */
export function getWebSocketServer() {
  // If already initialized, return existing instances
  if (isInitialized && wss && server) {
    console.log('WebSocket server already initialized, reusing existing instance')
    return { wss, server }
  }

  console.log('Initializing WebSocket server singleton...')
  isInitialized = true

  // Create HTTP server
  server = createServer()

  // Create WebSocket server
  wss = new WebSocketServer({ noServer: true })

  // Store client connections
  const clients = new Map<string, WS>()

  // Handle WebSocket connection
  wss.on('connection', (ws: WS) => {
    console.log('New WebSocket connection')

    ws.on('message', (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString())
        console.log('Received:', message)

        if (!wss) return // Safety check

        switch (message.type) {
          case 'new_step':
            // Broadcast new step to all clients
            wss.clients.forEach((client) => {
              if (client.readyState === WS.OPEN) {
                client.send(JSON.stringify(message))
              }
            })
            break

          case 'execute_command':
            // Send command to specific client
            if (message.projectId && clients.has(message.projectId)) {
              const client = clients.get(message.projectId)
              client?.send(JSON.stringify(message))
            }
            break

          case 'update_step':
            // Broadcast step update to all clients
            wss.clients.forEach((client) => {
              if (client.readyState === WS.OPEN) {
                client.send(JSON.stringify(message))
              }
            })
            break

          case 'next_step':
            // Broadcast next step to all clients
            wss.clients.forEach((client) => {
              if (client.readyState === WS.OPEN) {
                client.send(JSON.stringify(message))
              }
            })
            break

          case 'task_update':
            // Send task update to clients subscribed to this project
            if (message.projectId && wss) {
              // Get the specific client for this project
              const projectClient = clients.get(message.projectId)
              if (projectClient && projectClient.readyState === WS.OPEN) {
                projectClient.send(JSON.stringify(message))
              }
              
              // Also broadcast to all admin clients (they receive all task updates)
              wss.clients.forEach((client) => {
                if (client !== projectClient && client.readyState === WS.OPEN) {
                  // Check if this is an admin client (listening to all projects)
                  const adminClient = Array.from(clients.entries())
                    .find(([_, c]) => c === client && _ === 'admin')
                
                  if (adminClient) {
                    client.send(JSON.stringify(message))
                  }
                }
              })
            }
            break

          default:
            console.warn('Unknown message type:', message.type)
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type'
            }))
        }
      } catch (error) {
        console.error('Error processing message:', error)
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }))
      }
    })

    ws.on('close', () => {
      console.log('Client disconnected')
      // Remove client from map
      clients.forEach((client, projectId) => {
        if (client === ws) {
          clients.delete(projectId)
        }
      })
    })
  })

  // Handle upgrade
  if (server) {
    server.on('upgrade', (request, socket, head) => {
      if (!wss) return // Safety check
      
      const url = new URL(request.url || '', `http://${request.headers.host}`)
      const projectId = url.searchParams.get('projectId')

      wss.handleUpgrade(request, socket, head, (ws) => {
        if (projectId) {
          clients.set(projectId, ws)
        }
        if (wss) {
          wss.emit('connection', ws, request)
        }
      })
    })
  }

  // Start server - dynamic port management
  const WS_PORT = parseInt(process.env.WS_PORT || '3001', 10)
  const APP_PORT = parseInt(process.env.PORT || '3000', 10)
  const isProduction = process.env.NODE_ENV === 'production'

  // Make sure we're not using the same port as the Next.js app
  const PORT = WS_PORT !== APP_PORT ? WS_PORT : WS_PORT + 1

  // In production, we might not need to start a separate WebSocket server
  // as it may be handled by the hosting platform or a reverse proxy
  if ((!isProduction || process.env.FORCE_WS_SERVER === 'true') && server) {
    try {
      server.listen(PORT, () => {
        console.log(`WebSocket server is running on port ${PORT} (${isProduction ? 'production' : 'development'} mode)`)
      })
    } catch (error) {
      console.error(`Failed to start WebSocket server on port ${PORT}:`, error)
      // Don't throw here - we want to gracefully degrade
    }
  } else {
    console.log('WebSocket server not started in production mode (will use hosting platform WebSocket integration)')
  }

  return { wss, server }
}

// Export server and WSS for backward compatibility
export { wss, server } 
