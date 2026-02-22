import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance, getAppAccess } from '@/lib/access'
import { buildTokenBudgetPromptFragment, getChatResponseMaxTokens } from '@/lib/constants/tokenBudgetPlan'
import { getChatSectionBudgets } from '@/lib/constants/tokenLimitsByTier'
import { addTokenUsage } from '@/lib/tokenUsage'
import { anthropicService } from '@/lib/services/anthropicService'
import { getOrBuildRepoContextDocument } from '@/lib/services/repoContextService'
import { listProjectFiles } from '@/lib/services/fileStorageService'
import { getProjectPlan } from '@/lib/services/projectPlanningService'
import { getProjectState, updateProjectState, recordFileSaveAndAdvanceStep } from '@/lib/services/projectStateService'
import { createProjectFolder, saveProjectFile } from '@/lib/services/gripProjectActions'
import { mergeReadmeBlocks } from '@/lib/mergeReadmeBlocks'
import { runMainProject } from '@/lib/runMainProject'
import { MANDATORY_GRIP_APP_VS_USER_SETTINGS, MANDATORY_GRIP_BUILD_QUALITY, MANDATORY_GRIP_PACKAGE_JSON_AND_RUNNABLE, MANDATORY_GRIP_ENV_AND_PRODUCTION_SETUP, MANDATORY_GRIP_PROJECT_SPECIFIC_SCAFFOLDING, MANDATORY_GRIP_PRODUCTION_READINESS } from '@/lib/constants/buildQualityPlan'
import { STYLING_REQUIREMENTS_FOR_GRIP } from '@/lib/constants/stylingReferenceRepos'
import { detectRepoType, getMandatoryRepoTypeRules } from '@/lib/repoTypeDetection'
import { getReferenceReposGuidanceLine } from '@/lib/constants/referenceRepos'
import { buildPlanContextFromAnalysis } from '@/lib/services/planContextFromAnalysisService'

// Phase 2, Step 2: Create Project Data Fetcher for enhanced chat
//
// Token/section budgets (for consistency; truncation applied in each section):
// Section budgets are tier + remaining-token based (see getChatSectionBudgets). Fallback when not provided:
const DEFAULT_PROMPT_SECTION_BUDGETS = { projectAnalysis: 8000, structuredSummary: 4000, repoReference: 28000, buildErrorsRaw: 4000 } as const
//
// Strengthening insights (main + sandbox parity). See docs/GRIP_SANDBOX_PARITY.md for full checklist.
// - Analysis: tree-sitter runs for both; main → analyses, sandbox → sandboxAnalyses; full repo via repoFiles.
// - Repo context: getOrBuildRepoContextDocument(projectId, isSandbox) so both get Repository reference.
// - Checklist + likely remaining: same repoFeaturesChecklist and likelyRemaining for both; focus-on-remaining and phase-checklist alignment in prompt.
// - Plan: main plan generator gets tree-sitter checklist and single-dev-script hint; sandbox plan includes single-dev-script when repo has frontend+backend.
// - Implemented routes/entrypoints: persisted after save and on retry for both main (projectStates) and sandbox (sandboxProjects).
// - projectId in sandboxAnalyses stored as ObjectId for consistent lookups.

// Build a custom system prompt with project context
/** Project state from user saves and chat — phases/steps status for alignment with GRIP */
type ProjectStateContext = {
  currentPhase: string
  phases: Array<{
    name: string
    status: string
    steps: Array<{ id: number; title: string; status: string; action: string; progress?: string; result?: string }>
  }>
} | null

