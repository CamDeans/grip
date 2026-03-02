/**
 * AST-based repository analysis (tree-sitter). Used for both main GRIP and sandbox.
 * Callers decide where to store results: analysisService → analyses; legal-sandbox/analyze → sandboxAnalyses.
 * Uses native tree-sitter (required dependency) with multi-language support; falls back to Babel/TS-estree for JS/TS when needed.
 * Repo separation: only the user's linked repo is analyzed—never GRIP codebase.
 */

import { parse as parseJS } from '@babel/parser'
import { parseAndGenerateServices } from '@typescript-eslint/typescript-estree'
import * as path from 'path'
import { getRepositoryContentServer } from '@/lib/github'
import { getAnthropicApiKey, ANTHROPIC_MODEL_CHAT } from '@/lib/anthropicConfig'
import Anthropic from '@anthropic-ai/sdk'
import { parseWithTreeSitter, isTreeSitterAvailable, loadNativeTreeSitterAsync, type TreeSitterExtract, PARSABLE_EXTENSIONS } from './treeSitterNative'
import { getAnalysisRawSummaryMaxChars } from '@/lib/constants/tokenLimitsByTier'

const SOURCE_EXT = new RegExp('\\.(' + PARSABLE_EXTENSIONS.join('|') + ')$', 'i')
const SKIP_DIRS = /(node_modules|\.next|dist|__tests__|\.git)\b/

interface GhItem {
  type: string
  name: string
  path: string
  encoding?: string
  content?: string
}

export interface SandboxStructuredAnalysis {
  analysis_metadata: {
    analysis_version: string
    generated_at: string
    repo_url: string
    commit_sha: string
    default_branch: string
    analyzer: {
      parser: string
      languages_supported: string[]
    }
  }
  identity: {
    repo_name: string
    primary_languages: string[]
    detected_frameworks: string[]
    project_type: string
    summary: string
  }
  file_manifest: Array<{
    path: string
    language: string
    size_bytes: number
    is_entry_candidate: boolean
    ignored: boolean
  }>
  symbol_index: Array<{
    file: string
    symbols: Array<{
      name: string
      type: string
      visibility: string
      description: string
      start_line: number
      end_line: number
    }>
  }>
  import_graph: Array<{
    source_file: string
    imports: Array<{
      target: string
      type: string
    }>
  }>
  entrypoints: Array<{
    file: string
    symbol: string
    reason: string
  }>
  route_map: Array<{
    route: string
    method: string
    handler_symbol: string
    source_file: string
  }>
  config_usage: Array<{
    env_var: string
    used_in_files: string[]
    required: boolean
  }>
  dependency_summary: {
    external_packages: string[]
    runtime_patterns: string[]
    data_storage_patterns: string[]
    auth_patterns: string[]
  }
  architecture_summary: {
    subsystems: Array<{
      name: string
      purpose: string
      files: string[]
    }>
    core_modules: string[]
    data_flow_summary: string
  }
  behavior_flows: Array<{
    flow_id: string
    trigger: string
    entrypoint: string
    execution_chain: string[]
    external_dependencies: string[]
    side_effects: string[]
  }>
  setup_analysis: {
    setup_readiness_score: number
    detected_commands: {
      install: string[]
      dev: string[]
      build: string[]
      test: string[]
    }
    missing_requirements: string[]
    recommended_boot_sequence: string[]
  }
  risk_analysis: {
    complexity_score: number
    high_centrality_files: string[]
    potential_failure_points: string[]
    notes: string[]
  }
  ideation_alignment: {
    user_ideation: string
    normalized_requirements: {
      product_summary: string
      target_platforms: string[]
      user_stories: Array<{
        as_a: string
        i_want: string
        so_that: string
        priority: string
      }>
      acceptance_criteria: Array<{
        id: string
        criterion: string
        how_to_verify: string
      }>
      nonfunctional_requirements: {
        performance: string[]
        security: string[]
        privacy: string[]
        availability: string[]
        scalability: string[]
        maintainability: string[]
      }
      constraints: {
        tech_stack_constraints: string[]
        deployment_constraints: string[]
        integration_constraints: string[]
        data_constraints: string[]
      }
      out_of_scope: string[]
      success_metrics: string[]
      clarifying_questions: Array<{
        question: string
        why_it_matters: string
        default_assumption_if_unanswered: string
      }>
    }
    matched_capabilities: Array<{
      repo_capability: string
      evidence: string
      maps_to_user_story_ids: string[]
    }>
    missing_capabilities: Array<{
      needed_capability: string
      impact: string
      recommended_approach: string
    }>
    recommended_integration_points: Array<{
      feature: string
      where: string
      why_here: string
      touches: {
        files: string[]
        symbols: string[]
        flows: string[]
      }
    }>
  }
}

