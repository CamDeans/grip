import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise, { DB_NAME } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { createSandboxProject } from '@/lib/services/sandboxProjectService'
import { listProjectFiles } from '@/lib/services/fileStorageService'
import { upsertLegalSandboxFile } from '@/lib/services/legalSandboxService'

/**
 * POST /api/projects/[id]/create-sandbox
 * Creates a sandbox experiment from a main project.
 * Copies project metadata and optionally files to the sandbox.
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

    const { id: mainProjectId } = await params
    if (!mainProjectId || !ObjectId.isValid(mainProjectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { title, copyFiles = false } = body

    const client = await clientPromise
    const db = client.db(DB_NAME)

    // Get main project
    const mainProject = await db.collection('projects').findOne({
      _id: new ObjectId(mainProjectId),
      userId: session.user.id,
    })

    if (!mainProject) {
      return NextResponse.json({ error: 'Main project not found' }, { status: 404 })
    }

    // Create sandbox project with experiment naming
    const sandboxTitle = title || `${mainProject.title} (Experiment ${new Date().toLocaleDateString()})`
    const sandboxProject = await createSandboxProject({
      userId: session.user.id,
      title: sandboxTitle,
      description: mainProject.description 
        ? `${mainProject.description}\n\n[Sandbox Experiment - Safe environment for testing new features or architecture]`
        : 'Sandbox experiment environment for safe testing and experimentation.',
      repository: mainProject.repository || null,
      ideation: mainProject.ideation || {
        goals: '',
        targetAudience: '',
        keyFeatures: '',
        technicalRequirements: '',
      },
      parentProjectId: mainProjectId, // Link to main project for experiment tracking
    })

    // Optionally copy files from main project to sandbox
    if (copyFiles) {
      const mainFiles = await listProjectFiles(mainProjectId)
      for (const file of mainFiles) {
        const fullPath = file.path ? `${file.path}/${file.filename}` : file.filename
        const content = file.content || ''
        await upsertLegalSandboxFile(sandboxProject._id.toString(), fullPath, content)
      }
    }

    return NextResponse.json({
      sandboxProject: {
        _id: sandboxProject._id,
        title: sandboxProject.title,
        description: sandboxProject.description,
        repository: sandboxProject.repository,
        ideation: sandboxProject.ideation,
        parentProjectId: sandboxProject.parentProjectId,
        isSandbox: true,
      },
    })
  } catch (error) {
    console.error('Error creating sandbox:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create sandbox' },
      { status: 500 }
    )
  }
}
