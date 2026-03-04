/**
 * POST /api/projects/[id]/fix-build
 * Autonomous fix for build failures: parses ALL file paths from build output, resolves to files
 * that exist in the project (projectFiles in DB), then fixes the matching file (deterministic for
 * layout/children, robots.ts, sitemap.ts; AI for others). Ensures GRIP finds and fixes code from
 * files/folders created and saved in the database. Mandatory: GRIP fixes and re-runs until success.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import { getFileContentByPath, saveProjectFile } from '@/lib/services/gripProjectActions'
import { listProjectFiles } from '@/lib/services/fileStorageService'
import { getAnthropicApiKey } from '@/lib/anthropicConfig'
import { ANTHROPIC_MODEL_CHAT } from '@/lib/anthropicConfig'
import { MANDATORY_GRIP_NEXTJS_APP_ROUTER_LAYOUT, MANDATORY_GRIP_BUILD_FIX_UNTIL_SUCCESS } from '@/lib/constants/buildQualityPlan'
import { SCOPE_REMINDER_MAX_CHARS } from '@/lib/constants/tokenLimitsByTier'
import { CANONICAL_ROOT_LAYOUT, CANONICAL_APP_PAGE } from '@/lib/constants/canonicalAppFiles'
import Anthropic from '@anthropic-ai/sdk'
import { gripLog } from '@/lib/gripLogger'
import clientPromise, { DB_NAME } from '@/lib/mongodb'

const MAX_FIXABLE_LENGTH = 120_000

/** Normalize path: no leading . or /, forward slashes (matches getFileContentByPath / projectFiles path+filename). */
function normalizeErrorPath(p: string): string {
  return p.replace(/^\.\/+/, '').replace(/^\/+/, '').replace(/\\/g, '/').trim()
}

