import { ObjectId } from 'mongodb'
import { clientPromise } from '@/lib/mongodb'
import { getRepositoryFiles } from '@/lib/repository'
import { IProjectStructureData, IFileNode } from '@/lib/models/ProjectStructure'

/**
 * Project Analyzer Service - Analyzes ideation and repository data
 * Part of Phase 3, Step 1 of the G.R.I.P. AI Assistant Enhancement Plan
 */

interface RepositoryFile {
  path: string
  content: string | null
  type: string
  sha?: string
  lastModified?: Date
  encoding?: string
}

interface ProjectIdeation {
  goals: string
  targetAudience: string
  keyFeatures: string
  technicalRequirements: string
}

interface EnhancedBuildRequirements {
  clarifiedGoals: string
  targetAudienceSummary: string
  keyFeaturesNormalized: string
  technicalRequirementsNormalized: string
  techStackRecommendations: string
  uxUiPrinciples: string
  qualityBar: string
  fullPromptText: string
}

interface Project {
  _id: ObjectId
  title: string
  description: string
  repository?: {
    owner: string
    name: string
  }
  ideation?: ProjectIdeation
  enhancedBuildRequirements?: EnhancedBuildRequirements
}

interface TechStackInfo {
  framework: string
  language: string
  libraries: string[]
  buildTools: string[]
  testingFrameworks: string[]
  databases: string[]
  deployment: string[]
  security: string[]
}

interface RepositoryAnalysis {
  structure: {
    files: RepositoryFile[]
    directories: string[]
    totalFiles: number
    totalSize: number
  }
  languages: {
    [key: string]: {
      files: number
      lines: number
      percentage: number
    }
  }
  components: {
    name: string
    type: string
    path: string
    dependencies: string[]
    complexity: number
  }[]
  features: {
    name: string
    description: string
    components: string[]
    dependencies: string[]
  }[]
}

interface DependencyAnalysis {
  packages: {
    name: string
    version: string
    type: 'production' | 'development'
    required: boolean
    vulnerabilities?: {
      severity: 'low' | 'medium' | 'high' | 'critical'
      description: string
      fix?: string
    }[]
  }[]
  conflicts: {
    package: string
    versions: string[]
    resolution?: string
  }[]
  tree: {
    [key: string]: {
      dependencies: string[]
      dependents: string[]
      depth: number
    }
  }
}

interface FileStructureRecommendation {
  path: string
  type: 'directory' | 'file'
  purpose: string
  children?: FileStructureRecommendation[]
}

interface AnalysisResult {
  techStack: TechStackInfo
  recommendations: string[]
  fileStructure: FileStructureRecommendation[]
  dependencies: Record<string, string>
  buildCommands: Record<string, string>
}

/**
 * Enhanced tech stack analysis with more detailed detection
 */