export interface SandboxAnalysisResult {
  projectId: string
  fileCount: number
  directoryStructure: string[]
  mainLanguages: Record<string, number>
  components: Array<{ name: string; type: string; file: string; dependencies: string[]; exports: string[]; imports: string[] }>
  features: Array<{ name: string; files: string[]; components: string[]; description: string }>
  fileAnalyses: Array<{ path: string; analysis: string }>
  projectAnalysis: string
  structuredAnalysis?: SandboxStructuredAnalysis
}

function decodeContent(item: GhItem): string {
  if (item.type !== 'file' || typeof item.content !== 'string') return ''
  if (item.encoding === 'base64') {
    try {
      return Buffer.from(item.content, 'base64').toString('utf8')
    } catch {
      return ''
    }
  }
  return item.content
}

function collectFiles(items: GhItem[]): GhItem[] {
  const out: GhItem[] = []
  for (const item of Array.isArray(items) ? items : [items]) {
    if (item.type === 'file' && item.path && SOURCE_EXT.test(item.path) && !SKIP_DIRS.test(item.path)) {
      out.push(item)
    }
  }
  return out
}

/** Normalize repo files (path + content) to analyzable entries; filters by SOURCE_EXT and SKIP_DIRS. */
function collectFilesFromRepoFiles(
  repoFiles: Array<{ path: string; content: string | null }>
): Array<{ path: string; content: string }> {
  const out: Array<{ path: string; content: string }> = []
  for (const f of repoFiles) {
    if (!f.path || !SOURCE_EXT.test(f.path) || SKIP_DIRS.test(f.path)) continue
    const content = (f.content ?? '').trim()
    if (!content) continue
    out.push({ path: f.path, content })
  }
  return out
}

function extractFromAST(ast: any, filePath: string): {
  imports: string[]
  exports: string[]
  functions: string[]
  classes: string[]
  components: Array<{ name: string; type: string; file: string; dependencies: string[]; exports: string[]; imports: string[] }>
} {
  const imports: string[] = []
  const exports: string[] = []
  const functions: string[] = []
  const classes: string[] = []
  const components: Array<{ name: string; type: string; file: string; dependencies: string[]; exports: string[]; imports: string[] }> = []

  function visit(node: any): void {
    if (!node || typeof node !== 'object') return

    if (node.type === 'ImportDeclaration' && node.source?.value) {
      imports.push(node.source.value)
    }
    if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
      const name = node.declaration?.id?.name || node.declaration?.name
      if (name) exports.push(name)
    }
    if (node.type === 'FunctionDeclaration' && node.id?.name) {
      functions.push(node.id.name)
    }
    if (node.type === 'ClassDeclaration' && node.id?.name) {
      classes.push(node.id.name)
      if (node.superClass?.name === 'Component' || node.superClass?.property?.name === 'Component') {
        components.push({
          name: node.id.name,
          type: 'class',
          file: filePath,
          dependencies: [...imports],
          exports: [...exports],
          imports: [...imports],
        })
      }
    }
    if ((node.type === 'FunctionDeclaration' || node.type === 'ArrowFunctionExpression') && node.id?.name) {
      const isComponent =
        node.id.name.endsWith('Component') ||
        node.params.some(
          (p: any) =>
            p?.type === 'ObjectPattern' && p.properties?.some((prop: any) => prop.key?.name === 'props')
        )
      if (isComponent) {
        components.push({
          name: node.id.name,
          type: 'function',
          file: filePath,
          dependencies: [...imports],
          exports: [...exports],
          imports: [...imports],
        })
      }
    }

    for (const key of Object.keys(node)) {
      const child = node[key]
      if (Array.isArray(child)) {
        child.forEach((c: any) => visit(c))
      } else if (child && typeof child === 'object' && child.type) {
        visit(child)
      }
    }
  }

  visit(ast)
  return { imports, exports, functions, classes, components }
}