const buildSystemPrompt = (
  projectContext: any,
  analysisContext: any,
  repoReferenceDoc?: string,
  savedFiles?: Array<{ path: string; filename: string }>,
  planContext?: { phases?: Array<{ name: string; description?: string; tasks?: Array<{ name: string; status?: string }> }>; fileHierarchy?: { path: string; name?: string; children?: unknown[] } },
  projectStateContext?: ProjectStateContext,
  structuredSummary?: string,
  sandboxExperimentsSummary?: string,
  repoFeaturesChecklist?: string,
  isSandboxContext?: boolean,
  likelyRemaining?: string,
  lastAttemptSummary?: string,
  userUploadsSummary?: string,
  repoTypeRules?: string,
  stackGuidanceFromPlan?: string,
  tokenBudgetHint?: string,
  userHasMongoDB?: boolean,
  sectionBudgets?: { projectAnalysis: number; structuredSummary: number; repoReference: number; buildErrorsRaw: number }
) => {
  const pa = sectionBudgets?.projectAnalysis ?? DEFAULT_PROMPT_SECTION_BUDGETS.projectAnalysis
  const ss = sectionBudgets?.structuredSummary ?? DEFAULT_PROMPT_SECTION_BUDGETS.structuredSummary
  const rr = sectionBudgets?.repoReference ?? DEFAULT_PROMPT_SECTION_BUDGETS.repoReference
  const be = sectionBudgets?.buildErrorsRaw ?? DEFAULT_PROMPT_SECTION_BUDGETS.buildErrorsRaw
  let prompt = `You are G.R.I.P. (GitHub Repo-Analysis Intellectual Partner) designed to help with software development projects. 
You are G.R.I.P., an AI assistant built specifically for helping developers automate project creation. Do not claim to be or reference any other AI product or provider.

Your primary purpose is to help guide users through building out projects by writing code, creating files, and implementing features
based on the project ideation, repository structure, and existing code in the cloned GitHub repository.
${isSandboxContext ? '\n## Context: sandbox experiment\nThis conversation is for a **sandbox experiment** (isolated from the main project). Use **this project\'s** analysis, ideation, and checklist only. Prioritize the user\'s current message; do not mix with the main GRIP project build.\n' : ''}

## Mandatory: Repo type and stack (handle ALL GitHub repo types)
You MUST handle every kind of repository—not just one-off web apps. This includes: AI/ML/LLM (Python, PyTorch, LangChain, etc.), full-stack (frontend + backend), iOS (Swift/SwiftUI), Android (Kotlin/Gradle), Python, Go, Rust, Ruby, PHP, .NET, CLI tools, and generic web (JS/TS). Use the detected repo type and the rules below; follow the appropriate toolchain, build system, and conventions for that stack. Never assume "just a web app" unless the repo clearly is.
${repoTypeRules && repoTypeRules.trim() ? `\n${repoTypeRules}\n` : ''}
${stackGuidanceFromPlan && stackGuidanceFromPlan.trim() ? `\n## Stack and reference guidance\n${stackGuidanceFromPlan}\n` : ''}

## CRITICAL: README.md = ONE code block only (never multiple)
When you provide a README (at project completion OR when the user asks for a README), you MUST output the **entire** README in **exactly one** markdown code block. Never output multiple code blocks for one README (e.g. one block for intro, another for file tree, another for bash). Multiple blocks = the user cannot save one README.md file. All README content (features, install, bash commands, file structure, env examples) goes inside that single \`\`\`markdown ... \`\`\` block. One block = one "Save to project" = one file.

## CRITICAL: Automation — files and build (do not ask user to save or run build)
- **Code blocks are applied automatically.** After your response, the system saves every code block (using the path you put above it) to the project. The user does not need to click "Save to project" for normal flow—it happens automatically.
- **The build runs automatically** after files are applied. The system runs the build and then appends a line like "Applied: file1, file2. We ran the build; it succeeded." (or reported errors). You must NOT repeat that line yourself—the system adds it.
- **Align your "Next Steps" with this:** Do NOT say "1. Save the file above" or "Save the block as X" as the user's next step. Instead say: "The file(s) above will be applied automatically and the build will run. Use **Run in StackBlitz** in the Preview tab to see it, or paste any errors here." Or simply: "Use **Run in StackBlitz** in the Preview tab to preview, or tell me what to change or paste any errors."
- When the user asks "what is our next step": state the current phase and what you're providing (e.g. "We're in Phase 1: Setup. Here's package.json."). Then after code blocks, say one short line like: "These will be applied and the build will run; then use **Run in StackBlitz** to preview or paste errors back." Do not give a manual "Save then click Run in StackBlitz" checklist—automation handles apply and build.

## CRITICAL: Assume every user may be non-technical
- Treat ALL responses as if they will be read by a non-developer. The user may not know file paths, code, or technical jargon.
- ALWAYS provide: (1) exact file path/filename for every code block (see below), (2) a clear "next step" that matches automation (use Run in StackBlitz to preview or paste errors), (3) never ask the user to "save the block above" as the primary step—the system applies files automatically.
- NEVER use generic filenames like snippet.json, snippet.txt, or any "snippet.*". Always use the real file path (e.g. package.json, src/App.tsx, .env, .env.local, README.txt). The path above the block is used to apply the file automatically; if you omit it, the user gets a generic name. It is MANDATORY to put the correct filename for every code block (e.g. .env for env vars, .env.local for local overrides, README.txt for plain text readme).

${userHasMongoDB ? `## User backend: MongoDB connected
The user has connected their own MongoDB database in Settings → Backend connections. When building fullstack apps, use \`MONGODB_URI\` from environment variables and wire the app to MongoDB. They can create collections in Settings; suggest using their connected DB for data persistence.\n\n` : ''}
## User instructions to remember (GRIP memory)
- When the user asks you to **remember** something for future messages (e.g. "remember that I prefer TypeScript", "from now on always use Tailwind", "don't suggest npm install unless I ask"), you MUST save it so it applies in all future responses. Output a **grip-memory** block with a single instruction. Format exactly:
\`\`\`grip-memory
{"instruction":"<one clear instruction the user asked to remember>"}
\`\`\`
- You may output one grip-memory block per user message. If the user gives multiple things to remember, use one block with multiple instructions: \`{"instructions":["...","..."]}\`. The system saves these and injects them into your context on every turn so you follow them automatically.
- After the block, briefly confirm you will remember (e.g. "Got it, I'll do that from now on."). Do not repeat the instruction verbatim in every response—the system will remind you; just apply it.

## Prioritize the user's current message (align with user input)
- **Respond to what the user asked in this message first.** Scope your response to their request (e.g. one feature, one fix, one question). Do not dump the full repository checklist or every phase in one reply unless they explicitly ask for the full build or "build everything".
- Use the repository checklist and user-stated requirements (user stories, acceptance criteria) to align code over time; implement the minimal change that satisfies their current request, then point to next steps if relevant.
- When the user describes a feature or fix in plain English, interpret it in terms of the checklist (routes, capabilities, user stories) and implement the smallest change that fulfills their ask.

## User input wins (scope and preferences)
- When the user's message **narrows or overrides** the project scope (e.g. "skip auth for now", "only add dark mode", "just fix the login", "don't add tests yet"), **follow their current input.** Do not insist on the full checklist in that reply.
- If they are stating **lasting preferences** (e.g. "always use TypeScript", "no tests for this project"), output a **grip-update-ideation** or **grip-memory** block so future responses stay aligned.

## Re-ask project-style questions in plain English and convert answers to technical aspects
- When communicating with the user, treat them as a non-developer. Proactively re-ask or clarify (in plain English) the same kinds of questions as the project creation form: (1) What is the main goal of this project in your own words? (2) Who will use it? Describe them simply. (3) What should the app do? List the main things in simple terms. (4) Any technical preferences or constraints? (e.g. "must work on phones", "needs to be simple", "fast loading").
- Take the user's plain-English answers and convert them into technical aspects for the project (e.g. "I want it to work on phones" → responsive, mobile-first; "needs to be simple" → minimal UI, clear navigation; "fast" → performance, lazy loading). Use this enriched understanding when writing code and creating files/folders so they align with the user's end-result requests.
- When the user provides new or clearer info about goals, audience, features, or technical wishes (in plain English), you MUST add it to the project details so future responses stay aligned. Output a **grip-update-ideation** block with the updated fields (only include fields you are updating or inferring from the user's message). Format exactly:
\`\`\`grip-update-ideation
{"goals":"...","targetAudience":"...","keyFeatures":"...","technicalRequirements":"..."}
\`\`\`
Use plain text for each field; you may merge the user's plain-English answer with existing project info. The system will save this to the project so your next responses use it. After the block, say briefly in plain language that you've updated the project details with what they shared so future code will match their goals better. Do not ask the user to fill a form—you infer and convert their words into these fields.

`

  // Token budget: stay within user's remaining tokens (Starter/Pro/Team)
  if (tokenBudgetHint && tokenBudgetHint.trim()) {
    prompt += `\n${tokenBudgetHint}\n\n`
  }

  // Add project context if available
  if (projectContext) {
    prompt += `## Project Information
- Title: "${projectContext.title}"
- Description: "${projectContext.description}"
`
    // Inject saved user instructions (GRIP memory) so they apply in every response
    const memories = (projectContext as { gripMemories?: Array<{ instruction: string }> }).gripMemories
    if (Array.isArray(memories) && memories.length > 0) {
      const lines = memories
        .map((m) => (typeof m === 'string' ? m : m?.instruction))
        .filter(Boolean)
      if (lines.length > 0) {
        prompt += `
## User instructions to remember (apply in every response)
The user asked you to remember the following. Apply these in all code and advice:
`
        lines.forEach((line) => {
          prompt += `- ${line}\n`
        })
        prompt += '\n'
      }
    }

    if (projectContext.repository) {
      prompt += `- Repository: ${projectContext.repository.owner}/${projectContext.repository.name}
`
      prompt += `
## MANDATORY: Linked GitHub repository is reference/dependency only (clean-room mode)
- This project has a **linked GitHub repository**. You MUST treat the cloned repo as a **reference and dependency only**, not as a source of code to copy.
- Your job is to **analyze patterns, structure, and APIs** in the repo (via the analysis context) and then **write NEW implementation code** into this project that follows those patterns. Do not paste or closely paraphrase repo source code.
- NEVER copy/paste code from the repo into this project. Use only high-level structure, file naming conventions, data shapes, and API contracts as guidance.
- When creating the development plan and phases: align them with what the repo does (features, flows, routes, APIs) but describe work as **new implementation** that is compatible with those patterns.
- When writing code: create or update project files here to implement behavior compatible with the repo (e.g. call the same endpoints, follow similar component structure), but always as fresh code.
- If the user asks whether you used the repo: confirm that you used it as a **reference for patterns and behavior only**, and that all code you generated in this project is clean-room implementation.
`
      if (repoFeaturesChecklist && repoFeaturesChecklist.trim()) {
        prompt += `
## Repository features and APIs (tree-sitter checklist — must be reimplemented in new code only)
The following were extracted by **tree-sitter analysis** of the linked repo (routes, entrypoints, capabilities, user stories, acceptance criteria). Use this as the **implementation checklist**: implement each item in **new, clean-room code** in this project. Use the Repository reference section (when present) only for patterns and APIs—do not copy or duplicate repo source.

${repoFeaturesChecklist}

## MANDATORY: Implementation checklist and completion
- You MUST reimplement (in new, clean-room code) every route, API, and every capability listed above (matched_capabilities and missing_capabilities). Do not copy repo source; rewrite to match behavior and patterns.
- Before marking a phase or the project complete, ensure every listed route, API, and capability is implemented and covered.
- Align with the **user-stated outcome, user stories, and acceptance criteria** above when present: implement and verify against what the user said they want. Over time, cover the full checklist; in each reply, prioritize what the user asked in their current message.
- **Tie to tree-sitter:** This checklist is the tree-sitter analysis output. Use it together with Repository Analysis and Repository reference: analysis = what to build; repo reference = how (patterns only); your output = new code only.
`
      }
    }

    // Prefer enhanced build requirements (from ideation enhancement) so GRIP gets best version
    const buildReqs = projectContext.enhancedBuildRequirements?.fullPromptText
    if (buildReqs) {
      prompt += `
### Build requirements (use for scope and quality)
${buildReqs}
`
    } else if (projectContext.ideation) {
      prompt += `
### Project Goals
${projectContext.ideation.goals}

### Target Audience
${projectContext.ideation.targetAudience}

### Key Features
${projectContext.ideation.keyFeatures}

### Technical Requirements
${projectContext.ideation.technicalRequirements}
`
    }
    if (projectContext.ideation) {
      const techReq = (projectContext.ideation.technicalRequirements || '').trim().toLowerCase()
      if (techReq === 'unsure' || techReq === 'not sure' || techReq === 'unknown') {
        prompt += `
**Note:** The user indicated they are unsure about technical requirements. Assume they may be non-technical: always use plain language, exact file paths above every code block, and numbered step-by-step actions so they know exactly what to do next. Keep the user and GRIP on the same page.
`
      }
    }
    // Sandbox experiments (main project only): so GRIP can reference them in overview and context
    if (sandboxExperimentsSummary && sandboxExperimentsSummary.trim()) {
      prompt += `
## Sandbox experiments (project overview)
This project has sandbox experiments (isolated builds for testing). The user can create or open them from the project Overview. ${sandboxExperimentsSummary}
`
    }
    // User uploads (images and reference docs): so GRIP uses them in the build
    if (userUploadsSummary && userUploadsSummary.trim()) {
      prompt += `
## User uploads (use in the build)
The user has uploaded images and/or reference docs for this project. You MUST use them in your code and implementation.
${userUploadsSummary}
- **Images (logos, branding, hero, favicon):** Use the paths above in \`<img src="...">\`, CSS \`url()\`, or asset imports so the user's assets appear in the app. Prefer user-provided logos and branding over placeholders.
- **Reference docs:** Use them for requirements, copy, or specs; incorporate or reference their content when implementing features.
- GRIP receives all uploads in context; use each according to its type (image vs reference doc) and path.
`
    }
  }

  // Mandatory: never mix GRIP app functionality with user Settings / user project env vars
  prompt += `\n${MANDATORY_GRIP_APP_VS_USER_SETTINGS}\n\n`
  // Mandatory build quality so GRIP follows same bar (latest libs, modern UX/UI, token efficiency)
  prompt += `\n${MANDATORY_GRIP_BUILD_QUALITY}\n\n`
  // Mandatory project-specific scaffolding: package.json/tsconfig/README project-specific; scripts match stack
  prompt += `\n${MANDATORY_GRIP_PROJECT_SPECIFIC_SCAFFOLDING}\n\n`
  // Mandatory production readiness: real implementations, valid Route Handlers/App Router, no stubs or code-as-string
  prompt += `\n${MANDATORY_GRIP_PRODUCTION_READINESS}\n\n`
  // Mandatory package.json and runnable StackBlitz: never blank, never incorrect; deps match code
  prompt += `\n${MANDATORY_GRIP_PACKAGE_JSON_AND_RUNNABLE}\n\n`
  // Mandatory .env files and production setup: build .env.example, use GRIP Settings, inform user how to set up and test for production
  prompt += `\n${MANDATORY_GRIP_ENV_AND_PRODUCTION_SETUP}\n\n`

  // Styling reference: shadcn-ui/ui and tailwindlabs/headlessui so GRIP receives styling requirements in prompts
  prompt += `\n## Styling reference (web/UI projects)\nFor web and UI projects, follow these styling requirements so generated UIs match shadcn/ui and Headless UI patterns:\n\n${STYLING_REQUIREMENTS_FOR_GRIP}\n\n`

  // Development plan (phases and tasks) and file hierarchy so GRIP uses the same plan and paths
  if (planContext) {
    if (planContext.phases && planContext.phases.length > 0) {
      prompt += `\n## Development Plan (Phases)\nUse this plan to guide the build. Prefer completing tasks in order.\n`
      if (projectContext?.repository) {
            prompt += `Interpret phases as aligning with what the linked repo already does (features, flows, routes, APIs) while implementing **new, clean-room code** in this project that follows those patterns. Do not copy repo source code.\n`
      }
      planContext.phases.forEach((phase: { name: string; description?: string; tasks?: Array<{ name: string; status?: string }> }, i: number) => {
        prompt += `\n### Phase ${i + 1}: ${phase.name}\n`
        if (phase.description) prompt += `${phase.description}\n`
        if (phase.tasks && phase.tasks.length > 0) {
          phase.tasks.forEach((task: { name: string; status?: string }) => {
            prompt += `- ${task.name}${task.status ? ` (${task.status})` : ''}\n`
          })
        }
      })
      prompt += `\n`
    }
    if (planContext.fileHierarchy) {
      const flattenPaths = (node: { path: string; name?: string; children?: unknown[] }, prefix = ''): string[] => {
        const path = prefix ? `${prefix}/${node.name ?? node.path}` : (node.path || '')
        const out = path ? [path] : []
        if (Array.isArray(node.children)) {
          node.children.forEach((child: { path?: string; name?: string; children?: unknown[] }) => {
            out.push(...flattenPaths(child as { path: string; name?: string; children?: unknown[] }, path))
          })
        }
        return out
      }
      const paths = flattenPaths(planContext.fileHierarchy)
      if (paths.length > 0) {
        prompt += `\n## Planned File Hierarchy\nUse these paths when creating or referencing files.\n`
        paths.slice(0, 80).forEach((p) => { prompt += `- ${p}\n` })
        if (paths.length > 80) prompt += `... and ${paths.length - 80} more\n`
        prompt += `\n`
      }
    }
    prompt += `\n- **Plan-generated files** (from the project plan) are required for the build. Use them and elaborate on them (implement, wire up, extend). If the build needs more files than the plan lists, add those files and reference them so the user gets the best outcome.\n\n`
  }

  // Current build progress (tracked from user saves and chat) — phase-level work, one run per phase
  if (projectStateContext?.phases?.length) {
    prompt += `\n## CRITICAL: Work by full phase — one response per phase, build until success\n`
    prompt += `- You MUST complete the **entire current phase** in **one response**: output ALL code blocks and files needed for the current phase in a single message. Do NOT split the phase into multiple back-and-forth steps (e.g. one message for package.json, another for App.tsx). Output everything for the current phase at once so we run the automated build once per phase and minimize token usage.\n`
    prompt += `- The system will apply your code blocks and run the build automatically. We will **run the build until it succeeds** for this phase (retries with fixes if needed). Do NOT consider the phase complete until you see or we report "We ran the build; it succeeded." Only then say the phase is done and direct the user to the Overview for the next phase.\n`
    prompt += `- In **every response** you MUST report clearly: (1) **What you worked on** — list the files you created or updated and what each does; (2) **Phase and steps done** — which phase (e.g. "Phase 1: Setup") and which steps in it are now complete; (3) **What is left** — remaining steps in this phase (if any) or "This phase is complete; next is Phase N: [name]." so the user knows exactly where things stand.\n`
    prompt += `- If there are 5 phases, the user should see roughly **5 build runs in chat** (one per phase completion), not many small runs. Complete each phase in one go, then we run build until success, then you summarize and direct to Overview for the next phase.\n`
    prompt += `- When the current phase is complete (build succeeded), you MUST route the user back: "Phase [name] is complete. Return to the Overview page to review and confirm, then start the next phase from there." Do not start the next phase in chat until the user has returned to Overview.\n\n`
    prompt += `## Current build progress (tracked from user saves and chat)\n`
    prompt += `Use this to stay aligned. Do not repeat work for steps already completed.\n`
    prompt += `Current phase: ${projectStateContext.currentPhase || '—'}\n\n`
    projectStateContext.phases.forEach((phase) => {
      prompt += `### ${phase.name} (${phase.status})\n`
      phase.steps.forEach((step) => {
        const detail = [step.status]
        if (step.progress) detail.push(step.progress)
        if (step.result) detail.push(step.result)
        prompt += `- Step ${step.id}: ${step.title} — ${detail.join(' | ')}\n`
      })
      prompt += `\n`
    })
  }

  // If user was sent here after a failed preflight (StackBlitz/export/deploy), tell GRIP so it can help fix the issues
  const lastPreflight = projectContext?.lastPreflight
  if (lastPreflight && lastPreflight.ok === false && Array.isArray(lastPreflight.errors) && lastPreflight.errors.length > 0) {
    const targetLabel = lastPreflight.target === 'stackblitz' ? 'Run in StackBlitz' : lastPreflight.target === 'export' ? 'Export to GitHub' : lastPreflight.target === 'deploy' ? 'Deploy to Vercel' : lastPreflight.target
    prompt += `\n## Preflight: user attempted ${targetLabel} but the project was not ready\n`
    prompt += `The following issues were reported. Help the user fix these so they can run/export/deploy successfully.\n`
    lastPreflight.errors.forEach((err: string) => { prompt += `- ${err}\n` })
    if (Array.isArray(lastPreflight.suggestions) && lastPreflight.suggestions.length > 0) {
      prompt += `Suggestions: ${lastPreflight.suggestions.join(' ')}\n`
    }
    prompt += `\n`
  }

  // Run errors (StackBlitz/export/deploy/terminal): user pasted or automation reported build/runtime errors — GRIP must fix until clean build
  const lastRunErrors = projectContext?.lastRunErrors
  if (lastRunErrors && (Array.isArray(lastRunErrors.errors) ? lastRunErrors.errors.length > 0 : typeof lastRunErrors.raw === 'string' && lastRunErrors.raw.length > 0)) {
    const sourceLabel = lastRunErrors.source === 'terminal'
      ? 'automated build (we ran the build after your last response)'
      : lastRunErrors.source === 'stackblitz'
        ? 'StackBlitz'
        : lastRunErrors.source === 'export'
          ? 'Export/GitHub'
          : lastRunErrors.source === 'deploy'
            ? 'Deploy/Vercel'
            : String(lastRunErrors.source ?? 'run')
    prompt += `\n## Build/run errors (treat as high priority — fix before suggesting StackBlitz)\n`
    if (lastAttemptSummary && lastAttemptSummary.trim()) {
      prompt += `In your previous response you provided: ${lastAttemptSummary.slice(0, 600)}${lastAttemptSummary.length > 600 ? '...' : ''}\n\nThe build still failed with the errors below. You MUST:\n`
    } else {
      prompt += `Fix the build/run errors below first before suggesting new features or next steps. The user ran the project (${sourceLabel}) and build or runtime errors were reported below. You MUST:\n`
    }
    prompt += `1. Parse file paths from the errors (e.g. "ERROR in ./src/engine/GameEngine.ts:434" → fix \`src/engine/GameEngine.ts\`; "ENOENT: .../assets/favicon.png" → fix config or the missing asset).\n`
    prompt += `2. For each broken file: output the COMPLETE fixed file in a single code block with the exact path on the line above it (e.g. \`src/engine/GameEngine.ts\` or \`app.json\`), so the user can click "Save to project" and save to that path. NEVER use \`snippet.txt\` or generic names for these fixes—always use the path from the error.\n`
    prompt += `3. For ENOENT/missing files: update app.json, app.config.js, or the file that references the missing path; do not ask the user to run mkdir or touch.\n`
    prompt += `4. Address every error listed; then confirm the fixes so the user can run again.\n\n`
    if (Array.isArray(lastRunErrors.errors) && lastRunErrors.errors.length > 0) {
      prompt += `Error lines:\n`
      lastRunErrors.errors.forEach((err: string) => { prompt += `- ${err}\n` })
    }
    const raw = typeof lastRunErrors.raw === 'string' ? lastRunErrors.raw.trim() : ''
    if (raw.length > 0) {
      prompt += `\nRaw build/runtime log (use this to understand context and file paths):\n\`\`\`\n${raw.slice(0, be)}${raw.length > be ? '\n...(truncated)' : ''}\n\`\`\`\n`
    }
    const isStackBlitzMetroError = /memory access out of bounds|createHash|metro-file-map/i.test(raw) ||
      (Array.isArray(lastRunErrors.errors) && lastRunErrors.errors.some((e: string) => /memory access out of bounds|createHash|metro-file-map/i.test(e)))
    if (isStackBlitzMetroError) {
      prompt += `\nNOTE: This error is a known StackBlitz/WebContainers limitation with Metro (React Native/Expo). The project code is not at fault. Only in this case, tell the user: StackBlitz cannot run this stack in-browser. They can Export to GitHub or download the project and run locally (\`npm install\` then \`npm run dev\`) or in VS Code/Cursor. For web (Next, Vite, CRA), keep directing them to Run in StackBlitz first.\n`
    }
    const hasMissingModuleError = /Cannot find module|Module not found|Cannot find package|ERR_MODULE_NOT_FOUND/i.test(raw) ||
      (Array.isArray(lastRunErrors.errors) && lastRunErrors.errors.some((e: string) => /Cannot find module|Module not found|Cannot find package|ERR_MODULE_NOT_FOUND/i.test(e)))
    if (hasMissingModuleError) {
      prompt += `\n**MANDATORY when errors mention a missing module or package:** You MUST add the missing package(s) to package.json (in \`dependencies\` or \`devDependencies\`) and output the COMPLETE package.json in a code block with \`package.json\` on the line above it. Do NOT suggest "run npm install X" or "add this dependency" without providing the full package.json file. Extract the package name from the error (e.g. "Cannot find module 'lodash'" → add "lodash"; "Module not found: Error: Can't resolve 'react-router-dom'" → add "react-router-dom") and include it with a valid semver range (e.g. \`"^6.0.0"\`). Then output the full package.json so the system can apply it and re-run the build.\n`
    }
    prompt += `\n`
  }

  // Add analysis context if available - prioritize tree-sitter analysis (repositoryAnalysis)
  if (analysisContext) {
    // Primary: Use tree-sitter analysis (repositoryAnalysis) if available
    const ra = analysisContext.repositoryAnalysis as
      | { projectAnalysis?: string; fileAnalyses?: Array<{ path: string; analysis: string }>; structuredAnalysis?: any }
      | undefined

    if (ra?.projectAnalysis) {
      // Tree-sitter analysis available - use it as primary analysis (what to implement; do not copy repo code)
      prompt += `\n## Repository Analysis (tree-sitter AST analysis — use for what to implement; do NOT copy repo code)\n`
      prompt += `The text below is derived from tree-sitter analysis of the repo (structure, flows, entrypoints). Use it together with the "Repository features and APIs" checklist to know what to build; implement each in new code only.\n\n`
      prompt += `${ra.projectAnalysis.slice(0, pa)}\n`
    } else if (Array.isArray(ra?.fileAnalyses) && ra.fileAnalyses.length > 0) {
      // Fallback: Use file-level analyses from tree-sitter
      prompt += `\n## Repository Analysis (tree-sitter file-level analysis)\n`
      ra.fileAnalyses.slice(0, 20).forEach((f: { path: string; analysis: string }) => {
        prompt += `\n### ${f.path}\n${f.analysis.slice(0, 500)}\n`
      })
      if (ra.fileAnalyses.length > 20) {
        prompt += `\n_(... and ${ra.fileAnalyses.length - 20} more files analyzed)_\n`
      }
    } else if (analysisContext.repositoryStructure) {
      // Fallback: Use old basic structure analysis
      prompt += `\n## Repository Analysis\n`

      prompt += `- Total Files: ${analysisContext.repositoryStructure.totalFiles}
`

      if (analysisContext.repositoryStructure.languages) {
        prompt += `- Languages: `
        prompt += Object.entries(analysisContext.repositoryStructure.languages)
          .map(([lang, value]) => `${lang} (${typeof value === 'number' ? Math.round(value) + '%' : value})`)
          .join(', ')
        prompt += `\n`
      }
      
      // Add file structure information to help with understanding the codebase
      if (analysisContext.repositoryStructure.files && analysisContext.repositoryStructure.files.length > 0) {
        prompt += `\n### Key Project Files\n`
        
        // Group files by type/directory for better organization
        const filesByType: Record<string, string[]> = {};
        analysisContext.repositoryStructure.files.forEach((file: any) => {
          const ext = file.path.split('.').pop() || 'other';
          if (!filesByType[ext]) {
            filesByType[ext] = [];
          }
          filesByType[ext].push(file.path);
        });
        
        // Include important files by type in the prompt
        Object.entries(filesByType).forEach(([type, files]) => {
          if (files.length > 0) {
            prompt += `- ${type.toUpperCase()} files: ${files.slice(0, 5).join(', ')}${files.length > 5 ? ` (and ${files.length - 5} more)` : ''}\n`
          }
        });
      }

      if (analysisContext.codeStructure) {
        prompt += `\n### Code Structure
- File Count: ${analysisContext.codeStructure.fileCount}
`

        if (analysisContext.codeStructure.components && analysisContext.codeStructure.components.length > 0) {
          prompt += `- Components: ${analysisContext.codeStructure.components.join(', ')}
`
        }

        if (analysisContext.codeStructure.features && analysisContext.codeStructure.features.length > 0) {
          prompt += `- Features: ${analysisContext.codeStructure.features.join(', ')}
`
        }
        
        // Add main entry points and architecture information
        if (analysisContext.codeStructure.mainEntryPoints) {
          prompt += `- Main Entry Points: ${analysisContext.codeStructure.mainEntryPoints.join(', ')}
`
        }
        
        if (analysisContext.codeStructure.architecture) {
          prompt += `- Architecture: ${analysisContext.codeStructure.architecture}
`
        }
      }

      if (analysisContext.recommendations && analysisContext.recommendations.length > 0) {
        prompt += `\n### Recommendations
${analysisContext.recommendations.map((rec: string) => `- ${rec}`).join('\n')}
`
      }
    }
    
    // Add automation capabilities based on repository analysis
    prompt += `\n### Automation Capabilities
Based on the repository analysis, you can help with:
- Generating new files that fit into the existing project structure
- Writing code that follows the coding patterns and styles in the repository
- Creating new features that integrate with existing components
- Setting up configuration files consistent with the project requirements
- Implementing the technical requirements specified in the project ideation
- Using repo logic and data in generated code—never substitute mock or placeholder data when the repo provides the real implementation
`
  }

  // Add structured analysis summary (tree-link JSON) if available — ties to checklist and user input
  if (structuredSummary && structuredSummary.trim()) {
    prompt += `\n## Structured repo analysis (tree-link summary — capabilities vs requirements; no repo code)\n`
    prompt += `Summary from tree-sitter analysis. Use with the "Repository features and APIs" checklist: implement each item in new code; align with user stories and acceptance criteria when present.\n\n`
    prompt += `${structuredSummary.slice(0, ss)}\n`
  }

  if (repoReferenceDoc && repoReferenceDoc.length > 0) {
    prompt += `\n## Repository reference (structure, patterns, and APIs only — do NOT copy code)\n`
    prompt += `Use this **together with the tree-sitter analysis** (Repository Analysis, Structured repo analysis, and "Repository features and APIs" checklist above): the analysis tells you **what** to implement (routes, entrypoints, capabilities, user stories); this section shows **how** the repo implements it (patterns, APIs, file layout). You MUST use it only to understand patterns, architecture, and APIs—**never** to copy or closely paraphrase code.\n`
    prompt += `- Base the development plan and phases on what the repo does (features, flows, routes, APIs), but implement everything here as new, clean-room code.\n`
    prompt += `- When a file exists in the repo, you may mirror its responsibilities and structure in new files in this project, but do not paste its contents. Integrate via compatible APIs and data shapes.\n\n`
    prompt += repoReferenceDoc.slice(0, rr)
    if (repoReferenceDoc.length > rr) prompt += '\n_(document truncated)_'
    prompt += '\n\n'
  } else if (projectContext?.repository) {
    prompt += `\n## Repository context note\n`
    prompt += `This project has a linked repo (${projectContext.repository.owner}/${projectContext.repository.name}) but repo file content is not in this context yet. You MUST still treat the repo as a reference only: when implementing, follow its patterns and structure but write new, clean-room code here. If you need repo file contents to proceed, tell the user to open the Repo tab to load the clone, or to refresh the project so repo context can be rebuilt.\n\n`
  }

  // Tie tree-sitter analysis and repo reference to best build results (no copying) — for both main and sandbox
  if (projectContext?.repository && (analysisContext?.repositoryAnalysis || (structuredSummary && structuredSummary.trim()) || (repoFeaturesChecklist && repoFeaturesChecklist.trim()))) {
    prompt += `\n## Tree-sitter analysis and repository: how to use (best build results, no copying)\n`
    prompt += `The **Repository Analysis** (tree-sitter AST), **Structured repo analysis** (tree-link summary), and **Repository features and APIs (must be reimplemented)** sections in this prompt are from **tree-sitter analysis** of the linked repo—structure, routes, entrypoints, capabilities, user stories, acceptance criteria. They contain **no raw repo code**; they are the **checklist of what to implement**.\n`
    prompt += `- **What to implement:** Use the tree-sitter checklist (routes, entrypoints, matched/missing capabilities, user stories, acceptance criteria) as the single source of truth for what must exist in this project. Implement each item in **new, clean-room code** that achieves the same behavior and contracts.\n`
    prompt += `- **How the repo does it:** When **Repository reference** is present above, use it only to see patterns, APIs, data shapes, and file layout. Then write **new code** that matches those patterns and contracts—do not copy, paste, or paraphrase repo source. No duplication of repo code.\n`
    prompt += `- **Pipeline:** For each route/entrypoint/capability: (1) Use the analysis to know *what* to build. (2) Use the repo reference (if present) to see *how* the repo implements it. (3) Implement in **new code** in this project that matches behavior and APIs. Result: best build alignment with the repo and user input without copying or duplicating code.\n`
    prompt += `- **User input:** Align with the user-stated outcome, user stories, and acceptance criteria in the checklist; prioritize the user's current message. Over time, cover the full checklist in new code only.
- **Focus on remaining work:** When the project already has many files, prefer implementing checklist items that do not yet appear to be implemented (e.g. routes or capabilities with no obvious corresponding file). This avoids duplicate work and speeds the build.
- **Phases and checklist:** Development plan phases should align with the tree-sitter checklist (routes, entrypoints, capabilities). Implement phase by phase in new code; before marking a phase complete, ensure its checklist items are done.
- **Token focus:** When the repository reference is very long, focus on the sections relevant to the user's current message and the checklist items you are implementing.
- **Track progress:** For each route or capability you implement, briefly name the route/capability and the file path before the code block (e.g. "Implementing GET /api/users → \`src/app/api/users/route.ts\`") so the user and system can track progress. Applies to both main GRIP and sandbox GRIP.\n\n`
  }
  if (likelyRemaining && likelyRemaining.trim()) {
    prompt += `\n## Likely remaining to implement (focus here when relevant)\nThe following do not yet appear to have a matching file in this project. Prefer implementing these when the user asks for progress or next steps:\n${likelyRemaining}\n\n`
  }

  // List files currently in the project so GRIP can reference them and answer "which files used snippet.txt"
  if (savedFiles && savedFiles.length > 0) {
    prompt += `\n## Files currently in this project\n`
    prompt += `The following files are saved in the project (path/filename). Use this list to reference existing files and to answer when the user asks which files used a generic name like snippet.txt.\n\n`
    savedFiles.forEach((f) => {
      const full = (f.path ? `${f.path}/` : '') + (f.filename || '')
      if (full.trim()) prompt += `- ${full.trim()}\n`
    })
    const hasLockfile = savedFiles.some(
      (f) => (f.filename || '').toLowerCase() === 'package-lock.json' || (f.filename || '').toLowerCase() === 'yarn.lock' || (f.filename || '').toLowerCase() === 'pnpm-lock.yaml'
    )
    if (hasLockfile) {
      const lockfileName = savedFiles.find((f) => (f.filename || '').toLowerCase() === 'package-lock.json')?.filename ? 'package-lock.json' : savedFiles.find((f) => (f.filename || '').toLowerCase() === 'yarn.lock')?.filename ? 'yarn.lock' : 'pnpm-lock.yaml'
      const manager = lockfileName === 'package-lock.json' ? 'npm' : lockfileName === 'yarn.lock' ? 'yarn' : 'pnpm'
      prompt += `\n**Package manager:** This project has \`${lockfileName}\`. Prefer \`${manager}\` and keep dependency version ranges in package.json consistent so install and build succeed in StackBlitz and on export.\n`
    }
    prompt += `\nWhen the user asks "which files used snippet.txt", "list files that are snippet.txt", "what files were saved as snippet", or similar: list from the above project files any file whose filename is \`snippet.txt\` or starts with \`snippet.\` (e.g. snippet.ts, snippet.json). For each, show the full path (path/filename) so the user can find and rename them in the project. If none exist, say so. This helps the user fix overwritten files.\n\n`
  }

  // CRITICAL: Code must always be in markdown code blocks so it can be saved to project files
  prompt += `
## CRITICAL: Code block formatting (must follow)
- **One file = one code block (treat like normal code).** Every file you output (README.md, CONTRIBUTING.md, long config, or any document) must be in exactly ONE code block so the user gets one "Save to project" button and can save the file in one shot. Do NOT split one file into multiple blocks (e.g. one for intro, one for install, one for bash). Long responses are still one block per file.
- **README.md:** Output the entire README in exactly ONE code block. Never output multiple blocks for one README.
- ALL code you generate MUST be inside markdown code blocks using triple backticks (e.g. \`\`\`tsx or \`\`\`js).
- NEVER output code as plain text outside of code blocks. Code outside blocks cannot be saved to project files.
- REQUIRED: You MUST put the exact file path/filename on the line directly above EVERY code block. Use backticks, e.g. \`package.json\` or \`src/App.tsx\` or \`.env\` or \`.env.local\` or \`README.txt\`. The "Save to project" button uses this to pre-fill the path; if you omit it, the user gets a generic name and files can overwrite each other. **MANDATORY: NEVER use snippet.txt, snippet.json, or any filename starting with "snippet."** — always use the real file name (e.g. \`.env\`, \`.env.local\`, \`config.txt\`, \`README.txt\`, \`package.json\`). Every code block must have the correct path on the line above it so the user never overwrites the wrong file.
- If the code is long: output the FULL code in a SINGLE code block. Do NOT split it—do NOT continue the code in plain text after the block. **For README.md and any long document:** one file = exactly ONE code block. Put the entire content (all sections, shell examples, file trees) inside one \`\`\`markdown ... \`\`\` block so the user can save it in one shot.
- If you hit token limits: close the current code block, then in a NEW message/block provide the rest in another full code block. Never leave code unclosed or mixed with prose in the middle.
- Format: one line with the path (e.g. \`package.json\`), then opening triple backticks, optional language (e.g. json), newline, full code, newline, closing triple backticks. The entire snippet must be between opening and closing backticks.
- After every code block: give one short line that matches automation (e.g. "The file above will be applied automatically and the build will run. Use **Run in StackBlitz** in the Preview tab to preview, or paste any errors here."). Do NOT say "Save the block above" or "1. Save... 2. Go to Preview..."—the system applies files and runs the build. Do not suggest npm install or local run first; direct to Run in StackBlitz to preview or paste errors.

## Full-file updates (critical for non-devs)
- Many users are non-developers. NEVER ask the user to manually edit a file (e.g. "add this line to X" or "edit the scripts section"). Manual edits cause errors and are hard for non-devs.
- When suggesting changes to an EXISTING file (config, component, or any file the user or context refers to), you MUST output the COMPLETE, UPDATED file in a single code block with the path/filename above it (e.g. \`package.json\` or \`src/App.tsx\`). The system will apply it automatically. Do not output partial diffs, "add this", or "replace line X with Y"—only full file content.
- Analyze the current file from context (repository reference or project files). Apply the requested change to that content and output the entire result. If the file is not in context, infer a minimal valid version and state that the file will be applied automatically.
- After a full-file code block, say one line aligned with automation: "The file above will be applied and the build will run. Use **Run in StackBlitz** to preview or paste errors back." Do NOT say "Save the block above as [filename]"—the system applies it.

## package.json: always provide full file (never blank, never incorrect)
- **Strengthening rule:** You MUST never output a blank, empty, or invalid package.json. Every package.json MUST be valid JSON with at least \`name\`, \`version\`, and \`scripts\` (dev/start/build) so the project is runnable in StackBlitz. Dependencies MUST include every package the code imports or requires.
- When the user asks to add a dependency, update scripts, change config, or modify package.json in any way, you MUST output the COMPLETE package.json with the change applied—never "add this to your package.json" or "add this dependency" without providing the full file.
- Use the project's current package.json from context (repository reference or project files). Merge in the new dependency, script, or config change and output the full JSON in a code block with \`package.json\` (or \`package.json\` on its own line) directly above the block. Preserve existing fields (name, version, other dependencies, etc.); only add or update what is needed.
- **Reuse repo dependencies for pattern alignment:** When the linked repo uses specific dependencies (e.g. for text-to-image, text-to-video, APIs, SDKs), reuse those **same package names and compatible versions** in the project's package.json so generated code aligns with the repo's patterns. Do not substitute different packages unless the user explicitly asks. Example: if the repo uses \`@fal-ai/client\` or \`replicate\` for image generation, include the same in the project's package.json and match the repo's usage patterns.
- If package.json is not in context, build a minimal valid package.json that includes the requested change (e.g. new dependency or script). Always include at least: name, version, scripts (e.g. dev, start, build), and every dependency the project code uses—so the project remains runnable and passes \`npm install\` and the build.
- After outputting package.json, say one line: "The file will be applied and the build will run. Use **Run in StackBlitz** in the Preview tab to preview, or paste any errors here." Do NOT say "save the block as package.json" or "go to Preview and click Run in StackBlitz" as a manual step—the system applies files and runs the build automatically.

## Code Automation Instructions
- **Tree-sitter checklist + repo reference:** Implement the routes, entrypoints, and capabilities from the tree-sitter analysis checklist; use the repository reference only for patterns, APIs, and structure. Write **new code** only—never copy, paste, or duplicate repo source. Match behavior and contracts; do not paraphrase repo code.
- Help automate the development process by generating code based on the project analysis and ideation
- When writing code, ensure compatibility with the existing repository structure and coding patterns
- Consider the project's architectural patterns and follow them in generated code
- Suggest file structures that align with the existing repository organization
- Ensure new components follow the same naming conventions and patterns as existing ones
- Provide code that implements the features described in the project ideation
- Suggest step-by-step implementation plans that build upon the existing codebase
- When generating code, include imports that match the dependencies used in the repository
- Reference existing files when suggesting new features to ensure integration points are clear

## Important Usage Instructions
- IMPORTANT: YOU DO HAVE ACCESS to the project repository and files through the context provided to you
- YOU SHOULD reference and analyze the repository files provided in this context
- YOU SHOULD generate real code examples based on the project's actual repository structure and patterns
- NEVER say you don't have access to code or repository data - you do have this information in your context
- ALWAYS act as if you can see and analyze the actual project files shown in the context
- ALWAYS generate specific code that matches the project's coding style and patterns
- ALWAYS reference specific files and components from the provided context when explaining implementation details

## Missing assets (favicon, icon, splash, images) — GRIP fixes it, user does nothing
- When build errors mention missing files (e.g. ENOENT: assets/favicon.png, public/images/logo.png), do NOT tell the user to run mkdir, touch, or copy files. You fix it so the user does nothing: (1) use **grip-actions** to create the folder and copy the file from the repo (e.g. copy \`images/logo.png\` to \`public/images/logo.png\`); or (2) update the app config to remove or point to existing paths; or (3) provide the file in a code block with the path so the user can "Save to project". Prefer grip-actions for copying repo assets so everything is included in StackBlitz automatically.
- Output the COMPLETE updated config file in a single code block with the path above it when you change config. Never suggest "create the missing directory and files" with bash—you create folders and copy files via grip-actions so the system does it and the user does nothing.
- For Expo/React Native: if \`icon\`, \`splash\`, or \`favicon\` point to missing paths, update app.json/app.config to omit them or use an existing asset path, or use grip-actions to copy the asset to the expected path.

## StackBlitz only after a clean build (critical for automation)
- We apply your code blocks and run the build automatically after each response. Do NOT suggest "Run in StackBlitz" or "test in StackBlitz" until the automated build has succeeded. Do NOT repeat "Applied: ..." or "We ran the build; it succeeded"—the system appends that line after your message when files were applied.
- **MANDATORY: No cut-off or broken code.** The system checks every applied file for code breaks (unclosed braces/brackets/backticks, trailing incomplete lines, truncation). The build is NOT marked successful until all files pass this check. If the system reports "cut-off or incomplete code" or "Unclosed backtick" or "Unbalanced brackets", you MUST output the COMPLETE file(s) again in code blocks with no truncation—do not leave code mid-statement or with missing closing characters.
- When the last run reported errors (e.g. "We ran the build; it reported errors"): fix the code in your response (output full files in code blocks). We will apply them and run the build again. Do NOT tell the user to test in StackBlitz until you see or we report "We ran the build; it succeeded."
- Only after "We ran the build; it succeeded" should you say to use StackBlitz (e.g. "Use **Run in StackBlitz** in the Preview tab to see the app, or paste any errors here."). Keep it to one short line; do not repeat the "Applied" or build line—the system adds it.
- If the user pastes build or runtime errors (e.g. from StackBlitz): fix the code (output full files in code blocks). Say one line: "The file(s) above will be applied and we'll run the build again. Use **Run in StackBlitz** to preview or paste errors back." Do not suggest npm install or terminal commands first.
- Only suggest terminal commands (npm install, npm run dev, Run & Debug) when the user explicitly says they want to run locally, export to GitHub, or run in an IDE. For normal flow, direct to **Preview → Run in StackBlitz** only after the build succeeds.
 - When the repo contains both a **frontend** and a **backend/API** (for example: separate folders named "frontend"/"backend" or "client"/"server", directories like "api" or "server", or multiple package.json files), you MUST make sure there is a **single dev/start script from the project root** that starts everything needed (both frontend and backend) so **Run in StackBlitz** spins up the whole stack at once. Prefer tools like concurrently, npm-run-all, workspaces, or a custom dev script that orchestrates both servers. Do **not** leave this for the user to request later—always add and/or update the scripts so StackBlitz runs real frontend + backend using the repo code and data.

## Terminal / Run & Debug (only when user wants local or export)
- If the user explicitly wants to run the project locally or use Run & Debug: put commands in a **shell code block** (\`bash\` or \`shell\`) and tell them to run in the app terminal or **Run & Debug** (Develop tab). Prefer the project's package manager if known (\`package-lock.json\` → npm, etc.).
- Do not suggest \`@types/package-name\` for packages that ship their own TypeScript types. Only suggest @types/ when the package has no built-in types.
- Do NOT suggest terminal commands for creating files or directories (e.g. mkdir, touch). Use "Save to project" with file content instead.

## StackBlitz and export — GRIP handles everything
- When the user opens the project in **StackBlitz** (Run in StackBlitz), the submission includes **all repo files** (from the linked GitHub repo) plus any files you create or update. Your saved/copied files override the same path. So images, assets, and code in the repo are all included—the user does not need to add or copy anything manually.
- You MUST handle all setup so the user does nothing: create folders and copy/move files yourself via grip-actions. Never ask the user to create folders, copy files, or use the Repo page—that causes mistakes and errors. You do it so it is correct every time.

## Creating folders and copying files (you do it — user does nothing)
- When the user needs a new folder (e.g. public/images, assets, src/components) or needs to copy/move files into a folder (e.g. images into public/images so they show in StackBlitz), YOU MUST do it automatically by outputting a **grip-actions** block. The system runs these actions; the user does nothing.
- Format exactly (one JSON object per line):
\`\`\`grip-actions
{"action":"create_folder","path":"public/images"}
{"action":"copy_file","sourcePath":"images/logo.png","targetPath":"public/images/logo.png"}
\`\`\`
- Use \`create_folder\` with \`path\` (e.g. "public/images", "src/components"). Use \`copy_file\` with \`sourcePath\` (existing file path in the repo or project) and \`targetPath\` (full path for the copy, e.g. "public/images/logo.png").
- After the block, say briefly what you did (e.g. "I've created public/images and copied your image files there. When you open in StackBlitz, everything will be included."). Never ask the user to create folders or copy files—always use grip-actions so the system does it and avoids errors.

## Final build files BEFORE declaring project complete (required)
- You MUST NOT say the project is "complete", "ready to run", or "100% done" until you have provided updated **build/config files** that match the code and dependencies you created.
- Before declaring completion, you MUST output in code blocks (one file per block, path above each block so the user can save):
  1. **package.json** — Must include every dependency that the project code actually uses (every \`import\` / \`require\` from an npm package). Include \`dependencies\` and \`devDependencies\` with sensible versions (e.g. \`"react": "^18.2.0"\`). Include \`scripts\` for \`build\`, \`dev\`, \`start\`, \`test\` as appropriate for the stack (e.g. Vite, Next, Expo, CRA).
  2. Any other config files required to run (e.g. **tsconfig.json**, **app.json** / **app.config.js** for Expo, **vite.config.ts**, **next.config.js**) — output the COMPLETE file so the project runs in StackBlitz (and, if they export, after \`npm install\` and \`npm run dev\`).
- Scan the files you have generated in this conversation: list every npm package they import. Ensure package.json includes every one. Missing dependencies are the main reason "the project is complete" fails when the user runs it.
- Order: output package.json (and other config files) first; they will be applied automatically. Only after that may you provide the README and state the project is complete. Do not say "Save these to your project root"—the system applies them.

## MANDATORY: package.json when directing to StackBlitz or deployment
- Whenever you (1) tell the user to **test in StackBlitz**, or (2) **finish the build** and inform the user to **test for deployment**, you MUST provide or update **package.json** in a code block with all dependency requirements—never suggest "add this dependency" or "update your package.json" without outputting the full package.json content.
- **Never blank, never incorrect:** The package.json you output MUST be valid JSON (no trailing commas, no truncation), MUST include \`name\`, \`version\`, and \`scripts\` with at least \`build\` and one of \`dev\` or \`start\`, and MUST list every npm package the project code imports or requires. This ensures \`npm install\` and the build succeed so the user gets runnable code in StackBlitz.
- Output the complete package.json (path above the block, e.g. \`package.json\`) so the system can apply it. Include every dependency the project needs and correct \`scripts\` for \`build\`, \`dev\`, \`start\` (and \`test\` if applicable). Missing dependencies are the main reason "Run in StackBlitz" fails—cross-check your generated files and add any missing packages.

## MANDATORY: README.md — exactly ONE code block (no exceptions)
- This rule applies whenever you provide a README (when the project is complete OR when the user asks you to build or create a README).
- You MUST output the **entire** README in **exactly ONE** markdown code block. The user can only save one block as one file; if you split the README into multiple blocks, they cannot save it as a single README.md.

**WRONG (do NOT do this):**
- Block 1: \`\`\`markdown ... (intro/features only) \`\`\`
- Block 2: \`\`\`plaintext ... (file tree) \`\`\`
- Block 3: \`\`\`bash ... (git clone) \`\`\`
- Block 4: \`\`\`bash ... (npm install) \`\`\`
- etc.
That produces many "Save to project" buttons and the user cannot get one README.md file.

**RIGHT (required):**
- One line: \`README.md\`
- One block: \`\`\`markdown
# Title
Description...
## Features
...
## Install
\`\`\`bash
git clone ...
npm install
\`\`\`
## File structure
...
(entire README with all sections and embedded code examples inside this single block)
\`\`\`
- One block only. One "Save to project" = one README.md file.

- **Before outputting a second code block:** If you have already output a code block and are about to output another (bash, plaintext, markdown) that is part of the README, STOP. Do not output that second block. Put that content INSIDE the first README block as markdown (e.g. a \`\`\`bash ... \`\`\` subsection inside the README text).
- If the README is long and you hit token limits: continue in the next message with **one** more \`README.md\` block containing the **full** README again (or the remainder), and tell the user to save it as README.md (one file). Do **not** split by section into multiple blocks.
- After the single README block, say one line: "The README above will be applied automatically. Use **Run in StackBlitz** to preview or paste any errors." Do not say "Save the block above as README.md"—the system applies it.

## MANDATORY: Interruption and continuation
- If your previous response was cut off (e.g. due to token limits), you MUST continue from exactly where you left off on the next user message. Do not start over or repeat what you already said.
- When continuing after an interruption: (1) Briefly inform the user that an interruption occurred; (2) Reassure them that you did not lose where you were; (3) State clearly that you have picked up where you left off; (4) Confirm that any remaining code and file updates will be completed. Then immediately continue with the next unfinished part (e.g. the next code block, step, or file).
- Do not ask the user to "ask me to continue"—treat continuation as mandatory whenever your prior reply was incomplete.

## MANDATORY: Phase reversion when user says phases are not met
- If the user says that GRIP's code is **not meeting phase completions** (e.g. "our project phases say production ready but we are not there", "we are still in phase 3 of 5", "grip code is not meeting the phase completions", "we're stuck in phase 2"), you MUST treat this as a **revert and rerun** instruction. You have **no choice** but to fix until the project aligns with where they are in the build.
- **Revert to the mentioned phase:** Identify the phase the user indicated (e.g. "phase 3 of 5" → Phase 3). Treat the project as being at that phase. Do not argue or say the project is further along; the user's assessment is final.
- **Rerun code generation and file updates:** Output ALL code blocks and file updates needed to **complete that phase** (and, in order, each subsequent phase) so the project actually meets the phase standards. Regenerate or update every file that belongs to that phase so the codebase aligns with the current state. Do not suggest manual steps; output full files and apply.
- **Fix until aligned:** Keep fixing until the build succeeds and the project meets the phase completion criteria. If the user says they are still not at the right phase or not production ready, repeat: revert to the phase they name, rerun code generation for that phase (and following phases), and output complete files until the project aligns. Do not tell the user to "try again" or "run the build"—you output the fixes; the system will apply and run the build.
- **Acknowledge clearly:** In your response, state: "Reverting to Phase [N]: [name]. I'm regenerating the code and file updates for this phase (and completing through to production ready) so the project aligns. Here are the updated files."

## General Instructions
- ALWAYS respond directly to the user's latest message in the context of this conversation. Do not repeat a generic introduction; continue the dialogue.
- Provide specific, actionable advice based on the project context and what the user just asked or said.
- When answering technical questions, consider the specific tech stack and project requirements
- If you don't have enough context, ask clarifying questions
- When suggesting code, ensure it aligns with the project's existing structure and conventions
- Be concise and clear in your responses
- You may suggest exploring new features if they align with project goals
- You can refer to project files and structure if mentioned in the context
`

  return prompt
}

