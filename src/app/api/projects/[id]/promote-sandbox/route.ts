import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { getSandboxProject } from '@/lib/services/sandboxProjectService'
import { listLegalSandboxFiles } from '@/lib/services/legalSandboxService'
import { saveProjectFile } from '@/lib/services/gripProjectActions'

/**
 * POST /api/projects/[id]/promote-sandbox
 * Promotes files from a sandbox experiment to its parent main project.
 * Copies all files from legalSandboxFiles to projectFiles.
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

    const { id: sandboxProjectId } = await params
    if (!sandboxProjectId || !ObjectId.isValid(sandboxProjectId)) {
      return NextResponse.json({ error: 'Invalid sandbox project ID' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { overwrite = false } = body // Option to overwrite existing files in main project

    // Get sandbox project
    const sandboxProject = await getSandboxProject(sandboxProjectId)
    if (!sandboxProject) {
      return NextResponse.json({ error: 'Sandbox project not found' }, { status: 404 })
    }

    // Verify user owns the sandbox
    if (sandboxProject.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify sandbox has a parent project
    if (!sandboxProject.parentProjectId) {
      return NextResponse.json(
        { error: 'This sandbox is not linked to a main project' },
        { status: 400 }
      )
    }

    const mainProjectId = sandboxProject.parentProjectId.toString()

    // Verify main project exists and user owns it
    const client = await clientPromise
    const db = client.db('test')
    const mainProject = await db.collection('projects').findOne({
      _id: new ObjectId(mainProjectId),
      userId: session.user.id,
    })

    if (!mainProject) {
      return NextResponse.json({ error: 'Main project not found' }, { status: 404 })
    }

    // Get all files from sandbox
    const sandboxFiles = await listLegalSandboxFiles(sandboxProjectId)
    if (sandboxFiles.length === 0) {
      return NextResponse.json(
        { error: 'No files to promote. The sandbox is empty.' },
        { status: 400 }
      )
    }

    // Copy files to main project
    const promotedFiles: string[] = []
    const skippedFiles: string[] = []
    const errors: string[] = []

    for (const file of sandboxFiles) {
      try {
        const fullPath = file.path ? `${file.path}/${file.filename}` : file.filename
        const content = file.content || ''

        // Check if file exists in main project (if overwrite is false)
        if (!overwrite) {
          const existingFiles = await db
            .collection('projectFiles')
            .find({
              projectId: new ObjectId(mainProjectId),
              path: file.path || '',
              filename: file.filename,
            })
            .toArray()

          if (existingFiles.length > 0) {
            skippedFiles.push(fullPath)
            continue
          }
        }

        // Save file to main project
        const result = await saveProjectFile(mainProjectId, fullPath, content)
        if (result.ok) {
          promotedFiles.push(fullPath)
        } else {
          errors.push(`${fullPath}: ${result.error || 'Failed to save'}`)
        }
      } catch (fileErr) {
        const fullPath = file.path ? `${file.path}/${file.filename}` : file.filename
        errors.push(`${fullPath}: ${fileErr instanceof Error ? fileErr.message : 'Unknown error'}`)
      }
    }

    // Update main project's updatedAt timestamp
    await db.collection('projects').updateOne(
      { _id: new ObjectId(mainProjectId) },
      { $set: { updatedAt: new Date() } }
    )

    return NextResponse.json({
      success: true,
      promotedFiles,
      skippedFiles,
      errors,
      summary: {
        total: sandboxFiles.length,
        promoted: promotedFiles.length,
        skipped: skippedFiles.length,
        errors: errors.length,
      },
    })
  } catch (error) {
    console.error('Error promoting sandbox:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to promote sandbox' },
      { status: 500 }
    )
  }
}