/** Extract ALL file paths from build error lines (Next/TS formats). Returns unique paths in order of appearance. */
function parseAllFilePathsFromError(lines: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const push = (path: string) => {
    const n = normalizeErrorPath(path)
    if (n && !n.includes('node_modules') && !seen.has(n)) {
      seen.add(n)
      out.push(n)
    }
  }
  for (const line of lines) {
    const trimmed = (line || '').trim()
    // :line:column (e.g. ./src/app/layout.tsx:19:499)
    const withColon = trimmed.matchAll(/(\.\/)?(src\/[^\s:]+\.(tsx?|jsx?|js|ts)|app\/[^\s:]+\.(tsx?|jsx?|js|ts))(?::\d+)?(?::\d+)?/gi)
    for (const m of withColon) if (m[2]) push(m[2])
    // (line:col) at end
    const paren = trimmed.match(/(\.\/)?(src\/[^\s(]+\.(tsx?|jsx?|js|ts)|app\/[^\s(]+\.(tsx?|jsx?|js|ts))\s*\(\d+:\d+\)/gi)
    if (paren) for (const p of paren) push(p.replace(/\s*\(\d+:\d+\)\s*$/, '').trim())
    // "in src/app/file.tsx"
    const inMatch = trimmed.match(/(?:in\s+)(src\/app\/[\w./-]+\.(tsx?|jsx?|js|ts)|app\/[\w./-]+\.(tsx?|jsx?|js|ts))/gi)
    if (inMatch) for (const p of inMatch) push(p.replace(/^in\s+/i, '').trim())
  }
  return out
}

/** Extract the first/best file path from errors (for backward compatibility). Prefer path that appears on same line as "Type error" or "Error:". */
function parseFilePathFromError(lines: string[]): string | null {
  const all = parseAllFilePathsFromError(lines)
  return all[0] ?? null
}

/** Build set of full paths (path/filename) for all project files in DB so we only fix files that exist. */
async function getProjectFileFullPaths(projectId: string): Promise<Set<string>> {
  const files = await listProjectFiles(projectId)
  const set = new Set<string>()
  for (const f of files) {
    const full = (f.path ? `${(f.path as string).replace(/^\/+|\/+$/g, '')}/${f.filename}` : f.filename).replace(/^\/+/, '')
    if (full) set.add(full)
  }
  return set
}

/** Next.js App Router robots.ts must return MetadataRoute.Robots (fixes type/return errors). */
const CANONICAL_ROBOTS = `import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: '/sitemap.xml',
  }
}
`

/** Next.js App Router sitemap.ts must return MetadataRoute.Sitemap (fixes type/return errors). */
const CANONICAL_SITEMAP = `import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://example.com', lastModified: new Date(), changeFrequency: 'yearly', priority: 1 },
  ]
}
`

/** ESM postcss.config so "module is not defined" is avoided when Node loads .js as ESM (e.g. StackBlitz, Next 14). */
const CANONICAL_POSTCSS_CONFIG = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`

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

    const client = await clientPromise
    const db = client.db(DB_NAME)
    let project = await db.collection('projects').findOne(
      { _id: new ObjectId(projectId) },
      { projection: { userId: 1 } }
    ) as { userId?: string } | null
    if (!project) {
      project = await db.collection('sandboxProjects').findOne(
        { _id: new ObjectId(projectId) },
        { projection: { userId: 1 } }
      ) as { userId?: string } | null
    }
    if (!project || (project.userId && project.userId !== session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const errors: string[] = Array.isArray(body.errors) ? body.errors : []
    const output: string = typeof body.output === 'string' ? body.output : ''

    if (errors.length === 0 && !output) {
      return NextResponse.json({ fixed: false, error: 'No errors or output provided' }, { status: 400 })
    }

    // Use full context: errors (build failure tail) + full output so path parsing and AI have complete build log
    const combined = [errors.join('\n'), output].filter(Boolean).join('\n\n')
    const allLines = [...errors.flatMap((e) => String(e).split('\n')), ...output.split('\n')]
    const projectPaths = await getProjectFileFullPaths(projectId)
    const parsedPaths = parseAllFilePathsFromError(allLines)
    const typeOrReturnError = /Type error|does not satisfy|MetadataRoute|return type|is not assignable/i.test(combined)
    const isPostcssModuleError = /module is not defined|ReferenceError.*module/i.test(combined)
    const isChildrenError = /Cannot find name ['"]?children['"]?/i.test(combined)
    const errorMentionsMetadataOrHead = /next\/head|Metadata API|migrate to the Metadata/i.test(combined)

    // Multi-file pass: apply deterministic fixes to every matching path in one call (strengthens fix-until-success)
    const candidatePaths: string[] = []
    for (const p of parsedPaths) {
      const n = normalizeErrorPath(p)
      if (projectPaths.has(n)) candidatePaths.push(n)
    }
    const seenPath = new Set<string>()
    const uniqueCandidates = candidatePaths.filter((p) => {
      if (seenPath.has(p)) return false
      seenPath.add(p)
      return true
    })
    if (isChildrenError) {
      for (const candidate of ['src/app/layout.tsx', 'app/layout.tsx']) {
        if (projectPaths.has(candidate) && !seenPath.has(candidate)) {
          uniqueCandidates.push(candidate)
          seenPath.add(candidate)
        }
      }
    }
    if (isPostcssModuleError && /postcss\.config\.(js|mjs)/i.test(combined)) {
      for (const candidate of ['postcss.config.js', 'postcss.config.mjs']) {
        if (projectPaths.has(candidate) && !seenPath.has(candidate)) {
          uniqueCandidates.push(candidate)
          seenPath.add(candidate)
        }
      }
    }
    const fixedPaths: string[] = []
    const multiFileCap = 25
    for (let i = 0; i < Math.min(uniqueCandidates.length, multiFileCap); i++) {
      const path = uniqueCandidates[i]
      const content = await getFileContentByPath(projectId, path)
      if (!content || content.length > MAX_FIXABLE_LENGTH) continue
      const isLayout = /(^|\/)(app|src\/app)\/layout\.(tsx|jsx)$/i.test(path)
      const isAppPage = /(^|\/)(app|src\/app)\/.+\/page\.(tsx|jsx)$/i.test(path)
      const isRobots = /robots\.(ts|tsx)$/i.test(path)
      const isSitemap = /sitemap\.(ts|tsx)$/i.test(path)
      const isPostcssConfig = /postcss\.config\.(js|mjs)$/i.test(path)
      const usesNextHead = /from\s+['"]next\/head['"]|import\s+Head\s+from|<Head\s*\/?>/.test(content)
      const hasChildrenInJsx = /\{children\}/.test(content)
      const hasChildrenInParams = /\{\s*children\s*\}\s*[:\}]|\(\s*\{\s*children\s*\}\s*\)/.test(content)
      const missingChildrenInSignature = hasChildrenInJsx && !hasChildrenInParams

      if (isRobots && (typeOrReturnError || /robots/i.test(combined))) {
        const saveResult = await saveProjectFile(projectId, path, CANONICAL_ROBOTS)
        if (saveResult.ok) fixedPaths.push(path)
        continue
      }
      if (isSitemap && (typeOrReturnError || /sitemap/i.test(combined))) {
        const saveResult = await saveProjectFile(projectId, path, CANONICAL_SITEMAP)
        if (saveResult.ok) fixedPaths.push(path)
        continue
      }
      if (isPostcssConfig && (isPostcssModuleError || /module\.exports|require\s*\(/i.test(content))) {
        const saveResult = await saveProjectFile(projectId, path, CANONICAL_POSTCSS_CONFIG)
        if (saveResult.ok) fixedPaths.push(path)
        continue
      }
      if (isLayout && isChildrenError && hasChildrenInJsx && missingChildrenInSignature) {
        const saveResult = await saveProjectFile(projectId, path, CANONICAL_ROOT_LAYOUT)
        if (saveResult.ok) fixedPaths.push(path)
        continue
      }
      if (isLayout && usesNextHead && errorMentionsMetadataOrHead) {
        const saveResult = await saveProjectFile(projectId, path, CANONICAL_ROOT_LAYOUT)
        if (saveResult.ok) fixedPaths.push(path)
        continue
      }
      if (isAppPage && usesNextHead && errorMentionsMetadataOrHead) {
        const saveResult = await saveProjectFile(projectId, path, CANONICAL_APP_PAGE)
        if (saveResult.ok) fixedPaths.push(path)
      }
    }
    if (fixedPaths.length > 0) {
      console.info('[GRIP Stage 5] fix-build applied (multi-file deterministic)', { projectId, filesFixed: fixedPaths.length, paths: fixedPaths.slice(0, 5) })
      gripLog(5, 'fix-build multi-file deterministic', { projectId, filesFixed: fixedPaths.length })
      return NextResponse.json({
        fixed: true,
        filePath: fixedPaths[0],
        filesFixed: fixedPaths,
        message: `Fixed ${fixedPaths.length} file(s). Re-run build.`,
      })
    }

    // Prefer path that appears on a line with "Type error" or "Error:" (the actual failing file)
    const errorLineIndices = new Set<number>()
    allLines.forEach((line, i) => {
      if (/Type error|Error:\s|Failed to compile/i.test(line)) errorLineIndices.add(i)
    })
    let filePath: string | null = null
    for (const p of parsedPaths) {
      if (projectPaths.has(p)) {
        filePath = p
        break
      }
    }
    if (!filePath && parsedPaths.length > 0) {
      for (const p of parsedPaths) {
        const normalized = normalizeErrorPath(p)
        if (projectPaths.has(normalized)) {
          filePath = normalized
          break
        }
      }
    }
    if (!filePath) {
      filePath = parseFilePathFromError(allLines)
      if (filePath && !projectPaths.has(normalizeErrorPath(filePath))) filePath = null
    }
    // Fallback: "Cannot find name 'children'" → root layout
    if (!filePath && /Cannot find name ['"]?children['"]?/i.test(combined)) {
      for (const candidate of ['src/app/layout.tsx', 'app/layout.tsx']) {
        if (projectPaths.has(candidate)) {
          const c = await getFileContentByPath(projectId, candidate)
          if (c && c.trim().length > 0) {
            filePath = candidate
            break
          }
        }
      }
    }
    // Fallback: "module is not defined" at postcss.config.js (Node loads .js as ESM; CommonJS fails)
    if (!filePath && /postcss\.config\.(js|mjs|cjs)/i.test(combined) && /module is not defined|ReferenceError.*module/i.test(combined)) {
      for (const candidate of ['postcss.config.js', 'postcss.config.mjs']) {
        if (projectPaths.has(candidate)) {
          filePath = candidate
          break
        }
      }
    }
    if (!filePath) {
      gripLog(5, 'fix-build: could not parse file path from errors', { errors: errors.slice(0, 2), outputSlice: output.slice(0, 200), projectPathCount: projectPaths.size })
      return NextResponse.json({ fixed: false, error: 'Could not determine which file to fix from the build error (no matching project file in DB)' }, { status: 400 })
    }

    const content = await getFileContentByPath(projectId, filePath)
    if (!content || content.length > MAX_FIXABLE_LENGTH) {
      return NextResponse.json({ fixed: false, error: 'File not found or too large to fix' }, { status: 400 })
    }

    const isLayout = /(^|\/)(app|src\/app)\/layout\.(tsx|jsx)$/i.test(filePath)
    const isAppPage = /(^|\/)(app|src\/app)\/.+\/page\.(tsx|jsx)$/i.test(filePath)
    const isRobots = /robots\.(ts|tsx)$/i.test(filePath)
    const isSitemap = /sitemap\.(ts|tsx)$/i.test(filePath)
    const isPostcssConfig = /postcss\.config\.(js|mjs)$/i.test(filePath)
    const hasChildrenInJsx = /\{children\}/.test(content)
    const hasChildrenInParams = /\{\s*children\s*\}\s*[:\}]|\(\s*\{\s*children\s*\}\s*\)/.test(content)
    const missingChildrenInSignature = hasChildrenInJsx && !hasChildrenInParams

    // Deterministic: Next.js robots.ts must return MetadataRoute.Robots
    if (isRobots && (typeOrReturnError || /robots/i.test(combined))) {
      const saveResult = await saveProjectFile(projectId, filePath, CANONICAL_ROBOTS)
      if (saveResult.ok) {
        console.info('[GRIP Stage 5] fix-build applied (deterministic robots.ts)', { projectId, filePath })
        gripLog(5, 'fix-build applied (deterministic robots)', { projectId, filePath })
        return NextResponse.json({ fixed: true, filePath, message: 'robots.ts fixed. Re-run build.' })
      }
    }
    // Deterministic: Next.js sitemap.ts must return MetadataRoute.Sitemap
    if (isSitemap && (typeOrReturnError || /sitemap/i.test(combined))) {
      const saveResult = await saveProjectFile(projectId, filePath, CANONICAL_SITEMAP)
      if (saveResult.ok) {
        console.info('[GRIP Stage 5] fix-build applied (deterministic sitemap.ts)', { projectId, filePath })
        gripLog(5, 'fix-build applied (deterministic sitemap)', { projectId, filePath })
        return NextResponse.json({ fixed: true, filePath, message: 'sitemap.ts fixed. Re-run build.' })
      }
    }
    // Deterministic: postcss.config.js "module is not defined" — use ESM export so it works when Node loads .js as ESM
    if (isPostcssConfig && (isPostcssModuleError || /module\.exports|require\s*\(/i.test(content))) {
      const saveResult = await saveProjectFile(projectId, filePath, CANONICAL_POSTCSS_CONFIG)
      if (saveResult.ok) {
        console.info('[GRIP Stage 5] fix-build applied (deterministic postcss.config ESM)', { projectId, filePath })
        gripLog(5, 'fix-build applied (deterministic postcss ESM)', { projectId, filePath })
        return NextResponse.json({ fixed: true, filePath, message: 'postcss.config.js fixed (ESM). Re-run build.' })
      }
    }
    // Deterministic fix: layout + "children" error
    if (isLayout && isChildrenError && hasChildrenInJsx && missingChildrenInSignature) {
      const saveResult = await saveProjectFile(projectId, filePath, CANONICAL_ROOT_LAYOUT)
      if (saveResult.ok) {
        console.info('[GRIP Stage 5] fix-build applied (deterministic layout fix)', { projectId, filePath })
        gripLog(5, 'fix-build applied (deterministic layout fix)', { projectId, filePath })
        return NextResponse.json({ fixed: true, filePath, message: 'Layout fixed (children in signature). Re-run build.' })
      }
    }
    // Deterministic fix: layout uses next/head — replace with Metadata API (canonical layout)
    const usesNextHead = /from\s+['"]next\/head['"]|import\s+Head\s+from|<Head\s*\/?>/.test(content)
    if (isLayout && usesNextHead && errorMentionsMetadataOrHead) {
      const saveResult = await saveProjectFile(projectId, filePath, CANONICAL_ROOT_LAYOUT)
      if (saveResult.ok) {
        console.info('[GRIP Stage 5] fix-build applied (layout next/head → Metadata API)', { projectId, filePath })
        gripLog(5, 'fix-build applied (layout Metadata API)', { projectId, filePath })
        return NextResponse.json({ fixed: true, filePath, message: 'Layout fixed (Metadata API, no next/head). Re-run build.' })
      }
    }
    // Deterministic fix: app-dir page.tsx uses next/head — replace with Metadata-only page
    if (isAppPage && usesNextHead && errorMentionsMetadataOrHead) {
      const saveResult = await saveProjectFile(projectId, filePath, CANONICAL_APP_PAGE)
      if (saveResult.ok) {
        console.info('[GRIP Stage 5] fix-build applied (page next/head → Metadata API)', { projectId, filePath })
        gripLog(5, 'fix-build applied (page Metadata API)', { projectId, filePath })
        return NextResponse.json({ fixed: true, filePath, message: 'Page fixed (Metadata API, no next/head). Re-run build.' })
      }
    }

    const apiKey = getAnthropicApiKey()
    if (!apiKey) {
      return NextResponse.json({ fixed: false, error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
    }

    const layoutRule = isLayout ? `\n\n${MANDATORY_GRIP_NEXTJS_APP_ROUTER_LAYOUT}\n` : ''

    let scopeBlock = ''
    try {
      const analysis = await db.collection('analyses').findOne(
        { projectId: new ObjectId(projectId) },
        { projection: { buildRequirementsDocument: 1 } }
      ) as { buildRequirementsDocument?: string } | null
      if (analysis?.buildRequirementsDocument?.trim()) {
        scopeBlock = `\n\nFull build scope (use to trace which files/code blocks belong to this project; fix this file so it aligns):\n${analysis.buildRequirementsDocument.trim().slice(0, SCOPE_REMINDER_MAX_CHARS)}\n`
      }
    } catch {
      // non-fatal
    }

    const projectPathsList = [...projectPaths].slice(0, 80).join(', ')
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_CHAT,
      max_tokens: 8000,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: `Fix this file so the Next.js/TypeScript build succeeds. The build reported:

${combined.slice(0, 12000)}

**File to fix (this file is in the project and caused or is related to the error):** ${filePath}

**Other project files (for context; do not edit these):** ${projectPathsList || 'none'}

**Current content of the file to fix:**

\`\`\`
${content.slice(0, 60000)}
\`\`\`

Return ONLY the corrected full file content—no explanation, no markdown fences. Output the exact source code that should replace this file. Fix the type/compile error so the build passes.

**GRIP rule:** ${MANDATORY_GRIP_BUILD_FIX_UNTIL_SUCCESS}${layoutRule}${scopeBlock}`
        }
      ]
    })

    const text = (response.content?.[0] && 'text' in response.content[0] ? response.content[0].text : '') as string
    let fixedContent = (text || '').trim()
    // Strip markdown code block if present
    const codeMatch = fixedContent.match(/```(?:tsx?|jsx?|js|ts)?\s*([\s\S]*?)```/)
    if (codeMatch) fixedContent = codeMatch[1].trim()
    if (!fixedContent || fixedContent.length < 10) {
      return NextResponse.json({ fixed: false, error: 'AI did not return valid file content' }, { status: 500 })
    }

    const saveResult = await saveProjectFile(projectId, filePath, fixedContent)
    if (!saveResult.ok) {
      return NextResponse.json({ fixed: false, error: saveResult.message || 'Failed to save file' }, { status: 500 })
    }

    console.info('[GRIP Stage 5] fix-build applied', { projectId, filePath })
    gripLog(5, 'fix-build applied', { projectId, filePath })
    return NextResponse.json({ fixed: true, filePath, message: 'File updated. Re-run build.' })
  } catch (error) {
    console.error('[GRIP Stage 5] fix-build error', error)
    gripLog(5, 'fix-build error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { fixed: false, error: error instanceof Error ? error.message : 'Fix failed' },
      { status: 500 }
    )
  }
}
