import { Anthropic } from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'
import { ObjectId } from 'mongodb'
import { getAnthropicApiKey, ANTHROPIC_MODEL_CHAT } from '@/lib/anthropicConfig'
import {
  GRIP_FULL_POWER_BACKEND,
  MANDATORY_GRIP_FIRST_BUILD_COMPLETE_DEPLOYABLE,
  MANDATORY_GRIP_IDEATION_100_MATCH,
  MANDATORY_GRIP_IDEATION_FIRST_THEN_MIDDLES,
  MANDATORY_GRIP_IDEATION_ONLY_NO_FILLER,
  MANDATORY_GRIP_LAYOUT_IMPORT_GLOBALS_CSS,
  MANDATORY_GRIP_NEXTJS_APP_ROUTER_LAYOUT,
  MANDATORY_GRIP_NEXTJS_METADATA_NO_HEAD,
  MANDATORY_GRIP_REPO_PIGGYBACK,
} from '@/lib/constants/buildQualityPlan'
import { SCOPE_REMINDER_MAX_CHARS } from '@/lib/constants/tokenLimitsByTier'

// Mock imports until we can properly access the project structure
// These will be replaced with proper imports when integrating into the main codebase
interface IProjectStructureData {
  _id: string;
  // Add other properties as needed
}

interface IFileNode {
  _id: string;
  // Add other properties as needed
}

// Mock client promise
const clientPromise = {
  db: () => ({
    collection: (name: string) => ({
      find: (query: any) => ({ toArray: async () => [] }),
      findOne: async (query: any) => null,
      insertOne: async (doc: any) => ({ insertedId: new ObjectId() })
    })
  })
};

/**
 * File generation: user ideation first, then middles (template engine).
 *
 * CONCRETE and mandatory order: (1) USER IDEATION FIRST — always and at all times. The user's
 * input is the spec; no constraints may override or dilute it. (2) THEN middles (repo analysis
 * alignment, plan, build scope) — used to align structure and patterns; they must not constrain
 * or override ideation. This service does NOT define its own rules or constraints. Template IDs
 * only control request shape (one FileContent blob vs. multiple variables). File-type hints
 * inject only the relevant buildQualityPlan constant when needed. buildMiddleReferenceBlock()
 * enforces section 1 = ideation first, section 2 = middles.
 */

// Project Context Interface
export interface ProjectContext {
  projectType: string;
  framework: string;
  language: string;
  features: string[];
  requirements: string[];
  architecture: string;
  database?: string;
  deployment?: string;
  testing?: string[];
  ideation: {
    goals: string;
    targetAudience: string;
    keyFeatures: string;
    technicalRequirements: string;
  };
}

// Dynamic Template Interface
export interface DynamicTemplate extends ITemplate {
  metadata: {
    framework: string;
    projectType: string;
    dependencies: string[];
    bestPractices: string[];
    patterns: string[];
  };
}

// Template Generation Options
export interface TemplateGenerationOptions {
  projectContext: ProjectContext;
  templateType: string;
  filePath: string;
  dependencies?: string[];
  customVariables?: Record<string, any>;
}

function getAnthropicClient() {
  const apiKey = getAnthropicApiKey()
  if (!apiKey) return null
  return new Anthropic({ apiKey })
}

// Define template interface
export interface ITemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  fileType: string;
  template: string;
  variables: string[];
  defaultValues?: Record<string, string>;
  isBuiltIn: boolean;
}

// Define custom template variables interface
export interface ITemplateVariables {
  [key: string]: any;
}

/**
 * Load built-in templates from templates directory
 * @returns Array of built-in templates
 */
