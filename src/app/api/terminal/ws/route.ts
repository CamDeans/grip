import { NextResponse } from 'next/server'
import { WebSocket } from 'ws'
import { getWebSocketServer } from '@/lib/websocket'

// Update to use the new route segment config format
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: Request) {
  // Use the singleton WebSocket server
  const { wss } = getWebSocketServer()

  // Only add event handlers if they haven't been added yet
  if (wss && !wss.listenerCount('terminal_message')) {
    console.log('Adding WebSocket terminal event handlers...')

    // Add a specific event listener for terminal messages
    wss.on('connection', (ws: WebSocket) => {
      console.log('Terminal client connected')

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString())
          
          // Only process messages with type 'terminal'
          if (data.type === 'terminal') {
            console.log('Received terminal message:', data)
            
            // Echo back the message
            ws.send(JSON.stringify({
              type: 'terminal_response',
              data: `Received: ${data.message}`
            }))
          }
        } catch (error) {
          console.error('Error handling terminal message:', error)
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Failed to process terminal message'
          }))
        }
      })

      ws.on('close', () => {
        console.log('Terminal client disconnected')
      })
    })
  }

  return new NextResponse('Terminal WebSocket endpoint active')
} 