function formatFileAnalysis(path: string, data: ReturnType<typeof extractFromAST>): string {
  const lines: string[] = [
    `File: ${path}`,
    'Imports: ' + (data.imports.length ? data.imports.join(', ') : 'none'),
    'Exports: ' + (data.exports.length ? data.exports.join(', ') : 'none'),
    'Functions: ' + (data.functions.length ? data.functions.join(', ') : 'none'),
    'Classes: ' + (data.classes.length ? data.classes.join(', ') : 'none'),
  ]
  if (data.components.length) {
    lines.push('Components: ' + data.components.map((c) => c.name).join(', '))
  }
  return lines.join('\n')
}

function parseFile(filePath: string, content: string): ReturnType<typeof extractFromAST> | null {
  const native = parseWithTreeSitter(filePath, content)
  if (native) return treeSitterExtractToShape(native)
  const ext = path.extname(filePath).toLowerCase()
  try {
    if (ext === '.ts' || ext === '.tsx') {
      const { ast } = parseAndGenerateServices(content, {
        jsx: true,
        loc: true,
        filePath,
      })
      return extractFromAST(ast, filePath)
    }
    if (ext === '.js' || ext === '.jsx') {
      const ast = parseJS(content, { sourceType: 'module', plugins: ['jsx'] })
      return extractFromAST(ast, filePath)
    }
  } catch {
    return { imports: [], exports: [], functions: [], classes: [], components: [] }
  }
  return null
}

function treeSitterExtractToShape(e: TreeSitterExtract): ReturnType<typeof extractFromAST> {
  return {
    imports: e.imports,
    exports: e.exports,
    functions: e.functions,
    classes: e.classes,
    components: e.components,
  }
}

async function buildProjectAnalysisWithPrompt(
  rawSummary: string,
  technicalPrompt: string
): Promise<{ text: string; totalTokens: number }> {
  const apiKey = getAnthropicApiKey()
  if (!apiKey) return { text: rawSummary, totalTokens: 0 }
  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_CHAT,
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `You are G.R.I.P. in legal-sandbox mode. Produce a concise project analysis that aligns with the following technical analysis criteria (derived from the user's project ideation). Do not reference GRIP or any codebase other than the analyzed repo.

Analysis criteria (use these to focus and interpret):
${technicalPrompt}

AST/repo summary:
${rawSummary}

Output a short, technical project analysis (bullet points or short paragraphs) that:
- Provides a top-level architecture synthesis: how routes, pages, and layouts are organized (L3-style multi-page structure if present or implied).
- Compares the repo against the criteria and highlights fit, gaps, and recommendations.
- Calls out UX/UI and design-relevant patterns (screens, flows, components, layout approach) where present.
- Notes what should be preserved or recreated in new code (patterns only, no copying) to meet the quality bar.
- If the "Top-level structure" section shows routes/pages/layouts, summarize that structure; if not, recommend an L3 file structure (multiple pages/screens/routes, shared layouts) for best-in-class output unless the user explicitly asked for a single landing only.
Use the AST and structure summary to their fullest. No preamble.`
        }
      ]
    })
    const text =
      response?.content?.[0] && 'text' in response.content[0]
        ? String(response.content[0].text).trim()
        : ''
    const totalTokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)
    return { text: text || rawSummary, totalTokens }
  } catch (err) {
    console.warn('Sandbox project analysis with prompt failed:', err)
    return { text: rawSummary, totalTokens: 0 }
  }
}

