import { ObjectId } from 'mongodb'
import { clientPromise } from '@/lib/mongodb'
import { IProjectStructureData } from '@/lib/models/ProjectStructure'
import { DevelopmentPlan, Phase } from './planGeneratorService'

/**
 * Plan Storage Service - Implements storage of plans in projectStructures collection
 * Part of Phase 3, Step 5 of the G.R.I.P. AI Assistant Enhancement Plan
 */

/**
 * Interface for plan version history
 */
interface PlanVersion {
  version: number;
  plan: DevelopmentPlan;
  timestamp: Date;
  changes: string;
  metadata: {
    author?: string;
    reason?: string;
    impact?: string;
  };
}

/**
 * Interface for plan metadata
 */
interface PlanMetadata {
  lastUpdated: Date;
  version: number;
  status: 'draft' | 'active' | 'completed' | 'archived';
  tags: string[];
  dependencies: string[];
  metrics: {
    taskCount: number;
    completedTasks: number;
    totalDuration: number;
    estimatedCost?: number;
  };
  history: PlanVersion[];
}

/**
 * Store a project structure in the database
 * @param structure The project structure to store
 * @returns The ID of the stored structure
 */
export async function storeProjectStructure(
  structure: IProjectStructureData
): Promise<ObjectId> {
  try {
    console.log(`Storing project structure for project: ${structure.projectId}`)
    const db = (await clientPromise).db()
    
    // Check if structure already exists
    const existingStructure = await db.collection('projectStructures').findOne({
      projectId: structure.projectId
    })
    
    if (existingStructure) {
      // Create new version in history
      const history = existingStructure.history || []
      history.push({
        version: existingStructure.version + 1,
        structure: existingStructure,
        timestamp: new Date(),
        changes: 'Structure updated',
        metadata: {
          reason: 'Regular update'
        }
      })
      
      // Update existing structure
      await db.collection('projectStructures').updateOne(
        { _id: existingStructure._id },
        { 
          $set: { 
            ...structure, 
            updatedAt: new Date(),
            version: existingStructure.version + 1,
            history
          } 
        }
      )
      
      return existingStructure._id
    } else {
      // Create new structure with initial version
      const result = await db.collection('projectStructures').insertOne({
        ...structure,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        history: [{
          version: 1,
          structure: structure,
          timestamp: new Date(),
          changes: 'Initial structure',
          metadata: {
            reason: 'Initial creation'
          }
        }]
      })
      
      return result.insertedId
    }
  } catch (error) {
    console.error('Error storing project structure:', error)
    throw error
  }
}

/**
 * Get a project structure by project ID
 * @param projectId The ID of the project
 * @returns The project structure or null if not found
 */
export async function getProjectStructure(
  projectId: string
): Promise<(IProjectStructureData & { _id: ObjectId }) | null> {
  try {
    console.log(`Getting project structure for project: ${projectId}`)
    const db = (await clientPromise).db()
    
    const structure = await db.collection<IProjectStructureData & { _id: ObjectId }>('projectStructures').findOne({
      projectId: new ObjectId(projectId)
    })
    
    return structure
  } catch (error) {
    console.error('Error getting project structure:', error)
    throw error
  }
}

/**
 * Get plan metadata for a project
 * @param projectId The ID of the project
 * @returns The plan metadata or null if not found
 */
export async function getPlanMetadata(
  projectId: string
): Promise<PlanMetadata | null> {
  try {
    console.log(`Getting plan metadata for project: ${projectId}`)
    const db = (await clientPromise).db()
    
    const metadata = await db.collection<PlanMetadata>('planMetadata').findOne({
      projectId: new ObjectId(projectId)
    })
    
    return metadata
  } catch (error) {
    console.error('Error getting plan metadata:', error)
    throw error
  }
}

/**
 * Update plan metadata
 * @param projectId The ID of the project
 * @param metadata The updated metadata
 * @returns True if successful
 */