export async function loadBuiltInTemplates(): Promise<ITemplate[]> {
  try {
    const templates: ITemplate[] = []
    
    // Define the templates directory path - in a real environment, this would be a file path
    // For our MongoDB implementation, we'll use predefined templates
    
    // React component template
    templates.push({
      id: 'react-component',
      name: 'React Component',
      description: 'Basic React functional component with TypeScript',
      language: 'typescript',
      fileType: 'tsx',
      template: `import { FC } from 'react'

interface {{ComponentName}}Props {
  {{#props}}
  {{name}}: {{type}};
  {{/props}}
}

export const {{ComponentName}}: FC<{{ComponentName}}Props> = ({
  {{#props}}
  {{name}},
  {{/props}}
}) => {
  return (
    <div>
      {{ComponentContent}}
    </div>
  )
}`,
      variables: ['ComponentName', 'props', 'ComponentContent'],
      defaultValues: {
        ComponentName: 'Component',
        ComponentContent: 'Component content goes here',
        props: []
      },
      isBuiltIn: true
    })
    
    // Next.js App Router page template (Metadata API only — no next/head; ensures complete first build)
    templates.push({
      id: 'nextjs-page',
      name: 'Next.js Page',
      description: 'Next.js App Router page with Metadata API (no next/head)',
      language: 'typescript',
      fileType: 'tsx',
      template: `import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '{{PageTitle}}',
  description: '{{MetaDescription}}',
}

export default function {{PageName}}() {
  return (
    <main>
      {{PageContent}}
    </main>
  )
}`,
      variables: ['PageName', 'props', 'PageTitle', 'MetaDescription', 'PageContent'],
      defaultValues: {
        PageName: 'Page',
        PageTitle: 'Page Title',
        MetaDescription: 'Page description',
        PageContent: 'Page content goes here',
        props: []
      },
      isBuiltIn: true
    })
    
    // TypeScript utility template
    templates.push({
      id: 'ts-utility',
      name: 'TypeScript Utility',
      description: 'TypeScript utility functions file',
      language: 'typescript',
      fileType: 'ts',
      template: `/**
 * {{FileName}} - Utility functions
 * {{Description}}
 */

{{#functions}}
/**
 * {{name}} - {{description}}
 * {{#params}}
 * @param {{name}} - {{description}}
 * {{/params}}
 * @returns {{returnDescription}}
 */
export function {{name}}({{#params}}{{name}}: {{type}}{{^last}}, {{/last}}{{/params}}): {{returnType}} {
  {{body}}
}

{{/functions}}`,
      variables: ['FileName', 'Description', 'functions'],
      defaultValues: {
        FileName: 'utils',
        Description: 'Collection of utility functions',
        functions: [{ name: 'placeholder', description: 'Placeholder', params: [], returnType: 'void', body: 'return', returnDescription: 'None' }]
      },
      isBuiltIn: true
    })

    // Full-file — single FileContent variable for config/schema/lib/hooks so AI returns complete runnable code (not comment-only)
    templates.push({
      id: 'full-file',
      name: 'Full file content',
      description: 'Complete file content from AI (config, schema, lib, hooks, etc.)',
      language: 'typescript',
      fileType: 'ts',
      template: `{{FileContent}}`,
      variables: ['FileContent'],
      defaultValues: {
        FileContent: 'export function noop(): void {\n  // Replace with real implementation\n}\n'
      },
      isBuiltIn: true
    })
    
    // package.json — mandatory for StackBlitz preview (GRIP must always include; never empty deps so Run in StackBlitz works)
    templates.push({
      id: 'package-json',
      name: 'package.json',
      description: 'Root package.json for npm/StackBlitz',
      language: 'json',
      fileType: 'json',
      template: `{
  "name": "{{ProjectName}}",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "{{DevScript}}",
    "build": "{{BuildScript}}",
    "start": "{{StartScript}}",
    "lint": "{{LintScript}}"
  },
  "engines": {
    "node": "{{NodeEngineVersion}}"
  },
  "dependencies": {
    "next": "{{NextVersion}}",
    "react": "{{ReactVersion}}",
    "react-dom": "{{ReactDomVersion}}"
  },
  "devDependencies": {
    "typescript": "{{TypescriptVersion}}",
    "@types/node": "{{TypesNodeVersion}}",
    "@types/react": "{{TypesReactVersion}}",
    "@types/react-dom": "{{TypesReactDomVersion}}"
  }
}`,
      variables: ['ProjectName', 'DevScript', 'BuildScript', 'StartScript', 'LintScript', 'NodeEngineVersion', 'NextVersion', 'ReactVersion', 'ReactDomVersion', 'TypescriptVersion', 'TypesNodeVersion', 'TypesReactVersion', 'TypesReactDomVersion'],
      defaultValues: {
        ProjectName: 'my-app',
        DevScript: 'next dev',
        BuildScript: 'next build',
        StartScript: 'next start',
        LintScript: 'next lint',
        NodeEngineVersion: '>=18.17.0',
        NextVersion: '^14.0.0',
        ReactVersion: '^18.2.0',
        ReactDomVersion: '^18.2.0',
        TypescriptVersion: '^5.0.0',
        TypesNodeVersion: '^20.0.0',
        TypesReactVersion: '^18.2.0',
        TypesReactDomVersion: '^18.2.0'
      },
      isBuiltIn: true
    })

    // src/index.tsx — mandatory entry point for StackBlitz preview
    templates.push({
      id: 'index-tsx',
      name: 'index.tsx',
      description: 'Entry point for app preview',
      language: 'typescript',
      fileType: 'tsx',
      template: `import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const root = document.getElementById('root')
if (root) createRoot(root).render(<App />)
`,
      variables: [],
      defaultValues: {},
      isBuiltIn: true
    })

    // tsconfig.json — mandatory for TypeScript/StackBlitz preview
    templates.push({
      id: 'tsconfig-json',
      name: 'tsconfig.json',
      description: 'TypeScript config for build and preview',
      language: 'json',
      fileType: 'json',
      template: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}`,
      variables: [],
      defaultValues: {},
      isBuiltIn: true
    })

    // .env.example — mandatory so user can run preview; placeholders map to user Settings (Backend, System Integration) only — never GRIP app config
    templates.push({
      id: 'env-example',
      name: '.env.example',
      description: 'Environment template for StackBlitz and local run; copy from GRIP Settings (Backend connections, System Integration)',
      language: 'plaintext',
      fileType: 'example',
      template: `# Copy this to .env.local or .env and fill in values.
# User-setting vars (copy from Dashboard → Settings → Backend connections / System Integration). GRIP app AI config is deployment-only, not here.

# Backend (copy from Dashboard → Settings → Backend connections)
MONGODB_URI="your_mongodb_uri_here"

# System integration (copy from Dashboard → Settings → System Integration)
GITHUB_API_TOKEN="your-github-api-token"
VERCEL_TOKEN="your-vercel-token"
VERCEL_TEAM_ID=""

# App URL (for auth callbacks; set in production to your deployed URL)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
# VITE_* or NEXT_PUBLIC_* — add any project-specific vars below.
{{ProjectSpecificVars}}`,
      variables: ['ProjectSpecificVars'],
      defaultValues: { ProjectSpecificVars: '' },
      isBuiltIn: true
    })

    // README.md — mandatory project-specific README (name, description, getting started, tech stack)
    templates.push({
      id: 'readme-md',
      name: 'README.md',
      description: 'Project-specific README: project name, description, getting started, tech stack',
      language: 'markdown',
      fileType: 'md',
      template: `# {{ProjectName}}

{{ProjectDescription}}

## Getting started

{{GettingStarted}}

## Tech stack

{{TechStack}}

## Scripts

- \`npm install\` — Install dependencies
- \`npm run dev\` — Start development server
- \`npm run build\` — Build for production
- \`npm run start\` — Start production server (if applicable)
`,
      variables: ['ProjectName', 'ProjectDescription', 'GettingStarted', 'TechStack'],
      defaultValues: {
        ProjectName: 'My App',
        ProjectDescription: 'Application description. Replace with project-specific summary.',
        GettingStarted: '1. Copy `.env.example` to `.env.local` and fill in values.\\n2. Run `npm install` then `npm run dev`.',
        TechStack: 'List the frameworks and libraries used in this project.'
      },
      isBuiltIn: true
    })

    // app/globals.css — mandatory for Next/StackBlitz; Tailwind + base styles (no variables)
    templates.push({
      id: 'globals-css',
      name: 'globals.css',
      description: 'Global CSS for Tailwind and base styles',
      language: 'css',
      fileType: 'css',
      template: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground: 0 0% 0%;
  --background: 0 0% 100%;
}

body {
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  font-family: system-ui, sans-serif;
}
`,
      variables: [],
      defaultValues: {},
      isBuiltIn: true
    })

    // API route template
    templates.push({
      id: 'api-route',
      name: 'API Route',
      description: 'Next.js API route with TypeScript',
      language: 'typescript',
      fileType: 'ts',
      template: `import { NextApiRequest, NextApiResponse } from 'next'

/**
 * {{RouteName}} API handler
 * {{Description}}
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check method
    if (req.method !== '{{Method}}') {
      return res.status(405).json({ error: 'Method not allowed' })
    }
    
    {{RouteImplementation}}
    
    return res.status(200).json({ {{ResponseData}} })
  } catch (error) {
    console.error('{{RouteName}} error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}`,
      variables: ['RouteName', 'Description', 'Method', 'RouteImplementation', 'ResponseData'],
      defaultValues: {
        Method: 'GET',
        RouteImplementation: '// Implementation goes here',
        ResponseData: 'success: true'
      },
      isBuiltIn: true
    })

    // Next.js App Router API route (app/api/**/route.ts) — export GET/POST with NextResponse
    templates.push({
      id: 'nextjs-app-api-route',
      name: 'Next.js App API Route',
      description: 'Next.js App Router API route (route.ts) with GET/POST',
      language: 'typescript',
      fileType: 'ts',
      template: `import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ success: true, data: null })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    return NextResponse.json({ success: true, data: body })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}`,
      variables: [],
      defaultValues: {},
      isBuiltIn: true
    })

    // Generic API route for non-Next stacks (Vite, SvelteKit, Express, etc.) — stack-agnostic return shape
    templates.push({
      id: 'generic-api-route',
      name: 'Generic API Route',
      description: 'Stack-agnostic API handler for non-Next.js projects; wire to your server by path/method.',
      language: 'typescript',
      fileType: 'ts',
      template: `/**
 * API handler — wire to your server (Express, Vite, SvelteKit, etc.) by path/method.
 * Returns { status, body } so any stack can send the response.
 */
export async function get(): Promise<{ status: number; body: unknown }> {
  try {
    return { status: 200, body: { success: true, data: null } }
  } catch (error) {
    console.error('API error:', error)
    return { status: 500, body: { error: 'Internal server error' } }
  }
}

export async function post(body: unknown): Promise<{ status: number; body: unknown }> {
  try {
    return { status: 200, body: { success: true, data: body ?? null } }
  } catch (error) {
    console.error('API error:', error)
    return { status: 500, body: { error: 'Internal server error' } }
  }
}`,
      variables: [],
      defaultValues: {},
      isBuiltIn: true
    })
    
    return templates
  } catch (error) {
    console.error('Error loading built-in templates:', error)
    return []
  }
}

