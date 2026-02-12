import { ObjectId } from 'mongodb'
import { clientPromise } from '@/lib/mongodb'
import { Anthropic } from '@anthropic-ai/sdk'
import { analyzeAndCreateProjectStructure } from './projectAnalyzerService'
import { IProjectStructureData, IFileNode } from '@/lib/models/ProjectStructure'
import { getAnthropicApiKey, ANTHROPIC_MODEL_CHAT } from '@/lib/anthropicConfig'

function getAnthropicClient() {
  const apiKey = getAnthropicApiKey()
  if (!apiKey) return null
  return new Anthropic({ apiKey })
}

/**
 * Structure Generator Service - Creates file hierarchy based on analysis
 * Part of Phase 3, Step 2 of the G.R.I.P. AI Assistant Enhancement Plan
 */

interface FeatureDetails {
  name: string
  description: string
  components: string[]
  routes?: string[]
  dependencies?: string[]
  tests?: {
    unit: string[]
    integration: string[]
    e2e: string[]
  }
  documentation?: {
    api?: string
    usage?: string
    examples?: string[]
  }
  configuration?: {
    env?: string[]
    config?: string[]
  }
  dataModel?: {
    fields: Array<{
      name: string
      type: string
      description: string
      validation?: string[]
      relationships?: Array<{
        type: 'one-to-one' | 'one-to-many' | 'many-to-many'
        target: string
        field: string
      }>
    }>
    indexes?: Array<{
      fields: string[]
      type: 'unique' | 'sparse' | 'text'
    }>
  }
}

interface ComponentDetails {
  name: string
  type: 'ui' | 'layout' | 'feature' | 'shared'
  description: string
  props?: Array<{
    name: string
    type: string
    required: boolean
    description: string
  }>
  examples?: string[]
  tests?: {
    unit: string[]
    integration: string[]
    e2e: string[]
  }
  documentation?: {
    usage: string
    props: string
    examples: string[]
  }
  stories?: {
    title: string
    description: string
    examples: string[]
  }
}

interface DatabaseSchema {
  name: string
  fields: Array<{
    name: string
    type: string
    required: boolean
    unique?: boolean
    index?: boolean
    default?: any
    validation?: string[]
  }>
  indexes: Array<{
    fields: string[]
    type: 'unique' | 'sparse' | 'text'
  }>
  relationships: Array<{
    type: 'one-to-one' | 'one-to-many' | 'many-to-many'
    target: string
    field: string
  }>
}

interface APIRoute {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  handler: string
  middleware?: string[]
  validation?: {
    body?: string[]
    query?: string[]
    params?: string[]
  }
  documentation?: {
    description: string
    parameters: string[]
    responses: string[]
    examples: string[]
  }
}

interface GeneratedStructure {
  structure: IProjectStructureData
  features: FeatureDetails[]
}

/**
 * Enhance project structure with AI-generated details
 */
export type EnhanceProjectStructureResult = { structure: IProjectStructureData; totalTokens: number }

export async function enhanceProjectStructure(
  projectId: string,
  structure: IProjectStructureData
): Promise<EnhanceProjectStructureResult> {
  try {
    console.log(`Enhancing project structure: ${projectId}`)
    const db = (await clientPromise).db()

    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId)
    })

    if (!project) throw new Error(`Project not found: ${projectId}`)

    if (structure.fileHierarchy.children &&
        structure.fileHierarchy.children.some(child => child.description)) {
      console.log('Structure already has detailed children, skipping enhancement')
      return { structure, totalTokens: 0 }
    }
    
    // Prefer enhanced build requirements (from ideation enhancement) for clearer feature extraction
    const keyFeatures = project.enhancedBuildRequirements?.keyFeaturesNormalized ?? project.ideation?.keyFeatures ?? ''
    const technicalReqs = project.enhancedBuildRequirements?.technicalRequirementsNormalized ?? project.ideation?.technicalRequirements ?? ''
    const { features, totalTokens } = await extractFeaturesFromIdeation(keyFeatures, technicalReqs)

    const enhancedHierarchy = addFeaturesDirectories(structure.fileHierarchy, features)

    const enhancedStructure: IProjectStructureData = {
      ...structure,
      fileHierarchy: enhancedHierarchy,
      updatedAt: new Date()
    }

    await db.collection('projectStructures').updateOne(
      { projectId: new ObjectId(projectId) },
      { $set: enhancedStructure }
    )

    return { structure: enhancedStructure, totalTokens }
  } catch (error) {
    console.error('Error enhancing project structure:', error)
    throw error
  }
}

