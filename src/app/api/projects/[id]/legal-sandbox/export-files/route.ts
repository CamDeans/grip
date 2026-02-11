import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import { getLegalSandboxFilesForExport } from '@/lib/services/legalSandboxService'
import { getSandboxProject } from '@/lib/services/sandboxProjectService'
import { isImagePath, validateImageContent, PLACEHOLDER_IMAGE_BASE64 } from '@/lib/imageValidation'
import { embedImagesAndRemoveImageFiles } from '@/lib/stackblitzImageEmbed'

/**
 * GET /api/projects/[id]/legal-sandbox/export-files
 * Returns only files from the legal-sandbox store for StackBlitz.
 * No cloned repo, no main projectFiles — sandbox-only. For testing the clean-room flow.
 */
export async function GET(
  _request: NextRequest,
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

    const project = await getSandboxProject(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Sandbox project not found' }, { status: 404 })
    }
    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const filesArray = await getLegalSandboxFilesForExport(projectId)
    if (!filesArray.length) {
      return NextResponse.json(
        { error: 'No sandbox files to export. Use the chat on this page to generate files first.' },
        { status: 400 }
      )
    }

    const normalizePathForStackBlitz = (p: string) => p.replace(/^\.\//, '').replace(/^\/+/, '').trim()
    const files: Record<string, string> = {}
    for (const { path, content } of filesArray) {
      const key = normalizePathForStackBlitz(path) || path
      files[key] = content
    }

    for (const key of Object.keys(files)) {
      if (!isImagePath(key)) continue
      const content = files[key]
      if (!content || !content.trim()) {
        files[key] = PLACEHOLDER_IMAGE_BASE64
        continue
      }
      const { valid, normalized } = validateImageContent(content, key)
      if (valid && normalized) {
        files[key] = normalized
      } else if (content.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(content.replace(/\s/g, ''))) {
        files[key] = content.replace(/\s/g, '')
      } else {
        files[key] = PLACEHOLDER_IMAGE_BASE64
      }
    }

    files['.stackblitzrc'] = JSON.stringify(
      { installDependencies: true, startCommand: 'npm run dev' },
      null,
      2
    )

    const stackblitzFiles = embedImagesAndRemoveImageFiles(files)

    return NextResponse.json({
      files: stackblitzFiles,
      title: ((project as { title?: string }).title || 'grip-legal-sandbox')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .slice(0, 50) || 'grip-legal-sandbox',
    })
  } catch (error) {
    console.error('Legal-sandbox export-files error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}