/**
 * Load custom templates from database
 * @param projectId Optional project ID to filter templates
 * @returns Array of custom templates
 */
export async function loadCustomTemplates(projectId?: string): Promise<ITemplate[]> {
  try {
    const db = (await clientPromise).db()
    
    const query: any = { isBuiltIn: false }
    if (projectId) {
      query.projectId = projectId // Remove ObjectId conversion
    }
    
    const templates = await db.collection('templates').find(query).toArray()
    
    return templates as ITemplate[] // Cast to correct type
  } catch (error) {
    console.error('Error loading custom templates:', error)
    return []
  }
}

/**
 * Create a new custom template
 * @param template Template data
 * @returns Created template
 */
export async function createTemplate(template: Omit<ITemplate, 'id'>): Promise<ITemplate> {
  try {
    const db = (await clientPromise).db()
    
    const result = await db.collection('templates').insertOne({
      ...template,
      isBuiltIn: false
    })
    
    return {
      ...template,
      id: result.insertedId.toString(),
      isBuiltIn: false
    }
  } catch (error) {
    console.error('Error creating template:', error)
    throw error
  }
}

/**
 * Render a template with variables
 * @param template Template to render
 * @param variables Variables to substitute
 * @returns Rendered template
 */
export function renderTemplate(template: ITemplate, variables: ITemplateVariables): string {
  try {
    let rendered = template.template
    
    // Simple variable replacement for now - for complex templates we'd use a proper template engine
    Object.entries(variables).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Simple variable
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
        rendered = rendered.replace(regex, value)
      } else if (Array.isArray(value)) {
        // Array variable - handle loops
        // Example: {{#items}} content with {{name}} {{/items}}
        const loopRegex = new RegExp(`{{\\s*#${key}\\s*}}([\\s\\S]*?){{\\s*/${key}\\s*}}`, 'g')
        
        rendered = rendered.replace(loopRegex, (match, content) => {
          return value.map((item: any, index: number) => {
            let itemContent = content
            
            // Add "last" property to each item
            const itemWithMeta = {
              ...item,
              last: index === value.length - 1
            }
            
            // Replace item properties
            Object.entries(itemWithMeta).forEach(([itemKey, itemValue]) => {
              const itemRegex = new RegExp(`{{\\s*${itemKey}\\s*}}`, 'g')
              itemContent = itemContent.replace(itemRegex, String(itemValue))
            })
            
            return itemContent
          }).join('')
        })
      }
    })
    
    // Fill in default values for any remaining variables
    if (template.defaultValues) {
      Object.entries(template.defaultValues).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
        if (regex.test(rendered)) {
          rendered = rendered.replace(regex, value)
        }
      })
    }
    
    // Clean up any remaining template variables with empty strings
    rendered = rendered.replace(/{{[^}]+}}/g, '')
    
    return rendered
  } catch (error) {
    console.error('Error rendering template:', error)
    return template.template
  }
}

