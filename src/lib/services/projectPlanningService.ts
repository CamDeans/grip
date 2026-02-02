import { ObjectId } from 'mongodb'
import { IProjectStructureData, IFileNode } from '@/lib/models/ProjectStructure'
import { analyzeProject, analyzeAndCreateProjectStructure } from './projectAnalyzerService'
import { enhanceProjectStructure, generateStructurePlan, getOrCreateProjectStructure } from './structureGeneratorService'
import { generateDevelopmentPlan, getOrCreateDevelopmentPlan, DevelopmentPlan } from './planGeneratorService'
import { analyzeProjectDependencies, getProjectDependencyTree, getFileDependencies, getFileDependents } from './dependencyResolverService'
import { storeProjectStructure, getProjectStructure, linkPlanToStructure, storeFileGenerationPlan } from './planStorageService'

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
  };
  structure: ProjectStructureWithId;
  plan?: DevelopmentPlan;
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
    
    // Create result object
    const result: PlanningResult = {
      structureId,
      planId: plan._id,
      dependencyTree: {
        fileCount: dependencies.files.length,
        packageCount: dependencies.packages.length
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
    
    // Get project structure
    const structure = await getProjectStructure(projectId)
    
    if (!structure) {
      return null
    }
    
    // Get development plan
    const plan = await getOrCreateDevelopmentPlan(projectId)
    
    // Get dependencies
    const dependencies = await getProjectDependencyTree(projectId)
    
    return {
      structureId: structure._id,
      planId: plan._id,
      dependencyTree: {
        fileCount: dependencies.files.length,
        packageCount: dependencies.packages.length
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
 * Find and return all files in a project that need to be generated
 * These are files that have generation metadata
 * 
 * @param projectId The ID of the project
 * @returns Array of file nodes with generation metadata
 */
export async function getFilesToGenerate(projectId: string): Promise<Array<IFileNode & { generationMetadata: any }>> {
  try {
    console.log(`Getting files to generate for project: ${projectId}`)
    
    // Get project structure
    const structure = await getProjectStructure(projectId)
    
    if (!structure) {
      throw new Error(`Project structure not found: ${projectId}`)
    }
    
    // Find all files with generation metadata
    const filesToGenerate: Array<IFileNode & { generationMetadata: any }> = []
    
    const findFilesWithMetadata = (node: any) => {
      if (node.type === 'file' && node.generationMetadata) {
        filesToGenerate.push(node)
      }
      
      if (node.children) {
        for (const child of node.children) {
          findFilesWithMetadata(child)
        }
      }
    }
    
    findFilesWithMetadata(structure.fileHierarchy)
    
    // Sort by priority
    filesToGenerate.sort((a, b) => 
      (b.generationMetadata.priority || 0) - (a.generationMetadata.priority || 0)
    )
    
    return filesToGenerate
  } catch (error) {
    console.error(`Error getting files to generate: ${error}`)
    throw error
  }
} 