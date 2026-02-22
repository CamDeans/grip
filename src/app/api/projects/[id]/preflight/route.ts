import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise, { DB_NAME } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { getProjectFilesForExport } from '@/lib/services/exportService'
import { validatePackageJsonForStackBlitz } from '@/lib/services/packageJsonRequirementsService'

/**
 * GET /api/projects/[id]/preflight?target=stackblitz|export|deploy&record=1
 * Validates that the project is ready for the target (StackBlitz, export, or deploy).
 * If record=1 and validation fails, stores lastPreflight on the project so chat context can show it.
 * If record=1 and validation passes, clears lastPreflight.
 */
export async function GET(
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

    const { searchParams } = new URL(request.url)
    const target = (searchParams.get('target') || 'stackblitz') as 'stackblitz' | 'export' | 'deploy'
    const record = searchParams.get('record') === '1'

    const client = await clientPromise
    const db = client.db(DB_NAME)
    
    // Check if this is a sandbox project
    let project = await db.collection('projects').findOne(
      { _id: new ObjectId(projectId) },
      { projection: { userId: 1, repository: 1, exportedRepoUrl: 1 } }
    ) as { userId?: unknown; repository?: { owner: string; name: string }; exportedRepoUrl?: string } | null
    
    let isSandbox = false
    if (!project) {
      // Try sandbox projects
      const sandboxProject = await db.collection('sandboxProjects').findOne(
        { _id: new ObjectId(projectId) },
        { projection: { userId: 1, repository: 1 } }
      ) as { userId?: unknown; repository?: { owner: string; name: string } } | null
      if (sandboxProject) {
        project = sandboxProject
        isSandbox = true
      }
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    const projectUserId = project.userId != null ? String(project.userId) : null
    if (projectUserId && projectUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const errors: string[] = []
    const suggestions: string[] = []

    if (target === 'stackblitz') {
      const filesArray = isSandbox
        ? await (await import('@/lib/services/legalSandboxService')).getLegalSandboxFilesForExport(projectId)
        : await getProjectFilesForExport(projectId, { gripOnly: true })
      if (!filesArray.length) {
        errors.push('No files to run. Add generated files in Develop (chat) or link a repo.')
        suggestions.push('Use GRIP in Develop to generate code and save files to the project, or connect a GitHub repo.')
      } else {
        const validation = validatePackageJsonForStackBlitz(filesArray)
        if (!validation.ok) {
          errors.push(...validation.errors)
          suggestions.push(...validation.suggestions)
        }
      }
    }

    if (target === 'export') {
      const filesArray = isSandbox
        ? await (await import('@/lib/services/legalSandboxService')).getLegalSandboxFilesForExport(projectId)
        : await getProjectFilesForExport(projectId)
      if (!filesArray.length) {
        errors.push('No files to export. Add generated files or link a repo.')
        suggestions.push('Use Develop to generate and save files, or connect a GitHub repo.')
      }
    }

    if (target === 'deploy') {
      if (!project?.repository?.owner && !('exportedRepoUrl' in project && project.exportedRepoUrl)) {
        errors.push('Deploy requires a linked GitHub repo or an exported repo.')
        suggestions.push('Link a repo in Settings, or use "Export to GitHub" first.')
      }
    }

    const ok = errors.length === 0

    if (record) {
      const lastPreflight = ok
        ? null
        : {
            target,
            ok: false,
            errors: [...errors],
            suggestions: [...suggestions],
            at: new Date().toISOString(),
          }
      // Update the appropriate collection based on project type
      const collection = isSandbox ? 'sandboxProjects' : 'projects'
      await db.collection(collection).updateOne(
        { _id: new ObjectId(projectId) },
        { $set: { lastPreflight, updatedAt: new Date() } }
      )
    }

    return NextResponse.json({
      ok,
      target,
      errors,
      suggestions,
      summary: ok ? undefined : `Project is not ready for ${target}. Fix the issues below, then try again.`,
    })
  } catch (error) {
    console.error('Preflight error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Preflight failed' },
      { status: 500 }
    )
  }
}
