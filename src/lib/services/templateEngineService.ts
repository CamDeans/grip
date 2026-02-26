import { Anthropic } from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'
import { ObjectId } from 'mongodb'
import { getAnthropicApiKey, ANTHROPIC_MODEL_CHAT } from '@/lib/anthropicConfig'

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
 * Template Engine Service - Implements templating system for code generation
 * Part of Phase 4, Step 1 of the G.R.I.P. AI Assistant Enhancement Plan
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
    
    // Next.js page template
    templates.push({
      id: 'nextjs-page',
      name: 'Next.js Page',
      description: 'Next.js page component with TypeScript',
      language: 'typescript',
      fileType: 'tsx',
      template: `import { ReactElement } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'

interface {{PageName}}Props {
  {{#props}}
  {{name}}: {{type}};
  {{/props}}
}

const {{PageName}}: NextPage<{{PageName}}Props> = ({
  {{#props}}
  {{name}},
  {{/props}}
}) => {
  return (
    <>
      <Head>
        <title>{{PageTitle}}</title>
        <meta name="description" content="{{MetaDescription}}" />
      </Head>
      <main>
        {{PageContent}}
      </main>
    </>
  )
}

export default {{PageName}}`,
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
      variables: ['ProjectName', 'DevScript', 'BuildScript', 'StartScript', 'LintScript', 'NextVersion', 'ReactVersion', 'ReactDomVersion', 'TypescriptVersion', 'TypesNodeVersion', 'TypesReactVersion', 'TypesReactDomVersion'],
      defaultValues: {
        ProjectName: 'my-app',
        DevScript: 'next dev',
        BuildScript: 'next build',
        StartScript: 'next start',
        LintScript: 'next lint',
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
  }
): Promise<{ variables: ITemplateVariables; totalTokens: number }> {
  try {
    // Extract needed variables from template
    const missingVariables = template.variables.filter(v => {
      // Skip props and functions - they're complex types that will be handled specially
      return !['props', 'functions'].includes(v)
    })
    
    if (missingVariables.length === 0) {
      // No variables to generate
      return { variables: {}, totalTokens: 0 }
    }
    
    const phaseBlock = projectContext.phaseContext?.stepTitles?.length
      ? `\nCurrent build phase: "${projectContext.phaseContext.currentPhase}". Steps in this phase: ${projectContext.phaseContext.stepTitles.join('; ')}. Generate variable values that support implementing these steps.\n`
      : ''
    const stackBlock =
      projectContext.framework || projectContext.repoCategory
        ? `\nProject stack (from repo + analysis): Framework: ${projectContext.framework ?? 'not specified'}; Repo type: ${projectContext.repoCategory ?? 'not specified'}. Generate variable values that fit this stack and project structure.\n`
        : ''
    const languagesBlock =
      (projectContext.primaryLanguages?.length ?? 0) > 0 || (projectContext.mainLanguages && Object.keys(projectContext.mainLanguages).length > 0)
        ? `\nLanguages used/referenced in tree-sitter analysis: Primary: ${(projectContext.primaryLanguages ?? []).join(', ') || 'none'}; Extension counts: ${JSON.stringify(projectContext.mainLanguages ?? {})}. Generate variable values that match the languages and conventions of this project.\n`
        : ''
    
    // Build prompt for AI
    const prompt = `
I need to generate appropriate values for variables in a code template.

Template: ${template.name} (${template.description})
Template Variables: ${missingVariables.join(', ')}

File Path: ${projectContext.filePath}
Project Description: ${projectContext.description || 'Not provided'}
${stackBlock}${languagesBlock}${phaseBlock}

GRIP mandatory rule: every file must have real, runnable code. Generate variable values that produce complete content—never placeholder or empty. The rendered template must be a full, valid file (e.g. a real component with real JSX, or real logic), not a stub or TODO.

Return ONLY a single JSON object. Use double quotes for keys and string values. Do not use backticks. Keep string values short (under 200 chars) so the JSON is valid. Example: {"ComponentName":"MyComponent","ComponentContent":"<p>Hello</p>"}
`
    const anthropic = getAnthropicClient()
    if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not set')
    console.info('[GRIP Files] Calling Anthropic API for template variables (generateTemplateVariables). Usage will appear in Anthropic console.')
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_CHAT,
      max_tokens: 1000,
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
