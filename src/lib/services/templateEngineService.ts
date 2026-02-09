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
        ComponentContent: 'Component content goes here'
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
        PageTitle: 'Page Title',
        MetaDescription: 'Page description',
        PageContent: 'Page content goes here'
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
        Description: 'Collection of utility functions'
      },
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
  }
): Promise<ITemplateVariables> {
  try {
    // Extract needed variables from template
    const missingVariables = template.variables.filter(v => {
      // Skip props and functions - they're complex types that will be handled specially
      return !['props', 'functions'].includes(v)
    })
    
    if (missingVariables.length === 0) {
      // No variables to generate
      return {}
    }
    
    // Build prompt for AI
    const prompt = `
I need to generate appropriate values for variables in a code template.

Template: ${template.name} (${template.description})
Template Variables: ${missingVariables.join(', ')}

File Path: ${projectContext.filePath}
Project Description: ${projectContext.description || 'Not provided'}

Please generate appropriate values for these variables that would make sense in the context 
of this template and file path. Return the values in JSON format.
`
    const anthropic = getAnthropicClient()
    if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not set')
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_CHAT,
      max_tokens: 1000,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    })
    
    const content = response.content[0].text
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const jsonString = jsonMatch ? jsonMatch[0] : '{}'
    
    try {
      const generatedVariables = JSON.parse(jsonString) as Record<string, string>
      
      // Add any complex variables that might need special handling
      if (template.variables.includes('props') && !Object.keys(generatedVariables).includes('props')) {
        generatedVariables.props = [] as any; // Cast to any to fix type error
      }
      
      if (template.variables.includes('functions') && !Object.keys(generatedVariables).includes('functions')) {
        generatedVariables.functions = [] as any; // Cast to any to fix type error
      }
      
      return generatedVariables
    } catch (jsonError) {
      console.error('Error parsing AI-generated variables:', jsonError)
      return {}
    }
  } catch (error) {
    console.error('Error generating template variables:', error)
    return {}
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
