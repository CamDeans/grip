import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'
import { IProjectStructureData, IFileNode } from '@/lib/models/ProjectStructure'
import { analyzeProject, analyzeAndCreateProjectStructure } from './projectAnalyzerService'
import { enhanceProjectStructure, generateStructurePlan, getOrCreateProjectStructure } from './structureGeneratorService'
import { generateDevelopmentPlan, getOrCreateDevelopmentPlan, DevelopmentPlan } from './planGeneratorService'
import { analyzeProjectDependencies, getProjectDependencyTree, getFileDependencies, getFileDependents } from './dependencyResolverService'
import { storeProjectStructure, getProjectStructure, linkPlanToStructure, storeFileGenerationPlan } from './planStorageService'
import { syncProjectStateFromPlan } from './projectStateService'

/**
 * Project Planning Service - Integrates all Phase 3 components into a unified API
 * This is the main service for the Project Planning Engine
 */

// Define a type that includes the _id field for database records
type ProjectStructureWithId = IProjectStructureData & { _id: ObjectId };

export interface PlanningResult {
  structureId: ObjectId;
  planId?: ObjectId;
  dependencyTree?: {
    fileCount: number;
    packageCount: number;
    packages?: Array<{ name: string; version: string; type: string }>;
    recommendedPackages?: string[];
  };
  structure: ProjectStructureWithId;
  plan?: DevelopmentPlan;
}

/**
 * Derive recommended npm package names from project ideation (technical requirements, key features).
 * Used when repo has no package.json yet so the plan still shows dependencies to install.
 */
function getRecommendedDependenciesFromIdeation(project: { ideation?: { technicalRequirements?: string; keyFeatures?: string } } | null): string[] {
  if (!project?.ideation) return []
  const text = [
    project.ideation.technicalRequirements ?? '',
    project.ideation.keyFeatures ?? ''
  ].join(' ')
  if (!text.trim()) return []
  const knownPackages: Record<string, string> = {
    react: 'react', typescript: 'typescript', vite: 'vite', next: 'next', node: 'node',
    express: 'express', tailwind: 'tailwindcss', 'tailwind css': 'tailwindcss',
    jest: 'jest', testing: '@testing-library/react', eslint: 'eslint', prettier: 'prettier',
    expo: 'expo', 'react native': 'react-native', redux: '@reduxjs/toolkit',
    mongoose: 'mongoose', prisma: 'prisma', graphql: 'graphql',
    axios: 'axios', lodash: 'lodash', 'date-fns': 'date-fns', zod: 'zod'
  }
  const lower = text.toLowerCase()
  const found = new Set<string>()
  for (const [label, pkg] of Object.entries(knownPackages)) {
    if (lower.includes(label)) found.add(pkg)
  }
  const regex = /(?:react|typescript|vite|next\.?js|node\.?js|express|tailwind|jest|eslint|prettier|expo|redux|mongoose|prisma|graphql|axios|lodash|zod|date-fns)/gi
  let m
  while ((m = regex.exec(text)) !== null) {
    found.add(m[0].toLowerCase().replace(/\.?js$/i, ''))
  }
  return Array.from(found)
}

/**
 * Generate a complete project plan
 * This is the main function that orchestrates the entire planning process
 * 
 * 1. Analyze the project
 * 2. Generate project structure
 * 3. Generate development plan
 * 4. Resolve dependencies
 * 5. Store everything in the database
 * 
 * @param projectId The ID of the project to plan
 * @returns The complete planning result
 */