/**
 * Generate a file name based on template and variables
 * @param template Template being used
 * @param variables Template variables
 * @returns Generated file name
 */
export function generateFileName(template: ITemplate, variables: ITemplateVariables): string {
  try {
    // Default to component or page name if available
    if (variables.ComponentName) {
      return `${variables.ComponentName}.${template.fileType}`
    }
    
    if (variables.PageName) {
      return `${variables.PageName}.${template.fileType}`
    }
    
    // Use provided FileName if available
    if (variables.FileName) {
      // Add extension if not present
      if (!variables.FileName.includes('.')) {
        return `${variables.FileName}.${template.fileType}`
      }
      return variables.FileName
    }
    
    // Fallback to template name as file name
    return `${template.name.toLowerCase().replace(/\s+/g, '-')}.${template.fileType}`
  } catch (error) {
    console.error('Error generating file name:', error)
    return `generated-file.${template.fileType}`
  }
}

/**
 * Get a template by ID
 * @param templateId Template ID to find
 * @returns Template or null if not found
 */
export async function getTemplateById(templateId: string): Promise<ITemplate | null> {
  try {
    // First check built-in templates
    const builtInTemplates = await loadBuiltInTemplates()
    const builtInTemplate = builtInTemplates.find(t => t.id === templateId)
    
    if (builtInTemplate) {
      return builtInTemplate
    }
    
    // Then check custom templates
    const db = (await clientPromise).db()
    
    let objectId: ObjectId
    try {
      objectId = new ObjectId(templateId)
    } catch (error) {
      return null
    }
    
    const template = await db.collection('templates').findOne({ _id: objectId })
    
    if (!template) {
      return null
    }
    
    return {
      ...template as any, // Cast to any to fix spread error
      id: (template as any)._id.toString() // Add type assertion
    } as ITemplate // Cast result to ITemplate
  } catch (error) {
    console.error('Error getting template by ID:', error)
    return null
  }
}

/**
 * Try to parse AI JSON that may contain backticks, unterminated strings, or truncation.
 * Returns null if no valid object can be extracted.
 */