/**
 * Extract features from project ideation using AI
 */
async function extractFeaturesFromIdeation(
  keyFeatures: string,
  technicalRequirements: string
): Promise<FeatureDetails[]> {
  try {
    if (!keyFeatures && !technicalRequirements) {
      return []
    }
    
    const prompt = `
I need to extract structured feature information from a project ideation. Please analyze the following
key features and technical requirements and return a JSON array of features with the following structure:

[
  {
    "name": "FeatureName",
    "description": "Brief description",
    "components": ["ComponentName1", "ComponentName2"],
    "routes": ["/path1", "/path2"] (if applicable),
    "dataModel": {
      "fields": [
        { "name": "fieldName", "type": "string|number|boolean", "description": "Field purpose" }
      ]
    } (if applicable)
  }
]

Key Features:
${keyFeatures}

Technical Requirements:
${technicalRequirements}

Return only the JSON array, no explanation.
`
    
    // Use AI to extract features
    const anthropic = getAnthropicClient()
    if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not set')
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_CHAT,
      max_tokens: 2000,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    })

    const totalTokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)
    const content = response?.content?.[0]?.text || '[]'

    const jsonMatch = content.match(/\[[\s\S]*\]/)
    const jsonString = jsonMatch ? jsonMatch[0] : '[]'

    try {
      const features = JSON.parse(jsonString) as FeatureDetails[]
      return { features, totalTokens }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      return { features: [], totalTokens }
    }
  } catch (error) {
    console.error('Error extracting features from ideation:', error)
    return { features: [], totalTokens: 0 }
  }
}

/**
 * Add feature-specific directories and files to hierarchy
 */
