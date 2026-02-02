import { ObjectId } from 'mongodb'
import { clientPromise } from '@/lib/mongodb'
import { getRepositoryFiles } from '@/lib/repository'
import { IProjectStructureData, IFileNode } from '@/lib/models/ProjectStructure'
import { getOrCreateProjectStructure } from './structureGeneratorService'

/**
 * Dependency Resolver Service - Identifies and manages project dependencies
 * Part of Phase 3, Step 4 of the G.R.I.P. AI Assistant Enhancement Plan
 */

interface FileDependency {
  source: string
  target: string
  type: 'import' | 'reference' | 'usage'
}

interface PackageDependency {
  name: string
  version: string
  type: 'production' | 'development' | 'peer'
  required: boolean
}

interface CircularDependency {
  path: string[]
  type: 'file' | 'package'
  severity: 'low' | 'medium' | 'high'
}

interface VersionConflict {
  package: string
  versions: string[]
  resolution?: string
  severity: 'low' | 'medium' | 'high'
  impact: string
}

interface SecurityVulnerability {
  package: string
  version: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  fix?: string
  cve?: string
}

interface DependencyCache {
  timestamp: Date
  ttl: number
  data: DependencyTree
  metadata: {
    fileCount: number
    packageCount: number
    circularDependencies: CircularDependency[]
    versionConflicts: VersionConflict[]
    securityVulnerabilities: SecurityVulnerability[]
  }
}

// Update DependencyTree interface
export interface DependencyTree {
  files: FileDependency[]
  packages: PackageDependency[]
  circularDependencies: CircularDependency[]
  versionConflicts: VersionConflict[]
  securityVulnerabilities: SecurityVulnerability[]
  metadata: {
    lastUpdated: Date
    fileCount: number
    packageCount: number
    totalDependencies: number
  }
}

interface FileAnalysisResult {
  path: string
  imports: string[]
  exports: string[]
  references: string[]
}

/**
 * Analyze package.json to extract package dependencies
 */
function analyzePackageDependencies(content: string): PackageDependency[] {
  try {
    const dependencies: PackageDependency[] = []
    const packageJson = JSON.parse(content)
    
    // Process production dependencies
    if (packageJson.dependencies) {
      Object.entries(packageJson.dependencies).forEach(([name, version]) => {
        dependencies.push({
          name,
          version: version as string,
          type: 'production',
          required: true
        })
      })
    }
    
    // Process development dependencies
    if (packageJson.devDependencies) {
      Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
        dependencies.push({
          name,
          version: version as string,
          type: 'development',
          required: false
        })
      })
    }
    
    // Process peer dependencies
    if (packageJson.peerDependencies) {
      Object.entries(packageJson.peerDependencies).forEach(([name, version]) => {
        dependencies.push({
          name,
          version: version as string,
          type: 'peer',
          required: false
        })
      })
    }
    
    return dependencies
  } catch (error) {
    console.error('Error analyzing package dependencies:', error)
    return []
  }
}

/**
 * Analyze JavaScript/TypeScript file to extract imports and exports
 */
function analyzeFileImports(filePath: string, content: string): FileAnalysisResult {
  try {
    const imports: string[] = []
    const exports: string[] = []
    const references: string[] = []
    
    // Simple regex for import statements
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    const exportRegex = /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g
    
    // Extract imports
    let match
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1])
    }
    
    // Extract requires
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push(match[1])
    }
    
    // Extract exports
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1])
    }
    
    // Find references to other files or components
    // This is a simplified approach - a proper analysis would use an AST parser
    const lines = content.split('\n')
    lines.forEach(line => {
      // Look for component usage in JSX
      const componentRegex = /<([A-Z]\w+)/g
      while ((match = componentRegex.exec(line)) !== null) {
        references.push(match[1])
      }
    })
    
    return {
      path: filePath,
      imports,
      exports,
      references
    }
  } catch (error) {
    console.error(`Error analyzing file imports for ${filePath}:`, error)
    return {
      path: filePath,
      imports: [],
      exports: [],
      references: []
    }
  }
}

