import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

// Define types for our analysis events
interface AnalysisProgress {
  projectId: string
  stage: string
  progress: number
  details?: string
}

interface AnalysisComplete {
  projectId: string
  results: any
}

interface AnalysisError {
  projectId: string
  error: string
}

export function initSocket(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXTAUTH_URL,
      methods: ['GET', 'POST'],
      credentials: true
    },
  })

  // Middleware to ensure authentication
  io.use(async (socket, next) => {
    const userId = socket.handshake.auth.userId
    if (!userId) {
      return next(new Error('Unauthorized'))
    }
    socket.data.userId = userId
    next()
  })

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}, User: ${socket.data.userId}`)

    // Handle joining project-specific analysis room
    socket.on('join-analysis', (projectId: string) => {
      const room = `analysis-${projectId}`
      socket.join(room)
      console.log(`Client ${socket.id} joined analysis room: ${room}`)
    })

    // Handle analysis progress updates
    socket.on('analysis-progress', (data: AnalysisProgress) => {
      const room = `analysis-${data.projectId}`
      io.to(room).emit('analysis-update', {
        stage: data.stage,
        progress: data.progress,
        details: data.details
      })
    })

    // Handle analysis completion
    socket.on('analysis-complete', (data: AnalysisComplete) => {
      const room = `analysis-${data.projectId}`
      io.to(room).emit('analysis-complete', {
        results: data.results
      })
    })

    // Handle analysis errors
    socket.on('analysis-error', (data: AnalysisError) => {
      const room = `analysis-${data.projectId}`
      io.to(room).emit('analysis-error', {
        error: data.error
      })
    })

    // Handle client disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`)
    })

    // Handle leaving analysis rooms
    socket.on('leave-analysis', (projectId: string) => {
      const room = `analysis-${projectId}`
      socket.leave(room)
      console.log(`Client ${socket.id} left analysis room: ${room}`)
    })
  })

  return io
}

export const config = {
  api: {
    bodyParser: false,
  },
}

// Export event name constants to ensure consistency
export const SOCKET_EVENTS = {
  JOIN_ANALYSIS: 'join-analysis',
  LEAVE_ANALYSIS: 'leave-analysis',
  ANALYSIS_PROGRESS: 'analysis-progress',
  ANALYSIS_UPDATE: 'analysis-update',
  ANALYSIS_COMPLETE: 'analysis-complete',
  ANALYSIS_ERROR: 'analysis-error'
} as const