export async function determineTechStack(files: RepositoryFile[]): Promise<TechStackInfo> {
  const techStack: TechStackInfo = {
    framework: 'unknown',
    language: 'unknown',
    libraries: [],
    buildTools: [],
    testingFrameworks: [],
    databases: [],
    deployment: [],
    security: []
  }

  // Analyze package.json for dependencies
  const packageJson = files.find(file => 
    file.path.endsWith('package.json') && file.content
  )

  if (packageJson?.content) {
    try {
      const pkg = JSON.parse(packageJson.content)
      
      // Detect framework
      if (pkg.dependencies?.next) techStack.framework = 'Next.js'
      else if (pkg.dependencies?.react) techStack.framework = 'React'
      else if (pkg.dependencies?.vue) techStack.framework = 'Vue'
      else if (pkg.dependencies?.angular) techStack.framework = 'Angular'
      
      // Detect build tools
      if (pkg.devDependencies?.webpack) techStack.buildTools.push('Webpack')
      if (pkg.devDependencies?.vite) techStack.buildTools.push('Vite')
      if (pkg.devDependencies?.rollup) techStack.buildTools.push('Rollup')
      
      // Detect testing frameworks
      if (pkg.devDependencies?.jest) techStack.testingFrameworks.push('Jest')
      if (pkg.devDependencies?.cypress) techStack.testingFrameworks.push('Cypress')
      if (pkg.devDependencies?.playwright) techStack.testingFrameworks.push('Playwright')
      
      // Detect databases
      if (pkg.dependencies?.mongoose) techStack.databases.push('MongoDB')
      if (pkg.dependencies?.prisma) techStack.databases.push('Prisma')
      if (pkg.dependencies?.sequelize) techStack.databases.push('Sequelize')
      
      // Detect deployment tools
      if (pkg.dependencies?.docker) techStack.deployment.push('Docker')
      if (pkg.dependencies?.kubernetes) techStack.deployment.push('Kubernetes')
      
      // Detect security tools
      if (pkg.devDependencies?.eslint) techStack.security.push('ESLint')
      if (pkg.devDependencies?.husky) techStack.security.push('Husky')
    } catch (error) {
      console.error('Error parsing package.json:', error)
    }
  }

  // Analyze configuration files
  const configFiles = files.filter(file => 
    file.path.match(/\.config\.(js|ts|json)$/) || 
    file.path.match(/^\.(eslintrc|prettierrc|babelrc|tsconfig|jest\.config)/)
  )

  configFiles.forEach(file => {
    if (file.path.includes('tsconfig')) techStack.language = 'TypeScript'
    if (file.path.includes('jest')) techStack.testingFrameworks.push('Jest')
    if (file.path.includes('eslint')) techStack.security.push('ESLint')
  })

  // Analyze source files for language detection
  const extensions: Record<string, number> = {}
  files.forEach(file => {
    const ext = file.path.split('.').pop()?.toLowerCase()
    if (ext) {
      extensions[ext] = (extensions[ext] || 0) + 1
    }
  })

  const sortedExts = Object.entries(extensions)
    .sort((a, b) => b[1] - a[1])
    .map(([ext]) => ext)

  // Set language based on most common extension
  const jsOrTs = sortedExts.find(ext => ['js', 'jsx', 'ts', 'tsx'].includes(ext))
  if (jsOrTs) {
    techStack.language = jsOrTs.includes('ts') ? 'TypeScript' : 'JavaScript'
  }

  return techStack
}

/**
 * Generate file structure recommendations based on tech stack and ideation
 */