/**
 * Map relative imports to actual file paths
 */
function resolveRelativeImports(
  fileAnalysis: FileAnalysisResult[], 
  fileNodes: IFileNode[]
): FileDependency[] {
  const dependencies: FileDependency[] = []
  const filePathMap = new Map<string, IFileNode>()
  
  // Create map of file paths
  const mapFiles = (node: IFileNode) => {
    filePathMap.set(node.path, node)
    
    if (node.children) {
      node.children.forEach(mapFiles)
    }
  }
  
  fileNodes.forEach(mapFiles)
  
  // Resolve relative imports
  fileAnalysis.forEach(file => {
    const fileDir = file.path.substring(0, file.path.lastIndexOf('/'))
    
    file.imports.forEach(importPath => {
      // Skip package imports
      if (!importPath.startsWith('.')) {
        return
      }
      
      // Resolve relative path
      let resolvedPath = importPath
      if (importPath.startsWith('./')) {
        resolvedPath = `${fileDir}/${importPath.substring(2)}`
      } else if (importPath.startsWith('../')) {
        // Handle parent directory references
        let currentDir = fileDir
        let relativePath = importPath
        
        while (relativePath.startsWith('../')) {
          currentDir = currentDir.substring(0, currentDir.lastIndexOf('/'))
          relativePath = relativePath.substring(3)
        }
        
        resolvedPath = `${currentDir}/${relativePath}`
      }
      
      // Add file extensions if missing
      if (!resolvedPath.endsWith('.js') && !resolvedPath.endsWith('.ts') && 
          !resolvedPath.endsWith('.tsx') && !resolvedPath.endsWith('.jsx')) {
        
        // Try common extensions
        const extensions = ['.js', '.ts', '.tsx', '.jsx']
        for (const ext of extensions) {
          if (filePathMap.has(`${resolvedPath}${ext}`)) {
            resolvedPath = `${resolvedPath}${ext}`
            break
          }
        }
        
        // Check for index files
        if (!resolvedPath.endsWith('.js') && !resolvedPath.endsWith('.ts') && 
            !resolvedPath.endsWith('.tsx') && !resolvedPath.endsWith('.jsx')) {
          for (const ext of extensions) {
            if (filePathMap.has(`${resolvedPath}/index${ext}`)) {
              resolvedPath = `${resolvedPath}/index${ext}`
              break
            }
          }
        }
      }
      
      // Add to dependencies if valid
      if (filePathMap.has(resolvedPath)) {
        dependencies.push({
          source: file.path,
          target: resolvedPath,
          type: 'import'
        })
      }
    })
    
    // Add references
    file.references.forEach(reference => {
      // Find files that export this reference
      fileAnalysis.forEach(targetFile => {
        if (targetFile.exports.includes(reference)) {
          dependencies.push({
            source: file.path,
            target: targetFile.path,
            type: 'usage'
          })
        }
      })
    })
  })
  
  return dependencies
}

/**
 * Analyze project files to identify dependencies
 */
