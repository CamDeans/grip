import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { anthropicService } from '@/lib/services/anthropicService'
import { getOrBuildRepoContextDocument } from '@/lib/services/repoContextService'
import { listProjectFiles } from '@/lib/services/fileStorageService'
import { getProjectPlan } from '@/lib/services/projectPlanningService'
import { createProjectFolder, getFileContentByPath, saveProjectFile } from '@/lib/services/gripProjectActions'

// Phase 2, Step 2: Create Project Data Fetcher for enhanced chat

// Build a custom system prompt with project context
const buildSystemPrompt = (
  projectContext: any,
  analysisContext: any,
  repoReferenceDoc?: string,
  savedFiles?: Array<{ path: string; filename: string }>,
  planContext?: { phases?: Array<{ name: string; description?: string; tasks?: Array<{ name: string; status?: string }> }>; fileHierarchy?: { path: string; name?: string; children?: unknown[] } }
) => {
  let prompt = `You are G.R.I.P. (Guided Real-time Intelligence Partner) designed to help with software development projects. 
You are not Claude or an Anthropic AI. You are G.R.I.P., an AI assistant built specifically for helping developers automate project creation.

Your primary purpose is to help guide users through building out projects by writing code, creating files, and implementing features
based on the project ideation, repository structure, and existing code in the cloned GitHub repository.

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
    }

    if (projectContext.ideation) {
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
  }

  // Development plan (phases and tasks) and file hierarchy so GRIP uses the same plan and paths
  if (planContext) {
    if (planContext.phases && planContext.phases.length > 0) {
      prompt += `\n## Development Plan (Phases)\nUse this plan to guide the build. Prefer completing tasks in order.\n`
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

  // Run errors (StackBlitz/export/deploy): user pasted build/runtime errors — GRIP must fix the actual project files
  const lastRunErrors = projectContext?.lastRunErrors
  if (lastRunErrors && (Array.isArray(lastRunErrors.errors) ? lastRunErrors.errors.length > 0 : typeof lastRunErrors.raw === 'string' && lastRunErrors.raw.length > 0)) {
    const sourceLabel = lastRunErrors.source === 'stackblitz' ? 'StackBlitz' : lastRunErrors.source === 'export' ? 'Export/GitHub' : lastRunErrors.source === 'deploy' ? 'Deploy/Vercel' : lastRunErrors.source
    prompt += `\n## StackBlitz / run errors (treat as high priority)\n`
    prompt += `The user ran the project in ${sourceLabel} and pasted build or runtime errors below. You MUST:\n`
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
      prompt += `\nNOTE: This error is a known StackBlitz/WebContainers limitation with Metro (React Native/Expo). The project code is not at fault. Tell the user: run the project locally (Download project or Export to GitHub, then \`npm install\` and \`npm run dev\`) or in VS Code/Cursor; StackBlitz in-browser cannot run Metro reliably.\n`
    }
    prompt += `\n`
  }

  // Add analysis context if available - enhanced to provide more actionable insights
  if (analysisContext) {
    prompt += `\n## Repository Analysis\n`

    if (analysisContext.repositoryStructure) {
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
    
    // Add automation capabilities based on repository analysis
    prompt += `\n### Automation Capabilities
Based on the repository analysis, you can help with:
- Generating new files that fit into the existing project structure
- Writing code that follows the coding patterns and styles in the repository
- Creating new features that integrate with existing components
- Setting up configuration files consistent with the project requirements
- Implementing the technical requirements specified in the project ideation
`
  }

  if (repoReferenceDoc && repoReferenceDoc.length > 0) {
    prompt += `\n## Full repository reference (analyzed from stored repo)\nUse this document as the primary reference for the codebase. It contains structure and file excerpts from the complete repo stored in the database.\n\n`
    prompt += repoReferenceDoc.slice(0, 28000)
    if (repoReferenceDoc.length > 28000) prompt += '\n_(document truncated)_'
    prompt += '\n\n'
  }

  // CRITICAL: Code must always be in markdown code blocks so it can be saved to project files
  prompt += `
## CRITICAL: Code block formatting (must follow)
- ALL code you generate MUST be inside markdown code blocks using triple backticks (e.g. \`\`\`tsx or \`\`\`js).
- NEVER output code as plain text outside of code blocks. Code outside blocks cannot be saved to project files.
- If the code is long: output the FULL code in a SINGLE code block. Do NOT split it—do NOT continue the code in plain text after the block. This applies to README.md and any long document: one file = one code block; do not output part of the file as plain text and part in blocks.
- If you hit token limits: close the current code block, then in a NEW message/block provide the rest in another full code block. Never leave code unclosed or mixed with prose in the middle.
- Optional: before a code block, you may add one line like \`src/App.tsx\` or **path/filename** so the user can save the block to that path. Keep that line directly above the block.
- Format: opening triple backticks, optional language (e.g. tsx), newline, full code, newline, closing triple backticks. The entire snippet must be between opening and closing backticks.

## Full-file updates (critical for non-devs)
- Many users are non-developers. NEVER ask the user to manually edit a file (e.g. "add this line to X" or "edit the scripts section"). Manual edits cause errors and are hard for non-devs.
- When suggesting changes to an EXISTING file (config, component, or any file the user or context refers to), you MUST output the COMPLETE, UPDATED file in a single code block with the path/filename above it (e.g. \`package.json\` or \`src/App.tsx\`) so the user can save it in one action via "Save to project" or copy-paste. Do not output partial diffs, "add this", or "replace line X with Y"—only full file content.
- Analyze the current file from context (repository reference or project files). Apply the requested change to that content and output the entire result. If the file is not in context, infer a minimal valid version and state that the user should replace the file with the block you provide.
- After a full-file code block, briefly say something like: "Save the block above as [filename] in your project so the change is applied." This makes it clear for non-devs that one action (Save to project) is enough.

## package.json: always provide full file
- When the user asks to add a dependency, update scripts, change config, or modify package.json in any way, you MUST output the COMPLETE package.json with the change applied—never "add this to your package.json" or "add this dependency" without providing the full file.
- Use the project's current package.json from context (repository reference or project files). Merge in the new dependency, script, or config change and output the full JSON in a code block with \`package.json\` (or \`package.json\` on its own line) directly above the block. Preserve existing fields (name, version, other dependencies, etc.); only add or update what is needed.
- If package.json is not in context, build a minimal valid package.json that includes the requested change (e.g. new dependency or script) and say the user should save it as \`package.json\` in the project root. Always include at least: name, version, and scripts (e.g. dev, start, build) so the project remains runnable.
- After outputting package.json, tell the user to save the block as \`package.json\` and then run \`npm install\` (or the project's package manager) in the app terminal if they added dependencies.

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

## Run & Debug (non-devs and faster feedback)
- The user can run project commands (npm install, npm run build, npm run dev) from **Develop → Run & Debug** and send the output to you. When you see build/run output or errors in the user message, treat them as high priority: fix the code (output full files in code blocks so they can save), then say something like "Save the file(s) above, then run **npm run build** again in Run & Debug and send the new output to me if there are more errors."
- After suggesting fixes, always tell the user to run the command again (e.g. "Run **npm run build** in Run & Debug" or "Run the build again and send the output to GRIP") so they get a fast fix cycle without needing an IDE or terminal elsewhere.
- If the user has no local project path, they may paste build/run errors from their own terminal or from StackBlitz/Export. Fix those the same way (full files in code blocks) and suggest they re-run and re-paste if needed.

## Terminal and CLI commands (npm install, scripts, etc.)
- When suggesting package installs (e.g. npm install, yarn add, pnpm add) or run commands (npm run dev, npm run build), put the FULL command in a **shell code block** with language \`bash\` or \`shell\`.
- Tell the user to run the command **in the app terminal** (Dashboard → Terminal) or in **Run & Debug** (Develop tab) so they can then send the output back to you. All commands are run locally within the app.
- Prefer the project's package manager if known from context: \`package-lock.json\` → npm, \`yarn.lock\` → yarn, \`pnpm-lock.yaml\` → pnpm. If unknown, use npm.
- Do not suggest \`@types/package-name\` for packages that ship their own TypeScript types (e.g. axios, react, lodash, express). Only suggest @types/ when the package has no built-in types (e.g. older untyped packages).
- One command per block when possible; for multi-step (e.g. install then run), use one block with one line per command or separate blocks.
- Never output raw shell commands as plain text; always use a code block so the user can copy and run them in the app terminal.
- Do NOT suggest terminal commands for creating files or directories (e.g. mkdir, touch). Use "Save to project" with file content instead so the user does not need to run those.

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
  2. Any other config files required to run (e.g. **tsconfig.json**, **app.json** / **app.config.js** for Expo, **vite.config.ts**, **next.config.js**) — output the COMPLETE file so the project runs after \`npm install\` and \`npm run dev\` (or the project's run command).
- Scan the files you have generated in this conversation: list every npm package they import. Ensure package.json includes every one. Missing dependencies are the main reason "the project is complete" fails when the user runs it.
- Order: output package.json (and other config files) first, then say "Save these to your project root." Only after that may you provide the README and state the project is complete.

## README when project is complete (100%) — ONE block only
- When the project is complete (you state 100% completion, or the user confirms the project is done), you MUST provide a README.md for the project.
- The ENTIRE README must be in exactly ONE markdown code block. Do NOT output any README content as plain text. Do NOT split the README into multiple code blocks (e.g. intro in one block, then numbered steps as plain text with separate bash blocks). Every section—title, features, installation steps, commands, project structure, how to play—must be inside that single \`\`\`markdown ... \`\`\` block.
- Put one line above the block: \`README.md\` (so the user can save it). Use language \`markdown\` for the block. Shell commands in the README (e.g. git clone, npm install, npx expo start) must be written as markdown code inside the README (e.g. \`\`\`bash ... \`\`\` inside the block), not as separate chat code blocks. One block = one file = one "Save to project" for the whole README.
- The README MUST include: (1) project title and short description, (2) how to install (e.g. npm install or yarn install), (3) how to run (e.g. npm run dev or npx expo start), (4) any env vars or setup steps if needed. Keep it concise and copy-paste friendly for both devs and non-devs.
- After the single README block, say something like: "Save the block above as README.md in your project root so it's included when you download or export the project."

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

/** Parse grip-actions block from message, execute create_folder/copy_file, return cleaned message and summary. */
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
      } else if (obj.action === 'copy_file' && typeof obj.sourcePath === 'string' && typeof obj.targetPath === 'string') {
        const content = await getFileContentByPath(projectId, obj.sourcePath)
        if (content != null) {
          const result = await saveProjectFile(projectId, obj.targetPath, content)
          if (result.ok) executed.push(`Copied ${obj.sourcePath} → ${obj.targetPath}`)
        }
      }
    } catch {
      // skip malformed lines
    }
  }
  const cleanedMessage = message.replace(blockRe, '').trim()
  return { cleanedMessage, executedSummary: executed }
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

    const { message, projectId, messages: clientMessages } = await request.json()

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
        const content = typeof m.content === 'string' ? m.content : String(m.content ?? '')
        if (content.trim()) history.push({ role, content: content.trim() })
      }
    }
    history.push({ role: 'user', content: message.trim() })

    // Get project context
    const client = await clientPromise
    const db = client.db('test')
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId)
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get analysis context
    const analysis = await db.collection('analyses').findOne({
      projectId: new ObjectId(projectId)
    })

    // Get or build repo reference document (full repo context for G.R.I.P.)
    const repoReferenceDoc = await getOrBuildRepoContextDocument(projectId)

    // List files already saved to this project so GRIP knows where we are and stays on the same page
    const projectFilesList = await listProjectFiles(projectId)
    const savedFiles = projectFilesList.map((f) => ({ path: f.path || '', filename: f.filename || '' }))

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

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(project, analysis, repoReferenceDoc, savedFiles, planContext)

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

    // Parse and execute grip-actions (create_folder, copy_file) so GRIP can create folders and copy files for the user
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

    // Save AI response
    await saveChatMessage(projectId, {
      role: 'assistant',
      content: aiMessage,
      timestamp: new Date()
    })

    return NextResponse.json({
      message: aiMessage,
      refreshContext: false
    })
  } catch (error) {
    console.error('Error in enhanced chat:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
} 