function parseJsonRelaxed(jsonString: string): Record<string, string> | null {
  try {
    return JSON.parse(jsonString) as Record<string, string>
  } catch {
    // no-op
  }
  // Extract "key":"value" or "key":`value` pairs so we still get variables when JSON is malformed
  const out: Record<string, string> = {}
  // Double-quoted value: "key":"value" (value stops at first unescaped ")
  const doubleRe = /"([A-Za-z_][A-Za-z0-9_]*)":\s*"((?:[^"\\]|\\.)*)"/g
  let m
  while ((m = doubleRe.exec(jsonString)) !== null) {
    out[m[1]] = m[2].replace(/\\"/g, '"').slice(0, 500)
  }
  // Backtick value: "key":`value` (AI sometimes uses backticks; invalid JSON)
  const backtickRe = /"([A-Za-z_][A-Za-z0-9_]*)":\s*`([^`]*)`/g
  while ((m = backtickRe.exec(jsonString)) !== null) {
    out[m[1]] = m[2].replace(/\\/g, '\\\\').slice(0, 500)
  }
  if (Object.keys(out).length > 0) return out
  return null
}

/** Derive ComponentName from file path (e.g. incident-form.tsx -> IncidentForm). */
function componentNameFromPath(filePath: string): string {
  const name = filePath.split('/').pop() || 'Component'
  const base = name.replace(/\.[^.]+$/, '')
  return base.split(/[-_]/).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('')
}

/** True if this path is a web UI file (page, component, layout, globals.css) so we inject styling and first-build-complete mandate. */
function isWebUIFilePath(filePath: string): boolean {
  const n = (filePath || '').replace(/\\/g, '/').toLowerCase()
  if (/\.(tsx|jsx)$/.test(n) && (n.includes('/app/') || n.includes('src/app/') || n.includes('/components/') || n.includes('src/components/'))) return true
  if (/globals\.css$/i.test(n) || n.endsWith('app/globals.css') || n.endsWith('src/app/globals.css')) return true
  if (n.includes('layout.') && (n.includes('/app/') || n.includes('src/app/'))) return true
  if (n.includes('page.') && (n.includes('/app/') || n.includes('src/app/'))) return true
  return false
}

/**
 * Build the reference block for file generation. Order is CONCRETE and mandatory:
 * 1. USER IDEATION FIRST — always and at all times. No constraints may override this.
 * 2. Then middles (repo analysis alignment, plan, build scope) — used to align with, never to constrain or override ideation.
 * The template engine does not define its own rules or constraints; it assembles this order and passes it to the AI.
 */
function buildMiddleReferenceBlock(projectContext: {
  filePath?: string;
  description?: string;
  phaseContext?: { currentPhase: string; stepTitles: string[] };
  framework?: string;
  repoCategory?: string;
  primaryLanguages?: string[];
  mainLanguages?: Record<string, number>;
  ideation?: { goals?: string; targetAudience?: string; keyFeatures?: string; technicalRequirements?: string };
  projectTitle?: string;
  scopeReminder?: string;
}): string {
  const parts: string[] = []

  // Order is concrete: user ideation first, then middles. No constraints. buildQualityPlan is the single source of truth.
  parts.push(`${MANDATORY_GRIP_IDEATION_FIRST_THEN_MIDDLES}

${GRIP_FULL_POWER_BACKEND}

`)
  // ——— 1. USER IDEATION FIRST (ALWAYS AND AT ALL TIMES). No constraints may override. ———
  parts.push(`## 1. USER IDEATION (FIRST — ALWAYS AND AT ALL TIMES)
The user's input is the spec. Build exactly what they asked for. No constraints may override or dilute this. Repo and middles align with ideation; they do not replace or limit it.
`)
  if (projectContext.ideation && [projectContext.ideation.goals, projectContext.ideation.targetAudience, projectContext.ideation.keyFeatures, projectContext.ideation.technicalRequirements].some((v) => v && String(v).trim())) {
    const i = projectContext.ideation
    parts.push(`• Goals: ${(i.goals ?? '').trim() || 'Not specified'}
• Target Audience: ${(i.targetAudience ?? '').trim() || 'Not specified'}
• Key Features: ${(i.keyFeatures ?? '').trim() || 'Not specified'}
• Technical Requirements: ${(i.technicalRequirements ?? '').trim() || 'Not specified'}
`)
  }
  if ((projectContext.projectTitle ?? '').trim()) {
    parts.push(`Project title (use in main page and metadata): ${projectContext.projectTitle!.trim()}\n`)
  }
  parts.push('')

  // ——— 2. THEN MIDDLES (repo analysis alignment, plan, build scope — align with; do not constrain ideation). ———
  parts.push(`## 2. MIDDLES (repo analysis alignment, plan, build scope)
