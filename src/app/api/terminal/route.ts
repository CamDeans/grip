import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { TerminalSession } from '@/lib/models/TerminalSession'
import { ObjectId } from 'mongodb'
import { randomUUID } from 'crypto'

// New route segment config
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Get all terminal sessions for a user
export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    // Connect to database
    await connectToDatabase()

    let query = {}
    
    // If project ID is provided, filter by project
    if (projectId) {
      query = { projectId: new ObjectId(projectId) }
    }

    // Find all terminal sessions for the user
    const terminals = await TerminalSession.find(query)
      .sort({ lastActive: -1 })
      .select('sessionId name status lastActive')
      .lean()
      .exec()

    return NextResponse.json({
      success: true,
      terminals: terminals.map(t => t.sessionId)
    })
  } catch (error) {
    console.error('Error fetching terminals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch terminals' },
      { status: 500 }
    )
  }
}

// Create a new terminal session
export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const projectId = body.projectId || '000000000000000000000000' // Use a default MongoDB ObjectId
    const providedSessionId = body.sessionId // Use provided sessionId if available

    // Connect to database
    await connectToDatabase()

    // Create a new terminal session
    const sessionId = providedSessionId || randomUUID()
    
    // Check if a terminal with this ID already exists
    if (providedSessionId) {
      const existingTerminal = await TerminalSession.findOne({ sessionId })
      if (existingTerminal) {
        return NextResponse.json({
          success: true,
          terminal: {
            id: sessionId
          }
        })
      }
    }

    const terminalSession = new TerminalSession({
      sessionId,
      name: `Terminal ${sessionId.substring(0, 8)}`,
      status: 'active',
      currentDirectory: '/',
      projectId: new ObjectId(projectId), // Ensure projectId is always an ObjectId
      history: [],
      environment: {},
      metadata: {
        createdBy: session.user.email || session.user.id,
        purpose: 'User terminal session'
      }
    })

    await terminalSession.save()

    return NextResponse.json({
      success: true,
      terminal: {
        id: sessionId
      }
    })
  } catch (error) {
    console.error('Error creating terminal:', error)
    return NextResponse.json(
      { error: 'Failed to create terminal' },
      { status: 500 }
    )
  }
}

// Delete a terminal session
export async function DELETE(request: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const terminalId = searchParams.get('terminalId')

    if (!terminalId) {
      return NextResponse.json(
        { error: 'Terminal ID is required' },
        { status: 400 }
      )
    }

    // Connect to database
    await connectToDatabase()

    // Delete the terminal session
    const result = await TerminalSession.deleteOne({ sessionId: terminalId })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Terminal not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting terminal:', error)
    return NextResponse.json(
      { error: 'Failed to delete terminal' },
      { status: 500 }
    )
  }
} 