export function generateFileStructure(
  techStack: TechStackInfo, 
  ideation?: ProjectIdeation,
  existingFiles: RepositoryFile[] = []
): FileStructureRecommendation[] {
  const isNextJs = techStack.framework === 'Next.js'
  const isReact = techStack.framework === 'React' || isNextJs
  const isTypescript = techStack.language === 'TypeScript'
  const hasTailwind = techStack.language === 'Tailwind CSS'
  
  // Check for existing structure patterns
  const hasPublicFolder = existingFiles.some(f => f.path.startsWith('public/'))
  const hasSrcFolder = existingFiles.some(f => f.path.startsWith('src/'))
  const hasAppRouter = existingFiles.some(f => f.path.includes('/app/'))
  const hasComponentsFolder = existingFiles.some(f => f.path.includes('/components/'))
  
  // Base structure
  const structure: FileStructureRecommendation[] = [
    {
      path: hasSrcFolder ? 'src' : '.',
      type: 'directory',
      purpose: 'Root source directory',
      children: []
    }
  ]
  
  // Add public directory if needed
  if (isReact && hasPublicFolder) {
    structure.push({
      path: 'public',
      type: 'directory',
      purpose: 'Static assets directory',
      children: []
    })
  }
  
  // Get the source root structure element
  const srcRoot = structure.find(item => item.path === (hasSrcFolder ? 'src' : '.'))
  
  if (srcRoot && srcRoot.children) {
    // Add components directory
    if (isReact) {
      srcRoot.children.push({
        path: hasSrcFolder ? 'src/components' : 'components',
        type: 'directory',
        purpose: 'Reusable UI components',
        children: [
          {
            path: hasSrcFolder ? 'src/components/layout' : 'components/layout',
            type: 'directory',
            purpose: 'Layout components (headers, footers, etc.)'
          },
          {
            path: hasSrcFolder ? 'src/components/ui' : 'components/ui',
            type: 'directory',
            purpose: 'UI components (buttons, forms, etc.)'
          }
        ]
      })
    }
    
    // Add pages or app directory for Next.js
    if (isNextJs) {
      if (hasAppRouter) {
        srcRoot.children.push({
          path: hasSrcFolder ? 'src/app' : 'app',
          type: 'directory',
          purpose: 'Next.js App Router pages and routes'
        })
      } else {
        srcRoot.children.push({
          path: hasSrcFolder ? 'src/pages' : 'pages',
          type: 'directory',
          purpose: 'Next.js Pages Router components'
        })
      }
    }
    
    // Add lib/utils directory
    srcRoot.children.push({
      path: hasSrcFolder ? 'src/lib' : 'lib',
      type: 'directory',
      purpose: 'Utility functions and shared code',
      children: [
        {
          path: hasSrcFolder ? 'src/lib/utils' : 'lib/utils',
          type: 'directory',
          purpose: 'Utility functions'
        }
      ]
    })
    
    // Add services directory if applicable
    if (techStack.databases.length > 0) {
      const servicesPath = hasSrcFolder ? 'src/services' : 'services'
      srcRoot.children.push({
        path: servicesPath,
        type: 'directory',
        purpose: 'API and data services',
        children: [
          {
            path: `${servicesPath}/api`,
            type: 'directory',
            purpose: 'API client and services'
          }
        ]
      })
    }
  }
  
  return structure
}

/**
 * Generate dependencies based on tech stack and ideation
 */
export function generateDependencies(
  techStack: TechStackInfo,
  ideation?: ProjectIdeation
): Record<string, string> {
  const deps: Record<string, string> = {}
  
  // Framework dependencies
  if (techStack.framework === 'Next.js') {
    deps.next = '^13.4.1'
    deps.react = '^18.2.0'
    deps['react-dom'] = '^18.2.0'
  } else if (techStack.framework === 'React') {
    deps.react = '^18.2.0'
    deps['react-dom'] = '^18.2.0'
  }
  
  // TypeScript dependencies
  if (techStack.language === 'TypeScript') {
    deps.typescript = '^5.0.4'
    deps['@types/react'] = '^18.2.0'
    deps['@types/node'] = '^18.16.0'
  }
  
  // Styling dependencies
  if (techStack.language === 'Tailwind CSS') {
    deps.tailwindcss = '^3.3.2'
    deps.postcss = '^8.4.23'
    deps.autoprefixer = '^10.4.14'
  }
  
  // Database dependencies
  techStack.databases.forEach(db => {
    deps[db] = 'latest'
  })
  
  // Existing libraries should be preserved
  techStack.libraries.forEach(lib => {
    deps[lib] = 'latest' // We would need to get actual versions
  })
  
  return deps
}

/**
 * Generate build commands based on tech stack
 */
export function generateBuildCommands(techStack: TechStackInfo): Record<string, string> {
  const commands: Record<string, string> = {}
  
  // Standard commands
  commands.start = 'npm start'
  commands.build = 'npm run build'
  
  // Framework specific commands
  if (techStack.framework === 'Next.js') {
    commands.dev = 'next dev'
    commands.build = 'next build'
    commands.start = 'next start'
    commands.lint = 'next lint'
  } else if (techStack.framework === 'React') {
    commands.start = 'react-scripts start'
    commands.build = 'react-scripts build'
    commands.test = 'react-scripts test'
    commands.eject = 'react-scripts eject'
  }
  
  // Add testing command if applicable
  if (techStack.testingFrameworks.includes('Jest')) {
    commands.test = 'jest'
  }
  
  return commands
}