export async function updatePlanMetadata(
  projectId: string,
  metadata: Partial<PlanMetadata>
): Promise<boolean> {
  try {
    console.log(`Updating plan metadata for project: ${projectId}`)
    const db = (await clientPromise).db()
    
    const result = await db.collection('planMetadata').updateOne(
      { projectId: new ObjectId(projectId) },
      { 
        $set: { 
          ...metadata,
          lastUpdated: new Date()
        } 
      },
      { upsert: true }
    )
    
    return result.modifiedCount > 0 || result.upsertedCount > 0
  } catch (error) {
    console.error('Error updating plan metadata:', error)
    return false
  }
}

/**
 * Store file generation plan in project structure
 * This links the file structure to planned code generation
 * @param projectId The ID of the project
 * @param filePath The path of the file in the structure
 * @param generationMetadata Metadata about the planned generation
 * @returns The ID of the updated structure
 */
export async function storeFileGenerationPlan(
  projectId: string,
  filePath: string,
  generationMetadata: {
    template: string;
    variables: Record<string, any>;
    priority: number;
    dependencies: string[];
    description: string;
  }
): Promise<ObjectId> {
  try {
    console.log(`Storing file generation plan for ${filePath} in project: ${projectId}`)
    const db = (await clientPromise).db()
    
    // Get project structure
    const structure = await getProjectStructure(projectId)
    
    if (!structure) {
      throw new Error(`Project structure not found: ${projectId}`)
    }
    
    // Find the file node in the structure
    const findFileNode = (node: any, path: string): any => {
      if (node.path === path) {
        return node;
      }
      
      if (node.children) {
        for (const child of node.children) {
          const found = findFileNode(child, path);
          if (found) return found;
        }
      }
      
      return null;
    }
    
    const fileNode = findFileNode(structure.fileHierarchy, filePath)
    
    if (!fileNode) {
      throw new Error(`File node not found: ${filePath}`)
    }
    
    // Update the file node with generation metadata
    fileNode.generationMetadata = generationMetadata
    
    // Update structure in database
    await db.collection('projectStructures').updateOne(
      { projectId: new ObjectId(projectId) },
      { 
        $set: { 
          fileHierarchy: structure.fileHierarchy,
          updatedAt: new Date()
        } 
      }
    )
    
    return structure._id
  } catch (error) {
    console.error('Error storing file generation plan:', error)
    throw error
  }
}

/**
 * Link a development plan to a project structure
 * @param projectId The ID of the project
 * @param plan The development plan to link
 * @returns True if successful
 */
export async function linkPlanToStructure(
  projectId: string,
  plan: DevelopmentPlan
): Promise<boolean> {
  try {
    console.log(`Linking plan to structure for project: ${projectId}`)
    const db = (await clientPromise).db()
    
    // Update project structure with plan reference
    await db.collection('projectStructures').updateOne(
      { projectId: new ObjectId(projectId) },
      { 
        $set: { 
          planId: plan._id,
          updatedAt: new Date()
        } 
      }
    )
    
    // Update plan metadata
    const metadata: PlanMetadata = {
      lastUpdated: new Date(),
      version: 1,
      status: plan.status,
      tags: [],
      dependencies: [],
      metrics: {
        taskCount: plan.phases.reduce((acc, phase) => acc + phase.tasks.length, 0),
        completedTasks: plan.phases.reduce((acc, phase) => 
          acc + phase.tasks.filter(t => t.status === 'completed').length, 0),
        totalDuration: plan.phases.reduce((acc, phase) => 
          acc + phase.tasks.reduce((taskAcc, task) => 
            taskAcc + (task.metrics?.estimatedHours || 0), 0), 0),
        estimatedCost: 0 // To be calculated based on resource requirements
      },
      history: [{
        version: 1,
        plan,
        timestamp: new Date(),
        changes: 'Initial plan',
        metadata: {
          reason: 'Initial creation'
        }
      }]
    }
    
    await updatePlanMetadata(projectId, metadata)
    
    return true
  } catch (error) {
    console.error('Error linking plan to structure:', error)
    return false
  }
}

/**
 * Search plans by criteria
 * @param criteria Search criteria
 * @returns Array of matching plans
 */
