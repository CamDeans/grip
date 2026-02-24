import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'
import { IProjectStructureData, IFileNode } from '@/lib/models/ProjectStructure'
import { analyzeProject, analyzeAndCreateProjectStructure } from './projectAnalyzerService'
import { enhanceProjectStructure, generateStructurePlan, getOrCreateProjectStructure } from './structureGeneratorService'
import { generateDevelopmentPlan, getOrCreateDevelopmentPlan, getDevelopmentPlan, deriveSuggestedFilesFromPlan, DevelopmentPlan } from './planGeneratorService'
import { analyzeProjectDependencies, getProjectDependencyTree, getFileDependencies, getFileDependents } from './dependencyResolverService'
import { storeProjectStructure, getProjectStructure, linkPlanToStructure, storeFileGenerationPlan } from './planStorageService'
import { syncProjectStateFromPlan } from './projectStateService'
import { enhanceIdeationForBuild } from './ideationEnhancementService'
import { buildTechnicalPromptFromEnhancedRequirements } from '@/lib/sandbox/ideationToTechnicalPrompt'
import { analyzeRepositoryStructureWithTreeSitter } from '@/lib/treeSitter/treeSitterAnalysis'

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
 * 0. (Mandatory) Enhance user ideation into build requirements so plan and build get best input.
 * 1. Analyze the project
 * 2. Generate project structure
 * 3. Generate development plan
 * 4. Resolve dependencies
 * 5. Store everything in the database
 * 
 * @param projectId The ID of the project to plan
 * @returns The complete planning result
 */
export type GenerateProjectPlanOptions = { tokenBudgetHint?: string; tier?: string }

