/**
 * POST /api/projects/[id]/run-build
 * Runs the project build (npm install + npm run build) using GRIP project files.
 * Used by the overview automation so the in-flight toast stays until build completes.
 * Same logic as enhanced-chat runBuildAndPersistErrors → runMainProject.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/mongodb'
import { runMainProject } from '@/lib/runMainProject'
import { gripLog } from '@/lib/gripLogger'
import { getNativeMobileRepoCategory } from '@/lib/repoTypeDetection'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    if (!projectId || !ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    console.info('[GRIP Stage 5] run-build start', { projectId })
    gripLog(5, 'run-build start', { projectId })
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')
    let project = await db.collection('projects').findOne(
      { _id: new ObjectId(projectId) },
      { projection: { _id: 1, userId: 1, repositoryAnalysis: 1 } }
    )
    let isSandbox = false
    if (!project) {
      project = await db.collection('sandboxProjects').findOne(
        { _id: new ObjectId(projectId) },
        { projection: { _id: 1, userId: 1, repositoryAnalysis: 1 } }
      )
      if (project) isSandbox = true
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const projectUserId = (project as { userId?: string }).userId
    if (projectUserId && projectUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ra = (project as { repositoryAnalysis?: { structuredAnalysis?: { identity?: { project_type?: string } } } }).repositoryAnalysis
    const nativeMobile = getNativeMobileRepoCategory({
      identity: ra?.structuredAnalysis?.identity,
      project_type: ra?.structuredAnalysis?.identity?.project_type,
    })
    if (nativeMobile === 'ios_swift') {
      console.info('[GRIP Stage 5] run-build skipped (native iOS)', { projectId })
      gripLog(5, 'run-build skipped (native iOS)', { projectId })
      return NextResponse.json({
        success: true,
        errors: [],
        output: '',
        buildCommand: 'N/A (native iOS)',
        nativeMobile: true,
        message: 'Native iOS: no server build. Export to GitHub and open in Xcode to run.',
      })
    }
    if (nativeMobile === 'android_kotlin') {
      console.info('[GRIP Stage 5] run-build skipped (native Android)', { projectId })
      gripLog(5, 'run-build skipped (native Android)', { projectId })
      return NextResponse.json({
        success: true,
        errors: [],
        output: '',
        buildCommand: 'N/A (native Android)',
        nativeMobile: true,
        message: 'Native Android: no server build. Export to GitHub and open in Android Studio to run.',
      })
    }

    const result = await runMainProject(projectId, isSandbox)
    console.info('[GRIP Stage 5] run-build complete', { projectId, success: result.success, errorCount: result.errors?.length ?? 0 })
    gripLog(5, 'run-build complete', { projectId, success: result.success, errorCount: result.errors?.length ?? 0 })

    // Persist lastRunErrors on project so enhanced chat can show them later
    const projectCollection = isSandbox ? 'sandboxProjects' : 'projects'
    if (!result.success && result.errors.length > 0) {
      await db.collection(projectCollection).updateOne(
        { _id: new ObjectId(projectId) },
        {
          $set: {
            lastRunErrors: {
              source: 'terminal',
              errors: result.errors,
              raw: (result.output ?? result.errors.join('\n')).slice(0, 15000),
              at: new Date(),
            },
            updatedAt: new Date(),
          },
        }
      )
    } else if (result.success) {
      await db.collection(projectCollection).updateOne(
        { _id: new ObjectId(projectId) },
        { $unset: { lastRunErrors: '' }, $set: { updatedAt: new Date() } }
      )
    }

    // Contract for fix-build: always return both errors and output so fix-build gets full error context (see CONCRETE-RULES and .cursorrules autonomous_build_fix).
    return NextResponse.json({
      success: result.success,
      errors: result.errors,
      output: result.output ?? '',
      buildCommand: result.buildCommand ?? 'npm run build',
    })
  } catch (error) {
    gripLog(5, 'run-build error', { error: error instanceof Error ? error.message : String(error) })
    console.error('[GRIP Stage 5] run-build error:', error)
    return NextResponse.json(
      { error: 'Build run failed', success: false, errors: [String(error)] },
      { status: 500 }
    )
  }
}