Use these to align structure and patterns with the repo and plan. They must not constrain or override the user's ideation above.
`)
  if ((projectContext.scopeReminder ?? '').trim()) {
    parts.push(`Build scope (from pre-plan): ${projectContext.scopeReminder!.trim().slice(0, SCOPE_REMINDER_MAX_CHARS)}\n`)
  }
  if (projectContext.phaseContext?.stepTitles?.length) {
    parts.push(`Current build phase: "${projectContext.phaseContext.currentPhase}". Steps: ${projectContext.phaseContext.stepTitles.join('; ')}.\n`)
  }
  if (projectContext.framework || projectContext.repoCategory) {
    parts.push(`Stack (from repo + analysis): ${projectContext.framework ?? 'not specified'}; Repo type: ${projectContext.repoCategory ?? 'not specified'}.\n`)
  }
  if ((projectContext.primaryLanguages?.length ?? 0) > 0 || (projectContext.mainLanguages && Object.keys(projectContext.mainLanguages).length > 0)) {
    parts.push(`Languages (tree-sitter): Primary: ${(projectContext.primaryLanguages ?? []).join(', ') || 'none'}; Extensions: ${JSON.stringify(projectContext.mainLanguages ?? {})}.\n`)
  }
  parts.push('')

  // Mandatory rules support ideation-first; they do not add constraints that override user input.
  parts.push(`## Mandatory rules (support ideation-first; no constraints that override user input)
${MANDATORY_GRIP_IDEATION_100_MATCH}

${MANDATORY_GRIP_IDEATION_ONLY_NO_FILLER}

${MANDATORY_GRIP_REPO_PIGGYBACK}

${MANDATORY_GRIP_FIRST_BUILD_COMPLETE_DEPLOYABLE}
`)

  return parts.join('\n')
}

/**
 * File-type hint: only inject the minimal rule from buildQualityPlan when this file type requires it.
 * Template engine does not define rules—it only references the middle (buildQualityPlan).
 */
function buildFileTypeHint(filePath: string, projectTitle?: string): string {
  const n = (filePath || '').replace(/\\/g, '/')
  const hints: string[] = []

  if (/(^|\/)app\/layout\.tsx$/i.test(n) || /(^|\/)src\/app\/layout\.tsx$/i.test(n)) {
    hints.push(`This file is the Next.js App Router root layout. Follow these rules exactly:\n${MANDATORY_GRIP_NEXTJS_APP_ROUTER_LAYOUT}\n${MANDATORY_GRIP_LAYOUT_IMPORT_GLOBALS_CSS}`)
  }
  if (/(^|\/)(app|src\/app)\/.+\.(tsx|ts|jsx|js)$/i.test(n)) {
    hints.push(`CRITICAL — First build must succeed. Next.js App Router file: ${MANDATORY_GRIP_NEXTJS_METADATA_NO_HEAD} Do NOT output or reference next/head or <Head> in any variable value; the template already uses the Metadata API.`)
  }
  if (/(^|\/)(app|src\/app)\/page\.(tsx|jsx)$/i.test(n)) {
    hints.push(`This file is the root page (main landing). Use project title "${(projectTitle || 'this app').trim()}", ideation-based content only, and working Next.js Link navigation to other pages. FORBIDDEN: "Your app is running", "Edit this page in the editor", "Run plan and build in GRIP".`)
  }
  if (/next\.config\.(js|mjs|cjs)$/i.test(n)) {
    hints.push('This project uses "type": "module". Write next.config.js in ESM only: "const nextConfig = { ... }; export default nextConfig;" — do NOT use module.exports or require().')
  }
  if (/postcss\.config\.(js|mjs)$/i.test(n)) {
    hints.push('Write postcss.config in ESM only so it works in Next.js/StackBlitz: "export default { plugins: { tailwindcss: {}, autoprefixer: {} } };". Do NOT use module.exports or require() — that causes "ReferenceError: module is not defined" when Node loads .js as ESM.')
  }
  if (n.toLowerCase().endsWith('package.json')) {
    hints.push('Do NOT add expo, react-native, or @expo/* to dependencies unless this project is a 100% Expo/React Native app. For web (Next.js/Vite/CRA) use only web stack deps.')
  }

  if (hints.length === 0) return ''
  return '\n## File-type rule\n' + hints.join('\n\n')
}

/**
 * Generate template variables using AI
 * @param template Template to use
 * @param projectContext Context information about the project
 * @returns Generated template variables
 */
export async function generateTemplateVariables(
  template: ITemplate,
  projectContext: {
    projectId: string;
    filePath: string;
    fileNode: IFileNode;
    projectStructure: IProjectStructureData;
    description?: string;
    phaseContext?: { currentPhase: string; stepTitles: string[] };
    /** Inferred from repo + analysis; AI uses this to match project stack */
    framework?: string;
    /** Repo type from analysis (e.g. web_js, full_stack_js) */
    repoCategory?: string;
    /** Primary languages from tree-sitter analysis (identity.primary_languages) */
    primaryLanguages?: string[];
    /** Language extension counts from tree-sitter (mainLanguages) */
    mainLanguages?: Record<string, number>;
    /** User ideation (goals, audience, features, technical requirements); code and design must match 100% */
    ideation?: { goals?: string; targetAudience?: string; keyFeatures?: string; technicalRequirements?: string };
    /** Project display name; must appear in main page and metadata. */
    projectTitle?: string;
    /** Short scope reminder from pre-plan build requirements; for file-level context and for fix-build to trace files/code blocks on build failure. */
    scopeReminder?: string;
  }
): Promise<{ variables: ITemplateVariables; totalTokens: number }> {
  try {
    // Full-file template: single FileContent blob. Prompt is built only from middles (reference block + file-type hint from buildQualityPlan).
    if (template.id === 'full-file' && template.variables?.includes('FileContent')) {
      const middleReference = buildMiddleReferenceBlock(projectContext)
      const fileTypeHint = buildFileTypeHint(projectContext.filePath || '', projectContext.projectTitle)
      const fullFilePrompt = `