export async function generateProjectPlan(projectId: string): Promise<PlanningResult> {
  try {
    console.log(`Generating complete project plan for: ${projectId}`)
    
    // Step 1 & 2: Analyze project and create structure
    console.log('Step 1 & 2: Analyzing project and creating structure')
    const { structureId, analysis } = await analyzeAndCreateProjectStructure(projectId)
    
    // Get the basic structure
    const structure = await getProjectStructure(projectId)
    
    if (!structure) {
      throw new Error(`Failed to create project structure for: ${projectId}`)
    }
    
    // Step 3: Enhance structure with feature-specific details
    console.log('Step 3: Enhancing project structure with feature details')
    const enhancedStructure = await enhanceProjectStructure(projectId, structure)
    
    // Step 4: Generate development plan
    console.log('Step 4: Generating development plan')
    const plan = await generateDevelopmentPlan(projectId)
    
    // Step 5: Link plan to structure
    console.log('Step 5: Linking plan to structure')
    await linkPlanToStructure(projectId, plan)
    
    // Step 6: Analyze dependencies
    console.log('Step 6: Analyzing dependencies')
    const dependencies = await analyzeProjectDependencies(projectId)
    
    // Step 7: Sync project state from plan so chat and UI show same phases/steps
    console.log('Step 7: Syncing project state from plan')
    try {
      await syncProjectStateFromPlan(projectId, plan)
    } catch (syncErr) {
      console.warn('Project state sync from plan failed (non-fatal):', syncErr)
    }
    
    const client = await clientPromise
    const db = client.db()
    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) })
    const recommendedPackages = getRecommendedDependenciesFromIdeation(project as { ideation?: { technicalRequirements?: string; keyFeatures?: string } } | null)
    
    // Create result object (match GET shape: packages + recommendedPackages for PlanGenerator Overview)
    const result: PlanningResult = {
      structureId,
      planId: plan._id,
      dependencyTree: {
        fileCount: dependencies.files.length,
        packageCount: dependencies.packages.length,
        packages: dependencies.packages.map((p: { name: string; version: string; type: string }) => ({ name: p.name, version: p.version, type: p.type })),
        recommendedPackages
      },
      structure: {
        ...enhancedStructure,
        _id: structure._id
      },
      plan
    }
    
    console.log(`Project plan generated successfully for: ${projectId}`)
    
    return result
  } catch (error) {
    console.error(`Error generating project plan: ${error}`)
    throw error
  }
}

/**
 * Get the complete project plan
 * 
 * @param projectId The ID of the project
 * @returns The planning result or null if not found
 */
export async function getProjectPlan(projectId: string): Promise<PlanningResult | null> {
  try {
    console.log(`Getting project plan for: ${projectId}`)

    const structure = await getProjectStructure(projectId)
    if (!structure) return null

    const plan = await getOrCreateDevelopmentPlan(projectId)
    const dependencies = await getProjectDependencyTree(projectId)

    const client = await clientPromise
    const db = client.db()
    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) })
    const recommendedPackages = getRecommendedDependenciesFromIdeation(project as { ideation?: { technicalRequirements?: string; keyFeatures?: string } } | null)

    return {
      structureId: structure._id,
      planId: plan._id,
      dependencyTree: {
        fileCount: dependencies.files.length,
        packageCount: dependencies.packages.length,
        packages: dependencies.packages.map((p: { name: string; version: string; type: string }) => ({ name: p.name, version: p.version, type: p.type })),
        recommendedPackages
      },
      structure,
      plan
    }
  } catch (error) {
    console.error(`Error getting project plan: ${error}`)
    throw error
  }
}

/**
 * Generate a structure plan for a file
 * This prepares a file for code generation by specifying
 * all necessary metadata and dependencies
 * 
 * @param projectId The ID of the project
 * @param filePath The path of the file
 * @param templateName The name of the template to use
 * @param description A description of the file's purpose
 * @returns True if successful, false otherwise 
 */
export async function planFileGeneration(
  projectId: string,
  filePath: string,
  templateName: string,
  description: string
): Promise<boolean> {
  try {
    console.log(`Planning file generation for ${filePath} in project: ${projectId}`)
    
    // Get file dependencies
    const dependencies = await getFileDependencies(projectId, filePath)
    
    // Get dependents (files that depend on this one)
    const dependents = await getFileDependents(projectId, filePath)
    
    // Calculate priority based on dependencies and dependents
    // Files with many dependents should be generated earlier
    const priority = dependents.length * 2 - dependencies.length
    
    // Create generation metadata
    const generationMetadata = {
      template: templateName,
      variables: {}, // Will be populated during code generation
      priority: Math.max(0, priority),
      dependencies,
      description
    }
    
    // Store in project structure
    await storeFileGenerationPlan(projectId, filePath, generationMetadata)
    
    return true
  } catch (error) {
    console.error(`Error planning file generation: ${error}`)
    return false
  }
}