async function buildStructuredAnalysisWithPrompt(
  rawSummary: string,
  technicalPrompt: string,
  opts: {
    owner: string
    repo: string
    projectId: string
    mainLanguages: Record<string, number>
  }
): Promise<{ structured: SandboxStructuredAnalysis | null; totalTokens: number }> {
  const apiKey = getAnthropicApiKey()
  if (!apiKey) return { structured: null, totalTokens: 0 }
  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_CHAT,
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: `You are G.R.I.P. in legal-sandbox mode. Using the AST/repo summary and the user's technical/ideation criteria, emit a single JSON object that matches EXACTLY the following schema. This JSON will be used as a structured analysis of the repo and its alignment to the user's requirements.

User technical/ideation criteria (normalized prompt):
${technicalPrompt}

Repo context:
- Owner: ${opts.owner}
- Repo: ${opts.repo}
- Project ID: ${opts.projectId}
- Detected languages (by extension count): ${JSON.stringify(opts.mainLanguages)}

AST/repo summary:
${rawSummary}

JSON schema (fill all fields; use empty strings/arrays where information is not available; do not add extra top-level keys).
For identity.project_type use exactly one of: web_app, full_stack, ai_ml_llm, ios_app, android_app, python_app, go_app, rust_app, cli_tool, game, interactive_3d, generic (choose the best fit for the repo).
{
  "analysis_metadata": {
    "analysis_version": "1.1",
    "generated_at": "",
    "repo_url": "",
    "commit_sha": "",
    "default_branch": "",
    "analyzer": {
      "parser": "tree-sitter",
      "languages_supported": []
    }
  },
  "identity": {
    "repo_name": "",
    "primary_languages": [],
    "detected_frameworks": [],
    "project_type": "",
    "summary": ""
  },
  "file_manifest": [
    {
      "path": "",
      "language": "",
      "size_bytes": 0,
      "is_entry_candidate": false,
      "ignored": false
    }
  ],
  "symbol_index": [
    {
      "file": "",
      "symbols": [
        {
          "name": "",
          "type": "function|class|interface|handler|route|module",
          "visibility": "public|internal",
          "description": "",
          "start_line": 0,
          "end_line": 0
        }
      ]
    }
  ],
  "import_graph": [
    {
      "source_file": "",
      "imports": [
        {
          "target": "",
          "type": "internal|external"
        }
      ]
    }
  ],
  "entrypoints": [
    {
      "file": "",
      "symbol": "",
      "reason": "main|server_start|route_root|cli_entry"
    }
  ],
  "route_map": [
    {
      "route": "",
      "method": "",
      "handler_symbol": "",
      "source_file": ""
    }
  ],
  "config_usage": [
    {
      "env_var": "",
      "used_in_files": [],
      "required": false
    }
  ],
  "dependency_summary": {
    "external_packages": [],
    "runtime_patterns": [],
    "data_storage_patterns": [],
    "auth_patterns": []
  },
  "architecture_summary": {
    "subsystems": [
      {
        "name": "",
        "purpose": "",
        "files": []
      }
    ],
    "core_modules": [],
    "data_flow_summary": ""
  },
  "behavior_flows": [
    {
      "flow_id": "",
      "trigger": "",
      "entrypoint": "",
      "execution_chain": [],
      "external_dependencies": [],
      "side_effects": []
    }
  ],
  "setup_analysis": {
    "setup_readiness_score": 0,
    "detected_commands": {
      "install": [],
      "dev": [],
      "build": [],
      "test": []
    },
    "missing_requirements": [],
    "recommended_boot_sequence": []
  },
  "risk_analysis": {
    "complexity_score": 0,
    "high_centrality_files": [],
    "potential_failure_points": [],
    "notes": []
  },
  "ideation_alignment": {
    "user_ideation": "",
    "normalized_requirements": {
      "product_summary": "",
      "target_platforms": ["web|mobile|desktop|api|cli"],
      "user_stories": [
        {
          "as_a": "",
          "i_want": "",
          "so_that": "",
          "priority": "must|should|could"
        }
      ],
      "acceptance_criteria": [
        {
          "id": "",
          "criterion": "",
          "how_to_verify": ""
        }
      ],
      "nonfunctional_requirements": {
        "performance": [],
        "security": [],
        "privacy": [],
        "availability": [],
        "scalability": [],
        "maintainability": []
      },
      "constraints": {
        "tech_stack_constraints": [],
        "deployment_constraints": [],
        "integration_constraints": [],
        "data_constraints": []
      },
      "out_of_scope": [],
      "success_metrics": [],
      "clarifying_questions": [
        {
          "question": "",
          "why_it_matters": "",
          "default_assumption_if_unanswered": ""
        }
      ]
    },
    "matched_capabilities": [
      {
        "repo_capability": "",
        "evidence": "",
        "maps_to_user_story_ids": []
      }
    ],
    "missing_capabilities": [
      {
        "needed_capability": "",
        "impact": "",
        "recommended_approach": ""
      }
    ],
    "recommended_integration_points": [
      {
        "feature": "",
        "where": "",
        "why_here": "",
        "touches": {
          "files": [],
          "symbols": [],
          "flows": []
        }
      }
    ]
  }
}

Output ONLY the JSON object (no markdown, no code fences, no commentary).`
        }
      ]
    })
    const text =
      response?.content?.[0] && 'text' in response.content[0]
        ? String(response.content[0].text).trim()
        : ''
    if (!text) return { structured: null, totalTokens: 0 }
    const match = text.match(/\{[\s\S]*\}$/)
    const json = match ? match[0] : text
    const parsed = JSON.parse(json) as SandboxStructuredAnalysis
    const totalTokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)
    return { structured: parsed, totalTokens }
  } catch (err) {
    console.warn('Sandbox structured analysis build failed:', err)
    return { structured: null, totalTokens: 0 }
  }
}

