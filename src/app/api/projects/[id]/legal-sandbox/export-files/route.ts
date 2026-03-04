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

    // Next.js: when app lives in src/app/, remove root app/ so Next uses src/app (concrete rule: stackblitz-no-root-app-when-src-app).
    try {
      const pkgRaw = files['package.json']
      if (pkgRaw) {
        const pkg = JSON.parse(pkgRaw) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
        const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
        if (deps.next) {
          const keys = Object.keys(files)
          const useSrcApp = keys.some((k) => k.startsWith('src/app/'))
          if (useSrcApp) {
            for (const key of keys) {
              if (key === 'app/globals.css' && !files['src/app/globals.css']) {
                files['src/app/globals.css'] = files[key] as string
              }
              if (key.startsWith('app/')) delete files[key]
            }
          }
        }
      }
    } catch {
      // non-fatal
    }

    // Next.js: always inject root layout + page so StackBlitz preview GET / returns 200 (same as main export-files).
    try {
      const pkgRaw = files['package.json']
      if (pkgRaw) {
        const pkg = JSON.parse(pkgRaw) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
        const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
        if (deps.next) {
          const keys = Object.keys(files)
          const useSrcApp = keys.some((k) => k.startsWith('src/app/'))
          const appDir = useSrcApp ? 'src/app' : 'app'
          const layoutPath = `${appDir}/layout.tsx`
          const pagePath = `${appDir}/page.tsx`
          const projectTitle = ((project as { title?: string }).title || 'App').trim() || 'App'
          const existingLayout = files[layoutPath]
          const existingPage = files[pagePath]
          const hasLayout = typeof existingLayout === 'string' && existingLayout.trim().length > 0
          const hasPage = typeof existingPage === 'string' && existingPage.trim().length > 0
          if (!hasLayout) {
            files[layoutPath] = `import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = { title: '${projectTitle.replace(/'/g, "\\'")}', description: 'GRIP project' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`
          }
          if (!hasPage) {
            const safeTitle = projectTitle.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')
            files[pagePath] = `export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Welcome to ${safeTitle}</h1>
      <p>Run plan and build in GRIP to generate your full app with ideation, navigation, and styling.</p>
    </main>
  )
}
`
          }
        }
      }
    } catch {
      // non-fatal
    }

    // Next.js 14: strip deprecated experimental.appDir to avoid "Unrecognized key(s)" warning.
    try {
      for (const configKey of ['next.config.js', 'next.config.mjs', 'next.config.ts']) {
        const raw = files[configKey]
        if (typeof raw !== 'string' || !raw.trim()) continue
        const modified = raw
          .replace(/\n\s*appDir\s*:\s*(?:true|false)\s*,?\s*/g, '\n')
          .replace(/,(\s*})\s*(\n|\s*\/\/)/g, '$1$2')
        if (modified !== raw) files[configKey] = modified
      }
    } catch {
      // non-fatal
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
