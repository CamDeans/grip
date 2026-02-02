import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { TerminalSession } from '@/lib/models/TerminalSession'
import { getServerAuthSession } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import { TerminalService } from '@/lib/services/terminalService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Get terminal command history or execute a command
export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const terminalId = searchParams.get('terminalId')

    if (!terminalId) {
      return NextResponse.json({ error: 'Terminal ID is required' }, { status: 400 })
    }

    await connectToDatabase()
    
    const terminal = await TerminalSession.findOne({ sessionId: terminalId })
    
    if (!terminal) {
      return NextResponse.json({ error: 'Terminal not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      history: terminal.history || [],
      currentDirectory: terminal.currentDirectory
    })
  } catch (error) {
    console.error('Error fetching terminal history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch terminal history' },
      { status: 500 }
    )
  }
}

// Execute a command in the terminal
export async function PUT(request: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { terminalId, command } = body

    if (!terminalId || !command) {
      return NextResponse.json({ error: 'Terminal ID and command are required' }, { status: 400 })
    }

    // Connect to the database
    await connectToDatabase()
    
    // Find the terminal session
    let terminal = await TerminalSession.findOne({ sessionId: terminalId })
    
    if (!terminal) {
      return NextResponse.json({ error: 'Terminal not found' }, { status: 404 })
    }
    
    // Execute the command using the TerminalService
    const result = await TerminalService.executeCommand(terminalId, command)
    
    // Add the command to the history
    terminal.history.push({
      command,
      output: result.output,
      exitCode: result.exitCode,
      timestamp: new Date(),
      duration: result.duration
    })
    
    // Update the terminal session
    terminal.lastActive = new Date()
    await terminal.save()
    
    return NextResponse.json({ 
      success: true,
      output: result.output,
      exitCode: result.exitCode,
      duration: result.duration,
      currentDirectory: terminal.currentDirectory,
      clear: result.clear || false
    })
  } catch (error) {
    console.error('Error executing terminal command:', error)
    return NextResponse.json(
      { error: 'Failed to execute terminal command' },
      { status: 500 }
    )
  }
} 
