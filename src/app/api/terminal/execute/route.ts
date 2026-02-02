import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

// Update to use the new route segment config format
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const execAsync = promisify(exec)

export async function POST(req: Request) {
  try {
    const { command } = await req.json()
    
    if (!command) {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 })
    }

    const { stdout, stderr } = await execAsync(command)
    
    return NextResponse.json({
      output: stdout,
      error: stderr
    })
  } catch (error) {
    console.error('Error executing command:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute command' },
      { status: 500 }
    )
  }
} 