/**
 * Default template ID by file extension (for files without generationMetadata)
 */
function defaultTemplateForPath(pathOrName: string): string {
  const name = pathOrName.split('/').pop() || ''
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (name === 'page.tsx') return 'nextjs-page'
  if (ext === 'tsx' || ext === 'jsx') return 'react-component'
  if (ext === 'ts' || ext === 'js') return 'ts-utility'
  if (ext === 'md' || ext === 'mdx') return 'ts-utility'
  return 'ts-utility'
}

/**
 * Find and return all files in a project that need to be generated.
 * - Collects nodes with type === 'file' (with or without generationMetadata).
 * - If the structure has no file nodes (analyzer only creates directories), derives
 *   synthetic file entries from directories so the Files tab is never empty.
 *
 * @param projectId The ID of the project
 * @returns Array of file nodes with generation metadata
 */
export async function getFilesToGenerate(projectId: string): Promise<Array<IFileNode & { generationMetadata: any }>> {
  try {
    console.log(`Getting files to generate for project: ${projectId}`)
    
    const structure = await getProjectStructure(projectId)
    if (!structure) {
      throw new Error(`Project structure not found: ${projectId}`)
    }
    
    const filesToGenerate: Array<IFileNode & { generationMetadata: any }> = []
    
    const collectFiles = (node: any) => {
      if (node.type === 'file') {
        const meta = node.generationMetadata || {
          template: defaultTemplateForPath(node.path || node.name || ''),
          variables: {},
          priority: 0,
          dependencies: [],
          description: node.description || 'Generated from plan'
        }
        filesToGenerate.push({ ...node, generationMetadata: meta })
      }
      if (node.children) {
        for (const child of node.children) collectFiles(child)
      }
    }
    
    collectFiles(structure.fileHierarchy)
    
    // If the plan has no explicit file nodes (analyzer only creates directories),
    // derive one file per non-root directory so the Files tab has entries.
    if (filesToGenerate.length === 0 && structure.fileHierarchy) {
      const addSyntheticFromDirs = (node: any, depth: number) => {
        if (node.type !== 'directory' || !node.path) return
        const path = (node.path as string).replace(/^\/+/, '') || ''
        const name = node.name || path.split('/').pop() || ''
        if (!path || path === '/') return
        const isAppOrPages = /(^|\/)(app|pages)(\/|$)/.test(path)
        const fileName = isAppOrPages ? 'page.tsx' : 'index.tsx'
        const filePath = path.includes(fileName) ? path : `${path}/${fileName}`
        const meta = {
          template: isAppOrPages ? 'nextjs-page' : defaultTemplateForPath(filePath),
          variables: {},
          priority: depth,
          dependencies: [],
          description: node.description || (isAppOrPages ? 'Page component' : 'Entry file')
        }
        filesToGenerate.push({
          type: 'file',
          name: fileName,
          path: filePath,
          description: meta.description,
          generationMetadata: meta
        } as IFileNode & { generationMetadata: any })
        if (node.children) {
          for (const child of node.children) addSyntheticFromDirs(child, depth + 1)
        }
      }
      const root = structure.fileHierarchy
      if (root?.children) {
        for (const child of root.children) addSyntheticFromDirs(child, 0)
      }
    }
    
    filesToGenerate.sort((a, b) =>
      (b.generationMetadata?.priority ?? 0) - (a.generationMetadata?.priority ?? 0)
    )
    
    return filesToGenerate
  } catch (error) {
    console.error(`Error getting files to generate: ${error}`)
    throw error
  }
} 