// Function to extract the most relevant file snippets with improved code context
const extractRelevantFiles = (files: any[]) => {
  if (!files || files.length === 0) return ''

  let fileSnippets = `\n## Repository Code Context\n`
  
  // Group files by language/type for better organization
  const filesByLanguage: Record<string, any[]> = {};
  files.forEach(file => {
    if (!filesByLanguage[file.language]) {
      filesByLanguage[file.language] = [];
    }
    filesByLanguage[file.language].push(file);
  });
  
  // Process each language group
  Object.entries(filesByLanguage).forEach(([language, langFiles]) => {
    // Sort files by potential importance (e.g., entry points, config files first)
    langFiles.sort((a, b) => {
      // Prioritize main files, configs, etc.
      const isAImportant = /main|index|config|package\.json|app\.|\.env/.test(a.filename);
      const isBImportant = /main|index|config|package\.json|app\.|\.env/.test(b.filename);
      if (isAImportant && !isBImportant) return -1;
      if (!isAImportant && isBImportant) return 1;
      return 0;
    });

    // Include a more substantial number of important files per language
    const topFiles = langFiles.slice(0, 5);
    
    if (topFiles.length > 0) {
      fileSnippets += `\n### ${language.toUpperCase()} Files\n`;
      
      topFiles.forEach(file => {
        const fullPath = `${file.path}/${file.filename}`;
        fileSnippets += `\n#### ${fullPath}\n`;
        
        // Get a meaningful snippet (prioritize imports and main declarations)
        const contentLines = file.content.split('\n');
        
        // Extract imports and main declarations
        const importLines: string[] = [];
        const declarationLines: string[] = [];
        const otherImportantLines: string[] = [];
        
        // Pattern for finding important code parts
        const importPattern = /^import|^const|^function|^class|^interface|^type|^export/;
        
        contentLines.forEach((line: string, index: number) => {
          // Capture imports
          if (line.trim().startsWith('import ')) {
            importLines.push(line);
          } 
          // Capture main declarations
          else if (importPattern.test(line.trim())) {
            declarationLines.push(line);
            // Add the next few lines for context (increased from 3 to 5)
            const nextLines = contentLines.slice(index+1, index+6).filter((l: string) => l.trim() !== '');
            declarationLines.push(...nextLines);
          }
          // Other potentially important lines 
          else if (line.includes('function') || line.includes('class') || line.includes('interface')) {
            otherImportantLines.push(line);
            // Add surrounding context for better understanding
            const prevLine = index > 0 ? contentLines[index-1] : '';
            const nextLine = index < contentLines.length - 1 ? contentLines[index+1] : '';
            if (prevLine.trim() !== '') otherImportantLines.push(prevLine);
            if (nextLine.trim() !== '') otherImportantLines.push(nextLine);
          }
        });
        
        // Build a meaningful snippet that shows structure without overwhelming
        fileSnippets += "```" + language + "\n";
        
        // Add imports
        if (importLines.length > 0) {
          fileSnippets += "// Imports\n";
          fileSnippets += importLines.slice(0, 10).join('\n');
          if (importLines.length > 10) {
            fileSnippets += `\n// ... ${importLines.length - 10} more imports ...\n`;
          }
          fileSnippets += "\n\n";
        }
        
        // Add key declarations
        if (declarationLines.length > 0) {
          fileSnippets += "// Key declarations\n";
          fileSnippets += declarationLines.slice(0, 15).join('\n');
          if (declarationLines.length > 15) {
            fileSnippets += `\n// ... ${declarationLines.length - 15} more declarations ...\n`;
          }
          fileSnippets += "\n";
        }
        
        // Add other important code fragments that might have been missed
        if (otherImportantLines.length > 0 && declarationLines.length < 10) {
          fileSnippets += "\n// Other important code\n";
          fileSnippets += otherImportantLines.slice(0, 10).join('\n');
          fileSnippets += "\n";
        }
        
        // Add a small code sample if the above extraction didn't yield much
        if (importLines.length + declarationLines.length + otherImportantLines.length < 10) {
          fileSnippets += "\n// Sample code excerpt\n";
          // Get a substantial middle portion of the file for better context
          const middleIndex = Math.floor(contentLines.length / 2);
          const excerptStart = Math.max(0, middleIndex - 10);
          fileSnippets += contentLines.slice(excerptStart, excerptStart + 20).join('\n');
          fileSnippets += "\n";
        }
        
        // Add file length info for context
        fileSnippets += `\n// Total file length: ${contentLines.length} lines\n`;
        fileSnippets += "```\n";
      });
    }
  });
  
  // Add guidance for using the code context
  fileSnippets += `
### Code Integration Guidelines
- When generating new code, follow the patterns and styles from these existing files
- Match the import patterns and component structures shown in the relevant files
- Ensure new code maintains consistency with the project's coding standards
- Reference these files when suggesting implementation approaches
`;
  
  return fileSnippets
}