export async function analyzeProjectDependencies(projectId: string): Promise<DependencyTree> {
  try {
    console.log(`Analyzing dependencies for project: ${projectId}`)
    const db = (await clientPromise).db()
    
    // Check cache first
    const cachedAnalysis = await getCachedDependencyAnalysis(projectId)
    if (cachedAnalysis) {
      return cachedAnalysis.data
    }
    
    // Get project details
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId)
    })
    
    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }
    
    // Get repository files
    let repoFiles: any[] = []
    if (project.repository) {
      repoFiles = await getRepositoryFiles(
        project.repository.owner,
        project.repository.name,
        projectId
      )
    }
    
    // Extract package dependencies
    const packageJsonFile = repoFiles.find(file => 
      file.path.endsWith('package.json') && file.content
    )
    
    const packageDependencies = packageJsonFile 
      ? analyzePackageDependencies(packageJsonFile.content)
      : []
    
    // Analyze file dependencies
    const fileAnalysisResults: FileAnalysisResult[] = []
    
    // Get JS/TS files
    const jstsFiles = repoFiles.filter(file => {
      const ext = file.path.split('.').pop()?.toLowerCase()
      return ['js', 'jsx', 'ts', 'tsx'].includes(ext) && file.content
    })
    
    // Analyze each file
    jstsFiles.forEach(file => {
      fileAnalysisResults.push(
        analyzeFileImports(file.path, file.content)
      )
    })
    
    // Get project structure for file nodes
    const structure = await getOrCreateProjectStructure(projectId)
    
    // Convert file hierarchy to flat list
    const fileNodes: IFileNode[] = []
    const flattenFileHierarchy = (node: IFileNode) => {
      fileNodes.push(node)
      
      if (node.children) {
        node.children.forEach(flattenFileHierarchy)
      }
    }
    
    flattenFileHierarchy(structure.fileHierarchy)
    
    // Resolve relative imports to file paths
    const fileDependencies = resolveRelativeImports(fileAnalysisResults, fileNodes)
    
    // Detect circular dependencies
    const circularDependencies = detectCircularDependencies(fileDependencies)
    
    // Check for version conflicts
    const versionConflicts = checkVersionConflicts(packageDependencies)
    
    // Scan for security vulnerabilities
    const securityVulnerabilities = await scanSecurityVulnerabilities(packageDependencies)
    
    // Create dependency tree
    const dependencyTree: DependencyTree = {
      files: fileDependencies,
      packages: packageDependencies,
      circularDependencies,
      versionConflicts,
      securityVulnerabilities,
      metadata: {
        lastUpdated: new Date(),
        fileCount: fileDependencies.length,
        packageCount: packageDependencies.length,
        totalDependencies: fileDependencies.length + packageDependencies.length
      }
    }
    
    // Cache the analysis
    await cacheDependencyAnalysis(projectId, dependencyTree)
    
    return dependencyTree
  } catch (error) {
    console.error('Error analyzing project dependencies:', error)
    throw error
  }
}

/**
 * Detect circular dependencies in file dependencies
 */
function detectCircularDependencies(dependencies: FileDependency[]): CircularDependency[] {
  const circularDeps: CircularDependency[] = []
  const visited = new Set<string>()
  const path = new Set<string>()
  
  function dfs(file: string, currentPath: string[]): void {
    if (path.has(file)) {
      // Found a circular dependency
      const cycleStart = currentPath.indexOf(file)
      const cycle = currentPath.slice(cycleStart)
      
      circularDeps.push({
        path: cycle,
        type: 'file',
        severity: cycle.length > 3 ? 'high' : cycle.length > 2 ? 'medium' : 'low'
      })
      return
    }
    
    if (visited.has(file)) {
      return
    }
    
    visited.add(file)
    path.add(file)
    
    // Get all files this file depends on
    const deps = dependencies
      .filter(d => d.source === file)
      .map(d => d.target)
    
    // Recursively check dependencies
    deps.forEach(dep => {
      dfs(dep, [...currentPath, file])
    })
    
    path.delete(file)
  }
  
  // Check each file for circular dependencies
  dependencies.forEach(dep => {
    if (!visited.has(dep.source)) {
      dfs(dep.source, [])
    }
  })
  
  return circularDeps
}

/**
 * Check for version conflicts in package dependencies
 */
function checkVersionConflicts(dependencies: PackageDependency[]): VersionConflict[] {
  const conflicts: VersionConflict[] = []
  const versionMap = new Map<string, Set<string>>()
  
  // Group versions by package name
  dependencies.forEach(dep => {
    if (!versionMap.has(dep.name)) {
      versionMap.set(dep.name, new Set())
    }
    versionMap.get(dep.name)?.add(dep.version)
  })
  
  // Check for conflicts
  versionMap.forEach((versions, name) => {
    if (versions.size > 1) {
      const versionArray = Array.from(versions)
      conflicts.push({
        package: name,
        versions: versionArray,
        severity: versionArray.length > 2 ? 'high' : 'medium',
        impact: 'Potential runtime errors and inconsistent behavior'
      })
    }
  })
  
  return conflicts
}