export async function generateProjectPlan(projectId: string, options?: GenerateProjectPlanOptions): Promise<PlanningResult> {
  try {
    console.log(`Generating complete project plan for: ${projectId}`)

    const client = await clientPromise
    const db = client.db()
    let enhancementTokens = 0

    // Step 0: Enhance ideation into build requirements (mandatory so AI gets best version; reduces token waste)
    const projectForIdeation = await db.collection('projects').findOne(
      { _id: new ObjectId(projectId) },
      { projection: { ideation: 1 } }
    ) as { ideation?: { goals?: string; targetAudience?: string; keyFeatures?: string; technicalRequirements?: string } } | null
    if (projectForIdeation?.ideation) {
      const enhancedResult = await enhanceIdeationForBuild(projectForIdeation.ideation)
      if (enhancedResult) {
        enhancementTokens = enhancedResult.totalTokens
        await db.collection('projects').updateOne(
          { _id: new ObjectId(projectId) },
          {
            $set: {
              enhancedBuildRequirements: enhancedResult.enhanced,
              enhancedBuildRequirementsAt: new Date(),
              updatedAt: new Date()
            }
          }
        )
        console.log('Step 0: Ideation enhanced into build requirements')
      }
    }

    // Step 0b: Align tree-link analysis with enhanced build requirements (before build)
    // If project has a repo and we have enhanced build requirements, re-run tree-sitter with enhanced prompt and update analysis
    let treeAnalysisTokens = 0
    const projectForTree = await db.collection('projects').findOne(
      { _id: new ObjectId(projectId) },
      { projection: { repository: 1, enhancedBuildRequirements: 1 } }
    ) as { repository?: { owner: string; name: string }; enhancedBuildRequirements?: { fullPromptText: string; [k: string]: string } } | null
    if (projectForTree?.repository && projectForTree?.enhancedBuildRequirements) {
      try {
        const technicalPrompt = buildTechnicalPromptFromEnhancedRequirements(projectForTree.enhancedBuildRequirements)
        if (technicalPrompt) {
          const treeResult = await analyzeRepositoryStructureWithTreeSitter(
            projectForTree.repository.owner,
            projectForTree.repository.name,
            projectId,
            { technicalPrompt, tier: options?.tier }
          )
          treeAnalysisTokens = treeResult?.totalTokens ?? 0
          const { totalTokens: _t, ...analysisForDb } = treeResult
          await db.collection('analyses').updateOne(
            { projectId: new ObjectId(projectId) },
            { $set: { repositoryAnalysis: analysisForDb, updatedAt: new Date() } }
          )
          console.log('Step 0b: Tree-link analysis re-run with enhanced build requirements')
        }
      } catch (treeErr) {
        console.warn('Tree-link analysis alignment failed (non-fatal):', treeErr)
      }
    }

    // Step 1 & 2: Analyze project and create structure
    console.log('Step 1 & 2: Analyzing project and creating structure')
    const { structureId, analysis } = await analyzeAndCreateProjectStructure(projectId)
    
    // Get the basic structure
    const structure = await getProjectStructure(projectId)
    
    if (!structure) {
      throw new Error(`Failed to create project structure for: ${projectId}`)
    }
    
    console.log('Step 3: Enhancing project structure with feature details')
    const { structure: enhancedStructure, totalTokens: structureTokens } = await enhanceProjectStructure(projectId, structure)

    console.log('Step 4: Generating development plan')
    const { plan, totalTokens: planTokens } = await generateDevelopmentPlan(projectId, { tokenBudgetHint: options?.tokenBudgetHint, tier: options?.tier })
    const totalTokens = enhancementTokens + treeAnalysisTokens + structureTokens + planTokens
    
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
    
    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) })
    const recommendedPackages = getRecommendedDependenciesFromIdeation(project as { ideation?: { technicalRequirements?: string; keyFeatures?: string } } | null)
    
    // Create result object (match GET shape: packages + recommendedPackages for PlanGenerator Overview)
    const result: PlanningResult & { totalTokens: number } = {
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
      plan,
      totalTokens
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
/** Mandatory high-level files so the user can run preview in StackBlitz upon completion. GRIP automation always includes these when missing. */
const MANDATORY_STACKBLITZ_FILES: Array<{ path: string; description: string }> = [
  { path: 'package.json', description: 'Dependencies and scripts for npm/StackBlitz preview' },
  { path: 'tsconfig.json', description: 'TypeScript config for build and preview' },
  { path: '.env.example', description: 'Env placeholders for StackBlitz/local run; copy from Dashboard → Settings' },
  { path: 'README.md', description: 'Project-specific README: project name, description, getting started, tech stack' },
  { path: 'src/index.tsx', description: 'Entry point for app preview' },
  { path: 'app/globals.css', description: 'Global CSS for Tailwind and base styles' }
]

function defaultTemplateForPath(pathOrName: string): string {
  const normalized = pathOrName.replace(/^\/+/, '').replace(/\\/g, '/')
  const name = normalized.split('/').pop() || ''
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (name === 'package.json') return 'package-json'
  if (name === 'tsconfig.json') return 'tsconfig-json'
  if (name === '.env.example') return 'env-example'
  if (name === 'README.md') return 'readme-md'
  if (name === 'index.tsx' && normalized.includes('src')) return 'index-tsx'
  if (name === 'globals.css' || (name === 'globals.css' && normalized.includes('app'))) return 'globals-css'
  if (name === 'page.tsx') return 'nextjs-page'
  // Next.js App Router API routes (app/api/**/route.ts or route.js)
  if ((name === 'route.ts' || name === 'route.js') && /^app\/api\//.test(normalized)) return 'nextjs-app-api-route'
  if (ext === 'tsx' || ext === 'jsx') return 'react-component'
  if (ext === 'ts' || ext === 'js') return 'ts-utility'
  if (ext === 'css') return 'globals-css'
  if (ext === 'md' || ext === 'mdx') return 'ts-utility'
  return 'ts-utility'
}

/** Ensure package.json, tsconfig.json, and entry (src/index.tsx) are in the list so the user can preview in StackBlitz. */
function ensureMandatoryStackBlitzFiles(
  list: Array<IFileNode & { generationMetadata: any }>
): Array<IFileNode & { generationMetadata: any }> {
  const paths = new Set(list.map((f) => (f.path || '').replace(/^\/+/, '')))
  const toAdd: Array<IFileNode & { generationMetadata: any }> = []
  for (const { path, description } of MANDATORY_STACKBLITZ_FILES) {
    const normalized = path.replace(/^\/+/, '')
    if (paths.has(normalized)) continue
    const name = normalized.includes('/') ? normalized.split('/').pop()! : normalized
    toAdd.push({
      type: 'file',
      name,
      path: normalized,
      description,
      generationMetadata: {
        template: defaultTemplateForPath(normalized),
        variables: {},
        priority: 999,
        dependencies: [],
        description
      }
    } as IFileNode & { generationMetadata: any })
    paths.add(normalized)
  }
  if (toAdd.length > 0) {
    console.log(`Adding ${toAdd.length} mandatory StackBlitz file(s): ${toAdd.map((f) => f.path).join(', ')}`)
    return [...toAdd, ...list]
  }
  return list
}

/**
 * Find and return all files in a project that need to be generated.
 * - Prefers the plan's full file list (suggestedFiles) when present so the complete build
 *   is generated in one run instead of only structure-derived files (e.g. the "3 files").
 * - Otherwise collects nodes with type === 'file' from structure, or derives synthetic
 *   file entries from directories so the Files tab is never empty.
 *
 * @param projectId The ID of the project
 * @returns Array of file nodes with generation metadata
 */
export async function getFilesToGenerate(projectId: string): Promise<Array<IFileNode & { generationMetadata: any }>> {
  try {
    console.log(`Getting files to generate for project: ${projectId}`)

    let plan = await getDevelopmentPlan(projectId)
    // When plan has no suggestedFiles (e.g. existing plans or AI didn't return "files"), derive from phases/tasks once and store
    if (plan?.phases?.length && !plan.suggestedFiles?.length) {
      const derived = await deriveSuggestedFilesFromPlan(projectId)
      if (derived.length > 0) {
        plan = await getDevelopmentPlan(projectId)
      }
    }
    if (plan?.suggestedFiles?.length) {
      const filesToGenerate: Array<IFileNode & { generationMetadata: any }> = plan.suggestedFiles.map((f, idx) => {
        const path = f.path.replace(/^\/+/, '').replace(/\\/g, '/')
        const name = path.includes('/') ? path.split('/').pop()! : path
        // App Router API routes (app/api/**/route.ts) use nextjs-app-api-route; pages under app/pages use nextjs-page
        const isAppApiRoute = /^app\/api\/.+\/route\.(ts|js)$/.test(path)
        const isAppOrPages = !isAppApiRoute && /(^|\/)(app|pages)(\/|$)/.test(path)
        return {
          type: 'file' as const,
          name,
          path,
          description: f.description || `From plan phase ${f.phaseId || '—'}`,
          generationMetadata: {
            template: isAppApiRoute ? 'nextjs-app-api-route' : (isAppOrPages ? 'nextjs-page' : defaultTemplateForPath(path)),
            variables: {},
            priority: plan.suggestedFiles!.length - idx,
            dependencies: [],
            description: f.description || `From plan phase ${f.phaseId || '—'}`,
            phaseId: f.phaseId,
            taskId: f.taskId
          }
        }
      })
      filesToGenerate.sort((a, b) => (b.generationMetadata.priority ?? 0) - (a.generationMetadata.priority ?? 0))
      console.log(`Using plan suggestedFiles (${filesToGenerate.length} files) for full build in one run`)
      let result = ensureMandatoryStackBlitzFiles(filesToGenerate)
      if (result.length < MANDATORY_STACKBLITZ_FILES.length) {
        console.warn(`getFilesToGenerate: plan had ${result.length} files; re-merged mandatory to ensure full set`)
        result = ensureMandatoryStackBlitzFiles(result)
      }
      return result
    }

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
    let result = ensureMandatoryStackBlitzFiles(filesToGenerate)
    // Safeguard: never return fewer than mandatory files so we never generate only one file (e.g. just globals.css)
    if (result.length < MANDATORY_STACKBLITZ_FILES.length) {
      console.warn(`getFilesToGenerate: list had ${result.length} files; re-merged mandatory to ensure full set`)
      result = ensureMandatoryStackBlitzFiles(result)
    }
    return result
  } catch (error) {
    console.error(`Error getting files to generate: ${error}`)
    throw error
  }
} 