// Define the ChatMessage type
interface ChatMessage {
  role: string;
  content: string;
  timestamp?: Date;
  metadata?: {
    projectId?: string;
    userId?: string;
    type?: string;
    status?: string;
  };
}

// Define the MongoDB document type
interface ChatMessageDocument extends ChatMessage {
  _id: ObjectId;
}

// Define the ChatHistory document type
interface ChatHistoryDocument {
  _id: ObjectId;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessageDocument[];
  metadata: {
    lastMessage: ChatMessageDocument | null;
    totalMessages: number;
    lastUpdated: Date;
  };
}

/** Parse grip-actions block from message, execute create_folder, return cleaned message and summary. */
async function parseAndExecuteGripActions(
  projectId: string,
  message: string
): Promise<{ cleanedMessage: string; executedSummary: string[] }> {
  const executed: string[] = []
  const blockRe = /```grip-actions\n([\s\S]*?)```/
  const match = message.match(blockRe)
  if (!match) return { cleanedMessage: message, executedSummary: [] }
  const body = match[1].trim()
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean)
  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as { action?: string; path?: string; sourcePath?: string; targetPath?: string }
      if (obj.action === 'create_folder' && typeof obj.path === 'string') {
        const result = await createProjectFolder(projectId, obj.path)
        if (result.ok) executed.push(`Created folder: ${obj.path}`)
      } 
    } catch {
      // skip malformed lines
    }
  }
  const cleanedMessage = message.replace(blockRe, '').trim()
  return { cleanedMessage, executedSummary: executed }
}

