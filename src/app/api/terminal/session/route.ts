import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { TerminalSession } from '@/lib/models/TerminalSession'
import { ObjectId } from 'mongodb'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Terminal Session Management API
 * Part of Phase 6, Step 3 of G.R.I.P. Enhancement Plan
 * 
 * This endpoint handles terminal session operations:
 * - GET: Retrieve session details
 * - POST: Create or reconnect to a session
 * - PATCH: Update session state
 */

// Get terminal session(s): list by projectId or single by sessionId
export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const sessionId = searchParams.get('sessionId')

    await connectToDatabase()

    // List sessions for project
    if (projectId) {
      const sessions = await TerminalSession.find({ projectId: new ObjectId(projectId) })
        .sort({ lastActive: -1 })
        .select('sessionId name status lastActive')
        .lean()
      return NextResponse.json({
        success: true,
        sessions: sessions.map((s: { sessionId: string; name: string; status: string; lastActive: Date }) => ({
          id: s.sessionId,
          name: s.name,
          status: s.status,
          lastActive: s.lastActive
        }))
      })
    }

    // Single session by sessionId
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID or projectId is required' }, { status: 400 })
    }

    const terminalSession = await TerminalSession.findOne({ sessionId })
    if (!terminalSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      session: {
        id: terminalSession.sessionId,
        name: terminalSession.name,
        status: terminalSession.status,
        currentDirectory: terminalSession.currentDirectory,
        environment: terminalSession.environment,
        createdAt: terminalSession.createdAt,
        lastActive: terminalSession.lastActive,
        projectId: terminalSession.projectId,
        metadata: terminalSession.metadata
      }
    })
  } catch (error) {
    console.error('Error fetching terminal session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch terminal session' },
      { status: 500 }
    )
  }
}

// Create or reconnect to a terminal session
export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json().catch(() => ({}))
    const { sessionId, projectId, name, environment } = body

    await connectToDatabase()
    
    // If sessionId is provided, try to reconnect to an existing session
    if (sessionId) {
      const existingSession = await TerminalSession.findOne({ sessionId })
      
      if (existingSession) {
        // Reconnect to existing session - update status and lastActive
        existingSession.status = 'active'
        existingSession.lastActive = new Date()
        
        // Update environment variables if provided
        if (environment && typeof environment === 'object') {
          existingSession.environment = {
            ...existingSession.environment,
            ...environment
          }
        }
        
        await existingSession.save()
        
        return NextResponse.json({
          success: true,
          message: 'Session reconnected',
          session: {
            id: existingSession.sessionId,
            name: existingSession.name,
            status: existingSession.status,
            currentDirectory: existingSession.currentDirectory
          }
        })
      }
      
      // If session not found, return error
      return NextResponse.json({ 
        error: 'Session not found',
        suggestions: 'Create a new session instead'
      }, { status: 404 })
    }
    
    // If no sessionId, create a new session
    // This is the same as the POST handler in terminal/route.ts
    // We might want to consolidate these endpoints in the future
    const newSessionId = require('crypto').randomUUID()
    const terminalSession = new TerminalSession({
      sessionId: newSessionId,
      name: name || `Terminal ${newSessionId.substring(0, 8)}`,
      status: 'active',
      currentDirectory: '/',
      projectId: projectId ? new ObjectId(projectId) : null,
      environment: environment || {},
      history: [],
      metadata: {
        createdBy: session.user.email || session.user.id,
        purpose: 'User terminal session'
      }
    })

    await terminalSession.save()

    return NextResponse.json({
      success: true,
      message: 'Session created',
      sessionId: newSessionId,
      session: {
        id: newSessionId,
        name: terminalSession.name,
        status: 'active',
        currentDirectory: '/'
      }
    })
  } catch (error) {
    console.error('Error managing terminal session:', error)
    return NextResponse.json(
      { error: 'Failed to manage terminal session' },
      { status: 500 }
    )
  }
}

// Update terminal session state
export async function PATCH(request: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { sessionId, status, currentDirectory, environment } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    await connectToDatabase()
    
    const terminalSession = await TerminalSession.findOne({ sessionId })
    
    if (!terminalSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    // Update session properties if provided
    if (status && ['active', 'inactive', 'error'].includes(status)) {
      terminalSession.status = status
    }
    
    if (currentDirectory) {
      terminalSession.currentDirectory = currentDirectory
    }
    
    if (environment && typeof environment === 'object') {
      terminalSession.environment = {
        ...terminalSession.environment,
        ...environment
      }
    }
    
    // Always update lastActive
    terminalSession.lastActive = new Date()
    
    await terminalSession.save()
    
    return NextResponse.json({
      success: true,
      message: 'Session updated',
      session: {
        id: terminalSession.sessionId,
        status: terminalSession.status,
        currentDirectory: terminalSession.currentDirectory
      }
    })
  } catch (error) {
    console.error('Error updating terminal session:', error)
    return NextResponse.json(
      { error: 'Failed to update terminal session' },
      { status: 500 }
    )
  }
} 