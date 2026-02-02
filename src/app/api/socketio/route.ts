import { NextResponse } from 'next/server'
import { Server as HTTPServer } from 'http'
import { initSocket } from '@/lib/socket'
import { getServerAuthSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface SocketResponse extends NextResponse {
  socket: {
    server: HTTPServer & {
      io?: ReturnType<typeof initSocket>
    }
  }
}

export async function GET(_req: Request) {
  try {
    // Check authentication
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const res = new NextResponse() as SocketResponse
    
    if (!res.socket?.server) {
      return NextResponse.json(
        { error: 'Server not initialized' },
        { status: 500 }
      )
    }

    // Initialize Socket.IO if not already done
    if (!res.socket.server.io) {
      const io = initSocket(res.socket.server)
      res.socket.server.io = io

      // Set up analysis event handlers
      io.on('connection', (socket) => {
        // Associate socket with user
        socket.data.userId = session.user.id

        // Handle project-specific connections
        socket.on('join-analysis', (projectId: string) => {
          socket.join(`analysis-${projectId}`)
        })

        // Handle analysis stages
        socket.on('analysis-progress', (data: {
          projectId: string
          stage: string
          progress: number
          details?: string
        }) => {
          io.to(`analysis-${data.projectId}`).emit('analysis-update', data)
        })

        // Handle analysis completion
        socket.on('analysis-complete', (data: {
          projectId: string
          results: any
        }) => {
          io.to(`analysis-${data.projectId}`).emit('analysis-complete', data)
        })

        // Handle analysis errors
        socket.on('analysis-error', (data: {
          projectId: string
          error: string
        }) => {
          io.to(`analysis-${data.projectId}`).emit('analysis-error', data)
        })

        // Clean up on disconnect
        socket.on('disconnect', () => {
          // Handle any necessary cleanup
        })
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Socket initialization error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize socket connection' },
      { status: 500 }
    )
  }
}
