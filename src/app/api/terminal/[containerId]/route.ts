import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { spawn } from 'child_process'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ containerId: string }> }
) {
  try {
    const { containerId: _containerId } = await params
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if the request is a WebSocket upgrade request
    if (request.headers.get('upgrade') !== 'websocket') {
      return NextResponse.json({ error: 'Expected WebSocket connection' }, { status: 400 })
    }

    // Get the WebSocket object from the request
    const { socket, response } = await (request as any).body.webSocket()

    // Set up terminal session
    const shell = spawn(process.platform === 'win32' ? 'powershell.exe' : 'bash')

    // Handle data from client
    socket.onmessage = (event: MessageEvent) => {
      shell.stdin.write(event.data)
    }

    // Send shell output to client
    shell.stdout.on('data', (data) => {
      if (socket.readyState === 1) { // WebSocket.OPEN
        socket.send(data.toString())
      }
    })

    shell.stderr.on('data', (data) => {
      if (socket.readyState === 1) { // WebSocket.OPEN
        socket.send(data.toString())
      }
    })

    // Clean up on close
    socket.onclose = () => {
      shell.kill()
    }

    return response
  } catch (error) {
    console.error('Terminal connection error:', error)
    return NextResponse.json(
      { error: 'Failed to establish terminal connection' },
      { status: 500 }
    )
  }
} 