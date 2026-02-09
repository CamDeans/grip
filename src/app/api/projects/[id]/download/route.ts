import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import archiver from 'archiver'
import { getProjectFilesForExport } from '@/lib/services/exportService'

/**
 * GET /api/projects/[id]/download
 * Returns a ZIP of the full project (repo + projectFiles). No GitHub or terminal needed.
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
    const db = client.db('test')
    const project = await db.collection('projects').findOne(
      { _id: new ObjectId(projectId) },
      { projection: { title: 1, userId: 1 } }
    ) as { title?: string; userId?: unknown } | null

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    const projectUserId = project.userId != null ? String(project.userId) : null
    if (projectUserId && projectUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const filesArray = await getProjectFilesForExport(projectId)
    if (!filesArray.length) {
      return NextResponse.json(
        { error: 'No files to download. Add generated files or link a repo.' },
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