/**
 * Scan package dependencies for security vulnerabilities
 */
async function scanSecurityVulnerabilities(
  dependencies: PackageDependency[]
): Promise<SecurityVulnerability[]> {
  const vulnerabilities: SecurityVulnerability[] = []
  
  // Group dependencies by type
  const prodDeps = dependencies.filter(d => d.type === 'production')
  const devDeps = dependencies.filter(d => d.type === 'development')
  
  // Check production dependencies first
  for (const dep of prodDeps) {
    try {
      // In a real implementation, this would call a security scanning service
      // For now, we'll simulate with some example vulnerabilities
      if (dep.version.includes('beta') || dep.version.includes('alpha')) {
        vulnerabilities.push({
          package: dep.name,
          version: dep.version,
          severity: 'high',
          description: 'Using pre-release version in production',
          fix: `Update to stable version of ${dep.name}`
        })
      }
    } catch (error) {
      console.error(`Error scanning ${dep.name} for vulnerabilities:`, error)
    }
  }
  
  return vulnerabilities
}

/**
 * Cache dependency analysis results
 */
async function cacheDependencyAnalysis(
  projectId: string,
  analysis: DependencyTree
): Promise<void> {
  try {
    const db = (await clientPromise).db()
    
    const cache: DependencyCache = {
      timestamp: new Date(),
      ttl: 5 * 60 * 1000, // 5 minutes
      data: analysis,
      metadata: {
        fileCount: analysis.metadata.fileCount,
        packageCount: analysis.metadata.packageCount,
        circularDependencies: analysis.circularDependencies,
        versionConflicts: analysis.versionConflicts,
        securityVulnerabilities: analysis.securityVulnerabilities
      }
    }
    
    await db.collection('dependencyCache').updateOne(
      { projectId: new ObjectId(projectId) },
      { $set: cache },
      { upsert: true }
    )
  } catch (error) {
    console.error('Error caching dependency analysis:', error)
  }
}

/**
 * Get cached dependency analysis
 */
async function getCachedDependencyAnalysis(
  projectId: string
): Promise<DependencyCache | null> {
  try {
    const db = (await clientPromise).db()
    
    const cache = await db.collection('dependencyCache').findOne<DependencyCache>({
      projectId: new ObjectId(projectId)
    })
    
    if (!cache) {
      return null
    }
    
    // Check if cache is expired
    const now = new Date()
    const cacheAge = now.getTime() - cache.timestamp.getTime()
    
    if (cacheAge > cache.ttl) {
      return null
    }
    
    return cache
  } catch (error) {
    console.error('Error getting cached dependency analysis:', error)
    return null
  }
}

/**
 * Update project structure with dependency information
 */
export async function updateProjectDependencies(
  projectId: string,
  dependencies: DependencyTree
): Promise<void> {
  try {
    const db = (await clientPromise).db()
    
    // Get project structure
    const structure = await getOrCreateProjectStructure(projectId)
    
    // Create a map of file paths to dependencies
    const fileDependencyMap = new Map<string, string[]>()
    dependencies.files.forEach(dep => {
      const deps = fileDependencyMap.get(dep.source) || []
      deps.push(dep.target)
      fileDependencyMap.set(dep.source, deps)
    })
    
    // Update package dependencies
    const packageDeps: Record<string, string> = {}
    dependencies.packages.forEach(dep => {
      packageDeps[dep.name] = dep.version
    })
    
    // Update file nodes with dependencies
    const updateFileDependencies = (node: IFileNode): IFileNode => {
      // Deep clone node to avoid mutation
      const updatedNode: IFileNode = { ...node }
      
      // Add dependencies if this is a file
      if (node.type === 'file' && fileDependencyMap.has(node.path)) {
        updatedNode.dependencies = fileDependencyMap.get(node.path)
      }
      
      // Update children recursively
      if (node.children) {
        updatedNode.children = node.children.map(updateFileDependencies)
      }
      
      return updatedNode
    }
    
    // Update the file hierarchy with dependencies
    const updatedHierarchy = updateFileDependencies(structure.fileHierarchy)
    
    // Update project structure in the database
    await db.collection('projectStructures').updateOne(
      { projectId: new ObjectId(projectId) },
      {
        $set: {
          fileHierarchy: updatedHierarchy,
          dependencies: packageDeps,
          updatedAt: new Date()
        }
      }
    )
    
    console.log(`Updated project dependencies for ${projectId}`)
  } catch (error) {
    console.error('Error updating project dependencies:', error)
    throw error
  }
}