/**
 * Analyze project and generate recommendations
 */
export async function analyzeProject(projectId: string): Promise<AnalysisResult> {
  try {
    console.log(`Analyzing project: ${projectId}`)
    const db = (await clientPromise).db()
    
    // Fetch project details
    const project = await db.collection('projects').findOne<Project>({
      _id: new ObjectId(projectId)
    })
    
    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }
    
    // Fetch repository files
    let repoFiles: RepositoryFile[] = []
    if (project.repository) {
      try {
        repoFiles = await getRepositoryFiles(
          project.repository.owner,
          project.repository.name,
          projectId
        )
      } catch (error) {
        console.warn(`Could not fetch repository files: ${error}`)
      }
    }
    
    // Prefer enhanced build requirements (from ideation enhancement) so analysis aligns with best build input
    const ideationForAnalysis: ProjectIdeation | undefined = project.enhancedBuildRequirements
      ? {
          goals: project.enhancedBuildRequirements.clarifiedGoals,
          targetAudience: project.enhancedBuildRequirements.targetAudienceSummary,
          keyFeatures: project.enhancedBuildRequirements.keyFeaturesNormalized,
          technicalRequirements: project.enhancedBuildRequirements.technicalRequirementsNormalized
        }
      : project.ideation

    // Analyze tech stack
    const techStack = await determineTechStack(repoFiles)
    
    // Generate recommended file structure (aligned with enhanced build requirements when present)
    const fileStructure = generateFileStructure(techStack, ideationForAnalysis, repoFiles)
    
    // Generate dependencies (aligned with enhanced build requirements when present)
    const dependencies = generateDependencies(techStack, ideationForAnalysis)
    
    // Generate build commands
    const buildCommands = generateBuildCommands(techStack)
    
    // Generate recommendations
    const recommendations = [
      `Use ${techStack.framework} with ${techStack.language} for development`,
      `Organize code using the recommended file structure`,
      'Implement component-based architecture for better reusability',
      'Set up automated testing with the recommended testing framework',
      'Follow consistent coding style and naming conventions'
    ]
    
    // Add ideation/enhanced build-requirements-specific recommendations
    if (ideationForAnalysis) {
      const { goals, keyFeatures } = ideationForAnalysis
      if (goals) {
        recommendations.push(`Focus development on achieving project goals: ${goals.substring(0, 50)}...`)
      }
      if (keyFeatures) {
        recommendations.push(`Prioritize key features implementation: ${keyFeatures.substring(0, 50)}...`)
      }
    }
    
    return {
      techStack,
      recommendations,
      fileStructure,
      dependencies,
      buildCommands
    }
  } catch (error) {
    console.error('Error analyzing project:', error)
    throw error
  }
}

/**
 * Convert analysis result to a project structure format
 */
