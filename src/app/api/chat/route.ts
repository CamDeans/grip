import { Server as SocketIOServer } from 'socket.io'
import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { getAnthropicApiKey, ANTHROPIC_MODEL_OPUS } from '@/lib/anthropicConfig'

// Singleton instance management
let io: SocketIOServer | null = null
let serverInitialized = false

// Anthropic client created per-request when key is present (see POST)
function getAnthropicClient() {
  const apiKey = getAnthropicApiKey()
  if (!apiKey) return null
  return new Anthropic({ apiKey })
}

function initializeSocketServer() {
  if (serverInitialized) {
    console.log('Socket.IO server already initialized, reusing existing instance')
    return io
  }

  try {
    const isProduction = process.env.NODE_ENV === 'production'
    const WS_PORT = parseInt(process.env.WS_PORT || '3001', 10)
    const APP_PORT = parseInt(process.env.PORT || '3000', 10) 
    
    // Make sure we're not using the same port as the Next.js app
    const PORT = WS_PORT !== APP_PORT ? WS_PORT : WS_PORT + 1
    
    const corsOrigin = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    
    console.log(`Initializing Socket.IO server (${isProduction ? 'production' : 'development'} mode)`)
    console.log(`Socket.IO port: ${PORT}, CORS origin: ${corsOrigin}`)

    io = new SocketIOServer({
      path: '/api/chat/',
      addTrailingSlash: false,
      cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['*']
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000
    })

    io.on('connection', (socket) => {
      console.log('Chat client connected:', socket.id)
      
      socket.on('disconnect', () => {
        console.log('Chat client disconnected:', socket.id)
      })

      socket.on('error', (error) => {
        console.error('Socket error:', error)
      })

      socket.on(':command', (data) => {
        console.log('Received chat command:', data)
        // Handle command here
        socket.emit(':output', { output: `$ ${data.command}\r\n` })
      })
    })

    // In production on platforms like Vercel, we might not need to explicitly listen
    // as it might be handled by the hosting platform
    if (!isProduction || process.env.FORCE_SOCKET_SERVER === 'true') {
      io.listen(PORT, {
        cors: {
          origin: corsOrigin,
          methods: ['GET', 'POST'],
          credentials: true,
          allowedHeaders: ['*']
        }
      })
      console.log(`Socket.IO server running on port ${PORT} (${isProduction ? 'production' : 'development'} mode)`)
    } else {
      console.log('Socket.IO server initialized but not explicitly listening in production mode')
    }
    
    serverInitialized = true
    return io
  } catch (error) {
    console.error('Error initializing Socket.IO server:', error)
    throw error
  }
}

export async function GET(_req: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Initialize Socket.IO server if not already running
    initializeSocketServer()
    
    return new NextResponse('Socket.IO server is running', { status: 200 })
  } catch (error) {
    console.error('Socket.IO server error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const anthropic = getAnthropicClient()
    if (!anthropic) {
      return NextResponse.json(
        { error: 'G.R.I.P. AI is not configured. Set ANTHROPIC_API_KEY in .env.local or environment.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { projectId, message, currentPhase, phases } = body

    if (!projectId || !message) {
      console.error('API: Missing required fields:', { projectId: !!projectId, message: !!message })
      return NextResponse.json({ error: 'Project ID and message are required' }, { status: 400 })
    }

    console.log('API: Processing chat message for project ID:', projectId, {
      messageContent: typeof message === 'string' ? message : message.content,
      currentPhase,
      phasesProvided: Array.isArray(phases)
    })

    // Format conversation context
    const context = `You are G.R.I.P. (Guided Real-time Intelligence Partner), an AI assistant helping with project setup and development.
Current phase: ${currentPhase || 'Development Environment Setup'}
Project ID: ${projectId}

Your task is to help guide the user through their project setup and development process, following the defined phases and steps.
Always maintain a professional but friendly tone, and provide specific, actionable guidance.`

    try {
      // Extract message content, handling both string and object formats
      const messageContent = typeof message === 'string' ? message : message.content

      // Call G.R.I.P. AI
      const response = await anthropic.messages.create({
        model: ANTHROPIC_MODEL_OPUS,
        max_tokens: 4096,
        temperature: 0.7,
        system: context,
        messages: [
          {
            role: 'user',
            content: messageContent
          }
        ]
      })

      console.log('API: Received response from G.R.I.P.:', {
        responseLength: response.content[0].text.length,
      })

      // Safely determine step ID without causing errors
      let stepId = 1; // Default step ID
      
      if (Array.isArray(phases) && phases.length > 0) {
        const currentPhaseObj = phases.find((p) => p.name === currentPhase);
        if (currentPhaseObj?.steps?.length > 0) {
          stepId = currentPhaseObj.steps[0].id;
        }
      }

      // Process the response
      const aiResponse = {
        content: response.content[0].text,
        stepContext: {
          phase: currentPhase || 'Development Environment Setup',
          stepId: stepId,
          action: {
            type: 'response',
            status: 'completed',
            message: 'AI response generated'
          }
        }
      }

      return NextResponse.json(aiResponse)
    } catch (error) {
      console.error('API: Error calling G.R.I.P.:', error)
      throw error
    }
  } catch (error) {
    console.error('API Error in POST /api/chat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