/** Build a top-level structure summary for L3/multi-page context: routes, layouts, key dirs. Uses tree-sitter output to fullest. */
function buildTopLevelStructureSummary(
  directoryStructure: string[],
  fileAnalyses: Array<{ path: string; analysis: string }>,
  components: SandboxAnalysisResult['components']
): string {
  const paths = [...directoryStructure, ...fileAnalyses.map((f) => f.path)]
  const normalized = paths.map((p) => p.replace(/^\/+/, ''))
  const routeLike = /(?:^|\/)(?:app|pages|src\/app|src\/pages)(?:\/|$)|(?:app|pages)\/[^/]+\/(?:page|route)\.[^/]+$/
  const layoutLike = /[^/]+\/layout\.(tsx?|jsx?)$|^layout\.(tsx?|jsx?)$/
  const pageLike = /\/page\.(tsx?|jsx?)$|\.page\.(tsx?|jsx?)$/
  const routes: string[] = []
  const layouts: string[] = []
  const pages: string[] = []
  const componentFiles = new Set(components.map((c) => c.file))
  normalized.forEach((p) => {
    if (routeLike.test(p) || pageLike.test(p)) {
      if (layoutLike.test(p)) layouts.push(p)
      else if (pageLike.test(p) || /(?:app|pages)\//.test(p)) pages.push(p)
      else routes.push(p)
    }
    if (layoutLike.test(p)) layouts.push(p)
  })
  const lines: string[] = ['## Top-level structure (for L3 / multi-page generation)']
  if (pages.length || routes.length) {
    lines.push('Routes/pages:', ...[...new Set(pages.length ? pages : routes)].slice(0, 30).map((r) => `  - ${r}`))
  }
  if (layouts.length) {
    lines.push('Layouts:', ...layouts.slice(0, 20).map((l) => `  - ${l}`))
  }
  if (componentFiles.size) {
    lines.push('Component files (from AST):', ...[...componentFiles].slice(0, 25).map((c) => `  - ${c}`))
  }
  const dirs = [...new Set(normalized.map((p) => p.split('/').slice(0, -1).join('/')).filter(Boolean))]
  const keyDirs = dirs.filter((d) => /(?:^|\/)(?:app|pages|components|lib|layouts|features|screens)(?:\/|$)/.test(d)).slice(0, 20)
  if (keyDirs.length) lines.push('Key directories:', ...keyDirs.map((d) => `  - ${d}`))
  return lines.join('\n')
}

function identifyFeatures(components: SandboxAnalysisResult['components']): SandboxAnalysisResult['features'] {
  const byFile = new Map<string, typeof components>()
  for (const c of components) {
    if (!byFile.has(c.file)) byFile.set(c.file, [])
    byFile.get(c.file)!.push(c)
  }
  const features: SandboxAnalysisResult['features'] = []
  byFile.forEach((comps, file) => {
    if (comps.length > 0) {
      features.push({
        name: comps[0].name.replace(/Component$/, '') || 'Feature',
        files: [file],
        components: comps.map((c) => c.name),
        description: `Feature: ${comps.map((c) => c.name).join(', ')}`,
      })
    }
  })
  return features
}

/**
 * Analyze repository using AST parsing (tree-sitter). Only analyzes the user's linked repo (owner/repo)—never GRIP codebase.
 * Fetches repo from GitHub, decodes base64, parses with native tree-sitter (multi-language); falls back to Babel/TS-estree for JS/TS when needed.
 * If technicalPrompt is provided (from user ideation), it guides the project analysis so results align with user goals.
 */
export async function analyzeRepositoryStructureWithTreeSitter(
  owner: string,
  repo: string,
  projectId: string,
  options?: { technicalPrompt?: string; repoFiles?: Array<{ path: string; content: string | null }>; tier?: string }
): Promise<SandboxAnalysisResult> {
  const technicalPrompt = options?.technicalPrompt?.trim() || ''
  const repoFiles = options?.repoFiles
  const maxRawSummaryChars = getAnalysisRawSummaryMaxChars(options?.tier)
  await loadNativeTreeSitterAsync()
  const treeSitterAvailable = isTreeSitterAvailable()
  console.log(`[GRIP analyze] parser: ${treeSitterAvailable ? 'tree-sitter (native)' : 'Babel/TS-estree (fallback)'} | repo: ${owner}/${repo} | fullRepo: ${!!repoFiles?.length}`)
  // Repo separation: owner/repo are the user's linked repo only. We never fetch or analyze GRIP codebase.
  let sourceFileEntries: Array<{ path: string; content: string }>
  let directoryStructure: string[]

  if (repoFiles?.length) {
    sourceFileEntries = collectFilesFromRepoFiles(repoFiles)
    directoryStructure = [...new Set(sourceFileEntries.map((f) => f.path))]
  } else {
    const root = await getRepositoryContentServer(owner, repo)
    const rootItems = Array.isArray(root) ? root : [root]
    let allItems: GhItem[] = rootItems.filter((i: GhItem) => i.type === 'file') as GhItem[]
    const srcDir = rootItems.find((i: GhItem) => i.type === 'dir' && i.name === 'src')
    if (srcDir) {
      const srcContent = await getRepositoryContentServer(owner, repo, 'src')
      const srcItems = Array.isArray(srcContent) ? srcContent : [srcContent]
      allItems = allItems.concat(srcItems.filter((i: GhItem) => i.type === 'file') as GhItem[])
    }
    const sourceFiles = collectFiles(allItems)
    sourceFileEntries = sourceFiles
      .map((item) => ({ path: item.path, content: decodeContent(item) }))
      .filter((e) => e.content.trim())
    directoryStructure = [...new Set(sourceFileEntries.map((f) => f.path))]
  }

  const mainLanguages: Record<string, number> = {}
  sourceFileEntries.forEach((f) => {
    const ext = path.extname(f.path).toLowerCase().replace(/^\./, '') || 'js'
    mainLanguages[ext] = (mainLanguages[ext] || 0) + 1
  })

  const fileAnalyses: Array<{ path: string; analysis: string }> = []
  const allComponents: SandboxAnalysisResult['components'] = []

  for (const entry of sourceFileEntries) {
    const extracted = parseFile(entry.path, entry.content)
    if (extracted) {
      fileAnalyses.push({
        path: entry.path,
        analysis: formatFileAnalysis(entry.path, extracted),
      })
      allComponents.push(...extracted.components)
    }
  }

  const features = identifyFeatures(allComponents)
  const structureSummary = buildTopLevelStructureSummary(directoryStructure, fileAnalyses, allComponents)
  let rawSummary = [
    'AST-based repository analysis.',
    `Files analyzed: ${fileAnalyses.length}.`,
    structureSummary,
    fileAnalyses.length ? 'Per-file summaries:\n' + fileAnalyses.map((f) => f.analysis).join('\n\n') : '',
  ].join('\n\n')
  rawSummary = rawSummary.slice(0, maxRawSummaryChars)

  let projectAnalysisText: string
  let totalTokens = 0
  let structuredAnalysis: SandboxStructuredAnalysis | null = null
  if (technicalPrompt) {
    // Run both LLM calls in parallel so first-time analysis is faster (avoids sequential 30–60s each).
    const [projectResult, structResult] = await Promise.all([
      buildProjectAnalysisWithPrompt(rawSummary, technicalPrompt),
      buildStructuredAnalysisWithPrompt(rawSummary, technicalPrompt, {
        owner,
        repo,
        projectId,
        mainLanguages,
      }),
    ])
    projectAnalysisText = projectResult.text
    structuredAnalysis = structResult.structured
    totalTokens += projectResult.totalTokens + structResult.totalTokens
  } else {
    projectAnalysisText = rawSummary
  }

  return {
    projectId,
    fileCount: sourceFileEntries.length,
    directoryStructure,
    mainLanguages,
    components: allComponents,
    features,
    fileAnalyses,
    projectAnalysis: projectAnalysisText,
    structuredAnalysis: structuredAnalysis || undefined,
    totalTokens,
  }
}