function addFeaturesDirectories(
  fileHierarchy: IFileNode,
  features: FeatureDetails[]
): IFileNode {
  if (!features.length) {
    return fileHierarchy
  }
  
  // Create a deep copy of the hierarchy
  const updatedHierarchy: IFileNode = JSON.parse(JSON.stringify(fileHierarchy))
  
  // Find directories
  const componentsDir = findDirectory(updatedHierarchy, 'components')
  const routesDir = findDirectory(updatedHierarchy, ['pages', 'app'])
  const libDir = findDirectory(updatedHierarchy, 'lib')
  const testsDir = findDirectory(updatedHierarchy, 'tests')
  const docsDir = findDirectory(updatedHierarchy, 'docs')
  const configDir = findDirectory(updatedHierarchy, 'config')
  
  // Add feature components
  if (componentsDir) {
    const featuresDir = addDirectory(componentsDir, 'features', 'Feature-specific components')
    
    features.forEach(feature => {
      const featureDir = addDirectory(
        featuresDir,
        feature.name.toLowerCase().replace(/\s+/g, '-'),
        feature.description
      )
      
      // Add component files
      feature.components.forEach(component => {
        const componentFile = addFile(
          featureDir,
          `${component}.tsx`,
          `${feature.name} - ${component} component`
        )
        
        // Add component documentation
        if (feature.documentation?.examples) {
          const docsDir = addDirectory(componentFile, 'docs', 'Component documentation')
          feature.documentation.examples.forEach((example, index) => {
            addFile(docsDir, `example-${index + 1}.mdx`, example)
          })
        }
      })
      
      // Add feature tests
      if (feature.tests) {
        const testsDir = addDirectory(featureDir, 'tests', 'Feature tests')
        Object.entries(feature.tests).forEach(([type, tests]) => {
          const typeDir = addDirectory(testsDir, type, `${type} tests`)
          tests.forEach(test => {
            addFile(typeDir, `${test}.test.ts`, `Test for ${test}`)
          })
        })
      }
    })
  }
  
  // Add routes
  if (routesDir) {
    features.forEach(feature => {
      if (feature.routes) {
        feature.routes.forEach(route => {
          const routeDir = addRouteDirectory(routesDir, route)
          const routeFile = addFile(
            routeDir,
            'page.tsx',
            `Route for ${feature.name} - ${route}`
          )
          
          // Add route documentation
          if (feature.documentation?.api) {
            const docsDir = addDirectory(routeFile, 'docs', 'Route documentation')
            addFile(docsDir, 'api.md', feature.documentation.api)
          }
        })
      }
    })
  }
  
  // Add data models
  if (libDir) {
    const modelsDir = addDirectory(libDir, 'models', 'Data models')
    
    features.forEach(feature => {
      if (feature.dataModel) {
        const modelFile = addFile(
          modelsDir,
          `${feature.name.toLowerCase().replace(/\s+/g, '-')}.ts`,
          `Data model for ${feature.name}`
        )
        
        // Add model documentation
        if (feature.documentation?.usage) {
          const docsDir = addDirectory(modelFile, 'docs', 'Model documentation')
          addFile(docsDir, 'usage.md', feature.documentation.usage)
        }
      }
    })
  }
  
  // Add tests
  if (testsDir) {
    features.forEach(feature => {
      if (feature.tests) {
        const featureTestsDir = addDirectory(
          testsDir,
          feature.name.toLowerCase().replace(/\s+/g, '-'),
          `Tests for ${feature.name}`
        )
        
        Object.entries(feature.tests).forEach(([type, tests]) => {
          const typeDir = addDirectory(featureTestsDir, type, `${type} tests`)
          tests.forEach(test => {
            addFile(typeDir, `${test}.test.ts`, `Test for ${test}`)
          })
        })
      }
    })
  }
  
  // Add documentation
  if (docsDir) {
    features.forEach(feature => {
      if (feature.documentation) {
        const featureDocsDir = addDirectory(
          docsDir,
          feature.name.toLowerCase().replace(/\s+/g, '-'),
          `Documentation for ${feature.name}`
        )
        
        Object.entries(feature.documentation).forEach(([type, content]) => {
          if (typeof content === 'string') {
            addFile(featureDocsDir, `${type}.md`, content)
          } else if (Array.isArray(content)) {
            content.forEach((item, index) => {
              addFile(featureDocsDir, `${type}-${index + 1}.md`, item)
            })
          }
        })
      }
    })
  }
  
  // Add configuration
  if (configDir) {
    features.forEach(feature => {
      if (feature.configuration) {
        const featureConfigDir = addDirectory(
          configDir,
          feature.name.toLowerCase().replace(/\s+/g, '-'),
          `Configuration for ${feature.name}`
        )
        
        if (feature.configuration.env) {
          addFile(featureConfigDir, '.env.example', feature.configuration.env.join('\n'))
        }
        
        if (feature.configuration.config) {
          addFile(featureConfigDir, 'config.ts', feature.configuration.config.join('\n'))
        }
      }
    })
  }
  
  return updatedHierarchy
}

// Helper functions
function findDirectory(node: IFileNode, names: string | string[]): IFileNode | null {
  const nameArray = Array.isArray(names) ? names : [names]
  
  if (nameArray.includes(node.name)) {
    return node
  }
  
  if (node.children) {
    for (const child of node.children) {
      const found = findDirectory(child, nameArray)
      if (found) return found
    }
  }
  
  return null
}

function addDirectory(parent: IFileNode, name: string, description: string): IFileNode {
  if (!parent.children) {
    parent.children = []
  }
  
  const dir: IFileNode = {
    type: 'directory',
    name,
    path: `${parent.path}/${name}`,
    description,
    children: []
  }
  
  parent.children.push(dir)
  return dir
}

