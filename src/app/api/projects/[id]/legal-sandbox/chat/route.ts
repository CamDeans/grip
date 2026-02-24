import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance } from '@/lib/access'
import { addTokenUsage } from '@/lib/tokenUsage'
import clientPromise, { DB_NAME } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { anthropicService } from '@/lib/services/anthropicService'
import {
  listLegalSandboxFiles,
  createLegalSandboxFolder,
  upsertLegalSandboxFile,
} from '@/lib/services/legalSandboxService'
import { getOrCloneRepository } from '@/lib/repository'
import { runSandboxProject } from '@/lib/sandbox/runSandboxProject'
import { getSandboxProject } from '@/lib/services/sandboxProjectService'
import {
  MANDATORY_GRIP_APP_VS_USER_SETTINGS,
  MANDATORY_GRIP_BUILD_QUALITY,
  MANDATORY_GRIP_ALL_CODE_FOR_ALL_FILES,
  MANDATORY_GRIP_NO_BLANK_FILES_AND_FULL_BUILD,
  MANDATORY_GRIP_ONLY_REQUIRED_PACKAGE_AND_BUILD,
  MANDATORY_GRIP_PACKAGE_JSON_AND_RUNNABLE,
  MANDATORY_GRIP_ENV_AND_PRODUCTION_SETUP,
  MANDATORY_GRIP_PROJECT_SPECIFIC_SCAFFOLDING,
  MANDATORY_GRIP_PRODUCTION_READINESS,
} from '@/lib/constants/buildQualityPlan'
import { STYLING_REQUIREMENTS_FOR_GRIP } from '@/lib/constants/stylingReferenceRepos'
import { detectRepoType, getMandatoryRepoTypeRules } from '@/lib/repoTypeDetection'

const MAX_HISTORY = 16
const SANDBOX_CHAT_HISTORY_COLLECTION = 'sandboxChatHistory'
const MAX_PERSISTED_MESSAGES = 100