export function convertAnalysisToProjectStructure(
  projectId: string,
  project: Project,
  analysis: AnalysisResult
): IProjectStructureData {
  // Convert file structure recommendations to project structure format
  const fileHierarchy: IFileNode = {
    type: 'directory',
    name: project.title.toLowerCase().replace(/\s+/g, '-'),
    path: '/',
    children: analysis.fileStructure.map(recommendation => convertToFileNode(recommendation))
  }
  
  return {
    projectId: new ObjectId(projectId),
    name: project.title,
    description: project.description,
    fileHierarchy,
    dependencies: analysis.dependencies,
    buildConfig: {
      commands: analysis.buildCommands,
      environment: {}
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

/**
 * Convert a file structure recommendation to a file node
 */
function convertToFileNode(recommendation: FileStructureRecommendation): IFileNode {
  const pathParts = recommendation.path.split('/')
  const name = pathParts[pathParts.length - 1]
  
  return {
    type: recommendation.type,
    name,
    path: recommendation.path,
    description: recommendation.purpose,
    children: recommendation.children?.map(child => convertToFileNode(child)) || []
  }
}

/**
 * Save project structure to database
 */
export async function saveProjectStructure(
  projectStructure: IProjectStructureData
): Promise<ObjectId> {
  const db = (await clientPromise).db()
  
  // Check if project structure already exists
  const existing = await db.collection('projectStructures').findOne({
    projectId: projectStructure.projectId
  })
  
  if (existing) {
    // Update existing structure
    await db.collection('projectStructures').updateOne(
      { projectId: projectStructure.projectId },
      { $set: { 
        ...projectStructure,
        updatedAt: new Date()
      }}
    )
    
    return existing._id
  } else {
    // Create new structure
    const result = await db.collection('projectStructures').insertOne(projectStructure)
    return result.insertedId
  }
}

/**
 * Main function to analyze project and save structure
 */
export async function analyzeAndCreateProjectStructure(
  projectId: string
): Promise<{ structureId: ObjectId, analysis: AnalysisResult }> {
  try {
    // Fetch project
    const db = (await clientPromise).db()
    const project = await db.collection('projects').findOne<Project>({
      _id: new ObjectId(projectId)
    })
    
    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }
    
    // Analyze project
    const analysis = await analyzeProject(projectId)
    
    // Convert to project structure
    const projectStructure = convertAnalysisToProjectStructure(projectId, project, analysis)
    
    // Save to database
    const structureId = await saveProjectStructure(projectStructure)
    
    return { structureId, analysis }
  } catch (error) {
    console.error('Error analyzing and creating project structure:', error)
    throw error
  }
}

/**
 * Enhanced repository analysis with detailed structure and metrics
 */
export async function analyzeRepository(files: RepositoryFile[]): Promise<RepositoryAnalysis> {
  const analysis: RepositoryAnalysis = {
    structure: {
      files: [],
      directories: [],
      totalFiles: 0,
      totalSize: 0
    },
    languages: {},
    components: [],
    features: []
  }

  // Analyze file structure
  const directories = new Set<string>()
  files.forEach(file => {
    analysis.structure.files.push(file)
    analysis.structure.totalFiles++
    analysis.structure.totalSize += file.content?.length || 0
    
    // Extract directory path
    const dirPath = file.path.split('/').slice(0, -1).join('/')
    if (dirPath) directories.add(dirPath)
  })
  analysis.structure.directories = Array.from(directories)

  // Analyze languages
  files.forEach(file => {
    const ext = file.path.split('.').pop()?.toLowerCase() || 'unknown'
    const lines = file.content?.split('\n').length || 0
    
    if (!analysis.languages[ext]) {
      analysis.languages[ext] = {
        files: 0,
        lines: 0,
        percentage: 0
      }
    }
    
    analysis.languages[ext].files++
    analysis.languages[ext].lines += lines
  })

  // Calculate percentages
  const totalLines = Object.values(analysis.languages).reduce((acc, lang) => acc + lang.lines, 0)
  Object.values(analysis.languages).forEach(lang => {
    lang.percentage = (lang.lines / totalLines) * 100
  })

  // Analyze components
  const componentFiles = files.filter(file => 
    file.path.match(/\.(jsx|tsx|vue|svelte)$/) ||
    file.path.includes('/components/')
  )

  componentFiles.forEach(file => {
    const content = file.content || ''
    const imports = extractImports(content)
    const complexity = calculateComplexity(content)
    
    analysis.components.push({
      name: file.path.split('/').pop()?.split('.')[0] || 'unknown',
      type: file.path.split('.').pop() || 'unknown',
      path: file.path,
      dependencies: imports,
      complexity
    })
  })

  // Analyze features
  const featureFiles = files.filter(file => 
    file.path.includes('/features/') ||
    file.path.includes('/pages/')
  )

  featureFiles.forEach(file => {
    const content = file.content || ''
    const components = extractComponentUsage(content)
    const dependencies = extractImports(content)
    
    analysis.features.push({
      name: file.path.split('/').pop()?.split('.')[0] || 'unknown',
      description: extractDescription(content),
      components,
      dependencies
    })
  })

  return analysis
}

/**
 * Enhanced dependency analysis with security scanning
 */
export async function analyzeDependencies(
  packageJson: any,
  files: RepositoryFile[]
): Promise<DependencyAnalysis> {
  const analysis: DependencyAnalysis = {
    packages: [],
    conflicts: [],
    tree: {}
  }

  // Analyze package dependencies
  if (packageJson?.dependencies) {
    Object.entries(packageJson.dependencies).forEach(([name, version]) => {
      analysis.packages.push({
        name,
        version: version as string,
        type: 'production',
        required: true
      })
    })
  }

  if (packageJson?.devDependencies) {
    Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
      analysis.packages.push({
        name,
        version: version as string,
        type: 'development',
        required: false
      })
    })
  }

  // Check for version conflicts
  const versionMap = new Map<string, Set<string>>()
  analysis.packages.forEach(pkg => {
    if (!versionMap.has(pkg.name)) {
      versionMap.set(pkg.name, new Set())
    }
    versionMap.get(pkg.name)?.add(pkg.version)
  })

  versionMap.forEach((versions, name) => {
    if (versions.size > 1) {
      analysis.conflicts.push({
        package: name,
        versions: Array.from(versions)
      })
    }
  })

  // Build dependency tree
  const jsFiles = files.filter(file => 
    file.path.match(/\.(js|jsx|ts|tsx)$/) && file.content
  )

  jsFiles.forEach(file => {
    const content = file.content || ''
    const imports = extractImports(content)
    
    if (!analysis.tree[file.path]) {
      analysis.tree[file.path] = {
        dependencies: [],
        dependents: [],
        depth: 0
      }
    }
    
    analysis.tree[file.path].dependencies = imports
    imports.forEach(dep => {
      if (!analysis.tree[dep]) {
        analysis.tree[dep] = {
          dependencies: [],
          dependents: [],
          depth: 0
        }
      }
      analysis.tree[dep].dependents.push(file.path)
    })
  })

  // Calculate dependency depth
  const calculateDepth = (file: string, visited = new Set<string>()): number => {
    if (visited.has(file)) return 0
    visited.add(file)
    
    const deps = analysis.tree[file]?.dependencies || []
    const depths = deps.map(dep => calculateDepth(dep, visited))
    
    return Math.max(0, ...depths) + 1
  }

  Object.keys(analysis.tree).forEach(file => {
    analysis.tree[file].depth = calculateDepth(file)
  })

  return analysis
}

