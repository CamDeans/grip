import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise, { DB_NAME } from '@/lib/db'
import { ObjectId } from 'mongodb'
import archiver from 'archiver'
import { getProjectFilesForExport } from '@/lib/services/exportService'

/**
 * GET /api/projects/[id]/download
 * Returns a ZIP of GRIP-generated files only (projectFiles). GitHub repo is reference only—not included.
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

    const client = await clientPromise
    const db = client.db(DB_NAME)
    
    // Check if this is a sandbox project
    let project = await db.collection('projects').findOne(
      { _id: new ObjectId(projectId) },
      { projection: { title: 1, userId: 1 } }
    ) as { title?: string; userId?: unknown } | null
    
    let isSandbox = false
    if (!project) {
      // Try sandbox projects
      const sandboxProject = await db.collection('sandboxProjects').findOne(
        { _id: new ObjectId(projectId) },
        { projection: { title: 1, userId: 1 } }
      ) as { title?: string; userId?: unknown } | null
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

    // Use appropriate export function. Main projects: gripOnly so ZIP contains only GRIP-generated files (repo is reference only).
    const filesArray = isSandbox
      ? await (await import('@/lib/services/legalSandboxService')).getLegalSandboxFilesForExport(projectId)
      : await getProjectFilesForExport(projectId, { gripOnly: true })
    if (!filesArray.length) {
      return NextResponse.json(
        { error: 'No files to download. Run the plan and build to generate files, or add files in Develop.' },
        { status: 400 }
      )
    }

    const zipFilename =
      (project.title || 'grip-project')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .slice(0, 50) + '.zip'

    const archive = archiver('zip', { zlib: { level: 6 } })
    const chunks: Buffer[] = []
    archive.on('data', (chunk: Buffer) => chunks.push(chunk))

    const body = await new Promise<Buffer>((resolve, reject) => {
      archive.on('end', () => resolve(Buffer.concat(chunks)))
      archive.on('error', reject)
      for (const { path, content } of filesArray) {
        archive.append(Buffer.from(content, 'utf8'), { name: path })
      }
      archive.finalize()
    })

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Content-Length': String(body.length),
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Download failed' },
      { status: 500 }
    )
  }
}
