import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { getProjectFilesForExport } from '@/lib/services/exportService'

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
    const db = client.db('test')
    
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
      // Use appropriate export function based on project type
      const filesArray = isSandbox
        ? await (await import('@/lib/services/legalSandboxService')).getLegalSandboxFilesForExport(projectId)
        : await getProjectFilesForExport(projectId, { gripOnly: true })
      if (!filesArray.length) {
        errors.push('No files to run. Add generated files in Develop (chat) or link a repo.')
        suggestions.push('Use GRIP in Develop to generate code and save files to the project, or connect a GitHub repo.')
      } else {
        const normalizePath = (p: string) => p.replace(/^\.\//, '').replace(/^\/+/, '').trim()
        const filesMap: Record<string, string> = {}
        for (const { path, content } of filesArray) {
          filesMap[normalizePath(path) || path] = content
        }
        const pkgRaw = filesMap['package.json']
        if (!pkgRaw) {
          errors.push('package.json is required to run in StackBlitz.')
          suggestions.push('Add a package.json (e.g. via GRIP in Develop) so the project can install dependencies and run.')
        } else {
          try {
            JSON.parse(pkgRaw)
          } catch {
            errors.push('package.json has invalid JSON (e.g. missing comma). Fix syntax so the project can run.')
            suggestions.push('In Develop, ask GRIP to fix or regenerate package.json.')
          }
          if (errors.length === 0) {
            try {
              const pkg = JSON.parse(pkgRaw) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
              const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
              if (deps.expo || deps['react-native']) {
                if (!deps['react-native-web'] || !deps['react-dom']) {
                  suggestions.push('Expo/React Native: web deps (react-native-web, react-dom) will be added automatically for StackBlitz.')
                }
              }
            } catch {
              // already caught above
            }
          }
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
