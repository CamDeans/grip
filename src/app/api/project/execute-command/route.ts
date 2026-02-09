import { NextResponse } from 'next/server'
import { isProjectCommandAllowed, runCommandInPath } from '@/lib/projectCommand'

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

    const { allowed } = isProjectCommandAllowed(command)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Command not allowed. Allowed: mkdir, cd, ls, pwd, and npm/yarn/pnpm install, run, start, test, build, etc.' },
        { status: 403 }
      )
    }

    const result = await runCommandInPath(basePath, command)

    if (result.exitCode !== 0) {
      return NextResponse.json({
        success: false,
        error: result.output
      })
    }

    return NextResponse.json({
      success: true,
      output: result.output
    })

  } catch (error: any) {
    console.error('Error in execute-command:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
} 