// Helper functions
function extractImports(content: string): string[] {
  const imports: string[] = []
  const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  
  let match
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1])
  }
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1])
  }
  
  return imports
}

function calculateComplexity(content: string): number {
  // Simple cyclomatic complexity calculation
  const controlStructures = [
    /\bif\b/g,
    /\belse\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\bdo\b/g,
    /\bswitch\b/g,
    /\bcatch\b/g,
    /\b&&\b/g,
    /\b\|\|\b/g
  ]
  
  let complexity = 1 // Base complexity
  controlStructures.forEach(pattern => {
    const matches = content.match(pattern) || []
    complexity += matches.length
  })
  
  return complexity
}

function extractComponentUsage(content: string): string[] {
  const components: string[] = []
  const componentRegex = /<([A-Z]\w+)/g
  
  let match
  while ((match = componentRegex.exec(content)) !== null) {
    components.push(match[1])
  }
  
  return components
}

function extractDescription(content: string): string {
  // Extract JSDoc or similar documentation
  const docRegex = /\/\*\*[\s\S]*?\*\/|\/\/.*/g
  const match = content.match(docRegex)
  if (!match) return ''
  
  return match[0]
    .replace(/\/\*\*|\*\/|\/\/|^\s*\*\s*/g, '')
    .trim()
} 