/**
 * Get dependency tree for a project
 */
export async function getProjectDependencyTree(projectId: string): Promise<DependencyTree> {
  try {
    // Check if we need to analyze dependencies
    const db = (await clientPromise).db()
    
    // Get project structure
    const structure = await getOrCreateProjectStructure(projectId)
    
    // Check if dependencies already exist
    const hasDependencies = Object.keys(structure.dependencies || {}).length > 0
    const hasFileDependencies = checkFileHasAnyDependencies(structure.fileHierarchy)
    
    if (hasDependencies && hasFileDependencies) {
      // Extract existing dependencies
      return {
        packages: Object.entries(structure.dependencies || {}).map(([name, version]) => ({
          name,
          version: version as string,
          type: 'production',
          required: true
        })),
        files: extractFileDependenciesFromHierarchy(structure.fileHierarchy),
        circularDependencies: [],
        versionConflicts: [],
        securityVulnerabilities: [],
        metadata: {
          lastUpdated: new Date(),
          fileCount: structure.fileHierarchy.children?.length || 0,
          packageCount: Object.keys(structure.dependencies || {}).length,
          totalDependencies: (structure.fileHierarchy.children?.length || 0) + 
            Object.keys(structure.dependencies || {}).length
        }
      }
    }
    
    // Analyze and update dependencies
    const dependencies = await analyzeProjectDependencies(projectId)
    await updateProjectDependencies(projectId, dependencies)
    
    return dependencies
  } catch (error) {
    console.error('Error getting project dependency tree:', error)
    throw error
  }
}

/**
 * Check if any file in the hierarchy has dependencies
 */
function checkFileHasAnyDependencies(node: IFileNode): boolean {
  if (node.dependencies && node.dependencies.length > 0) {
    return true
  }
  
  if (node.children) {
    for (const child of node.children) {
      if (checkFileHasAnyDependencies(child)) {
        return true
      }
    }
  }
  
  return false
}

/**
 * Extract file dependencies from hierarchy
 */
function extractFileDependenciesFromHierarchy(node: IFileNode): FileDependency[] {
  const dependencies: FileDependency[] = []
  
  // Extract dependencies from this node
  if (node.type === 'file' && node.dependencies) {
    node.dependencies.forEach(target => {
      dependencies.push({
        source: node.path,
        target,
        type: 'import'
      })
    })
  }
  
  // Extract dependencies from children
  if (node.children) {
    node.children.forEach(child => {
      dependencies.push(...extractFileDependenciesFromHierarchy(child))
    })
  }
  
  return dependencies
}

/**
 * Get files that depend on a specific file
 */
export async function getFileDependents(
  projectId: string,
  filePath: string
): Promise<string[]> {
  try {
    const dependencyTree = await getProjectDependencyTree(projectId)
    
    // Find files that depend on the specified file
    return dependencyTree.files
      .filter(dep => dep.target === filePath)
      .map(dep => dep.source)
  } catch (error) {
    console.error('Error getting file dependents:', error)
    throw error
  }
}

/**
 * Get files that a specific file depends on
 */
export async function getFileDependencies(
  projectId: string,
  filePath: string
): Promise<string[]> {
  try {
    const dependencyTree = await getProjectDependencyTree(projectId)
    
    // Find files that the specified file depends on
    return dependencyTree.files
      .filter(dep => dep.source === filePath)
      .map(dep => dep.target)
  } catch (error) {
    console.error('Error getting file dependencies:', error)
    throw error
  }
} 