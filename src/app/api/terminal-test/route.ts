import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { connectToDatabase } from '@/lib/mongodb'
import { TerminalSession } from '@/lib/models/TerminalSession'
import { ObjectId } from 'mongodb'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_: Request) {
  try {
    // Connect to database
    console.log('Connecting to database from test route...')
    await connectToDatabase()
    console.log('Connected to database successfully')

    // Test creating a terminal session
    const sessionId = randomUUID()
    console.log('Generated session ID:', sessionId)
    
    console.log('Creating test terminal session...')
    const terminalSession = new TerminalSession({
      sessionId,
      name: `Test Terminal ${sessionId.substring(0, 8)}`,
      status: 'active',
      currentDirectory: '/',
      projectId: new ObjectId(),
      history: [],
      environment: {},
      metadata: {
        createdBy: 'test-user',
        purpose: 'Terminal API test'
      }
    })

    console.log('Saving terminal session...')
    await terminalSession.save()
    console.log('Terminal session saved successfully')

    return NextResponse.json({
      success: true,
      message: 'Terminal created successfully',
      terminalId: sessionId,
      time: new Date().toISOString()
    })
  } catch (error) {
    console.error('Terminal test error:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available')
    
    return NextResponse.json(
      { 
        error: 'Terminal test failed', 
        message: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : typeof error,
        time: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 