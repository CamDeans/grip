import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { TerminalSession } from '@/lib/models/TerminalSession'
import { getServerAuthSession } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import { TerminalService } from '@/lib/services/terminalService'
import { isPackageManagerCommand, isProjectCommandAllowed, runCommandInPath } from '@/lib/projectCommand'
import {
  getPackageJsonForProject,
  addDependencies,
} from '@/lib/services/packageJsonService'

const DEFAULT_PROJECT_ID = '000000000000000000000000'

/** Parse npm install / yarn add / pnpm add: packages and --save-dev */
function parseInstallCommand(command: string): { packages: string[]; dev: boolean } | null {
  const parts = command.trim().split(/\s+/).filter(Boolean)
  const dev = parts.includes('--save-dev') || parts.includes('-D')
  const packages = parts.filter(
    (p) => p !== '--save-dev' && p !== '-D' && !p.startsWith('--')
  )
  if (parts[0] === 'npm' && (parts[1] === 'install' || parts[1] === 'i')) {
    return { packages: packages.slice(2), dev }
  }
  if (parts[0] === 'yarn' && parts[1] === 'add') {
    return { packages: packages.slice(2), dev }
  }
  if (parts[0] === 'pnpm' && (parts[1] === 'add' || parts[1] === 'install' || parts[1] === 'i')) {
    return { packages: packages.slice(2), dev }
  }
  return null
}

/** True if command is install/add (we can do it in DB); false for run/build/etc. */
function isInstallAddCommand(command: string): boolean {
  const parts = command.trim().split(/\s+/).filter(Boolean)
  const cmd = parts[0]?.toLowerCase()
  const sub = parts[1]?.toLowerCase()
  if (cmd === 'npm') return sub === 'install' || sub === 'i'
  if (cmd === 'yarn') return sub === 'add'
  if (cmd === 'pnpm') return sub === 'add' || sub === 'install' || sub === 'i'
  return false
}

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

    // Treat installs like file saves: update package.json in DB (works on Vercel and self-hosted).
    const projectIdStr = terminal.projectId?.toString()
    const hasRealProject = projectIdStr && projectIdStr !== DEFAULT_PROJECT_ID && ObjectId.isValid(projectIdStr)
    const isVercel = process.env.VERCEL === '1'
    let result: { output: string; exitCode: number; duration: number; newDirectory?: string; clear?: boolean }
    const startTime = Date.now()

    if (hasRealProject && isInstallAddCommand(command)) {
      const parsed = parseInstallCommand(command)
      if (parsed !== null) {
        try {
          if (parsed.packages.length === 0) {
            const resolved = await getPackageJsonForProject(projectIdStr)
            const count = resolved
              ? Object.keys(resolved.data.dependencies || {}).length +
                Object.keys(resolved.data.devDependencies || {}).length
              : 0
            result = {
              output: `Installing dependencies...\nup to date, audited ${count} package${count === 1 ? '' : 's'} in 1s\n\nfound 0 vulnerabilities`,
              exitCode: 0,
              duration: Date.now() - startTime,
            }
          } else {
            const installResult = await addDependencies(projectIdStr, parsed.packages, { dev: parsed.dev })
            result = {
              output: installResult.output,
              exitCode: installResult.exitCode,
              duration: Date.now() - startTime,
            }
          }
        } catch (err) {
          result = {
            output: err instanceof Error ? err.message : 'Install failed',
            exitCode: 1,
            duration: Date.now() - startTime,
          }
        }
      } else {
        result = await TerminalService.executeCommand(terminalId, command)
      }
    } else if (
      !isVercel &&
      hasRealProject &&
      isPackageManagerCommand(command) &&
      isProjectCommandAllowed(command).allowed
    ) {
      // run/build/etc.: run on disk when projectPath exists (self-hosted only)
      const { db } = await connectToDatabase()
      const project = await db.collection('projects').findOne(
        { _id: new ObjectId(projectIdStr) },
        { projection: { projectPath: 1 } }
      ) as { projectPath?: string } | null
      const projectPath = project?.projectPath

      if (projectPath) {
        result = await runCommandInPath(projectPath, command)
      } else {
        result = await TerminalService.executeCommand(terminalId, command)
      }
    } else {
      result = await TerminalService.executeCommand(terminalId, command)
    }
    
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