/** Parse file path from text immediately before a code block. Mirrors sandbox helper. */
function parseFilePathFromPrecedingText(text: string): string | null {
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

/**
 * Validate file content for obvious cut-off or broken code. Returns list of issue messages (empty if OK).
 * Used before considering the automated build "successful" so we don't end the loop with truncated code.
 */
function validateFileContentForCutOff(path: string, content: string): string[] {
  const issues: string[] = []
  const ext = path.replace(/^.*\./, '').toLowerCase()
  const isCode = /^(tsx?|jsx?|js|mjs|cjs|css|html|json|py|yml|yaml)$/.test(ext) || path.endsWith('.config.js') || path.endsWith('.config.ts')

  if (!content || content.length < 2) return issues

  // Odd number of backticks → likely unclosed template/code fence
  const backticks = (content.match(/`/g) || []).length
  if (backticks % 2 !== 0) {
    issues.push('Unclosed backtick or template literal (odd number of `)')
  }

  // Trailing incomplete line: last non-empty line ends with continuation characters
  const lines = content.split(/\r?\n/)
  const lastNonEmpty = lines.map(l => l.trim()).filter(Boolean).pop()
  if (lastNonEmpty) {
    const tail = lastNonEmpty.slice(-3)
    if (/\+\s*$/.test(lastNonEmpty) || /,\s*$/.test(lastNonEmpty) || /\\\s*$/.test(lastNonEmpty)) {
      issues.push('File ends with incomplete line (trailing + , or \\)')
    }
    if (lastNonEmpty.endsWith('...') || lastNonEmpty.endsWith('${')) {
      issues.push('File ends with possible truncation (... or unclosed ${)')
    }
  }

  if (!isCode) return issues

  // Balance braces/brackets/parens (simple count; can false-positive on strings, but catches cut-off)
  let open = 0
  let inSingle = false
  let inDouble = false
  let inBacktick = false
  let i = 0
  const s = content
  while (i < s.length) {
    const c = s[i]
    if (inBacktick) {
      if (c === '`') inBacktick = false
      else if (c === '\\') i++
      i++
      continue
    }
    if (inSingle) {
      if (c === "'" && s[i - 1] !== '\\') inSingle = false
      i++
      continue
    }
    if (inDouble) {
      if (c === '"' && s[i - 1] !== '\\') inDouble = false
      i++
      continue
    }
    if (c === '`') { inBacktick = true; i++; continue }
    if (c === "'") { inSingle = true; i++; continue }
    if (c === '"') { inDouble = true; i++; continue }
    if (c === '{' || c === '[' || c === '(') open++
    if (c === '}' || c === ']' || c === ')') open--
    i++
  }
  if (open !== 0) {
    issues.push(`Unbalanced brackets/braces/parens (difference: ${open})`)
  }

  return issues
}

/** Save all extracted code blocks and validate for cut-off. Returns saved paths and any code-break issues. */
async function saveCodeBlocksToProject(
  projectId: string,
  message: string,
  isSandbox: boolean = false
): Promise<{ saved: string[]; codeBreakErrors: Array<{ path: string; issues: string[] }> }> {
  const blocks = extractCodeBlocksWithPaths(message)
  const saved: string[] = []
  const codeBreakErrors: Array<{ path: string; issues: string[] }> = []
  for (const { path, content } of blocks) {
    const issues = validateFileContentForCutOff(path, content)
    if (issues.length > 0) codeBreakErrors.push({ path, issues })
    if (isSandbox) {
      const { upsertLegalSandboxFile } = await import('@/lib/services/legalSandboxService')
      const res = await upsertLegalSandboxFile(projectId, path, content)
      if (res.ok) saved.push(path)
    } else {
      const res = await saveProjectFile(projectId, path, content)
      if (res.ok) saved.push(path)
    }
  }
  return { saved, codeBreakErrors }
}

/** Parse grip-update-ideation block from message, update project ideation, return cleaned message. */
async function parseAndApplyGripUpdateIdeation(
  projectId: string,
  message: string
): Promise<{ cleanedMessage: string; updated: boolean }> {
  const blockRe = /```grip-update-ideation\n([\s\S]*?)```/
  const match = message.match(blockRe)
  if (!match) return { cleanedMessage: message, updated: false }
  let cleanedMessage = message.replace(blockRe, '').trim()
  try {
    const body = match[1].trim()
    const parsed = JSON.parse(body) as Record<string, unknown>
    const goals = typeof parsed.goals === 'string' ? parsed.goals.trim() : undefined
    const targetAudience = typeof parsed.targetAudience === 'string' ? parsed.targetAudience.trim() : undefined
    const keyFeatures = typeof parsed.keyFeatures === 'string' ? parsed.keyFeatures.trim() : undefined
    const technicalRequirements = typeof parsed.technicalRequirements === 'string' ? parsed.technicalRequirements.trim() : undefined
    if (!goals && !targetAudience && !keyFeatures && !technicalRequirements) {
      return { cleanedMessage, updated: false }
    }
    const client = await clientPromise
    const db = client.db('test')
    const project = await db.collection('projects').findOne(
      { _id: new ObjectId(projectId) },
      { projection: { ideation: 1 } }
    ) as { ideation?: { goals?: string; targetAudience?: string; keyFeatures?: string; technicalRequirements?: string } } | null
    const existing = project?.ideation || {}
    const ideation = {
      goals: goals ?? existing.goals ?? '',
      targetAudience: targetAudience ?? existing.targetAudience ?? '',
      keyFeatures: keyFeatures ?? existing.keyFeatures ?? '',
      technicalRequirements: technicalRequirements ?? existing.technicalRequirements ?? '',
    }
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { ideation, updatedAt: new Date() } }
    )
    return { cleanedMessage, updated: true }
  } catch {
    return { cleanedMessage, updated: false }
  }
}

const MAX_GRIP_MEMORIES = 50

/** Parse grip-memory block(s) from message, append to project's gripMemories, return cleaned message. */
async function parseAndApplyGripMemory(
  projectId: string,
  message: string,
  isSandbox: boolean
): Promise<{ cleanedMessage: string; updated: boolean }> {
  const blockRe = /```grip-memory\n([\s\S]*?)```/g
  const matches = [...message.matchAll(blockRe)]
  if (matches.length === 0) return { cleanedMessage: message, updated: false }
  let cleanedMessage = message
  const toAdd: Array<{ instruction: string; createdAt: Date }> = []
  for (const match of matches) {
    cleanedMessage = cleanedMessage.replace(match[0], '').trim()
    try {
      const body = match[1].trim()
      const parsed = JSON.parse(body) as { instruction?: string; instructions?: string[] }
      if (typeof parsed.instruction === 'string' && parsed.instruction.trim()) {
        toAdd.push({ instruction: parsed.instruction.trim(), createdAt: new Date() })
      }
      if (Array.isArray(parsed.instructions)) {
        for (const instr of parsed.instructions) {
          if (typeof instr === 'string' && instr.trim()) {
            toAdd.push({ instruction: instr.trim(), createdAt: new Date() })
          }
        }
      }
    } catch {
      // skip malformed block
    }
  }
  if (toAdd.length === 0) return { cleanedMessage, updated: false }
  const client = await clientPromise
  const db = client.db(process.env.MONGODB_DB_NAME || 'test')
  const collection = isSandbox ? db.collection('sandboxProjects') : db.collection('projects')
  await collection.updateOne(
    { _id: new ObjectId(projectId) },
    {
      $push: {
        gripMemories: {
          $each: toAdd,
          $slice: -MAX_GRIP_MEMORIES,
        },
      },
      $set: { updatedAt: new Date() },
    }
  )
  return { cleanedMessage, updated: true }
}

// Helper function to save chat message to MongoDB
async function saveChatMessage(projectId: string, message: ChatMessage) {
  try {
    console.log('DB: Starting saveChatMessage function')
    console.log('DB: Project ID:', projectId)
    console.log('DB: Message:', JSON.stringify(message, null, 2))

    const client = await clientPromise
    const db = client.db('test')
    console.log('DB: Connected to database (test)')

    // Convert projectId to ObjectId
    const projectObjectId = new ObjectId(projectId)
    console.log('DB: Converted projectId to ObjectId:', projectObjectId)

    // Create the new message with proper structure
    const newMessage = {
      _id: new ObjectId(),
      id: new ObjectId().toString(),
      content: message.content,
      role: message.role,
      timestamp: new Date(),
      metadata: {
        projectId: projectId,
        userId: message.metadata?.userId,
        type: 'chat',
        status: 'sent'
      }
    }
    console.log('DB: Created new message document:', JSON.stringify(newMessage, null, 2))

    // First, ensure the chat history document exists with proper structure
    console.log('DB: Attempting to create/update chat history document')
    const initialDoc = {
      projectId: projectObjectId,
      id: new ObjectId().toString(),
      role: 'system',
      content: 'Chat history initialized',
      timestamp: new Date(),
      messages: [],
      metadata: {
        lastMessage: null,
        totalMessages: 0,
        lastUpdated: new Date()
      }
    }
    console.log('DB: Initial document structure:', JSON.stringify(initialDoc, null, 2))

    // Check if message already exists to prevent duplicates
    const existingMessage = await db.collection('chatHistory').findOne({
      projectId: projectObjectId,
      'messages.content': message.content,
      'messages.role': message.role,
      'messages.timestamp': {
        $gte: new Date(Date.now() - 5000) // Within last 5 seconds
      }
    })

    if (existingMessage) {
      console.log('DB: Message already exists, skipping save')
      return existingMessage.messages[existingMessage.messages.length - 1]
    }

    await db.collection('chatHistory').updateOne(
      { projectId: projectObjectId },
      {
        $setOnInsert: initialDoc
      },
      { upsert: true }
    )
    console.log('DB: Create/update completed')

    // Then update the document with the new message
    console.log('DB: Attempting to update document with new message')
    const result = await db.collection('chatHistory').updateOne(
      { projectId: projectObjectId },
      {
        $push: { messages: newMessage as any },
        $set: { 
          updatedAt: new Date(),
          'metadata.lastMessage': newMessage,
          'metadata.lastUpdated': new Date()
        },
        $inc: { 'metadata.totalMessages': 1 }
      }
    )
    console.log('DB: Update result:', JSON.stringify(result, null, 2))

    if (result.modifiedCount === 0) {
      console.error('DB: Failed to save chat message - no documents modified')
      throw new Error('Failed to save chat message')
    }

    console.log('DB: Successfully saved chat message')
    return newMessage
  } catch (error) {
    console.error('DB: Error saving chat message:', error)
    console.error('DB: Error details:', JSON.stringify(error, null, 2))
    throw error
  }
}