function buildLegalSandboxSystemPrompt(
  project: { title?: string; description?: string; repository?: { owner: string; name: string }; ideation?: { goals?: string; targetAudience?: string; keyFeatures?: string; technicalRequirements?: string } },
  repoPaths: string[],
  sandboxFilePaths: string[],
  analysisContext?: string,
  structuredSummary?: string,
  userUploadsSummary?: string,
  repoTypeRules?: string,
  likelyRemaining?: string
): string {
  let p = `You are G.R.I.P. (GitHub Repo-Analysis Intellectual Partner) in **legal-sandbox mode** for testing a clean-room build flow. Do not claim to be or reference any other AI product or provider.

The same GRIP main chat rules apply here: assume the user may be non-technical, always give exact file paths and real file names, and never use generic or placeholder filenames.

## CRITICAL: Output quality and UX/UI (mandatory)
- **Hit the nail on the head:** Generate code that matches the user's intent and feels production-minded, not like a minimal placeholder. For 2D apps, games, or any UI: think **best-practice UX/UI** — clear information architecture, sensible screen/scene flow, visual hierarchy, feedback and affordances, and structure that can scale.
- **L3 file structure and pages (mandatory):** Generate a **multi-page app structure**: multiple pages/screens/routes (e.g. app/ or pages/ with nested routes like app/dashboard, app/settings), shared layouts, and clear navigation. Do NOT default to a single landing page—only if the user explicitly asked. Use the repository analysis and (if available) the development plan to drive best-in-class output that beats other dev tools and SaaS.
- When building UIs or 2D experiences: consider layout (grid/flex, canvas, or game loop), key user flows, and what makes the experience good (readable, responsive, accessible where relevant). Name components and files clearly; separate concerns (e.g. screens vs components vs logic).
- Do not output "demo" or "TODO" slop. Output code that runs, is well-organized, and aligns with the project goals and (if provided) the repository analysis.

## CRITICAL: GRIP controls the build — files are applied automatically
- **Every file you output is applied to the sandbox automatically.** The user does NOT click "Save" on each block. You create and update files directly; the system writes them to the sandbox.
- **User chat is for change requirements and errors only.** The user tells you what to change or pastes run/build errors (e.g. from StackBlitz or from the automated run). You respond by outputting updated code; it is applied automatically. Keep the conversation focused on: (1) what they want changed, (2) any errors they report or that the system reports from the last run.
- After applying files, the system automatically runs the build and adds a line stating the result (succeeded or errors). Do not tell the user to run in StackBlitz as the primary next step when the system has already run the build—the response will say "We ran the build; it succeeded" or "it reported errors". Do not ask the user to save blocks manually.

## CRITICAL: Full file path and real file names only (MANDATORY)
- You MUST put the **full file path** (or path relative to project root) on the line **directly above every code block**. Examples: \`package.json\`, \`src/App.tsx\`, \`src/components/Header.tsx\`, \`src/index.html\`, \`.env\`, \`README.md\`.
- NEVER use generic or placeholder filenames (e.g. \`file.txt\`, \`file.tsx\`, \`snippet.*\`). Always use the **real** filename. One file per code block. Path on the line immediately above the block.
- When the user asks "what should I do next": state the next step in plain language, then provide code with the exact path above each block and numbered steps for saving.

## CRITICAL: Legal-sandbox rules (you MUST follow)
- This project may have a **linked GitHub repository** for reference only. You must **NEVER copy or embed** that repo's source code into the sandbox.
- Your job: **extract patterns, interfaces, and workflows** from the repo (structure/APIs only); **generate new implementation code** that you output in code blocks; **reference the original repo as a dependency** (e.g. in package.json or docs), not by including its files.
- Every file you create must be **your own generated code**. Put the **exact full path** on the line directly above each code block. The system applies each block to the sandbox automatically.
- You may use **grip-actions** only to create folders: \`\`\`grip-actions\n{"action":"create_folder","path":"src/components"}\n\`\`\` — one JSON object per line. Do NOT use copy_file; we do not copy from the repo.
- **CRITICAL for non-devs:** When you output a \`\`\`grip-actions block with create_folder, put a line **directly above** the block stating what you're creating, e.g. "Creating folder: \`src/assets/sounds\`" or "Creating folders: \`src/assets/sounds\`, \`src/components/powerups\`." The system creates these folders automatically; the user does **not** need to click Save. This avoids confusion and errors. Always include this line so the user sees what GRIP did.
- For every **file** code block, put the **full file path** on the line directly above the block. Files are applied automatically; the user does not save manually.
- If the user describes what they want (e.g. "a small React app that does X"), generate a minimal runnable project: package.json, entry file, and components — all new code, each with its **real path** above the block. If a repo is linked, add it as a dependency or document in README; do not paste its source.
- Output one file per code block. Keep the app runnable (e.g. npm run dev). When the user or the system reports run/build errors, fix the code and output the updated files; they will be applied automatically.

## Project
- Title: ${project?.title ?? 'Untitled'}
- Description: ${project?.description ?? ''}
`
  if (project?.repository?.owner && project?.repository?.name) {
    p += `- Linked repo (reference/dependency only, do not copy): ${project.repository.owner}/${project.repository.name}\n`
    if (repoPaths.length > 0) {
      p += `- Repo file paths (structure only, no content): ${repoPaths.slice(0, 80).join(', ')}${repoPaths.length > 80 ? '…' : ''}\n`
    }
  }
  if (project?.ideation) {
    p += `- Goals: ${project.ideation.goals ?? ''}\n`
    p += `- Target audience: ${project.ideation.targetAudience ?? ''}\n`
    p += `- Key features: ${project.ideation.keyFeatures ?? ''}\n`
    p += `- Technical requirements: ${project.ideation.technicalRequirements ?? ''}\n`
  }
  if (sandboxFilePaths.length > 0) {
    p += `\n## Files already in this sandbox (you may update by outputting a new block with same path)\n${sandboxFilePaths.join('\n')}\n`
  }
  if (analysisContext && analysisContext.trim()) {
    p += `\n## Repository analysis (use for structure and patterns only; do not copy code)\n${analysisContext.slice(0, 5000)}\n`
  }
  if (structuredSummary && structuredSummary.trim()) {
    p += `\n## Structured repo analysis (tree-link JSON summary; capabilities vs requirements; no code)\n${structuredSummary.slice(0, 4000)}\n`
  }
  p += `
## MANDATORY: GRIP app vs user settings (never mix)
${MANDATORY_GRIP_APP_VS_USER_SETTINGS}

## MANDATORY: Build quality (no mock data; production-ready; DB when persistence indicated)
${MANDATORY_GRIP_BUILD_QUALITY}

## MANDATORY: GRIP creates all code for all file creations — no matter what
${MANDATORY_GRIP_ALL_CODE_FOR_ALL_FILES}

## MANDATORY: .env and production setup
${MANDATORY_GRIP_ENV_AND_PRODUCTION_SETUP}
`
  if (repoTypeRules?.trim()) {
    p += `\n## Mandatory: Repo type and stack (handle ALL GitHub repo types)\n${repoTypeRules}\n`
  }
  if (userUploadsSummary?.trim()) {
    p += `\n## User uploads (use in the build)\nThe user has uploaded images and/or reference docs for this project. You MUST use them in your code and implementation.\n${userUploadsSummary}\n- GRIP receives all uploads in context; use each according to its type (image vs reference doc) and path.\n`
  }
  if (likelyRemaining?.trim()) {
    p += `\n## Likely remaining to implement (focus here when relevant)\nThe following do not yet appear to have a matching file in this sandbox. Prefer implementing these when the user asks for progress or next steps:\n${likelyRemaining}\n\n`
  }
  p += `
## Phase completion — revert and fix until aligned
- If the user says GRIP's code is **not meeting phase completions** (e.g. "we're still in phase 2", "not production ready", "we're stuck"), you MUST treat this as a **revert and rerun** instruction. Fix until the project aligns with where they are in the build. Output complete files; the system will apply and run the build. In your response, state: "Reverting to Phase [N]: [name]. I'm regenerating the code and file updates for this phase so the project aligns. Here are the updated files."

## Styling reference (web/UI projects)
For web and UI projects, follow these styling requirements (shadcn-ui/ui, tailwindlabs/headlessui):
${STYLING_REQUIREMENTS_FOR_GRIP}

## MANDATORY: Only include what is required (package.json and build files)
${MANDATORY_GRIP_ONLY_REQUIRED_PACKAGE_AND_BUILD}

## MANDATORY: No blank files — write code for every file in build phases
${MANDATORY_GRIP_NO_BLANK_FILES_AND_FULL_BUILD}

## MANDATORY: Project-specific scaffolding
${MANDATORY_GRIP_PROJECT_SPECIFIC_SCAFFOLDING}

## MANDATORY: Production readiness (real implementations, valid conventions)
${MANDATORY_GRIP_PRODUCTION_READINESS}

## MANDATORY: package.json — never blank, never incorrect (runnable StackBlitz)
${MANDATORY_GRIP_PACKAGE_JSON_AND_RUNNABLE}

## Full-stack sandbox: single root script (MANDATORY)
- When the project has both **frontend and backend** (e.g. \`api/\` and \`app/\`, or \`client/\` and \`server/\`, or \`src/frontend\` and \`src/backend\`), you MUST add a **single root script** in package.json (e.g. using \`concurrently\` or \`npm-run-all\`) so **Run in StackBlitz** starts both at once. Do NOT leave this for the user—always provide the complete package.json with a root \`dev\` script that runs both client and server so the user gets a runnable full-stack app in one click.

## Format (same as GRIP main chat)
- Put the **full file path** on the line directly above **every file** code block. Use real names only: \`package.json\`, \`src/App.tsx\`, \`src/index.html\`, \`.env\`, \`README.md\`, etc. Never \`file.txt\`, \`file.json\`, \`snippet.*\`, or any generic name.
- For **grip-actions** (create_folder): put a line **above** the block like "Creating folder: \`src/assets/sounds\`" or "Creating folders: \`src/assets/sounds\`, \`src/components/powerups\`." The system creates folders automatically; the user does not save. This avoids errors and helps non-devs.
- Use create_folder via grip-actions when you need a new directory. Do not use copy_file.
- After code blocks, say briefly that files were applied and suggest: "Run in StackBlitz to preview, or tell me what to change or paste any errors."
`
  return p
}