Generate the COMPLETE, runnable source code for this file. Order is CONCRETE: USER IDEATION FIRST (always and at all times), then middles (repo analysis alignment). No constraints may override or dilute the user's input. Build exactly what the user asked for; use repo/plan to align structure and patterns only.

## Reference (1 = user ideation first, 2 = middles — no constraints override section 1)
${middleReference}

## File to generate
Path: ${projectContext.filePath}
Description: ${projectContext.description || 'Not provided'}
${fileTypeHint}

GRIP mandatory: output must be full, valid, runnable code that matches the file type and the reference above. Return ONLY a single JSON object with one key: "FileContent". The value must be the exact file content. Use \\n for newlines inside the string so the JSON is valid. Example: {"FileContent":"const x = 1;\\nexport default x;"}
`
      const anthropic = getAnthropicClient()
      if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not set')
      console.info('[GRIP Files] Calling Anthropic API for template variables (generateTemplateVariables). Usage will appear in Anthropic console.')
      const response = await anthropic.messages.create({
        model: ANTHROPIC_MODEL_CHAT,
        max_tokens: 12_000,
        temperature: 0.2,
        messages: [{ role: 'user', content: fullFilePrompt }]
      })
      const text = response.content[0].text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : '{}'
      let fileContent = ''
      try {
        const parsed = JSON.parse(jsonString) as { FileContent?: string }
        fileContent = (parsed?.FileContent ?? '').trim()
      } catch {
        const m = text.match(/"FileContent"\s*:\s*"((?:[^"\\]|\\.)*)"/s)
        if (m) fileContent = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim()
      }
      if (!fileContent || fileContent.length < 20) {
        fileContent = (template.defaultValues?.FileContent as string) ?? 'export {} // TODO'
      }
      const totalTokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)
      return { variables: { FileContent: fileContent } as ITemplateVariables, totalTokens }
    }

    // Variable-generation templates (e.g. react-component, nextjs-page): use same middle reference; template ID only defines which variables to ask for.
    const missingVariables = template.variables.filter(v => {
      return !['props', 'functions'].includes(v)
    })
    
    if (missingVariables.length === 0) {
      return { variables: {}, totalTokens: 0 }
    }
    
    const middleReference = buildMiddleReferenceBlock(projectContext)
    const fileTypeHint = buildFileTypeHint(projectContext.filePath || '', projectContext.projectTitle)
    const webUIHint = isWebUIFilePath(projectContext.filePath || '')
      ? '\nThis file is web UI: generate variable values that produce styled, complete UI (Tailwind/shadcn patterns). No mock data, no plain unstyled content.'
      : ''
    const isAppDirNextjsPage = /(^|\/)(app|src\/app)\//i.test(projectContext.filePath || '') && template.id === 'nextjs-page'
    const criticalAppRouterLine = isAppDirNextjsPage
      ? '\nCRITICAL: This file is in the App Router (app/ or src/app/). The template uses the Metadata API only. Do NOT put next/head, <Head>, or "import Head" in any variable value (PageTitle, MetaDescription, PageContent, etc.). Output only content that fits the Metadata-based template so the first build succeeds.'
      : ''
    const prompt = `
Generate values for template variables. USER IDEATION FIRST (always and at all times), then middles. No constraints may override the user's input. Build exactly what the user asked for; use repo/plan to align only.

## Reference (1 = user ideation first, 2 = middles — no constraints override section 1)
${middleReference}

## Template and file
Template: ${template.name} (${template.description})
Variables to generate: ${missingVariables.join(', ')}
File path: ${projectContext.filePath}
Description: ${projectContext.description || 'Not provided'}
${fileTypeHint}${webUIHint}${criticalAppRouterLine}

