import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { getProjectFilesForExport } from '@/lib/services/exportService'
import { getProjectPlan } from '@/lib/services/projectPlanningService'
import { isImagePath, validateImageContent, PLACEHOLDER_IMAGE_BASE64 } from '@/lib/imageValidation'
import { embedImagesAndRemoveImageFiles } from '@/lib/stackblitzImageEmbed'

/**
 * GET /api/projects/[id]/export-files
 * Returns project file set for StackBlitz as { files: Record<path, content>, title }.
 * Includes ALL repo files plus GRIP project files (saved/generated in chat); project files
 * override repo at the same path. So StackBlitz gets the full repo (including images) and
 * any GRIP-created or updated files—no user action required.
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

    const client = await clientPromise
    const db = client.db('test')
    
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

    // Use appropriate export function based on project type
    const filesArray = isSandbox
      ? await (await import('@/lib/services/legalSandboxService')).getLegalSandboxFilesForExport(projectId)
      : await getProjectFilesForExport(projectId, { gripOnly: false })
    if (!filesArray.length) {
      return NextResponse.json(
        { error: 'No files to export. Link a repo or add generated files.' },
        { status: 400 }
      )
    }

    // StackBlitz expects paths without leading ./ or / (path.relative-style); see RangeError "path should be a path.relative()d string"
    // Image/binary content is kept as base64 (see repository.ts and gripProjectActions) so it is not corrupted; StackBlitz accepts string content.
    const normalizePathForStackBlitz = (p: string) => p.replace(/^\.\//, '').replace(/^\/+/, '').trim()
    const files: Record<string, string> = {}
    for (const { path, content } of filesArray) {
      const key = normalizePathForStackBlitz(path) || path
      files[key] = content
    }

    // Ensure every projectFile (including copied files in nested folders) is in the payload by
    // reading projectFiles directly with the same client used in this route.
    // Match both ObjectId and string projectId so we never miss docs (e.g. from different writers).
    // For sandbox projects, use legalSandboxFiles collection instead
    if (!isSandbox) {
      const projectFilesDocs = await db
        .collection('projectFiles')
        .find({
          $or: [
            { projectId: new ObjectId(projectId) },
            { projectId: projectId as unknown },
          ],
        })
        .project({ path: 1, filename: 1, content: 1 })
        .toArray() as { path?: string; filename?: string; content?: string }[]
      for (const f of projectFilesDocs) {
        const path = f.path ?? ''
        const filename = f.filename ?? ''
        if (!filename) continue
        const fullPath = path === '' ? filename : `${path}/${filename}`
        const key = normalizePathForStackBlitz(fullPath) || fullPath
        files[key] = f.content ?? ''
      }
    }

    // Ensure image files have valid image content (not blank/encrypted/wrong format) so StackBlitz can use them.
    // StackBlitz ProjectFiles accept strings only; we send raw base64 so their runtime can decode for image paths.
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
        // Likely valid base64 image that failed strict magic-byte check (e.g. variant); send as-is so StackBlitz gets full content
        files[key] = content.replace(/\s/g, '')
      } else {
        files[key] = PLACEHOLDER_IMAGE_BASE64
      }
    }

    // For Expo: add web deps and dev script so "expo start --web" works in StackBlitz (avoids CommandError: web support requires react-native-web, react-dom, @expo/webpack-config)
    try {
      const pkgRaw = files['package.json']
      if (pkgRaw) {
        const pkg = JSON.parse(pkgRaw) as { scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
        const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
        if (deps.expo || deps['react-native']) {
          if (!pkg.scripts) pkg.scripts = {}
          pkg.scripts.dev = 'expo start --web --port 8081'
          if (!pkg.dependencies) pkg.dependencies = {}
          if (!pkg.devDependencies) pkg.devDependencies = {}
          // Expo web requires these; add if missing so npm install picks them up (avoids "Module not found" in preview)
          if (!pkg.dependencies['react-native-web']) pkg.dependencies['react-native-web'] = '~0.19.6'
          if (!pkg.dependencies['react-dom']) pkg.dependencies['react-dom'] = '18.2.0'
          if (!pkg.dependencies['expo-status-bar']) pkg.dependencies['expo-status-bar'] = '~1.11.0'
          if (!pkg.devDependencies['@expo/webpack-config']) pkg.devDependencies['@expo/webpack-config'] = '^19.0.0'
          files['package.json'] = JSON.stringify(pkg, null, 2)
        }
      }
    } catch {
      // keep existing package.json
    }

    // Merge recommended dependencies from project plan (ideation) so export runs locally with fewer manual installs
    // Only for main projects (sandbox projects don't have main project plans)
    if (!isSandbox) {
      try {
        const plan = await getProjectPlan(projectId)
        const recommended = plan?.dependencyTree?.recommendedPackages
        if (Array.isArray(recommended) && recommended.length > 0) {
          const pkgRaw = files['package.json']
          if (pkgRaw) {
            const pkg = JSON.parse(pkgRaw) as { devDependencies?: Record<string, string>; dependencies?: Record<string, string> }
            if (!pkg.devDependencies) pkg.devDependencies = {}
            recommended.forEach((name: string) => {
              if (!pkg.dependencies?.[name] && !pkg.devDependencies[name]) {
                pkg.devDependencies[name] = pkg.dependencies?.[name] ?? '*'
              }
            })
            files['package.json'] = JSON.stringify(pkg, null, 2)
          }
        }
      } catch {
        // non-fatal
      }
    }

    files['.stackblitzrc'] = JSON.stringify(
      { installDependencies: true, startCommand: 'npm run dev' },
      null,
      2
    )

    // StackBlitz does not decode base64 for image paths—it stores file content as text.
    // Embed images as data URIs in HTML/JSX/CSS so the preview displays them; keep image files so folder structure (e.g. /images) exists.
    const stackblitzFiles = embedImagesAndRemoveImageFiles(files)

    return NextResponse.json({
      files: stackblitzFiles,
      title: (project.title || 'grip-project').replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 50) || 'grip-project',
    })
  } catch (error) {
    console.error('Export-files error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}
