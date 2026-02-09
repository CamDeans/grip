import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const ALLOWED_SYSTEM = ['mkdir', 'cd', 'ls', 'pwd']

const PACKAGE_MANAGER_SUBCOMMANDS: Record<string, string[]> = {
  npm: ['install', 'i', 'run', 'start', 'test', 'build', 'ci', 'exec'],
  yarn: ['install', 'add', 'run', 'start', 'test', 'build', 'exec'],
  pnpm: ['install', 'i', 'add', 'run', 'start', 'test', 'build', 'exec'],
}

export function isProjectCommandAllowed(commandStr: string): { allowed: boolean; timeout?: number } {
  const parts = commandStr.trim().split(/\s+/).filter(Boolean)
  const commandBase = parts[0]?.toLowerCase()
  if (!commandBase) return { allowed: false }

  if (ALLOWED_SYSTEM.includes(commandBase)) {
    return { allowed: true, timeout: 5000 }
  }

  const subcommands = PACKAGE_MANAGER_SUBCOMMANDS[commandBase]
  if (subcommands && parts.length >= 2) {
    const sub = parts[1]?.toLowerCase()
    if (sub && subcommands.includes(sub)) {
      const isInstall = sub === 'install' || sub === 'i'
      return { allowed: true, timeout: isInstall ? 120000 : 60000 }
    }
  }
  return { allowed: false }
}

export function isPackageManagerCommand(commandStr: string): boolean {
  const parts = commandStr.trim().split(/\s+/).filter(Boolean)
  const base = parts[0]?.toLowerCase()
  return base === 'npm' || base === 'yarn' || base === 'pnpm'
}

export interface RunCommandResult {
  output: string
  exitCode: number
  duration: number
}

export async function runCommandInPath(
  basePath: string,
  command: string
): Promise<RunCommandResult> {
  const start = Date.now()
  const { allowed, timeout = 5000 } = isProjectCommandAllowed(command)
  if (!allowed) {
    return {
      output: 'Command not allowed. Allowed: mkdir, cd, ls, pwd, and npm/yarn/pnpm install, run, start, test, build, etc.',
      exitCode: 1,
      duration: Date.now() - start,
    }
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: basePath,
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB for install output
    })
    const out = [stdout, stderr].filter(Boolean).join('\n').trim() || stdout
    return {
      output: out || '(no output)',
      exitCode: 0,
      duration: Date.now() - start,
    }
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string; code?: string }
    const out = [e.stdout, e.stderr, e.message].filter(Boolean).join('\n').trim()
    return {
      output: out || 'Command failed',
      exitCode: e.code === 'ETIMEDOUT' ? 124 : 1,
      duration: Date.now() - start,
    }
  }
}