// Update an existing assistant message's content (e.g. after appending build status)
async function updateAssistantMessageContent(projectId: string, messageId: string, content: string) {
  try {
    const client = await clientPromise
    const db = client.db('test')
    const projectObjectId = new ObjectId(projectId)
    const r = await db.collection('chatHistory').updateOne(
      { projectId: projectObjectId, 'messages.id': messageId },
      { $set: { 'messages.$.content': content, 'metadata.lastUpdated': new Date() } }
    )
    if (r.matchedCount === 0) {
      console.warn('Enhanced chat: could not update message content (message not found)', { projectId, messageId })
    }
  } catch (err) {
    console.warn('Enhanced chat: updateAssistantMessageContent failed', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const accessDenied = await requireAppAccess(session)
    if (accessDenied) return accessDenied
    const tokenExhausted = await requireTokenBalance(session)
    if (tokenExhausted) return tokenExhausted

    const access = await getAppAccess(session)
    const remainingTokens = Math.max(0, (access.tokenAllowance ?? 0) - (access.tokensUsedThisPeriod ?? 0))
    const tokenBudgetHint = buildTokenBudgetPromptFragment(remainingTokens, access.tier ?? 'starter', 'chat')
    const sectionBudgets = getChatSectionBudgets(access.tier ?? 'starter', remainingTokens)

    const { message, projectId, messages: clientMessages, runAfterApply: runAfterApplyRaw } = await request.json()

    if (!projectId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Build conversation history for the model (so GRIP responds in context, not generically).
    // Accept last N messages from client; cap to avoid token limits.
    const MAX_HISTORY = 20 // last 20 messages (10 user + 10 assistant)
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = []
    if (Array.isArray(clientMessages) && clientMessages.length > 0) {
      for (const m of clientMessages.slice(-MAX_HISTORY)) {
        const role = m.role === 'assistant' ? 'assistant' : 'user'
        let content = typeof m.content === 'string' ? m.content : String(m.content ?? '')
        if (role === 'assistant') content = mergeReadmeBlocks(content)
        if (content.trim()) history.push({ role, content: content.trim() })
      }
    }
    history.push({ role: 'user', content: message.trim() })

    // If user is asking for a README, inject a reminder so GRIP outputs one block only
    const lastUser = history[history.length - 1]
    if (lastUser?.role === 'user' && /readme|README/i.test(lastUser.content)) {
      lastUser.content =
        lastUser.content.trim() +
        '\n\n[Reminder: Output the entire README in exactly ONE markdown code block. Do not split into multiple blocks (e.g. one for features, one for install, one for bash). One block only.]'
    }

    // Get project context (check both main and sandbox)
    const client = await clientPromise
    const db = client.db('test')
    let project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId)
    })
    let isSandbox = false
    
    if (!project) {
      // Try sandbox projects
      const sandboxProject = await db.collection('sandboxProjects').findOne({
        _id: new ObjectId(projectId)
      })
      if (sandboxProject) {
        isSandbox = true
        project = {
          _id: sandboxProject._id,
          title: sandboxProject.title,
          description: sandboxProject.description,
          repository: sandboxProject.repository,
          ideation: sandboxProject.ideation,
          userId: sandboxProject.userId,
          createdAt: sandboxProject.createdAt,
          updatedAt: sandboxProject.updatedAt,
          isSandbox: true,
          parentProjectId: sandboxProject.parentProjectId,
          lastRunErrors: (sandboxProject as { lastRunErrors?: unknown }).lastRunErrors,
          gripMemories: (sandboxProject as { gripMemories?: Array<{ instruction: string }> }).gripMemories ?? [],
        }
      } else {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
    }

    // Sandbox ideation enhancement (once per sandbox so chat gets same quality as main)
    if (isSandbox && project?.ideation && !(project as { enhancedBuildRequirements?: unknown }).enhancedBuildRequirements) {
      try {
        const { enhanceIdeationForBuild } = await import('@/lib/services/ideationEnhancementService')
        const enhancedResult = await enhanceIdeationForBuild(project.ideation)
        if (enhancedResult?.enhanced) {
          await db.collection('sandboxProjects').updateOne(
            { _id: new ObjectId(projectId) },
            {
              $set: {
                enhancedBuildRequirements: enhancedResult.enhanced,
                enhancedBuildRequirementsAt: new Date(),
                updatedAt: new Date(),
              },
            }
          )
          const refetched = await db.collection('sandboxProjects').findOne({ _id: new ObjectId(projectId) }) as typeof project
          if (refetched) project = refetched
        }
      } catch (enhanceErr) {
        console.warn('Enhanced chat: sandbox ideation enhancement failed (non-fatal)', enhanceErr)
      }
    }

    // Analysis is per-project: main → analyses, sandbox → sandboxAnalyses. No cross-talk; input-override
    // and checklist rules apply to whichever project is in context (main build or sandbox experiment).
    const analysisCollection = isSandbox ? 'sandboxAnalyses' : 'analyses'
    const analysis = await db.collection(analysisCollection).findOne({
      projectId: new ObjectId(projectId)
    })

    // Extract structured analysis summary (tree-link JSON) and full repo features/API checklist (for main and sandbox)
    let structuredSummary = ''
    let repoFeaturesChecklist = ''
    let repoTypeRules = ''
    let checklistRoutes: Array<{ method?: string; route?: string; source_file?: string }> = []
    let checklistEntrypoints: Array<{ file?: string; symbol?: string }> = []
    try {
      const ra = analysis?.repositoryAnalysis as
        | { projectAnalysis?: string; fileAnalyses?: Array<{ path: string; analysis: string }>; structuredAnalysis?: any }
        | undefined
      if (ra?.structuredAnalysis) {
        const sa = ra.structuredAnalysis as any
        checklistRoutes = Array.isArray(sa.route_map) ? sa.route_map : []
        checklistEntrypoints = Array.isArray(sa.entrypoints) ? sa.entrypoints : []
        const identity = sa.identity || {}
        const ideation = sa.ideation_alignment || {}
        const matched = Array.isArray(ideation.matched_capabilities) ? ideation.matched_capabilities : []
        const missing = Array.isArray(ideation.missing_capabilities) ? ideation.missing_capabilities : []
        const subsystems = Array.isArray(sa.architecture_summary?.subsystems)
          ? sa.architecture_summary.subsystems
          : []
        const routes = Array.isArray(sa.route_map) ? sa.route_map : []
        const entrypoints = Array.isArray(sa.entrypoints) ? sa.entrypoints : []
        const symbolIndex = Array.isArray(sa.symbol_index) ? sa.symbol_index : []
        const recommended = Array.isArray(ideation.recommended_integration_points) ? ideation.recommended_integration_points : []
        const depSummary = sa.dependency_summary || {}
        const normReq = ideation.normalized_requirements || {}
        const userStories = Array.isArray(normReq.user_stories) ? normReq.user_stories : []
        const acceptanceCriteria = Array.isArray(normReq.acceptance_criteria) ? normReq.acceptance_criteria : []

        const lines: string[] = []
        lines.push('Identity & architecture:')
        lines.push(
          `- Repo name: ${identity.repo_name || '(unknown)'}`,
          `- Primary languages: ${(identity.primary_languages || []).join(', ') || '(none)'}`,
          `- Frameworks: ${(identity.detected_frameworks || []).join(', ') || '(none)'}`,
        )
        if (identity.summary) {
          lines.push(`- Summary: ${identity.summary}`)
        }
        if (subsystems.length) {
          lines.push('- Subsystems (partial): ' + subsystems.slice(0, 3).map((s: any) => s.name || '(unnamed)').join(', '))
        }
        if (routes.length) {
          lines.push('- Routes (partial): ' + routes.slice(0, 5).map((r: any) => r.route || '').join(', '))
        }
        if (entrypoints.length) {
          lines.push('- Entrypoints: ' + entrypoints.slice(0, 5).map((e: any) => `${e.file}:${e.symbol || ''}`).join('; '))
        }
        if (symbolIndex.length > 0) {
          const symbols: string[] = []
          for (const fileEntry of symbolIndex.slice(0, 8)) {
            const syms = (fileEntry.symbols || []).slice(0, 5).map((s: any) => s.name || '').filter(Boolean)
            if (syms.length) symbols.push(`${fileEntry.file}: ${syms.join(', ')}`)
          }
          if (symbols.length) lines.push('Key exports (file: symbols): ' + symbols.join(' | '))
        }
        if (ideation.normalized_requirements?.product_summary) {
          lines.push(`- Ideation product summary: ${ideation.normalized_requirements.product_summary}`)
        }
        lines.push(
          `- Matched capabilities: ${matched.length}`,
          `- Missing capabilities: ${missing.length}`,
        )
        structuredSummary = lines.join('\n')

        // Full repo features/API checklist (all routes, entrypoints, capabilities) for GRIP to reimplement
        // Start with user-stated requirements so GRIP aligns with user input first
        const checklistLines: string[] = []
        if (normReq.product_summary) {
          checklistLines.push('### User-stated outcome (align all code with this)')
          checklistLines.push(`- ${normReq.product_summary}`)
          checklistLines.push('')
        }
        if (userStories.length) {
          checklistLines.push('### User stories (implement to these)')
          userStories.forEach((s: any) => {
            checklistLines.push(`- As ${s.as_a || 'user'}, I want ${s.i_want || '—'} so that ${s.so_that || '—'} (priority: ${s.priority || '—'})`)
          })
          checklistLines.push('')
        }
        if (acceptanceCriteria.length) {
          checklistLines.push('### Acceptance criteria (verify against these)')
          acceptanceCriteria.forEach((c: any) => {
            checklistLines.push(`- ${c.criterion || '—'} (how to verify: ${c.how_to_verify || '—'})`)
          })
          checklistLines.push('')
        }
        checklistLines.push('### Routes (must reimplement each in new code)')
        if (routes.length) {
          routes.forEach((r: any) => {
            checklistLines.push(`- ${r.method || 'GET'} ${r.route || ''} → ${r.handler_symbol || ''} (${r.source_file || ''})`)
          })
        } else {
          checklistLines.push('- (none detected)')
        }
        checklistLines.push('')
        checklistLines.push('### Entrypoints (must reimplement each in new code)')
        if (entrypoints.length) {
          entrypoints.forEach((e: any) => {
            checklistLines.push(`- ${e.file}: ${e.symbol || ''} — ${e.reason || ''}`)
          })
        } else {
          checklistLines.push('- (none detected)')
        }
        checklistLines.push('')
        checklistLines.push('### Matched capabilities (repo already has these; reimplement in this project)')
        if (matched.length) {
          matched.forEach((c: any) => {
            checklistLines.push(`- ${c.repo_capability || ''} (evidence: ${c.evidence || '—'})`)
          })
        } else {
          checklistLines.push('- (none)')
        }
        checklistLines.push('')
        checklistLines.push('### Missing capabilities (must implement in this project)')
        if (missing.length) {
          missing.forEach((c: any) => {
            checklistLines.push(`- ${c.needed_capability || ''} — impact: ${c.impact || ''}; approach: ${c.recommended_approach || ''}`)
          })
        } else {
          checklistLines.push('- (none)')
        }
        if (recommended.length) {
          checklistLines.push('')
          checklistLines.push('### Recommended integration points')
          recommended.forEach((r: any) => {
            checklistLines.push(`- ${r.feature || ''} @ ${r.where || ''}: ${r.why_here || ''}`)
          })
        }
        if (depSummary && (depSummary.external_packages?.length || depSummary.runtime_patterns?.length || depSummary.data_storage_patterns?.length || depSummary.auth_patterns?.length)) {
          checklistLines.push('')
          checklistLines.push('### Dependency summary (align new code with these patterns)')
          if (depSummary.external_packages?.length) checklistLines.push('- External packages: ' + depSummary.external_packages.join(', '))
          if (depSummary.runtime_patterns?.length) checklistLines.push('- Runtime: ' + depSummary.runtime_patterns.join(', '))
          if (depSummary.data_storage_patterns?.length) checklistLines.push('- Data/storage: ' + depSummary.data_storage_patterns.join(', '))
          if (depSummary.auth_patterns?.length) checklistLines.push('- Auth: ' + depSummary.auth_patterns.join(', '))
        }
        repoFeaturesChecklist = checklistLines.join('\n')

        // Repo type detection: AI/ML, iOS, Android, full-stack, etc. — mandatory rules per category
        const fileManifest = Array.isArray(sa.file_manifest) ? sa.file_manifest : []
        const filePaths = fileManifest.map((f: any) => f.path).filter(Boolean)
        const mainLanguages: Record<string, number> = {}
        fileManifest.forEach((f: any) => {
          const ext = (f.path || '').split('.').pop()?.toLowerCase() || (f.language || '').toLowerCase() || 'unknown'
          if (ext) mainLanguages[ext] = (mainLanguages[ext] || 0) + 1
        })
        const repoTypeInput = {
          primary_languages: identity.primary_languages,
          detected_frameworks: identity.detected_frameworks,
          project_type: identity.project_type || '',
          filePaths,
          mainLanguages,
        }
        const detected = detectRepoType(repoTypeInput)
        repoTypeRules = getMandatoryRepoTypeRules(detected.category, detected.label, detected.hints)
        const refLine = getReferenceReposGuidanceLine(detected.category, detected.label)
        if (refLine) repoTypeRules += '\n' + refLine
      }
    } catch {
      // optional
    }

    // Get or build repo reference document (full repo context for G.R.I.P.; main and sandbox)
    const repoReferenceDoc = await getOrBuildRepoContextDocument(projectId, isSandbox)

    // List files already saved to this project (use sandbox files if sandbox project)
    let savedFiles: Array<{ path: string; filename: string }> = []
    if (isSandbox) {
      const { listLegalSandboxFiles } = await import('@/lib/services/legalSandboxService')
      const sandboxFiles = await listLegalSandboxFiles(projectId)
      savedFiles = sandboxFiles.map((f) => ({ path: f.path || '', filename: f.filename || '' }))
    } else {
      const projectFilesList = await listProjectFiles(projectId)
      savedFiles = projectFilesList.map((f) => ({ path: f.path || '', filename: f.filename || '' }))
    }

    // Fallback: when no structured analysis, infer repo type from saved project files so we get a better category than generic
    if (!repoTypeRules.trim()) {
      const filePathsFromSaved = savedFiles.map((f) => (f.path ? `${f.path}/` : '') + (f.filename || '')).filter(Boolean)
      const mainLanguagesFromSaved: Record<string, number> = {}
      filePathsFromSaved.forEach((p) => {
        const ext = p.split('.').pop()?.toLowerCase() || 'unknown'
        if (ext) mainLanguagesFromSaved[ext] = (mainLanguagesFromSaved[ext] || 0) + 1
      })
      const fallbackDetected = detectRepoType({ filePaths: filePathsFromSaved, mainLanguages: mainLanguagesFromSaved })
      repoTypeRules = getMandatoryRepoTypeRules(fallbackDetected.category, fallbackDetected.label, fallbackDetected.hints)
      const refLine = getReferenceReposGuidanceLine(fallbackDetected.category, fallbackDetected.label)
      if (refLine) repoTypeRules += '\n' + refLine
    }

    // Implemented checklist progress (persisted so we don't show already-implemented as remaining)
    let implementedRoutePaths: string[] = []
    let implementedEntrypointPaths: string[] = []
    try {
      if (isSandbox) {
        implementedRoutePaths = (project as { implementedRoutePaths?: string[] }).implementedRoutePaths || []
        implementedEntrypointPaths = (project as { implementedEntrypointPaths?: string[] }).implementedEntrypointPaths || []
      } else {
        const state = await getProjectState(projectId) as { implementedRoutePaths?: string[]; implementedEntrypointPaths?: string[] } | null
        implementedRoutePaths = state?.implementedRoutePaths || []
        implementedEntrypointPaths = state?.implementedEntrypointPaths || []
      }
    } catch {
      // optional
    }

    // Likely remaining to implement (main and sandbox): routes/entrypoints with no obvious file in project yet; exclude persisted implemented
    let likelyRemaining = ''
    if ((checklistRoutes.length || checklistEntrypoints.length) && savedFiles.length >= 0) {
      const projectPaths = savedFiles.map((f) => (f.path ? `${f.path}/` : '') + (f.filename || '')).filter(Boolean)
      const remainingRoutes: string[] = []
      for (const r of checklistRoutes) {
        const routeKey = `${r.method || 'GET'} ${r.route || ''}`
        const routePath = (r.route || '').replace(/^\//, '').replace(/\/$/, '')
        const sourceFile = (r.source_file || '').trim()
        const alreadyImplemented = implementedRoutePaths.some((impl) => impl === routeKey || impl === sourceFile)
        const hasMatch = routePath && (projectPaths.some((p) => p.includes(routePath)) || projectPaths.some((p) => sourceFile && p.includes(sourceFile)))
        if (!alreadyImplemented && !hasMatch && routePath) remainingRoutes.push(routeKey)
      }
      const remainingEntrypoints: string[] = []
      for (const e of checklistEntrypoints) {
        const epKey = `${e.file}:${e.symbol || ''}`
        if (implementedEntrypointPaths.includes(epKey)) continue
        const epFile = (e.file || '').trim()
        if (!epFile) continue
        const hasMatch = projectPaths.some((p) => p === epFile || p.endsWith(epFile) || epFile.endsWith(p))
        if (!hasMatch) remainingEntrypoints.push(epKey)
      }
      const lines: string[] = []
      if (remainingRoutes.length) lines.push('Routes: ' + remainingRoutes.join('; '))
      if (remainingEntrypoints.length) lines.push('Entrypoints: ' + remainingEntrypoints.join('; '))
      if (lines.length) likelyRemaining = lines.join('\n')
    }

    // Development plan (phases + file hierarchy) so GRIP uses the same plan and file paths (main and sandbox)
    let planContext: { phases?: Array<{ name: string; description?: string; tasks?: Array<{ name: string; status?: string }> }>; fileHierarchy?: { path: string; name?: string; children?: unknown[] } } | undefined
    try {
      if (isSandbox) {
        const sandboxPlanDoc = await db.collection('legalSandboxPlans').findOne({
          $or: [{ projectId: new ObjectId(projectId) }, { projectId }]
        }) as { plan?: { phases?: Array<{ name?: string; description?: string; tasks?: Array<{ title?: string; name?: string; status?: string }> }> }; structure?: { fileHierarchy?: unknown } } | null
        if (sandboxPlanDoc?.plan?.phases?.length) {
          planContext = {
            phases: sandboxPlanDoc.plan.phases.map((p: { name?: string; description?: string; tasks?: Array<{ title?: string; name?: string; status?: string }> }) => ({
              name: p.name || 'Phase',
              description: p.description,
              tasks: (p.tasks || []).map((t: { title?: string; name?: string; status?: string }) => ({
                name: (t.title ?? t.name) || 'Task',
                status: t.status
              }))
            })),
            fileHierarchy: (sandboxPlanDoc as { structure?: { fileHierarchy?: unknown } }).structure?.fileHierarchy
          }
        }
      } else {
        const plan = await getProjectPlan(projectId)
        if (plan) {
          planContext = {
            phases: plan.plan?.phases?.map((p: { name: string; description?: string; tasks?: Array<{ title?: string; name?: string; status?: string }> }) => ({
              name: p.name,
              description: p.description,
              tasks: p.tasks?.map((t: { title?: string; name?: string; status?: string }) => ({
                name: (t.title ?? t.name) || 'Task',
                status: t.status
              }))
            })),
            fileHierarchy: plan.structure?.fileHierarchy
          }
        }
      }
    } catch (planErr) {
      console.warn('Enhanced chat: could not load project plan for context', planErr)
    }

    // Project state (phases/steps) so GRIP knows what the user has completed (main: projectStates; sandbox: derived from legalSandboxPlans)
    let projectStateContext: ProjectStateContext = null
    try {
      if (isSandbox && planContext?.phases?.length) {
        projectStateContext = {
          currentPhase: planContext.phases[0]?.name || '',
          phases: planContext.phases.map((p) => ({
            name: p.name,
            status: 'pending',
            steps: (p.tasks || []).map((t, i) => ({
              id: i + 1,
              title: t.name,
              status: 'pending',
              action: t.name,
              progress: '0%',
              result: undefined,
            })),
          })),
        }
      } else {
        const state = await getProjectState(projectId)
        if (state?.phases?.length) {
          projectStateContext = {
            currentPhase: state.currentPhase || '',
            phases: state.phases.map((p) => ({
              name: p.name,
              status: p.status,
              steps: (p.steps || []).map((s) => ({
                id: s.id,
                title: s.title,
                status: s.status,
                action: s.action,
                progress: s.progress,
                result: s.result,
              })),
            })),
          }
        }
      }
    } catch (stateErr) {
      console.warn('Enhanced chat: could not load project state for context', stateErr)
    }

    // Sandbox experiments for main project: include in GRIP context so overview and chat stay aligned
    let sandboxExperimentsSummary = ''
    if (project && !isSandbox && session?.user?.id) {
      try {
        const client = await clientPromise
        const db = client.db('test')
        const sandboxesList = await db
          .collection('sandboxProjects')
          .find({
            parentProjectId: new ObjectId(projectId),
            userId: session.user.id,
          })
          .sort({ updatedAt: -1 })
          .limit(20)
          .toArray() as Array<{ title?: string }>
        if (sandboxesList.length > 0) {
          const titles = sandboxesList.map((s) => s.title || 'Untitled').join(', ')
          sandboxExperimentsSummary = `Experiments (${sandboxesList.length}): ${titles}. User can open any from Overview or create new ones there.`
        } else {
          sandboxExperimentsSummary = 'No experiments yet. User can create one from Overview → Sandbox Experiments.'
        }
      } catch (sandboxErr) {
        console.warn('Enhanced chat: could not load sandbox experiments for context', sandboxErr)
      }
    }

    // Last-attempt summary when build failed (so GRIP doesn't repeat the same fix)
    let lastAttemptSummary = ''
    if (project?.lastRunErrors && Array.isArray(history) && history.length > 0) {
      const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant')
      if (lastAssistant?.content) {
        const raw = typeof lastAssistant.content === 'string' ? lastAssistant.content : String(lastAssistant.content ?? '')
        lastAttemptSummary = raw.trim().slice(0, 600)
      }
    }

    // User uploads (images and reference docs) so GRIP uses them in the build (main and sandbox)
    let userUploadsSummary = ''
    try {
      const uploadsColl = isSandbox ? 'legalSandboxFiles' : 'projectFiles'
      const uploadsFilter = isSandbox
        ? { projectId: new ObjectId(projectId), 'metadata.generatedBy': 'user_upload' }
        : { projectId: new ObjectId(projectId), 'metadata.generatedBy': 'user_upload' }
      const uploads = await db.collection(uploadsColl).find(uploadsFilter).project({ path: 1, filename: 1, metadata: 1 }).toArray() as Array<{ path?: string; filename?: string; metadata?: { purpose?: string } }>
      const images = uploads.filter((u) => u.metadata?.purpose === 'image').map((u) => (u.path ? `${u.path}/${u.filename}` : u.filename).trim()).filter(Boolean)
      const docs = uploads.filter((u) => u.metadata?.purpose === 'reference_doc').map((u) => (u.path ? `${u.path}/${u.filename}` : u.filename).trim()).filter(Boolean)
      const lines: string[] = []
      if (images.length) lines.push(`Images (use these paths in your code): ${images.join(', ')}.`)
      if (docs.length) lines.push(`Reference docs (use for requirements or copy): ${docs.join(', ')}.`)
      if (lines.length) userUploadsSummary = lines.join('\n')
    } catch (uploadErr) {
      console.warn('Enhanced chat: could not load user uploads for context', uploadErr)
    }

    // Same stack and reference guidance the plan phase used (UI refs, data refs, linked repo, type-specific refs)
    let stackGuidanceFromPlan = ''
    try {
      const ra = analysis?.repositoryAnalysis as { structuredAnalysis?: any } | undefined
      const planContextFromAnalysis = buildPlanContextFromAnalysis({
        structuredAnalysis: ra?.structuredAnalysis,
        ideation: project?.ideation,
        enhancedBuildRequirements: project?.enhancedBuildRequirements,
        hasRepo: !!(project?.repository?.owner && project?.repository?.name),
        tier: (project as { tier?: string })?.tier,
      })
      stackGuidanceFromPlan = planContextFromAnalysis?.stackGuidance?.trim() ?? ''
    } catch (stackErr) {
      console.warn('Enhanced chat: could not build stack guidance for prompt', stackErr)
    }

    // Build system prompt with context
    const userDoc = session?.user?.id ? await db.collection('users').findOne({ _id: new ObjectId(session.user.id) }, { projection: { mongodbUri: 1 } }) as { mongodbUri?: string } | null : null
    const userHasMongoDB = !!(userDoc?.mongodbUri && String(userDoc.mongodbUri).trim())
    const systemPrompt = buildSystemPrompt(project, analysis, repoReferenceDoc, savedFiles, planContext, projectStateContext, structuredSummary, sandboxExperimentsSummary, repoFeaturesChecklist, isSandbox, likelyRemaining, lastAttemptSummary, userUploadsSummary, repoTypeRules, stackGuidanceFromPlan, tokenBudgetHint, userHasMongoDB, sectionBudgets)

    // Same env as plan/build: read key in this request and pass to service (plan creates client at request time; we pass key so service uses it)
    const { getAnthropicApiKey } = await import('@/lib/anthropicConfig')
    const apiKey = getAnthropicApiKey()
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'G.R.I.P. AI is not configured. Set ANTHROPIC_API_KEY in your deployment environment (e.g. Vercel env vars or .env.local in dev).',
          code: 'AI_NOT_CONFIGURED'
        },
        { status: 503 }
      )
    }

    try {
      await anthropicService.initialize(apiKey)
    } catch (initErr) {
      const msg = initErr instanceof Error ? initErr.message : String(initErr)
      console.error('G.R.I.P. AI initialization failed:', msg, initErr)
      const isKeyOrAuth = /invalid|401|authentication|api key|unauthorized/i.test(msg)
      return NextResponse.json(
        {
          error: isKeyOrAuth
            ? 'G.R.I.P. AI could not connect. Check ANTHROPIC_API_KEY in your deployment environment (e.g. Vercel) or .env.local. The key may be invalid or revoked.'
            : 'G.R.I.P. AI is temporarily unavailable. Please try again later.',
          code: isKeyOrAuth ? 'AI_KEY_INVALID' : 'AI_INIT_FAILED'
        },
        { status: 503 }
      )
    }

    const responseMaxTokens = getChatResponseMaxTokens(remainingTokens)
    let response
    try {
      response = await anthropicService.createMessage(
        history.map(m => ({ role: m.role, content: m.content })),
        { system: systemPrompt, maxTokens: responseMaxTokens }
      )
    } catch (apiErr) {
      console.error('G.R.I.P. AI request failed:', apiErr)
      const msg = apiErr instanceof Error ? apiErr.message : String(apiErr)
      const isRateOrQuota = /rate|quota|overloaded|429|503/i.test(msg)
      return NextResponse.json(
        {
          error: isRateOrQuota
            ? 'G.R.I.P. AI is rate limited or overloaded. Please try again in a minute.'
            : 'G.R.I.P. AI is temporarily unavailable. Please try again in a moment.',
          code: 'AI_REQUEST_FAILED'
        },
        { status: 503 }
      )
    }

    const totalTokens = response.usage?.totalTokens ?? (response.usage?.promptTokens ?? 0) + (response.usage?.completionTokens ?? 0)
    if (totalTokens > 0 && session.user?.id) {
      addTokenUsage(session.user.id, totalTokens).catch((err) =>
        console.warn('Enhanced chat: failed to record token usage', err)
      )
    }

    let aiMessage = (response.content && String(response.content).trim()) || ''
    // Treat empty or placeholder-only responses as failure so the user sees a real message
    if (!aiMessage || /^[-–—\s]+$/.test(aiMessage) || aiMessage.length < 3) {
      aiMessage = 'I could not generate a response right now. Please try again or rephrase your question.'
    }
    // If the model was cut off mid-response and left a code block unclosed, close it so the UI can parse and offer "Save to project"
    const backtickCount = (aiMessage.match(/```/g) || []).length
    if (backtickCount % 2 !== 0) {
      aiMessage = aiMessage.trimEnd() + '\n```'
    }
    // When the API stopped due to max_tokens, show the user so they know the response was cut off and can ask for less or add tokens
    if (response.stopReason === 'max_tokens') {
      aiMessage += '\n\n---\n**Note:** This response was cut off due to the token limit. To avoid incomplete files, try asking for a smaller change (e.g. one file at a time), or add more tokens in Settings → Token limits.'
    }

    // Parse and execute grip-actions (create_folder) so GRIP can create folders for the user
    try {
      const { cleanedMessage, executedSummary } = await parseAndExecuteGripActions(projectId, aiMessage)
      if (executedSummary.length > 0) {
        aiMessage = cleanedMessage + (cleanedMessage ? '\n\n' : '') + '**Done:** ' + executedSummary.join('; ')
      } else if (cleanedMessage !== aiMessage) {
        aiMessage = cleanedMessage
      }
    } catch (actionErr) {
      console.warn('Enhanced chat: grip-actions execution failed', actionErr)
    }

    // Parse and apply grip-update-ideation so GRIP can add user's plain-English answers to project details
    try {
      const { cleanedMessage, updated } = await parseAndApplyGripUpdateIdeation(projectId, aiMessage)
      if (updated) {
        aiMessage = cleanedMessage + (cleanedMessage ? '\n\n' : '') + "I've updated your project details with what you shared so future code will match your goals better."
      } else if (cleanedMessage !== aiMessage) {
        aiMessage = cleanedMessage
      }
    } catch (ideationErr) {
      console.warn('Enhanced chat: grip-update-ideation failed', ideationErr)
    }

    // Parse and apply grip-memory so GRIP can save user instructions for future turns
    try {
      const { cleanedMessage, updated } = await parseAndApplyGripMemory(projectId, aiMessage, isSandbox)
      if (updated) {
        aiMessage = cleanedMessage + (cleanedMessage ? '\n\n' : '') + "I'll remember that for future messages."
      } else if (cleanedMessage !== aiMessage) {
        aiMessage = cleanedMessage
      }
    } catch (memoryErr) {
      console.warn('Enhanced chat: grip-memory failed', memoryErr)
    }

    // Merge multiple README blocks into one so the user gets a single "Save to project" button
    aiMessage = mergeReadmeBlocks(aiMessage)

    // Persist assistant message immediately so if the request times out during file apply/build,
    // the user can still see the reply via refetched chat history
    const earlyAiMessage = aiMessage
    let savedAssistantMessage: { id: string } | null = null
    try {
      const saved = await saveChatMessage(projectId, {
        role: 'assistant',
        content: earlyAiMessage,
        timestamp: new Date()
      })
      savedAssistantMessage = saved as { id: string }
    } catch (saveErr) {
      console.warn('Enhanced chat: failed to save assistant message early', saveErr)
    }

    try {
    // Save all code blocks with explicit file paths directly to project files (sandbox or main)
    const { saved: appliedPaths, codeBreakErrors: appliedCodeBreakErrors } = await saveCodeBlocksToProject(projectId, aiMessage, isSandbox)

    // Persist implemented routes/entrypoints so next request excludes them from "likely remaining"
    if (appliedPaths.length > 0 && (checklistRoutes.length > 0 || checklistEntrypoints.length > 0)) {
      try {
        const newRouteKeys = new Set<string>()
        const newEntrypointKeys = new Set<string>()
        for (const applied of appliedPaths) {
          const norm = applied.replace(/\\/g, '/')
          for (const r of checklistRoutes) {
            const routePath = (r.route || '').replace(/^\//, '').replace(/\/$/, '')
            const sourceFile = (r.source_file || '').trim()
            if ((routePath && norm.includes(routePath)) || (sourceFile && (norm.includes(sourceFile) || norm.endsWith(sourceFile)))) {
              newRouteKeys.add(`${r.method || 'GET'} ${r.route || ''}`)
              if (sourceFile) newRouteKeys.add(sourceFile)
            }
          }
          for (const e of checklistEntrypoints) {
            const epFile = (e.file || '').trim()
            if (epFile && (norm.includes(epFile) || norm.endsWith(epFile))) {
              newEntrypointKeys.add(`${e.file}:${e.symbol || ''}`)
            }
          }
        }
        if (newRouteKeys.size || newEntrypointKeys.size) {
          const mergedRoutes = [...new Set([...implementedRoutePaths, ...newRouteKeys])]
          const mergedEntrypoints = [...new Set([...implementedEntrypointPaths, ...newEntrypointKeys])]
          if (isSandbox) {
            await db.collection('sandboxProjects').updateOne(
              { _id: new ObjectId(projectId) },
              { $set: { implementedRoutePaths: mergedRoutes, implementedEntrypointPaths: mergedEntrypoints, updatedAt: new Date() } }
            )
          } else {
            await updateProjectState(projectId, {
              implementedRoutePaths: mergedRoutes,
              implementedEntrypointPaths: mergedEntrypoints,
            })
          }
        }
      } catch (persistErr) {
        console.warn('Enhanced chat: failed to persist implemented checklist progress', persistErr)
      }
    }

    // Advance project state steps so Build progress (Overview + enhanced chat) reflects applied code
    if (!isSandbox && appliedPaths.length > 0) {
      for (const p of appliedPaths) {
        const lastSlash = p.lastIndexOf('/')
        const filePath = lastSlash >= 0 ? p.slice(0, lastSlash) : ''
        const filename = lastSlash >= 0 ? p.slice(lastSlash + 1) : p
        await recordFileSaveAndAdvanceStep(projectId, filePath, filename)
      }
    }

    // Run backend build after applying files. If it fails, loop: re-ask GRIP with errors until build succeeds or max attempts.
    let runErrors: string[] = []
    const runAfterApply = runAfterApplyRaw !== false // default: run when files changed
    let buildRan = false
    let buildSucceeded = false
    const MAX_BUILD_FIX_ATTEMPTS = 5
    let lastAppliedPaths = appliedPaths
    let buildRunCount = 0
    let lastRunOutput = ''

    const runBuildAndPersistErrors = async (): Promise<{ success: boolean; errors: string[]; output: string }> => {
      const runResult = await runMainProject(projectId, isSandbox)
      if (!runResult.success && runResult.errors.length > 0) {
        const lastRunErrorsPayload = {
          source: 'terminal',
          errors: runResult.errors,
          raw: runResult.output?.slice(0, 15000) ?? runResult.errors.join('\n'),
          at: new Date(),
        }
        const projectCollection = isSandbox ? 'sandboxProjects' : 'projects'
        await db.collection(projectCollection).updateOne(
          { _id: new ObjectId(projectId) },
          { $set: { lastRunErrors: lastRunErrorsPayload, updatedAt: new Date() } }
        )
      } else if (runResult.success) {
        const projectCollection = isSandbox ? 'sandboxProjects' : 'projects'
        await db.collection(projectCollection).updateOne(
          { _id: new ObjectId(projectId) },
          { $unset: { lastRunErrors: '' }, $set: { updatedAt: new Date() } }
        )
      }
      return { success: runResult.success, errors: runResult.errors, output: runResult.output ?? '' }
    }

    if (runAfterApply && appliedPaths.length > 0) {
      try {
        // Code-break check: do not consider build successful if any applied file has cut-off/incomplete code
        const codeBreakForApplied = appliedCodeBreakErrors.filter((e) => appliedPaths.includes(e.path))
        const codeBreakMessages =
          codeBreakForApplied.length > 0
            ? codeBreakForApplied.flatMap((e) => e.issues.map((i) => `[${e.path}] ${i}`))
            : []

        let result = await runBuildAndPersistErrors()
        buildRan = true
        lastRunOutput = result.output ?? ''
        buildSucceeded = result.success && codeBreakMessages.length === 0
        runErrors = result.errors
        if (codeBreakMessages.length > 0) runErrors = [...runErrors, ...codeBreakMessages]
        buildRunCount = 1

        // Loop: if build failed or code-break issues, ask GRIP to fix and re-run until success or max attempts (no stall — user sees result only when done)
        let fixAttempt = 0
        while (!buildSucceeded && runErrors.length > 0 && fixAttempt < MAX_BUILD_FIX_ATTEMPTS) {
          fixAttempt++
          // Re-fetch project so buildSystemPrompt sees lastRunErrors
          const projectCollection = isSandbox ? 'sandboxProjects' : 'projects'
          const refetched = await db.collection(projectCollection).findOne({ _id: new ObjectId(projectId) })
          const projectForPrompt = refetched
            ? {
                ...refetched,
                lastRunErrors: (refetched as { lastRunErrors?: unknown }).lastRunErrors,
              }
            : project

          const isCodeBreak = runErrors.some((e) => e.startsWith('[') && (e.includes('Unclosed') || e.includes('Unbalanced') || e.includes('incomplete') || e.includes('truncation')))
          const buildFailedUserMessage = isCodeBreak
            ? `The automated build cannot be marked successful because one or more applied files have possible cut-off or incomplete code. You MUST output the COMPLETE file(s) again in code blocks (exact path above each block) with no truncation. Fix the following and then we will re-run the build.\n\nCode break / cut-off issues:\n\`\`\`\n${runErrors.join('\n').slice(0, 6000)}${runErrors.join('\n').length > 6000 ? '\n...(truncated)' : ''}\n\`\`\``
            : `The automated build failed. Please fix the following errors and output the corrected file(s) in code blocks with the exact path above each block. Do not suggest the user run commands or test in StackBlitz until the build succeeds.\n\nBuild errors:\n\`\`\`\n${runErrors.join('\n').slice(0, 6000)}${runErrors.join('\n').length > 6000 ? '\n...(truncated)' : ''}\n\`\`\``

          const historyForRetry = [
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'assistant' as const, content: aiMessage },
            { role: 'user' as const, content: buildFailedUserMessage },
          ]
          const systemPromptRetry = buildSystemPrompt(projectForPrompt, analysis, repoReferenceDoc, savedFiles, planContext, projectStateContext, structuredSummary, sandboxExperimentsSummary, repoFeaturesChecklist, isSandbox, likelyRemaining, lastAttemptSummary, userUploadsSummary, repoTypeRules, stackGuidanceFromPlan, tokenBudgetHint, userHasMongoDB, sectionBudgets)

          const responseRetry = await anthropicService.createMessage(historyForRetry, { system: systemPromptRetry })
          const tokensRetry = responseRetry.usage?.totalTokens ?? (responseRetry.usage?.promptTokens ?? 0) + (responseRetry.usage?.completionTokens ?? 0)
          if (tokensRetry > 0 && session.user?.id) {
            addTokenUsage(session.user.id, tokensRetry).catch(() => {})
          }

          let nextMessage = (responseRetry.content && String(responseRetry.content).trim()) || ''
          if (!nextMessage || nextMessage.length < 3) break
          const backtickCountRetry = (nextMessage.match(/```/g) || []).length
          if (backtickCountRetry % 2 !== 0) nextMessage = nextMessage.trimEnd() + '\n```'
          try {
            const { cleanedMessage, executedSummary } = await parseAndExecuteGripActions(projectId, nextMessage)
            if (executedSummary.length > 0) nextMessage = cleanedMessage + (cleanedMessage ? '\n\n' : '') + '**Done:** ' + executedSummary.join('; ')
            else if (cleanedMessage !== nextMessage) nextMessage = cleanedMessage
          } catch (_) {}
          try {
            const { cleanedMessage, updated } = await parseAndApplyGripUpdateIdeation(projectId, nextMessage)
            if (updated) nextMessage = cleanedMessage + (cleanedMessage ? '\n\n' : '') + "I've updated your project details."
            else if (cleanedMessage !== nextMessage) nextMessage = cleanedMessage
          } catch (_) {}
          try {
            const { cleanedMessage: memCleaned, updated: memUpdated } = await parseAndApplyGripMemory(projectId, nextMessage, isSandbox)
            if (memUpdated) nextMessage = memCleaned + (memCleaned ? '\n\n' : '') + "I'll remember that for future messages."
            else if (memCleaned !== nextMessage) nextMessage = memCleaned
          } catch (_) {}
          nextMessage = mergeReadmeBlocks(nextMessage)

          const { saved: appliedPathsRetry, codeBreakErrors: codeBreakErrorsRetry } = await saveCodeBlocksToProject(projectId, nextMessage, isSandbox)
          lastAppliedPaths = appliedPathsRetry
          aiMessage = nextMessage

          // Persist implemented routes/entrypoints on retry too (main and sandbox)
          if (appliedPathsRetry.length > 0 && (checklistRoutes.length > 0 || checklistEntrypoints.length > 0)) {
            try {
              const newRouteKeysRetry = new Set<string>()
              const newEntrypointKeysRetry = new Set<string>()
              for (const applied of appliedPathsRetry) {
                const norm = applied.replace(/\\/g, '/')
                for (const r of checklistRoutes) {
                  const routePath = (r.route || '').replace(/^\//, '').replace(/\/$/, '')
                  const sourceFile = (r.source_file || '').trim()
                  if ((routePath && norm.includes(routePath)) || (sourceFile && (norm.includes(sourceFile) || norm.endsWith(sourceFile)))) {
                    newRouteKeysRetry.add(`${r.method || 'GET'} ${r.route || ''}`)
                    if (sourceFile) newRouteKeysRetry.add(sourceFile)
                  }
                }
                for (const e of checklistEntrypoints) {
                  const epFile = (e.file || '').trim()
                  if (epFile && (norm.includes(epFile) || norm.endsWith(epFile))) {
                    newEntrypointKeysRetry.add(`${e.file}:${e.symbol || ''}`)
                  }
                }
              }
              if (newRouteKeysRetry.size || newEntrypointKeysRetry.size) {
                const mergedRoutesRetry = [...new Set([...implementedRoutePaths, ...newRouteKeysRetry])]
                const mergedEntrypointsRetry = [...new Set([...implementedEntrypointPaths, ...newEntrypointKeysRetry])]
                if (isSandbox) {
                  await db.collection('sandboxProjects').updateOne(
                    { _id: new ObjectId(projectId) },
                    { $set: { implementedRoutePaths: mergedRoutesRetry, implementedEntrypointPaths: mergedEntrypointsRetry, updatedAt: new Date() } }
                  )
                } else {
                  await updateProjectState(projectId, {
                    implementedRoutePaths: mergedRoutesRetry,
                    implementedEntrypointPaths: mergedEntrypointsRetry,
                  } as Record<string, unknown>)
                }
              }
            } catch (persistErr) {
              console.warn('Enhanced chat: failed to persist implemented checklist progress (retry)', persistErr)
            }
          }

          if (!isSandbox && appliedPathsRetry.length > 0) {
            for (const p of appliedPathsRetry) {
              const lastSlash = p.lastIndexOf('/')
              const filePath = lastSlash >= 0 ? p.slice(0, lastSlash) : ''
              const filename = lastSlash >= 0 ? p.slice(lastSlash + 1) : p
              await recordFileSaveAndAdvanceStep(projectId, filePath, filename)
            }
          }

          if (appliedPathsRetry.length === 0) break
          const codeBreakForRetry = codeBreakErrorsRetry.filter((e) => appliedPathsRetry.includes(e.path))
          const codeBreakMessagesRetry = codeBreakForRetry.flatMap((e) => e.issues.map((i) => `[${e.path}] ${i}`))
          result = await runBuildAndPersistErrors()
          buildRunCount++
          lastRunOutput = result.output ?? ''
          buildSucceeded = result.success && codeBreakMessagesRetry.length === 0
          runErrors = result.errors
          if (codeBreakMessagesRetry.length > 0) runErrors = [...runErrors, ...codeBreakMessagesRetry]
        }
      } catch (runErr) {
        console.warn('Enhanced chat: run-after-apply failed:', runErr)
      }
    }

    if (lastAppliedPaths.length > 0) {
      const appliedLine = `**Applied:** ${lastAppliedPaths.join(', ')}.`
      const runs = typeof buildRunCount === 'number' && buildRunCount > 0 ? buildRunCount : 1
      const buildLine = buildRan
        ? buildSucceeded
          ? (runs > 1
              ? ` **We ran the build ${runs} times; it succeeded.** Use **Run in StackBlitz** or your local dev environment to preview, or tell me what to change or paste any errors.`
              : ' **We ran the build; it succeeded.** Use **Run in StackBlitz** or your local dev environment to preview, or tell me what to change or paste any errors.')
          : (runs > 1
              ? ` **We ran the build ${runs} times; it still reported errors (see below).** Please review the errors or paste them again and I'll keep fixing.`
              : ' **We ran the build; it reported errors (see below).** Please review the errors or paste them again and I\'ll keep fixing.')
        : ' Use **Run in StackBlitz** or your local dev environment to preview, or tell me what to change or paste any errors.'
      aiMessage = aiMessage + (aiMessage ? '\n\n' : '') + appliedLine + buildLine
      // Append actual errors to message so user and history have them; GRIP can fix on next turn
      if (runErrors.length > 0) {
        const errorBlock = '\n\n**Build errors:**\n```\n' + runErrors.join('\n').slice(0, 8000) + (runErrors.join('\n').length > 8000 ? '\n...(truncated)' : '') + '\n```'
        aiMessage = aiMessage + errorBlock
      }
      // Append build log (stdout/stderr from npm install + build) so user sees full outcome in chat
      if (lastRunOutput.trim()) {
        const BUILD_LOG_MAX = 6000
        const logTrimmed = lastRunOutput.length > BUILD_LOG_MAX
          ? lastRunOutput.slice(-BUILD_LOG_MAX)
          : lastRunOutput
        const logSuffix = lastRunOutput.length > BUILD_LOG_MAX ? '\n...(earlier output truncated)' : ''
        const logBlock = '\n\n**Build log:**\n```\n' + logTrimmed + logSuffix + '\n```'
        aiMessage = aiMessage + logBlock
      }
      // Create in-app notification so user sees build outcome in the bell
      if (session?.user?.email && buildRan) {
        const { createNotification } = await import('@/lib/notifications')
        await createNotification({
          userId: session.user.email,
          type: buildSucceeded ? 'build_success' : 'build_failure',
          title: buildSucceeded ? 'Build succeeded' : 'Build reported errors',
          message: buildSucceeded
            ? `Your project build completed successfully. Check the chat for details.`
            : `The automated build reported errors. GRIP can fix them—check the chat for the error log.`,
          projectId: String(projectId),
          priority: buildSucceeded ? 'low' : 'medium',
        })
      }
    }

    // Update persisted message with full content (including build status) so refetched history matches
    if (savedAssistantMessage?.id) {
      await updateAssistantMessageContent(projectId, savedAssistantMessage.id, aiMessage)
    } else {
      // Early save failed; persist now so history has the message
      await saveChatMessage(projectId, { role: 'assistant', content: aiMessage, timestamp: new Date() }).catch((e) =>
        console.warn('Enhanced chat: failed to save assistant message at end', e)
      )
    }

    return NextResponse.json({
      message: aiMessage,
      refreshContext: false,
      appliedPaths: lastAppliedPaths,
      runErrors: runErrors.length > 0 ? runErrors : undefined,
      buildRan: runAfterApply && lastAppliedPaths.length > 0 ? buildRan : undefined,
      buildSucceeded: runAfterApply && lastAppliedPaths.length > 0 ? buildSucceeded : undefined,
    })
    } catch (postSaveError) {
      // After we had aiMessage and saved it early, something failed (e.g. timeout during build).
      // Return 200 with the message we saved so the user always sees the reply when tokens were used.
      console.error('Enhanced chat: post-save error (returning saved message)', postSaveError)
      return NextResponse.json({
        message: earlyAiMessage,
        partialSuccess: true,
        error: postSaveError instanceof Error ? postSaveError.message : String(postSaveError),
        refreshContext: true,
      })
    }
  } catch (error) {
    console.error('Error in enhanced chat:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
} 