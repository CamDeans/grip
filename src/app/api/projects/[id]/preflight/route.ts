import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise, { DB_NAME } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { getProjectFilesForExport } from '@/lib/services/exportService'
import { validatePackageJsonForStackBlitz } from '@/lib/services/packageJsonRequirementsService'
import { getNativeMobileRepoCategory } from '@/lib/repoTypeDetection'

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
      { projection: { userId: 1, repository: 1, exportedRepoUrl: 1, repositoryAnalysis: 1, runTarget: 1 } }
    ) as { userId?: unknown; repository?: { owner: string; name: string }; exportedRepoUrl?: string; repositoryAnalysis?: { structuredAnalysis?: { identity?: { project_type?: string } } }; runTarget?: 'stackblitz' | 'local' } | null

    let isSandbox = false
    if (!project) {
      const sandboxProject = await db.collection('sandboxProjects').findOne(
        { _id: new ObjectId(projectId) },
        { projection: { userId: 1, repository: 1, repositoryAnalysis: 1, runTarget: 1 } }
      ) as { userId?: unknown; repository?: { owner: string; name: string }; repositoryAnalysis?: { structuredAnalysis?: { identity?: { project_type?: string } } }; runTarget?: 'stackblitz' | 'local' } | null
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
      const runTarget = project?.runTarget ?? 'stackblitz'
      if (runTarget === 'local') {
        errors.push('This project is set for local/IDE development. Use Export to GitHub or Download project, then run in your terminal (e.g. npm run dev) or open in VS Code/Cursor.')
        suggestions.push('Export or download the project, then run locally in your preferred environment.')
      } else {
        const ra = project?.repositoryAnalysis
        const nativeMobile = getNativeMobileRepoCategory({
          identity: ra?.structuredAnalysis?.identity,
          project_type: ra?.structuredAnalysis?.identity?.project_type,
        })
        if (nativeMobile === 'ios_swift') {
          errors.push('This project is native iOS (Swift/SwiftUI). StackBlitz cannot run it. Use Export to GitHub and open in Xcode to run on simulator or device.')
          suggestions.push('Export the project, then open the repo in Xcode to build and run.')
        } else if (nativeMobile === 'android_kotlin') {
          errors.push('This project is native Android (Kotlin/Java). StackBlitz cannot run it. Use Export to GitHub and open in Android Studio to run on emulator or device.')
          suggestions.push('Export the project, then open the repo in Android Studio to build and run.')
        } else {
          const filesArray = isSandbox
            ? await (await import('@/lib/services/legalSandboxService')).getLegalSandboxFilesForExport(projectId)
            : await getProjectFilesForExport(projectId, { gripOnly: true })
          if (!filesArray.length) {
            errors.push('No files to run. Run the plan and build to generate files, or add files in Develop.')
            suggestions.push('Use Overview automation to generate files, or use Develop to generate and save files.')
          } else {
            const validation = validatePackageJsonForStackBlitz(filesArray)
            if (!validation.ok) {
              errors.push(...validation.errors)
              suggestions.push(...validation.suggestions)
            }
          }
        }
      }
    }

    if (target === 'export') {
      const filesArray = isSandbox
        ? await (await import('@/lib/services/legalSandboxService')).getLegalSandboxFilesForExport(projectId)
        : await getProjectFilesForExport(projectId, { gripOnly: true })
      if (!filesArray.length) {
        errors.push('No files to export. Run the plan and build to generate files, or add files in Develop.')
        suggestions.push('Use Overview automation to generate files, or use Develop to generate and save files.')
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