export async function searchPlans(criteria: {
  tags?: string[];
  status?: string;
  dateRange?: { start: Date; end: Date };
  searchTerm?: string;
}): Promise<DevelopmentPlan[]> {
  try {
    console.log('Searching plans with criteria:', criteria)
    const db = (await clientPromise).db()
    
    const query: any = {}
    
    if (criteria.tags?.length) {
      query['metadata.tags'] = { $in: criteria.tags }
    }
    
    if (criteria.status) {
      query['metadata.status'] = criteria.status
    }
    
    if (criteria.dateRange) {
      query['metadata.lastUpdated'] = {
        $gte: criteria.dateRange.start,
        $lte: criteria.dateRange.end
      }
    }
    
    if (criteria.searchTerm) {
      query.$or = [
        { name: { $regex: criteria.searchTerm, $options: 'i' } },
        { description: { $regex: criteria.searchTerm, $options: 'i' } }
      ]
    }
    
    const plans = await db.collection<DevelopmentPlan>('developmentPlans').find(query).toArray()
    
    return plans
  } catch (error) {
    console.error('Error searching plans:', error)
    return []
  }
}

/**
 * Backup a plan
 * @param projectId The ID of the project
 * @returns True if successful
 */
export async function backupPlan(projectId: string): Promise<boolean> {
  try {
    console.log(`Backing up plan for project: ${projectId}`)
    const db = (await clientPromise).db()
    
    // Get current plan and metadata
    const plan = await db.collection('developmentPlans').findOne({
      projectId: new ObjectId(projectId)
    })
    
    const metadata = await getPlanMetadata(projectId)
    
    if (!plan || !metadata) {
      throw new Error('Plan or metadata not found')
    }
    
    // Create backup
    await db.collection('planBackups').insertOne({
      projectId: new ObjectId(projectId),
      plan,
      metadata,
      backupDate: new Date(),
      version: metadata.version
    })
    
    return true
  } catch (error) {
    console.error('Error backing up plan:', error)
    return false
  }
}

/**
 * Restore a plan from backup
 * @param projectId The ID of the project
 * @param backupId The ID of the backup to restore
 * @returns True if successful
 */
export async function restorePlan(
  projectId: string,
  backupId: string
): Promise<boolean> {
  try {
    console.log(`Restoring plan for project: ${projectId} from backup: ${backupId}`)
    const db = (await clientPromise).db()
    
    // Get backup
    const backup = await db.collection('planBackups').findOne({
      _id: new ObjectId(backupId),
      projectId: new ObjectId(projectId)
    })
    
    if (!backup) {
      throw new Error('Backup not found')
    }
    
    // Restore plan
    await db.collection('developmentPlans').updateOne(
      { projectId: new ObjectId(projectId) },
      { $set: backup.plan }
    )
    
    // Restore metadata
    await db.collection('planMetadata').updateOne(
      { projectId: new ObjectId(projectId) },
      { $set: backup.metadata }
    )
    
    return true
  } catch (error) {
    console.error('Error restoring plan:', error)
    return false
  }
}

/**
 * Get all project structures
 * @returns Array of project structures
 */
export async function getAllProjectStructures(): Promise<(IProjectStructureData & { _id: ObjectId })[]> {
  try {
    console.log('Getting all project structures')
    const db = (await clientPromise).db()
    
    const structures = await db.collection<IProjectStructureData & { _id: ObjectId }>('projectStructures')
      .find({})
      .sort({ updatedAt: -1 })
      .toArray()
    
    return structures
  } catch (error) {
    console.error('Error getting all project structures:', error)
    throw error
  }
}

/**
 * Delete a project structure
 * @param projectId The ID of the project
 * @returns True if successful, false otherwise
 */
export async function deleteProjectStructure(projectId: string): Promise<boolean> {
  try {
    console.log(`Deleting project structure: ${projectId}`)
    const db = (await clientPromise).db()
    
    const result = await db.collection('projectStructures').deleteOne({
      projectId: new ObjectId(projectId)
    })
    
    return result.deletedCount > 0
  } catch (error) {
    console.error('Error deleting project structure:', error)
    throw error
  }
} 