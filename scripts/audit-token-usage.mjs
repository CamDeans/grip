#!/usr/bin/env node
/**
 * GRIP Token Usage Audit Script
 *
 * Scans the codebase for all paths that call the AI (Anthropic/Claude) and reports:
 * - Which API routes trigger AI calls (directly or via services)
 * - Which of those routes check requireTokenBalance and call addTokenUsage
 * - Main app build flow vs sandbox flow
 *
 * Run from repo root: node scripts/audit-token-usage.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '..', 'src')

function readFile(p) {
  try {
    return fs.readFileSync(p, 'utf8')
  } catch {
    return ''
  }
}

function* walk(dir, ext = null) {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== '.next' && !e.name.startsWith('.')) {
        yield* walk(full, ext)
      }
    } else if (!ext || e.name.endsWith(ext)) {
      yield full
    }
  }
}

// Find all .ts/.tsx files that reference Anthropic / createMessage / anthropicService
const aiConsumers = []
for (const file of walk(SRC, '.ts')) {
  const content = readFile(file)
  if (
    content.includes('anthropicService') ||
    content.includes('anthropic.messages.create') ||
    content.includes('getAnthropicApiKey') ||
    content.includes('Anthropic(') ||
    content.includes('new Anthropic')
  ) {
    if (file.includes('.test.') || file.includes('anthropicConfig')) continue
    aiConsumers.push(path.relative(SRC, file))
  }
}
for (const file of walk(SRC, '.tsx')) {
  const content = readFile(file)
  if (
    content.includes('anthropicService') ||
    content.includes('getAnthropicApiKey') ||
    content.includes('anthropic.messages.create')
  ) {
    if (file.includes('.test.')) continue
    aiConsumers.push(path.relative(SRC, file))
  }
}

// Map file path to API route path (app/api/.../route.ts -> /api/...)
function fileToRoute(filePath) {
  const match = filePath.match(/app[\\/]api[\\/](.+)[\\/]route\.ts$/i)
  if (!match) return null
  return '/' + match[1].replace(/\\/g, '/')
}

// Which routes have requireTokenBalance and addTokenUsage
const routesWithTokenCheck = new Set()
const routesWithTokenDeduction = new Set()
for (const file of walk(path.join(SRC, 'app', 'api'), 'route.ts')) {
  const content = readFile(file)
  const route = fileToRoute(path.relative(SRC, file))
  if (!route) continue
  if (content.includes('requireTokenBalance')) routesWithTokenCheck.add(route)
  if (content.includes('addTokenUsage')) routesWithTokenDeduction.add(route)
}

// Lib/services that make AI calls (called from API or other services)
const libAiCallers = []
for (const file of walk(path.join(SRC, 'lib'), '.ts')) {
  const content = readFile(file)
  if (
    content.includes('anthropic.messages.create') ||
    content.includes('anthropicService.createMessage')
  ) {
    if (file.includes('.test.')) continue
    libAiCallers.push(path.relative(SRC, file))
  }
}

// Build flow: who calls analyzeProject, generateProjectPlan, etc.
const apiRoutesThatCallPlan = []
const apiRoutesThatCallAnalyze = []
for (const file of walk(path.join(SRC, 'app', 'api'), 'route.ts')) {
  const content = readFile(file)
  const route = fileToRoute(path.relative(SRC, file))
  if (!route) continue
  if (content.includes('generateProjectPlan') || content.includes('generateDevelopmentPlan')) {
    apiRoutesThatCallPlan.push(route)
  }
  if (
    content.includes('analyzeProject') ||
    content.includes('analyzeRepositoryStructure') ||
    content.includes('analyzeRepositoryStructureWithTreeSitter')
  ) {
    apiRoutesThatCallAnalyze.push(route)
  }
}

// Report
const report = []
report.push('')
report.push('=== GRIP Token Usage Audit ===')
report.push('')
report.push('--- 1. API routes that call AI (directly or via services) ---')
report.push('')

const allApiRoutesWithAi = new Set()
for (const file of walk(path.join(SRC, 'app', 'api'), 'route.ts')) {
  const content = readFile(file)
  const route = fileToRoute(path.relative(SRC, file))
  if (!route) continue
  if (
    content.includes('anthropicService') ||
    content.includes('anthropic.messages.create') ||
    content.includes('getAnthropicApiKey') ||
    content.includes('analyzeRepositoryStructure') ||
    content.includes('generateCodeSuggestions') ||
    content.includes('generateProjectPlan') ||
    content.includes('analyzeProject') ||
    content.includes('generateKeywordsServer')
  ) {
    allApiRoutesWithAi.add(route)
  }
}

const sorted = [...allApiRoutesWithAi].sort()
for (const route of sorted) {
  const hasCheck = routesWithTokenCheck.has(route)
  const hasDeduct = routesWithTokenDeduction.has(route)
  const status = hasCheck && hasDeduct ? '[CHECK + DEDUCT]' : hasCheck ? '[CHECK ONLY]' : '[NO TOKEN TRACKING]'
  report.push(`  ${route} ${status}`)
}

report.push('')
report.push('--- 2. Lib/services that make AI calls (may be invoked from above routes) ---')
report.push('')
for (const f of [...new Set(libAiCallers)].sort()) {
  report.push(`  ${f}`)
}

report.push('')
report.push('--- 3. Routes that trigger plan generation (use AI via planGeneratorService, structureGeneratorService) ---')
report.push('')
for (const r of apiRoutesThatCallPlan.sort()) {
  const tracked = routesWithTokenCheck.has(r) && routesWithTokenDeduction.has(r)
  report.push(`  ${r} ${tracked ? '[TOKENS TRACKED]' : '[NO TOKEN TRACKING]'}`)
}

report.push('')
report.push('--- 4. Routes that trigger repo/project analysis (use AI) ---')
report.push('')
for (const r of apiRoutesThatCallAnalyze.sort()) {
  const tracked = routesWithTokenCheck.has(r) && routesWithTokenDeduction.has(r)
  report.push(`  ${r} ${tracked ? '[TOKENS TRACKED]' : '[NO TOKEN TRACKING]'}`)
}

report.push('')
report.push('--- 5. All files that reference Anthropic / createMessage (for manual review) ---')
report.push('')
for (const f of [...new Set(aiConsumers)].sort()) {
  report.push(`  ${f}`)
}

const out = report.join('\n')
console.log(out)

// Write to docs for reference
const docsPath = path.join(__dirname, '..', 'docs', 'TOKEN_USAGE_AUDIT.md')
const docContent = `# GRIP Token Usage Audit

Generated by \`node scripts/audit-token-usage.mjs\`. Re-run after code changes.

## Summary

- **CHECK** = route calls \`requireTokenBalance\` (blocks when user has no tokens).
- **DEDUCT** = route calls \`addTokenUsage\` after AI call (records usage).
- **NO TOKEN TRACKING** = route uses AI but does not check balance or deduct; tokens are not counted against the user.

## 1. API routes that call AI

| Route | Token check | Token deduction |
|-------|-------------|-----------------|
${sorted.map((r) => {
  const hasCheck = routesWithTokenCheck.has(r)
  const hasDeduct = routesWithTokenDeduction.has(r)
  return `| ${r} | ${hasCheck ? 'Yes' : 'No'} | ${hasDeduct ? 'Yes' : 'No'} |`
}).join('\n')}

## 2. Lib/services that make AI calls

These are used by API routes or other services. Token tracking must happen in the **calling route** (the API that the client hits).

${[...new Set(libAiCallers)].sort().map((f) => `- \`${f}\``).join('\n')}

## 3. Main app build flow (start to finish)

1. **Create project** – \`POST /api/projects\`  
   - If repo provided: calls \`analyzeProject\` (analysisService) → \`buildTechnicalAnalysisPromptFromIdeation\` (AI) + \`analyzeRepositoryStructureWithTreeSitter\` (AI, up to 2 calls).  
   - **No token check or deduction.**

2. **Analyze project (alternate)** – \`POST /api/projects/[id]/analyze\`  
   - Uses \`analyzeRepositoryStructure\` (lib/analysis) → multiple \`anthropic.messages.create\` (analyzeFile × 5, generateProjectAnalysis).  
   - **No token check or deduction.**

3. **Enhanced analysis** – \`POST /api/analysis/enhanced\`  
   - \`analyzeRepositoryStructure\` + \`generateCodeSuggestions\` (both use AI).  
   - **No token check or deduction.**

4. **Generate plan** – \`POST /api/projects/[id]/plan\`  
   - \`generateProjectPlan\` → \`enhanceProjectStructure\` (structureGeneratorService, AI) + \`generateDevelopmentPlan\` (planGeneratorService, AI).  
   - **No token check or deduction.**

5. **Repo summarize** – \`POST /api/projects/[id]/repo/summarize\`  
   - \`anthropicService.createMessage\` per file.  
   - **Has token check + deduction.**

6. **Enhanced chat** – \`POST /api/enhanced-chat\`  
   - \`anthropicService.createMessage\`.  
   - **Has token check + deduction.**

7. **Update file from chat** – \`POST /api/projects/[id]/files/update-from-chat\`  
   - \`anthropicService.createMessage\`.  
   - **Has token check + deduction.**

8. **AI chat (project)** – \`POST /api/ai/chat\`  
   - Direct \`anthropic.messages.create\`.  
   - **No token check or deduction.**

9. **Chat completion / legacy chat** – \`POST /api/chat/route\`, \`POST /api/chat/completion\`  
   - Direct Anthropic.  
   - **No token check or deduction.**

10. **Generate keywords** – \`POST /api/ai/generate-keywords\`  
    - \`generateKeywordsServer\` (aiService) → Anthropic.  
    - **No token check or deduction.**

## 4. Sandbox flow

1. **Sandbox analyze** – \`POST /api/projects/[id]/legal-sandbox/analyze\`  
   - \`analyzeRepositoryStructureWithTreeSitter\` + \`buildTechnicalAnalysisPromptFromIdeation\`.  
   - **No token check or deduction.**

2. **Sandbox plan** – \`POST /api/projects/[id]/legal-sandbox/plan\`  
   - \`anthropicService.createMessage\`.  
   - **No token check or deduction.**

3. **Sandbox chat** – \`POST /api/projects/[id]/legal-sandbox/chat\`  
   - \`anthropicService.createMessage\`.  
   - **No token check or deduction.**

4. **Sandbox run** – \`POST /api/projects/[id]/legal-sandbox/run\`  
   - Runs npm install/build in temp dir; **no AI**.  
   - No token tracking needed.

## 5. Terminal / run-command

- \`POST /api/projects/[id]/run-command\` – runs shell command (e.g. npm run build). **No AI.**
- \`POST /api/terminal/command\` – executes command in terminal session. **No AI.**

## 6. GRIP tokens vs Claude API

- **Claude API** returns \`usage.input_tokens\` and \`usage.output_tokens\` per request.
- **GRIP** stores one number per user: \`tokensUsedThisPeriod\` = sum of (input_tokens + output_tokens) for all tracked requests.
- So **1 GRIP token = 1 Claude API token** (we count input + output and add to the user’s usage).
- We do not weight input vs output differently; both count against the allowance.
`

try {
  fs.mkdirSync(path.dirname(docsPath), { recursive: true })
  fs.writeFileSync(docsPath, docContent)
  console.log('\nWritten: docs/TOKEN_USAGE_AUDIT.md')
} catch (e) {
  console.error('Could not write docs:', e.message)
}
