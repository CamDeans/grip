import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const ALLOWED_COMMANDS = ['mkdir', 'cd', 'ls', 'pwd']

export async function POST(request: Request) {
  try {
    const { command, path: basePath } = await request.json()

    if (!command) {
      return NextResponse.json(
        { error: 'Command is required' },
        { status: 400 }
      )
    }

    if (!basePath) {
      return NextResponse.json(
        { error: 'Base path is required' },
        { status: 400 }
      )
    }

    // Validate command
    const commandBase = command.split(' ')[0]
    if (!ALLOWED_COMMANDS.includes(commandBase)) {
      return NextResponse.json(
        { error: 'Command not allowed' },
        { status: 403 }
      )
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: basePath,
        timeout: 5000 // 5 second timeout
      })

      if (stderr) {
        return NextResponse.json({
          success: false,
          error: stderr
        })
      }

      return NextResponse.json({
        success: true,
        output: stdout
      })

    } catch (execError: any) {
      // Handle timeout
      if (execError.code === 'ETIMEDOUT') {
        return NextResponse.json(
          { error: 'Command timed out' },
          { status: 408 }
        )
      }

      // Handle other execution errors
      return NextResponse.json(
        { error: execError.message || 'Command execution failed' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Error in execute-command:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
} 
