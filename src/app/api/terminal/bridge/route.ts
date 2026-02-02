import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { TerminalSession } from '@/lib/models/TerminalSession'
import { getServerAuthSession } from '@/lib/auth'
import { TerminalChatBridgeService } from '@/lib/services/terminalChatBridgeService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Terminal-Chat Bridge API Endpoint
 * Part of Phase 6, Step 4 of G.R.I.P. Enhancement Plan
 * 
 * This endpoint bridges terminal commands/outputs with the chat interface, allowing:
 * - Storing terminal interactions for chat context
 * - Executing terminal commands from the chat
 * - Synchronizing terminal state with chat UI
 */

// Store a terminal command in the chat context
export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { 
      projectId, 
      terminalId, 
      command,
      output,
      exitCode
    } = body
    
    if (!projectId || !terminalId || !command) {
      return NextResponse.json({ 
        error: 'Project ID, Terminal ID, and command are required' 
      }, { status: 400 })
    }
    
    // Share the command with chat using the service
    const result = await TerminalChatBridgeService.shareCommand({
      terminalId,
      projectId,
      command,
      output: output || '',
      exitCode,
      userId: session.user.id || session.user.email || 'unknown'
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error bridging terminal with chat:', error)
    return NextResponse.json(
      { 
        error: 'Failed to bridge terminal with chat',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// Execute a command from the chat interface
export async function PUT(request: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { terminalId, command } = body
    
    if (!terminalId || !command) {
      return NextResponse.json({ 
        error: 'Terminal ID and command are required' 
      }, { status: 400 })
    }
    
    // Execute the command using the service
    const result = await TerminalChatBridgeService.executeCommand({
      terminalId,
      command,
      userId: session.user.id || session.user.email || 'unknown'
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error executing command from chat:', error)
    return NextResponse.json(
      { 
        error: 'Failed to execute command from chat',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// WebSocket connection handler
export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const terminalId = searchParams.get('terminalId')
    
    if (!terminalId) {
      return NextResponse.json({ 
        error: 'Terminal ID is required' 
      }, { status: 400 })
    }
    
    // Upgrade to WebSocket
    const { socket, response } = await upgradeToWebSocket(request)
    
    // Initialize WebSocket connection
    await TerminalChatBridgeService.initializeWebSocket(terminalId, socket)
    
    return response
  } catch (error) {
    console.error('Error establishing WebSocket connection:', error)
    return NextResponse.json(
      { 
        error: 'Failed to establish WebSocket connection',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// Helper function to upgrade HTTP request to WebSocket
async function upgradeToWebSocket(request: Request) {
  const { socket, response } = await Deno.upgradeWebSocket(request)
  return { socket, response }
} 