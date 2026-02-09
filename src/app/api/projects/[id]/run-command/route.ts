import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { isProjectCommandAllowed, runCommandInPath } from '@/lib/projectCommand'

/**
 * POST /api/projects/[id]/run-command
 * Run a command (e.g. npm install, npm run build) in the project's local path.
 * Requires projectPath to be set (e.g. via project setup or export to a local folder).
 * Stores output in project.lastRunOutput; on failure also sets lastRunErrors so GRIP sees them.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    if (!projectId || !ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const command = typeof body.command === 'string' && body.command.trim()
      ? body.command.trim()
      : 'npm install && npm run build'

    // Allow compound commands (e.g. npm install && npm run build) by checking first part
    const firstPart = command.split(/\s+/)[0]?.toLowerCase()
    const allowed = firstPart === 'npm' || firstPart === 'yarn' || firstPart === 'pnpm'
      ? true
      : isProjectCommandAllowed(command).allowed
    if (!allowed) {
      return NextResponse.json(
        { error: 'Command not allowed. Use npm/yarn/pnpm install, run, build, start, test, etc.' },
        { status: 403 }
      )
    }

    const client = await clientPromise
    const db = client.db()
    const project = await db.collection('projects').findOne(
      { _id: new ObjectId(projectId) },
      { projection: { userId: 1, projectPath: 1 } }
    ) as { userId?: unknown; projectPath?: string } | null

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (project.userId != null && String(project.userId) !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const projectPath = project.projectPath
    if (!projectPath) {
      return NextResponse.json(
        {
          error: 'Run & Debug requires a local project path.',
          code: 'NO_PROJECT_PATH',
          hint: 'Export your project (Download or Export to GitHub), then run commands in your terminal. You can paste build/run errors here and use "Send run errors to GRIP" so GRIP can fix them. Or set up a local path in project settings if supported.',
        },
        { status: 501 }
      )
    }

    const result = await runCommandInPath(projectPath, command)

    const lastRunOutput = {
      command,
      output: result.output,
      exitCode: result.exitCode,
      duration: result.duration,
      timestamp: new Date(),
    }

    const update: Record<string, unknown> = {
      lastRunOutput,
      updatedAt: new Date(),
    }

    if (result.exitCode !== 0) {
      const raw = result.output
      const lines = raw.split(/\r?\n/)
      const errors: string[] = []
      for (const line of lines) {
        const trimmed = line.trim()
        if (
          /^ERROR\s/i.test(trimmed) || /Error in\s/i.test(trimmed) || /ENOENT:/i.test(trimmed) ||
          /Syntax error:/i.test(trimmed) || /Module not found/i.test(trimmed) || /Cannot find module/i.test(trimmed) ||
          /\.tsx?:\d+:\d+/i.test(trimmed) || /\.jsx?:\d+:\d+/i.test(trimmed)
        ) {
          errors.push(trimmed)
        }
      }
      if (errors.length === 0 && raw.length > 0 && raw.length < 10000) {
        errors.push(raw.slice(0, 2000))
      }
      const projectDoc = await db.collection('projects').findOne(
        { _id: new ObjectId(projectId) },
        { projection: { runErrorsSubmissionCount: 1 } }
      ) as { runErrorsSubmissionCount?: number } | null
      const submissionIndex = ((projectDoc?.runErrorsSubmissionCount ?? 0) + 1)
      update.lastRunErrors = {
        source: 'terminal',
        errors,
        submissionIndex,
        raw: raw.slice(0, 15000),
        at: new Date(),
      }
      await db.collection('projects').updateOne(
        { _id: new ObjectId(projectId) },
        { $set: update, $inc: { runErrorsSubmissionCount: 1 } }
      )
    } else {
      await db.collection('projects').updateOne(
        { _id: new ObjectId(projectId) },
        { $set: update }
      )
    }

    return NextResponse.json({
      output: result.output,
      exitCode: result.exitCode,
      duration: result.duration,
      stored: true,
    })
  } catch (error) {
    console.error('Run-command error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Run command failed' },
      { status: 500 }
    )
  }
}
