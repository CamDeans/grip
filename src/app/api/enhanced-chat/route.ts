import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance } from '@/lib/access'
import { addTokenUsage } from '@/lib/tokenUsage'
import { anthropicService } from '@/lib/services/anthropicService'
import { getOrBuildRepoContextDocument } from '@/lib/services/repoContextService'
import { listProjectFiles } from '@/lib/services/fileStorageService'
import { getProjectPlan } from '@/lib/services/projectPlanningService'
import { getProjectState, recordFileSaveAndAdvanceStep } from '@/lib/services/projectStateService'
import { createProjectFolder, saveProjectFile } from '@/lib/services/gripProjectActions'
import { mergeReadmeBlocks } from '@/lib/mergeReadmeBlocks'
import { runMainProject } from '@/lib/runMainProject'
import { MANDATORY_GRIP_BUILD_QUALITY } from '@/lib/constants/buildQualityPlan'

// Phase 2, Step 2: Create Project Data Fetcher for enhanced chat

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
  sandboxExperimentsSummary?: string
) => {
  let prompt = `You are G.R.I.P. (Guided Real-time Intelligence Partner) designed to help with software development projects. 
You are G.R.I.P., an AI assistant built specifically for helping developers automate project creation. Do not claim to be or reference any other AI product or provider.

Your primary purpose is to help guide users through building out projects by writing code, creating files, and implementing features
based on the project ideation, repository structure, and existing code in the cloned GitHub repository.

## CRITICAL: README.md = ONE code block only (never multiple)
When you provide a README (at project completion OR when the user asks for a README), you MUST output the **entire** README in **exactly one** markdown code block. Never output multiple code blocks for one README (e.g. one block for intro, another for file tree, another for bash). Multiple blocks = the user cannot save one README.md file. All README content (features, install, bash commands, file structure, env examples) goes inside that single \`\`\`markdown ... \`\`\` block. One block = one "Save to project" = one file.

## CRITICAL: Assume every user may be non-technical
- Treat ALL responses as if they will be read by a non-developer. The user may not know file paths, code, or technical jargon.
- ALWAYS provide: (1) exact file path/filename for every code block (see below), (2) step-by-step actions the user should follow, (3) clear "next step" so the user and GRIP stay on the same page.
- When the user asks "what is our next step" or "what should I do next": first state the current phase and the next step in plain language (e.g. "We're in Phase 1: Setup. Your next step is to add a package.json so the project can run."). Then if you provide code, put the exact file path on the line above the code block and give numbered steps (e.g. "1. Save the block above as package.json. 2. Go to the Preview tab and click **Run in StackBlitz** to see the app run—no install needed. 3. Tell me when that's done or if you see any errors.").
- NEVER use generic filenames like snippet.json, snippet.txt, or any "snippet.*". Always use the real file path (e.g. package.json, src/App.tsx, .env, .env.local, README.txt). The "Save to project" button uses the path you put above the block; if you omit it, the user gets a generic name and may overwrite the same file repeatedly. It is MANDATORY to put the correct filename for every code block (e.g. .env for env vars, .env.local for local overrides, README.txt for plain text readme).

## Re-ask project-style questions in plain English and convert answers to technical aspects
- When communicating with the user, treat them as a non-developer. Proactively re-ask or clarify (in plain English) the same kinds of questions as the project creation form: (1) What is the main goal of this project in your own words? (2) Who will use it? Describe them simply. (3) What should the app do? List the main things in simple terms. (4) Any technical preferences or constraints? (e.g. "must work on phones", "needs to be simple", "fast loading").
- Take the user's plain-English answers and convert them into technical aspects for the project (e.g. "I want it to work on phones" → responsive, mobile-first; "needs to be simple" → minimal UI, clear navigation; "fast" → performance, lazy loading). Use this enriched understanding when writing code and creating files/folders so they align with the user's end-result requests.
- When the user provides new or clearer info about goals, audience, features, or technical wishes (in plain English), you MUST add it to the project details so future responses stay aligned. Output a **grip-update-ideation** block with the updated fields (only include fields you are updating or inferring from the user's message). Format exactly:
\`\`\`grip-update-ideation
{"goals":"...","targetAudience":"...","keyFeatures":"...","technicalRequirements":"..."}
\`\`\`
Use plain text for each field; you may merge the user's plain-English answer with existing project info. The system will save this to the project so your next responses use it. After the block, say briefly in plain language that you've updated the project details with what they shared so future code will match their goals better. Do not ask the user to fill a form—you infer and convert their words into these fields.

`

  // Add project context if available
  if (projectContext) {
    prompt += `## Project Information
- Title: "${projectContext.title}"
- Description: "${projectContext.description}"
`

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
  }

  // Mandatory build quality so GRIP follows same bar (latest libs, modern UX/UI, token efficiency)
  prompt += `\n${MANDATORY_GRIP_BUILD_QUALITY}\n\n`

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

  // Current build progress (tracked from user saves and chat) — keep GRIP and user aligned
  if (projectStateContext?.phases?.length) {
    prompt += `\n## GRIP works only on phases — always route back to Overview for next steps\n`
    prompt += `- You work ONLY on the current phase. Do not suggest or implement work for future phases until the user has returned to the Overview page and confirmed the current phase is done.\n`
    prompt += `- When you and the user agree that the current phase is complete (all steps done), you MUST route the user back to the project Overview page for next steps and realignment. Say clearly: "Phase [name] is complete. Return to the Overview page to review the phases and confirm. Then you can start the next phase from there so we stay in sync." Do not start the next phase in chat until the user has returned to Overview and indicated they are ready.\n`
    prompt += `- This keeps both you and the user aligned: the Overview page is the single place for realignment before the next phase.\n\n`
    prompt += `## Current build progress (tracked from user saves and chat)\n`
    prompt += `Use this to stay aligned with what the user has actually completed. Do not suggest steps that are already completed.\n`
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
    prompt += `The user ran the project (${sourceLabel}) and build or runtime errors were reported below. You MUST:\n`
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
      prompt += `\nRaw build/runtime log (use this to understand context and file paths):\n\`\`\`\n${raw.slice(0, 4000)}${raw.length > 4000 ? '\n...(truncated)' : ''}\n\`\`\`\n`
    }
    const isStackBlitzMetroError = /memory access out of bounds|createHash|metro-file-map/i.test(raw) ||
      (Array.isArray(lastRunErrors.errors) && lastRunErrors.errors.some((e: string) => /memory access out of bounds|createHash|metro-file-map/i.test(e)))
    if (isStackBlitzMetroError) {
      prompt += `\nNOTE: This error is a known StackBlitz/WebContainers limitation with Metro (React Native/Expo). The project code is not at fault. Only in this case, tell the user: StackBlitz cannot run this stack in-browser. They can Export to GitHub or download the project and run locally (\`npm install\` then \`npm run dev\`) or in VS Code/Cursor. For web (Next, Vite, CRA), keep directing them to Run in StackBlitz first.\n`
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
      // Tree-sitter analysis available - use it as primary analysis
      prompt += `\n## Repository Analysis (tree-sitter AST analysis)\n${ra.projectAnalysis.slice(0, 8000)}\n`
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

  // Add structured analysis summary (tree-link JSON) if available
  if (structuredSummary && structuredSummary.trim()) {
    prompt += `\n## Structured repo analysis (tree-link JSON summary; capabilities vs requirements; no code)\n${structuredSummary.slice(0, 4000)}\n`
  }

  if (repoReferenceDoc && repoReferenceDoc.length > 0) {
    prompt += `\n## Repository reference (structure, patterns, and APIs only — do NOT copy code)\n`
    prompt += `The user's project input and the cloned GitHub repo are both in your context for the build. The content below is the repo's structure and file contents. You MUST use it only to understand patterns, architecture, and APIs—**never** to copy or closely paraphrase code.\n`
    prompt += `- Base the development plan and phases on what the repo does (features, flows, routes, APIs), but implement everything here as new, clean-room code.\n`
    prompt += `- When a file exists in the repo, you may mirror its responsibilities and structure in new files in this project, but do not paste its contents. Integrate via compatible APIs and data shapes.\n\n`
    prompt += repoReferenceDoc.slice(0, 28000)
    if (repoReferenceDoc.length > 28000) prompt += '\n_(document truncated)_'
    prompt += '\n\n'
  } else if (projectContext?.repository) {
    prompt += `\n## Repository context note\n`
    prompt += `This project has a linked repo (${projectContext.repository.owner}/${projectContext.repository.name}) but repo file content is not in this context yet. You MUST still treat the repo as a reference only: when implementing, follow its patterns and structure but write new, clean-room code here. If you need repo file contents to proceed, tell the user to open the Repo tab to load the clone, or to refresh the project so repo context can be rebuilt.\n\n`
  }

  // List files currently in the project so GRIP can reference them and answer "which files used snippet.txt"
  if (savedFiles && savedFiles.length > 0) {
    prompt += `\n## Files currently in this project\n`
    prompt += `The following files are saved in the project (path/filename). Use this list to reference existing files and to answer when the user asks which files used a generic name like snippet.txt.\n\n`
    savedFiles.forEach((f) => {
      const full = (f.path ? `${f.path}/` : '') + (f.filename || '')
      if (full.trim()) prompt += `- ${full.trim()}\n`
    })
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
- After every code block: give a short step-by-step for the user (e.g. "1. Save the block above as package.json. 2. Go to the Preview tab and click **Run in StackBlitz** to preview—no install needed. 3. Tell me when that's done or if you see errors."). Do not suggest npm install or local run first; assume they will use StackBlitz to test. This keeps non-devs on track.

## Full-file updates (critical for non-devs)
- Many users are non-developers. NEVER ask the user to manually edit a file (e.g. "add this line to X" or "edit the scripts section"). Manual edits cause errors and are hard for non-devs.
- When suggesting changes to an EXISTING file (config, component, or any file the user or context refers to), you MUST output the COMPLETE, UPDATED file in a single code block with the path/filename above it (e.g. \`package.json\` or \`src/App.tsx\`) so the user can save it in one action via "Save to project" or copy-paste. Do not output partial diffs, "add this", or "replace line X with Y"—only full file content.
- Analyze the current file from context (repository reference or project files). Apply the requested change to that content and output the entire result. If the file is not in context, infer a minimal valid version and state that the user should replace the file with the block you provide.
- After a full-file code block, briefly say something like: "Save the block above as [filename] in your project so the change is applied." This makes it clear for non-devs that one action (Save to project) is enough.

## package.json: always provide full file
- When the user asks to add a dependency, update scripts, change config, or modify package.json in any way, you MUST output the COMPLETE package.json with the change applied—never "add this to your package.json" or "add this dependency" without providing the full file.
- Use the project's current package.json from context (repository reference or project files). Merge in the new dependency, script, or config change and output the full JSON in a code block with \`package.json\` (or \`package.json\` on its own line) directly above the block. Preserve existing fields (name, version, other dependencies, etc.); only add or update what is needed.
- If package.json is not in context, build a minimal valid package.json that includes the requested change (e.g. new dependency or script) and say the user should save it as \`package.json\` in the project root. Always include at least: name, version, and scripts (e.g. dev, start, build) so the project remains runnable.
- After outputting package.json, tell the user to save the block as \`package.json\`, then go to the **Preview** tab and click **Run in StackBlitz** to preview the app. Do NOT suggest npm install or running commands locally first—the app is designed for non-devs; StackBlitz runs the project in the browser with no install.

## Code Automation Instructions
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
- We run the build automatically after each response when you output code (save to project). Do NOT suggest "Run in StackBlitz" or "test in StackBlitz" until the automated build has succeeded.
- When the last run reported errors (e.g. "We ran the build; it reported errors"): fix the code in your response (output full files in code blocks). We will run the build again after your response. Do NOT tell the user to test in StackBlitz until you see or we report "We ran the build; it succeeded."
- Only after "We ran the build; it succeeded" should you say to test in StackBlitz (e.g. "The build succeeded. Use **Run in StackBlitz** in the Preview tab to see the app.").
- If the user pastes build or runtime errors (e.g. from StackBlitz): fix the code (output full files in code blocks so they can save), then say "Save the file(s) above; we'll run the build again. If it succeeds, then use **Run in StackBlitz**." Do not suggest running npm install or terminal commands first.
- Only suggest terminal commands (npm install, npm run dev, Run & Debug) when the user explicitly says they want to run locally, export to GitHub, or run in an IDE. For normal flow, direct them to **Preview → Run in StackBlitz** only after the build succeeds.
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
- Order: output package.json (and other config files) first, then say "Save these to your project root." Only after that may you provide the README and state the project is complete.

## MANDATORY: package.json when directing to StackBlitz or deployment
- Whenever you (1) tell the user to **test in StackBlitz**, or (2) **finish the build** and inform the user to **test for deployment**, you MUST provide or update **package.json** in a code block with all dependency requirements—never suggest "add this dependency" or "update your package.json" without outputting the full package.json content.
- Output the complete package.json (path above the block, e.g. \`package.json\`) so the user can save it. Include every dependency the project needs and correct \`scripts\` for \`build\`, \`dev\`, \`start\` (and \`test\` if applicable). This ensures the project runs in StackBlitz and after deployment without missing dependencies.

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
- After the single README block, say: "Save the block above as README.md in your project root. This is the complete README in one file."

## MANDATORY: Interruption and continuation
- If your previous response was cut off (e.g. due to token limits), you MUST continue from exactly where you left off on the next user message. Do not start over or repeat what you already said.
- When continuing after an interruption: (1) Briefly inform the user that an interruption occurred; (2) Reassure them that you did not lose where you were; (3) State clearly that you have picked up where you left off; (4) Confirm that any remaining code and file updates will be completed. Then immediately continue with the next unfinished part (e.g. the next code block, step, or file).
- Do not ask the user to "ask me to continue"—treat continuation as mandatory whenever your prior reply was incomplete.

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

/** Save all extracted code blocks directly to project files (projectFiles or legalSandboxFiles based on project type). */
async function saveCodeBlocksToProject(
  projectId: string,
  message: string,
  isSandbox: boolean = false
): Promise<{ saved: string[] }> {
  const blocks = extractCodeBlocksWithPaths(message)
  const saved: string[] = []
  for (const { path, content } of blocks) {
    if (isSandbox) {
      const { upsertLegalSandboxFile } = await import('@/lib/services/legalSandboxService')
      const res = await upsertLegalSandboxFile(projectId, path, content)
      if (res.ok) saved.push(path)
    } else {
      const res = await saveProjectFile(projectId, path, content)
      if (res.ok) saved.push(path)
    }
  }
  return { saved }
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
        }
      } else {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
    }

    // Get analysis context (use sandboxAnalyses for sandbox projects)
    const analysisCollection = isSandbox ? 'sandboxAnalyses' : 'analyses'
    const analysis = await db.collection(analysisCollection).findOne({
      projectId: new ObjectId(projectId)
    })

    // Extract structured analysis summary (tree-link JSON) if available
    let structuredSummary = ''
    try {
      const ra = analysis?.repositoryAnalysis as
        | { projectAnalysis?: string; fileAnalyses?: Array<{ path: string; analysis: string }>; structuredAnalysis?: any }
        | undefined
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

    // Get or build repo reference document (full repo context for G.R.I.P.)
    const repoReferenceDoc = await getOrBuildRepoContextDocument(projectId)

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

    // Development plan (phases + file hierarchy) so GRIP uses the same plan and file paths
    let planContext: { phases?: Array<{ name: string; description?: string; tasks?: Array<{ name: string; status?: string }> }>; fileHierarchy?: { path: string; name?: string; children?: unknown[] } } | undefined
    try {
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
    } catch (planErr) {
      console.warn('Enhanced chat: could not load project plan for context', planErr)
    }

    // Project state (phases/steps) so GRIP knows what the user has completed via saves and chat
    let projectStateContext: ProjectStateContext = null
    try {
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

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(project, analysis, repoReferenceDoc, savedFiles, planContext, projectStateContext, structuredSummary, sandboxExperimentsSummary)

    // Production readiness: fail gracefully when AI is not configured
    const { getAnthropicApiKey } = await import('@/lib/anthropicConfig')
    if (!getAnthropicApiKey()) {
      return NextResponse.json(
        { error: 'G.R.I.P. AI is not configured. Set ANTHROPIC_API_KEY in .env.local or environment.' },
        { status: 503 }
      )
    }

    try {
      await anthropicService.initialize()
    } catch (initErr) {
      const msg = initErr instanceof Error ? initErr.message : String(initErr)
      console.error('G.R.I.P. AI initialization failed:', msg, initErr)
      return NextResponse.json(
        { error: 'G.R.I.P. AI is temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    let response
    try {
      response = await anthropicService.createMessage(
        history.map(m => ({ role: m.role, content: m.content })),
        { system: systemPrompt }
      )
    } catch (apiErr) {
      console.error('G.R.I.P. AI request failed:', apiErr)
      return NextResponse.json(
        { error: 'G.R.I.P. AI is temporarily unavailable. Please try again in a moment.' },
        { status: 503 }
      )
    }

    const totalTokens = (response.usage?.promptTokens ?? 0) + (response.usage?.completionTokens ?? 0)
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

    // Merge multiple README blocks into one so the user gets a single "Save to project" button
    aiMessage = mergeReadmeBlocks(aiMessage)

    // Save all code blocks with explicit file paths directly to project files (sandbox or main)
    const { saved: appliedPaths } = await saveCodeBlocksToProject(projectId, aiMessage, isSandbox)

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

    const runBuildAndPersistErrors = async (): Promise<{ success: boolean; errors: string[] }> => {
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
      return { success: runResult.success, errors: runResult.errors }
    }

    if (runAfterApply && appliedPaths.length > 0) {
      try {
        let result = await runBuildAndPersistErrors()
        buildRan = true
        buildSucceeded = result.success
        runErrors = result.errors

        // Loop: if build failed, ask GRIP to fix and re-run until success or max attempts (no stall — user sees result only when done)
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

          const buildFailedUserMessage =
            `The automated build failed. Please fix the following errors and output the corrected file(s) in code blocks with the exact path above each block. Do not suggest the user run commands or test in StackBlitz until the build succeeds.\n\nBuild errors:\n\`\`\`\n${runErrors.join('\n').slice(0, 6000)}${runErrors.join('\n').length > 6000 ? '\n...(truncated)' : ''}\n\`\`\``

          const historyForRetry = [
            ...history.map(m => ({ role: m.role, content: m.content })),
            { role: 'assistant' as const, content: aiMessage },
            { role: 'user' as const, content: buildFailedUserMessage },
          ]
          const systemPromptRetry = buildSystemPrompt(projectForPrompt, analysis, repoReferenceDoc, savedFiles, planContext, projectStateContext, structuredSummary, sandboxExperimentsSummary)

          const responseRetry = await anthropicService.createMessage(historyForRetry, { system: systemPromptRetry })
          const tokensRetry = (responseRetry.usage?.promptTokens ?? 0) + (responseRetry.usage?.completionTokens ?? 0)
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
          nextMessage = mergeReadmeBlocks(nextMessage)

          const { saved: appliedPathsRetry } = await saveCodeBlocksToProject(projectId, nextMessage, isSandbox)
          lastAppliedPaths = appliedPathsRetry
          aiMessage = nextMessage

          if (!isSandbox && appliedPathsRetry.length > 0) {
            for (const p of appliedPathsRetry) {
              const lastSlash = p.lastIndexOf('/')
              const filePath = lastSlash >= 0 ? p.slice(0, lastSlash) : ''
              const filename = lastSlash >= 0 ? p.slice(lastSlash + 1) : p
              await recordFileSaveAndAdvanceStep(projectId, filePath, filename)
            }
          }

          if (appliedPathsRetry.length === 0) break
          result = await runBuildAndPersistErrors()
          buildSucceeded = result.success
          runErrors = result.errors
        }
      } catch (runErr) {
        console.warn('Enhanced chat: run-after-apply failed:', runErr)
      }
    }

    if (lastAppliedPaths.length > 0) {
      const appliedLine = `**Applied:** ${lastAppliedPaths.join(', ')}.`
      const buildLine = buildRan
        ? buildSucceeded
          ? ' **We ran the build; it succeeded.** Use **Run in StackBlitz** or your local dev environment to preview, or tell me what to change or paste any errors.'
          : ' **We ran the build multiple times; it still reported errors (see below).** Please review the errors or paste them again and I\'ll keep fixing.'
        : ' Use **Run in StackBlitz** or your local dev environment to preview, or tell me what to change or paste any errors.'
      aiMessage = aiMessage + (aiMessage ? '\n\n' : '') + appliedLine + buildLine
      // Append actual errors to message so user and history have them; GRIP can fix on next turn
      if (runErrors.length > 0) {
        const errorBlock = '\n\n**Build errors:**\n```\n' + runErrors.join('\n').slice(0, 8000) + (runErrors.join('\n').length > 8000 ? '\n...(truncated)' : '') + '\n```'
        aiMessage = aiMessage + errorBlock
      }
    }

    // Save AI response
    await saveChatMessage(projectId, {
      role: 'assistant',
      content: aiMessage,
      timestamp: new Date()
    })

    return NextResponse.json({
      message: aiMessage,
      refreshContext: false,
      appliedPaths: lastAppliedPaths,
      runErrors: runErrors.length > 0 ? runErrors : undefined,
      buildRan: runAfterApply && lastAppliedPaths.length > 0 ? buildRan : undefined,
      buildSucceeded: runAfterApply && lastAppliedPaths.length > 0 ? buildSucceeded : undefined,
    })
  } catch (error) {
    console.error('Error in enhanced chat:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
} 