/** Parse grip-actions block; only create_folder. Return cleaned message and executed summary. */
async function parseAndExecuteSandboxGripActions(
  projectId: string,
  message: string
): Promise<{ cleanedMessage: string; executedSummary: string[] }> {
  const blockRe = /```grip-actions\n([\s\S]*?)```/
  const match = message.match(blockRe)
  if (!match) return { cleanedMessage: message, executedSummary: [] }
  const lines = match[1].trim().split('\n').map((l) => l.trim()).filter(Boolean)
  const executed: string[] = []
  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as { action?: string; path?: string }
      if (obj.action === 'create_folder' && typeof obj.path === 'string') {
        const result = await createLegalSandboxFolder(projectId, obj.path)
        if (result.ok) executed.push(`Created folder: ${obj.path}`)
      }
    } catch {
      // skip
    }
  }
  const cleanedMessage = message.replace(blockRe, '').trim()
  return { cleanedMessage, executedSummary: executed }
}

/** Parse file path from text before a code block (match FormattedMessage logic). */
function parseFilePathFromPrecedingText(text: string): string | null {
  if (!text?.trim()) return null
  const trimmed = text.trim()
  const extPattern = /\.(?:tsx?|jsx?|css|html|json|md|py|yml|yaml|env)$/i
  const candidates: { full: string; index: number }[] = []
  let m: RegExpExecArray | null
  const backtickRegex = /`([^`]+)`/g
  while ((m = backtickRegex.exec(trimmed)) !== null) {
    const full = m[1].trim()
    if (extPattern.test(full) || full.includes('/') || /^[a-zA-Z0-9_.-]+$/.test(full)) {
      candidates.push({ full, index: m.index })
    }
  }
  const boldRegex = /\*\*([^*]+)\*\*/g
  while ((m = boldRegex.exec(trimmed)) !== null) {
    const full = m[1].trim()
    if (extPattern.test(full) || full.includes('/')) candidates.push({ full, index: m.index })
  }
  const pathLikeRegex = /([\w./-]+\.(?:tsx?|jsx?|css|html|json|md|py|yml|yaml|env))\s*:?\s*$/gm
  while ((m = pathLikeRegex.exec(trimmed)) !== null) {
    candidates.push({ full: m[1].trim(), index: m.index })
  }
  if (candidates.length === 0) return null
  const last = candidates.reduce((best, c) => (c.index >= best.index ? c : best))
  return last.full
}

/** Find all code blocks and parse path from preceding text; return [{ path, content }]. */
function extractCodeBlocksWithPaths(message: string): Array<{ path: string; content: string }> {
  const out: Array<{ path: string; content: string }> = []
  const codeBlockRegex = /```([\w-]*)\n([\s\S]*?)```/g
  let lastEnd = 0
  let match: RegExpExecArray | null
  while ((match = codeBlockRegex.exec(message)) !== null) {
    const preceding = message.slice(lastEnd, match.index)
    const content = (match[2] || '').trimEnd()
    lastEnd = codeBlockRegex.lastIndex
    const path = parseFilePathFromPrecedingText(preceding)
    if (path && content.length > 0) out.push({ path, content })
  }
  return out
}

/** Save all extracted code blocks to legal sandbox. */
async function saveCodeBlocksToSandbox(
  projectId: string,
  message: string
): Promise<{ saved: string[] }> {
  const blocks = extractCodeBlocksWithPaths(message)
  const saved: string[] = []
  for (const { path, content } of blocks) {
    const res = await upsertLegalSandboxFile(projectId, path, content)
    if (res.ok) saved.push(path)
  }
  return { saved }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    if (!projectId || !ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    const project = await getSandboxProject(projectId)
    if (!project) {
      return NextResponse.json({ error: 'Sandbox project not found' }, { status: 404 })
    }
    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const accessDenied = await requireAppAccess(session)
    if (accessDenied) return accessDenied
    const tokenExhausted = await requireTokenBalance(session)
    if (tokenExhausted) return tokenExhausted

    let repoPaths: string[] = []
    if (project.repository?.owner && project.repository?.name) {
      try {
        const repoFiles = await getOrCloneRepository(project.repository.owner, project.repository.name, projectId)
        repoPaths = (repoFiles || []).map((f) => f.path)
      } catch {
        // optional
      }
    }

    const sandboxFiles = await listLegalSandboxFiles(projectId)
    const sandboxFilePaths = sandboxFiles.map((f) => (f.path ? `${f.path}/${f.filename}` : f.filename))

    let analysisContext = ''
  let structuredSummary = ''
    try {
      const client = await clientPromise
    const doc = await client.db(DB_NAME).collection('sandboxAnalyses').findOne(
      { projectId: new ObjectId(projectId) },
      { projection: { repositoryAnalysis: 1 } }
    )
    const ra = doc?.repositoryAnalysis as
      | { projectAnalysis?: string; fileAnalyses?: Array<{ path: string; analysis: string }>; structuredAnalysis?: any }
      | undefined
      if (ra?.projectAnalysis) analysisContext = ra.projectAnalysis
      else if (Array.isArray(ra?.fileAnalyses) && ra.fileAnalyses.length)
        analysisContext = ra.fileAnalyses.map((f) => `${f.path}: ${f.analysis}`).join('\n\n')
    if (ra?.structuredAnalysis) {
      const sa = ra.structuredAnalysis as any
      const identity = sa.identity || {}
      const ideation = sa.ideation_alignment || {}
      const matched = Array.isArray(ideation.matched_capabilities) ? ideation.matched_capabilities : []
      const missing = Array.isArray(ideation.missing_capabilities) ? ideation.missing_capabilities : []
      const subsystems = Array.isArray(sa.architecture_summary?.subsystems)
        ? sa.architecture_summary.subsystems
        : []
      const routes = Array.isArray(sa.route_map) ? sa.route_map : []

      const lines: string[] = []
      lines.push('Identity & architecture:')
      lines.push(
        `- Repo name: ${identity.repo_name || '(unknown)'}`,
        `- Primary languages: ${(identity.primary_languages || []).join(', ') || '(none)'}`,
        `- Frameworks: ${(identity.detected_frameworks || []).join(', ') || '(none)'}`,
      )
      if (subsystems.length) {
        lines.push('- Subsystems (partial): ' + subsystems.slice(0, 3).map((s: any) => s.name || '(unnamed)').join(', '))
      }
      if (routes.length) {
        lines.push('- Routes (partial): ' + routes.slice(0, 5).map((r: any) => r.route || '').join(', '))
      }
      if (ideation.normalized_requirements?.product_summary) {
        lines.push(`- Ideation product summary: ${ideation.normalized_requirements.product_summary}`)
      }
      lines.push(
        `- Matched capabilities: ${matched.length}`,
        `- Missing capabilities: ${missing.length}`,
      )
      structuredSummary = lines.join('\n')
    }
    } catch {
      // optional
    }

    // User uploads (sandbox-parity: same "MUST use" rule as enhanced-chat)
    let userUploadsSummary = ''
    let repoTypeRules = ''
    let likelyRemaining = ''
    try {
      const uploadsClient = await clientPromise
      const uploads = await uploadsClient.db(DB_NAME).collection('legalSandboxFiles').find(
        { projectId: new ObjectId(projectId), 'metadata.generatedBy': 'user_upload' },
        { projection: { path: 1, filename: 1, metadata: 1 } }
      ).toArray() as Array<{ path?: string; filename?: string; metadata?: { purpose?: string } }>
      const images = uploads.filter((u) => u.metadata?.purpose === 'image').map((u) => (u.path ? `${u.path}/${u.filename}` : u.filename).trim()).filter(Boolean)
      const docs = uploads.filter((u) => u.metadata?.purpose === 'reference_doc').map((u) => (u.path ? `${u.path}/${u.filename}` : u.filename).trim()).filter(Boolean)
      const lines: string[] = []
      if (images.length) lines.push(`Images (use these paths in your code): ${images.join(', ')}`)
      if (docs.length) lines.push(`Reference docs (use for requirements or copy): ${docs.join(', ')}`)
      if (lines.length) userUploadsSummary = lines.join('\n')
    } catch {
      // optional
    }

    // Repo type rules (sandbox-parity: same category rules as enhanced-chat)
    try {
      const ra = await (await clientPromise).db(DB_NAME).collection('sandboxAnalyses').findOne(
        { projectId: new ObjectId(projectId) },
        { projection: { 'repositoryAnalysis.structuredAnalysis': 1 } }
      ) as { repositoryAnalysis?: { structuredAnalysis?: { identity?: any } } } | null
      const sa = ra?.repositoryAnalysis?.structuredAnalysis
      const detected = detectRepoType({
        identity: sa?.identity,
        filePaths: repoPaths.length ? repoPaths : sandboxFilePaths,
        mainLanguages: {},
      })
      repoTypeRules = getMandatoryRepoTypeRules(detected.category, detected.label, detected.hints)
    } catch {
      // optional: fallback generic
      const detected = detectRepoType({ filePaths: sandboxFilePaths, mainLanguages: {} })
      repoTypeRules = getMandatoryRepoTypeRules(detected.category, detected.label, detected.hints)
    }

    // Likely remaining (sandbox-parity: focus on unimplemented when user asks for progress)
    try {
      const remDoc = await (await clientPromise).db(DB_NAME).collection('sandboxAnalyses').findOne(
        { projectId: new ObjectId(projectId) },
        { projection: { 'repositoryAnalysis.structuredAnalysis': 1 } }
      ) as { repositoryAnalysis?: { structuredAnalysis?: { route_map?: Array<{ route?: string }>; ideation_alignment?: { missing_capabilities?: string[] } } } } | null
      const sa = remDoc?.repositoryAnalysis?.structuredAnalysis
      const routes = (sa?.route_map || []).map((r) => r.route).filter(Boolean) as string[]
      const missing = (sa?.ideation_alignment?.missing_capabilities || []) as string[]
      const notYetInSandbox = [...routes.filter((r) => !sandboxFilePaths.some((f) => f.includes(r || ''))), ...missing].slice(0, 20)
      if (notYetInSandbox.length) likelyRemaining = notYetInSandbox.join('\n')
    } catch {
      // optional
    }

  const systemPrompt = buildLegalSandboxSystemPrompt(project, repoPaths, sandboxFilePaths, analysisContext, structuredSummary, userUploadsSummary, repoTypeRules, likelyRemaining)

    const history: Array<{ role: 'user' | 'assistant'; content: string }> = []
    if (Array.isArray(body.messages) && body.messages.length > 0) {
      for (const m of body.messages.slice(-MAX_HISTORY)) {
        const role = m.role === 'assistant' ? 'assistant' : 'user'
        const content = typeof m.content === 'string' ? m.content.trim() : ''
        if (content) history.push({ role, content })
      }
    }
    history.push({ role: 'user', content: message })

    const { getAnthropicApiKey } = await import('@/lib/anthropicConfig')
    if (!getAnthropicApiKey()) {
      return NextResponse.json(
        { error: 'G.R.I.P. AI is not configured. Set ANTHROPIC_API_KEY in your deployment (e.g. Vercel env vars or .env.local in dev).' },
        { status: 503 }
      )
    }

    try {
      await anthropicService.initialize()
    } catch (initErr) {
      return NextResponse.json(
        { error: 'G.R.I.P. AI is temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    let aiMessage: string
    let tokenUsageTotal = 0
    try {
      const response = await anthropicService.createMessage(
        history.map((m) => ({ role: m.role, content: m.content })),
        { system: systemPrompt }
      )
      aiMessage = (response?.content && String(response.content).trim()) || ''
      tokenUsageTotal = response?.usage?.totalTokens ?? (response?.usage?.promptTokens ?? 0) + (response?.usage?.completionTokens ?? 0)
    } catch (apiErr) {
      console.error('Legal-sandbox chat API error:', apiErr)
      return NextResponse.json(
        { error: 'G.R.I.P. AI is temporarily unavailable. Please try again in a moment.' },
        { status: 503 }
      )
    }

    if (!aiMessage || aiMessage.length < 2) {
      aiMessage = 'I could not generate a response right now. Please try again or rephrase.'
    }

    if (tokenUsageTotal > 0 && session.user?.id) {
      await addTokenUsage(session.user.id, tokenUsageTotal).catch((err) =>
        console.warn('Legal-sandbox chat: failed to record token usage', err)
      )
    }

    const backtickCount = (aiMessage.match(/```/g) || []).length
    if (backtickCount % 2 !== 0) {
      aiMessage = aiMessage.trimEnd() + '\n```'
    }

    let executedSummary: string[] = []
    try {
      const { cleanedMessage, executedSummary: summary } = await parseAndExecuteSandboxGripActions(projectId, aiMessage)
      aiMessage = cleanedMessage
      executedSummary = summary
      if (executedSummary.length > 0) {
        aiMessage = aiMessage + (aiMessage ? '\n\n' : '') + '**Done:** ' + executedSummary.join('; ')
      }
    } catch {
      // non-fatal
    }

    const { saved } = await saveCodeBlocksToSandbox(projectId, aiMessage)
    const appliedPaths: string[] = saved

    let runErrors: string[] = []
    const runAfterApply = body.runAfterApply !== false // default: run when files changed (same as enhanced-chat)
    let buildRan = false
    let buildSucceeded = false
    if (runAfterApply && saved.length > 0) {
      try {
        const runResult = await runSandboxProject(projectId)
        buildRan = true
        buildSucceeded = runResult.success
        if (!runResult.success && runResult.errors.length > 0) {
          runErrors = runResult.errors
        }
      } catch (runErr) {
        console.warn('Sandbox run-after-apply failed:', runErr)
      }
    }

    if (saved.length > 0) {
      const appliedLine = `**Applied:** ${saved.join(', ')}.`
      const buildLine = buildRan
        ? buildSucceeded
          ? ' **We ran the build; it succeeded.** Use **Run in StackBlitz** to preview in the browser, or tell me what to change or paste any errors.'
          : ' **We ran the build; it reported errors (see below).** I\'ll use them as the next step to fix the code.'
        : ' Use **Run in StackBlitz** to preview, or tell me what to change or paste any errors.'
      aiMessage = aiMessage + (aiMessage ? '\n\n' : '') + appliedLine + buildLine
    }

    // Persist chat history so it survives refresh (sandbox-only collection)
    try {
      const client = await clientPromise
      const db = client.db(DB_NAME)
      const coll = db.collection(SANDBOX_CHAT_HISTORY_COLLECTION)
      const doc = await coll.findOne({ projectId }, { projection: { messages: 1 } })
      const existing = Array.isArray(doc?.messages) ? doc.messages : []
      const next = [...existing, { role: 'user' as const, content: message }, { role: 'assistant' as const, content: aiMessage }].slice(-MAX_PERSISTED_MESSAGES)
      await coll.updateOne(
        { projectId },
        { $set: { projectId, messages: next, updatedAt: new Date() } },
        { upsert: true }
      )
    } catch (persistErr) {
      console.error('Sandbox chat history persist error:', persistErr)
      // non-fatal: still return the reply
    }

    return NextResponse.json({
      message: aiMessage,
      appliedPaths,
      runErrors: runErrors.length > 0 ? runErrors : undefined,
      buildRan: runAfterApply && saved.length > 0 ? buildRan : undefined,
      buildSucceeded: runAfterApply && saved.length > 0 ? buildSucceeded : undefined,
    })
  } catch (error) {
    console.error('Legal-sandbox chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Something went wrong.' },
      { status: 500 }
    )
  }
}