function addFile(parent: IFileNode, name: string, description: string): IFileNode {
  if (!parent.children) {
    parent.children = []
  }
  
  const file: IFileNode = {
    type: 'file',
    name,
    path: `${parent.path}/${name}`,
    description
  }
  
  parent.children.push(file)
  return file
}

function addRouteDirectory(routesDir: IFileNode, route: string): IFileNode {
  // Normalize route (remove leading slash)
  const normalizedRoute = route.startsWith('/') ? route.substring(1) : route
  // Split into path parts
  const routeParts = normalizedRoute.split('/')
  
  // Create directories for nested routes
  let currentDir = routesDir
  let currentPath = routesDir.path
  
  for (let i = 0; i < routeParts.length - 1; i++) {
    const part = routeParts[i]
    currentPath = `${currentPath}/${part}`
    
    // Check if directory already exists
    let childDir = currentDir.children?.find(
      child => child.type === 'directory' && child.name === part
    )
    
    if (!childDir) {
      childDir = {
        type: 'directory',
        name: part,
        path: currentPath,
        description: `Route: ${part}`,
        children: []
      }
      currentDir.children?.push(childDir)
    }
    
    currentDir = childDir
  }
  
  // Add route file
  const lastPart = routeParts[routeParts.length - 1]
  const isAppDir = routesDir.name === 'app'
  
  const routeFile: IFileNode = {
    type: 'file',
    name: isAppDir ? 'page.tsx' : `${lastPart}.tsx`,
    path: `${currentPath}/${isAppDir ? 'page.tsx' : `${lastPart}.tsx`}`,
    description: `Route: ${route}`
  }
  
  // If app directory, add route as directory
  if (isAppDir) {
    const routeDir: IFileNode = {
      type: 'directory',
      name: lastPart,
      path: `${currentPath}/${lastPart}`,
      description: `Route: ${route}`,
      children: [routeFile]
    }
    currentDir.children?.push(routeDir)
    return routeDir
  } else {
    currentDir.children?.push(routeFile)
    return currentDir
  }
}

/**
 * Generate a structure file plan including recommended components and files
 */
export async function generateStructurePlan(projectId: string): Promise<GeneratedStructure> {
  try {
    // First, analyze the project and create basic structure
    const { structureId, analysis } = await analyzeAndCreateProjectStructure(projectId)
    
    // Fetch the created structure
    const db = (await clientPromise).db()
    const structure = await db.collection('projectStructures').findOne<IProjectStructureData>({
      _id: new ObjectId(structureId)
    })
    
    if (!structure) {
      throw new Error(`Structure not found: ${structureId}`)
    }
    
    // Fetch project details
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId)
    })
    
    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }
    
    const { features } = await extractFeaturesFromIdeation(
      project.ideation?.keyFeatures || '',
      project.ideation?.technicalRequirements || ''
    )

    const { structure: enhancedStructure } = await enhanceProjectStructure(projectId, structure)

    return {
      structure: enhancedStructure,
      features
    }
  } catch (error) {
    console.error('Error generating structure plan:', error)
    throw error
  }
}

/**
 * Get the structure for a project, creating it if it doesn't exist
 */
export async function getOrCreateProjectStructure(projectId: string): Promise<IProjectStructureData> {
  try {
    const db = (await clientPromise).db()
    
    // Check if structure already exists
    const structure = await db.collection('projectStructures').findOne<IProjectStructureData>({
      projectId: new ObjectId(projectId)
    })
    
    if (structure) {
      return structure
    }
    
    // If not, generate a new structure
    const { structureId } = await analyzeAndCreateProjectStructure(projectId)
    
    const newStructure = await db.collection('projectStructures').findOne<IProjectStructureData>({
      _id: new ObjectId(structureId)
    })

    if (!newStructure) throw new Error(`Failed to create structure for project: ${projectId}`)

    const { structure: enhancedStructure } = await enhanceProjectStructure(projectId, newStructure)
    return enhancedStructure
  } catch (error) {
    console.error('Error getting or creating project structure:', error)
    throw error
  }
} 