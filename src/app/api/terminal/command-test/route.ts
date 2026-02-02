import { NextResponse } from 'next/server'
import { TerminalService } from '@/lib/services/terminalService'
import { connectToDatabase } from '@/lib/mongodb'
import { TerminalSession } from '@/lib/models/TerminalSession'
import { getServerAuthSession } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import { ObjectId } from 'mongodb'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Test endpoint for Terminal Command Interpreter
 * Part of Phase 6, Step 2 of the G.R.I.P. Enhancement Plan
 */
export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { command, projectId } = body

    if (!command) {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 })
    }

    const actualProjectId = projectId || new ObjectId()

    // Connect to database
    await connectToDatabase()

    // Create or find temporary test session
    let terminal = await TerminalSession.findOne({ 
      'metadata.purpose': 'command-test', 
      'metadata.createdBy': session.user.email 
    })

    if (!terminal) {
      // Create a new test terminal session
      terminal = new TerminalSession({
        projectId: actualProjectId,
        sessionId: `test-${uuidv4()}`,
        name: 'Command Test Terminal',
        status: 'active',
        currentDirectory: '/home/user',
        environment: {},
        history: [],
        metadata: {
          createdBy: session.user.email,
          purpose: 'command-test',
        },
        lastActive: new Date(),
      })
      
      await terminal.save()
    }

    // Execute the command 
    const result = await TerminalService.executeCommand(terminal.sessionId, command)

    return NextResponse.json({
      success: true,
      command,
      result: {
        output: result.output,
        exitCode: result.exitCode,
        duration: result.duration,
        clear: result.clear || false,
        newDirectory: result.newDirectory,
      },
      currentDirectory: terminal.currentDirectory,
      availableCommands: Array.from(TerminalService.getAvailableCommands().keys()),
    })
  } catch (error) {
    console.error('Error testing terminal command:', error)
    return NextResponse.json(
      { error: 'Failed to execute terminal command', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 