Generate variable values that produce complete, valid output. Return ONLY a single JSON object. Use double quotes for keys and string values. Keep string values under 200 chars. Example: {"ComponentName":"MyComponent","ComponentContent":"<p>Hello</p>"}
`
    const anthropic = getAnthropicClient()
    if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not set')
    console.info('[GRIP Files] Calling Anthropic API for template variables (generateTemplateVariables). Usage will appear in Anthropic console.')
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_CHAT,
      max_tokens: 2000,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    })
    
    const content = response.content[0].text
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const jsonString = jsonMatch ? jsonMatch[0] : '{}'
    
    let generatedVariables: Record<string, string> | null = parseJsonRelaxed(jsonString)
    
    if (!generatedVariables || Object.keys(generatedVariables).length === 0) {
      // Fallback: use template defaultValues and derive ComponentName from path so the file still renders
      generatedVariables = { ...(template.defaultValues || {}) } as Record<string, string>
      if (template.variables.includes('ComponentName')) {
        generatedVariables.ComponentName = componentNameFromPath(projectContext.filePath)
      }
    }
    
    // Add any complex variables that might need special handling
    if (template.variables.includes('props') && !Object.keys(generatedVariables).includes('props')) {
      (generatedVariables as any).props = []
    }
    if (template.variables.includes('functions') && !Object.keys(generatedVariables).includes('functions')) {
      (generatedVariables as any).functions = []
    }
    const totalTokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)
    return { variables: generatedVariables as ITemplateVariables, totalTokens }
  } catch (error) {
    console.error('Error generating template variables:', error)
    // Fallback so the file still generates
    const fallback: Record<string, string> = { ...(template.defaultValues || {}) } as Record<string, string>
    if (template.variables?.includes('ComponentName')) {
      fallback.ComponentName = componentNameFromPath(projectContext.filePath)
    }
    return { variables: fallback as ITemplateVariables, totalTokens: 0 }
  }
}

/**
 * Generate a dynamic template based on project context and requirements
 * @param options Template generation options
 * @returns Generated dynamic template
 */
export async function generateDynamicTemplate(
  options: TemplateGenerationOptions
): Promise<DynamicTemplate> {
  try {
    const { projectContext, templateType, filePath, dependencies = [], customVariables = {} } = options;

    // Build comprehensive prompt for AI
    const prompt = `
Generate a code template for a software project with the following context:

Project Type: ${projectContext.projectType}
Framework: ${projectContext.framework}
Language: ${projectContext.language}
Features: ${projectContext.features.join(', ')}
Requirements: ${projectContext.requirements.join(', ')}
Architecture: ${projectContext.architecture}
Database: ${projectContext.database || 'Not specified'}
Deployment: ${projectContext.deployment || 'Not specified'}
Testing: ${projectContext.testing?.join(', ') || 'Not specified'}

Project Ideation:
Goals: ${projectContext.ideation.goals}
Target Audience: ${projectContext.ideation.targetAudience}
Key Features: ${projectContext.ideation.keyFeatures}
Technical Requirements: ${projectContext.ideation.technicalRequirements}

Template Type: ${templateType}
File Path: ${filePath}
Dependencies: ${dependencies.join(', ')}

Please generate a template that:
1. Follows best practices for the specified framework and language
2. Includes proper error handling and type safety
3. Implements appropriate design patterns
4. Has clear documentation and comments
5. Is optimized for performance and maintainability

Format the response as a JSON object with the following structure:
{
  "name": "Template Name",
  "description": "Template Description",
  "language": "programming-language",
  "fileType": "file-extension",
  "template": "template-content-with-variables",
  "variables": ["variable1", "variable2"],
  "defaultValues": { "variable1": "default1" },
  "metadata": {
    "framework": "framework-name",
    "projectType": "project-type",
    "dependencies": ["dep1", "dep2"],
    "bestPractices": ["practice1", "practice2"],
    "patterns": ["pattern1", "pattern2"]
  }
}`;

    // Use Anthropic AI to generate template
    const anthropic = getAnthropicClient()
    if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not set')
    console.info('[GRIP Files] Calling Anthropic API for template generation. Usage will appear in Anthropic console.')
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_CHAT,
      max_tokens: 4000,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    });

    // Parse and validate generated template
    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : '{}';
    
    try {
      const templateData = JSON.parse(jsonString);
      
      // Create template with required fields
      const template: DynamicTemplate = {
        id: new ObjectId().toString(),
        name: templateData.name,
        description: templateData.description,
        language: templateData.language,
        fileType: templateData.fileType,
        template: templateData.template,
        variables: templateData.variables || [],
        defaultValues: templateData.defaultValues || {},
        isBuiltIn: false,
        metadata: {
          framework: templateData.metadata?.framework || projectContext.framework,
          projectType: templateData.metadata?.projectType || projectContext.projectType,
          dependencies: templateData.metadata?.dependencies || dependencies,
          bestPractices: templateData.metadata?.bestPractices || [],
          patterns: templateData.metadata?.patterns || []
        }
      };

      // Add custom variables if provided
      if (Object.keys(customVariables).length > 0) {
        // Fix for Set iteration error
        template.variables = Array.from(new Set([...template.variables, ...Object.keys(customVariables)]));
        template.defaultValues = {
          ...template.defaultValues,
          ...customVariables
        };
      }

      // Store template in database
      const db = (await clientPromise).db();
      const result = await db.collection('templates').insertOne({
        ...template,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return {
        ...template,
        id: result.insertedId.toString()
      };
    } catch (jsonError) {
      console.error('Error parsing AI-generated template:', jsonError);
      throw new Error('Failed to generate valid template');
    }
  } catch (error) {
    console.error('Error generating dynamic template:', error);
    throw error;
  }
}
