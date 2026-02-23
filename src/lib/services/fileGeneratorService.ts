import { ObjectId } from 'mongodb'
import { clientPromise } from '@/lib/mongodb'
import { ProjectFile, IProjectFile } from '@/lib/models/ProjectFile'
import { IProjectStructureData, IFileNode } from '@/lib/models/ProjectStructure'
import { getProjectStructure } from '@/lib/services/planStorageService'
import { 
  ITemplate, 
  ITemplateVariables, 
  getTemplateById, 
  renderTemplate, 
  generateFileName,
  generateTemplateVariables,
  loadBuiltInTemplates,
  loadCustomTemplates
} from '@/lib/services/templateEngineService'
import crypto from 'crypto'
import { connectToDatabase } from '@/lib/mongodb'
import { getFileDependencies } from '@/lib/services/dependencyResolverService'

/**
 * File Generator Service - Creates service to generate code based on templates and context
 * Part of Phase 4, Step 2 of the G.R.I.P. AI Assistant Enhancement Plan
 */

/**
 * Interface for file generation request
 */
/** Optional context from build phases so generated content aligns with current phase steps */
export interface PhaseContext {
  currentPhase: string;
  stepTitles: string[];
}

export interface FileGenerationRequest {
  projectId: string;
  filePath: string;
  filename?: string;
  templateId: string;
  variables?: ITemplateVariables;
  description?: string;
  /** When set, template variables and descriptions align with this phase and its steps */
  phaseContext?: PhaseContext;
  /** Inferred from repo + analysis; used for template choice and AI variable generation */
  framework?: string;
  /** Repo type from analysis (e.g. web_js, full_stack_js); used in AI context */
  repoCategory?: string;
  /** Primary languages from tree-sitter analysis (identity.primary_languages); used in AI context */
  primaryLanguages?: string[];
  /** Language extension counts from tree-sitter (mainLanguages); used in AI context */
  mainLanguages?: Record<string, number>;
}

/**
 * Interface for file generation result
 */
export interface FileGenerationResult {
  fileId: string;
  projectId: string;
  path: string;
  filename: string;
  content: string;
  size: number;
  language: string;
  success: boolean;
  error?: string;
  /** Tokens used by AI (e.g. generateTemplateVariables) for this file */
  totalTokens?: number;
}

/**
 * GRIP mandatory rule: no blank or placeholder files so StackBlitz preview runs.
 * Returns true if content is empty, only whitespace, only comments, or a bare empty export.
 * Allows minimal-but-valid content (e.g. CSS with :root/body, or one import + one real export).
 */
function isPlaceholderOrEmpty(content: string, filename: string): boolean {
  const trimmed = (content || '').trim()
  if (trimmed.length < 10) return true
  if (/^export\s*\{\}\s*;?\s*$/m.test(trimmed)) return true
  if (/^\/\*\*?[\s\S]*\*\/\s*$/m.test(trimmed)) return true
  if (/^\/\/\s*TODO[\s\S]*$/m.test(trimmed)) return true
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'css') {
    if (/^@tailwind\s/m.test(trimmed) || /:root\s*\{/.test(trimmed) || /body\s*\{/.test(trimmed)) return false
    if (trimmed.length < 30) return true
    return false
  }
  if (ext === 'tsx' || ext === 'jsx' || ext === 'ts' || ext === 'js') {
    if (/^import\s+.*\s+from\s+['"][^'"]+['"]\s*;?\s*$/m.test(trimmed)) return true
    if (/export\s+(const|function|default)\s+\w+/.test(trimmed)) return false
  }
  return false
}

/**
 * Generate a code file using a template
 * @param request File generation request
 * @returns File generation result
 */
export async function generateFile(request: FileGenerationRequest): Promise<FileGenerationResult> {
  try {
    console.log(`Generating file for project ${request.projectId} using template ${request.templateId}`)
    
    // Get project structure
    const projectStructure = await getProjectStructure(request.projectId)
    if (!projectStructure) {
      throw new Error(`Project structure not found: ${request.projectId}`)
    }
    
    // Get template
    const template = await getTemplateById(request.templateId)
    if (!template) {
      throw new Error(`Template not found: ${request.templateId}`)
    }
    
    // Find file node in project structure if it exists
    let fileNode: IFileNode | null = null
    const findFileNode = (node: IFileNode, path: string): IFileNode | null => {
      if (node.path === path) {
        return node
      }
      
      if (node.children) {
        for (const child of node.children) {
          const found = findFileNode(child, path)
          if (found) return found
        }
      }
      
      return null
    }
    
    fileNode = findFileNode(projectStructure.fileHierarchy, request.filePath)
    
    // If we don't have a file node, create a placeholder
    if (!fileNode) {
      const pathParts = request.filePath.split('/')
      const folderPath = pathParts.slice(0, -1).join('/')
      const filename = pathParts[pathParts.length - 1]
      
      fileNode = {
        type: 'file',
        name: filename,
        path: request.filePath,
        language: template.language
      }
    }
    
    // Generate variables if not provided
    let variables = request.variables || {}
    let templateTokens = 0
    const useDefaultValuesOnly = [
      'package-json',
      'tsconfig-json',
      'env-example',
      'readme-md',
      'index-tsx',
      'globals-css',
      'nextjs-app-api-route',
      'generic-api-route'
    ].includes(request.templateId)
    if (Object.keys(variables).length === 0) {
      if (useDefaultValuesOnly && template.defaultValues && Object.keys(template.defaultValues).length >= 0) {
        variables = { ...template.defaultValues } as ITemplateVariables
      } else {
        try {
          const tvResult = await generateTemplateVariables(template, {
            projectId: request.projectId,
            filePath: request.filePath,
            fileNode,
            projectStructure,
            description: request.description,
            phaseContext: request.phaseContext,
            framework: request.framework,
            repoCategory: request.repoCategory,
            primaryLanguages: request.primaryLanguages,
            mainLanguages: request.mainLanguages
          })
          variables = tvResult?.variables ?? { ...template.defaultValues } as ITemplateVariables
          templateTokens = tvResult?.totalTokens ?? 0
        } catch (e) {
          console.warn(`generateTemplateVariables failed for ${request.filePath}, using defaultValues:`, e)
          variables = { ...template.defaultValues } as ITemplateVariables
        }
      }
    }
    
    // Generate filename if not provided
    const filename = request.filename || generateFileName(template, variables)

    // GRIP mandatory: do not save blank or placeholder files (StackBlitz must get runnable code)
    const content = renderTemplate(template, variables)
    if (isPlaceholderOrEmpty(content, filename)) {
      const msg = `Generated content for ${request.filePath || filename} is empty or placeholder. GRIP requires every file to have real code so the app runs in StackBlitz.`
      console.warn(msg)
      return {
        fileId: '',
        projectId: request.projectId,
        path: request.filePath,
        filename,
        content: '',
        size: 0,
        language: template.language,
        success: false,
        error: msg,
      }
    }

    // Create file in database
    await connectToDatabase()
    
    // Calculate hash of content
    const hash = crypto.createHash('md5').update(content).digest('hex')
    
    // Get dependencies
    const dependencies = await getFileDependencies(request.projectId, request.filePath)
    
    // Parse imports from content
    const imports: string[] = []
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g
    let match
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1])
    }
    
    const pathDirRaw = request.filePath.includes('/') ? request.filePath.slice(0, request.filePath.lastIndexOf('/')) : ''
    const pathDir = pathDirRaw || '/' // root-level files (package.json, tsconfig.json, .env.example) use '/' per ProjectFile convention

    const existingFile = await ProjectFile.findOne({
      projectId: new ObjectId(request.projectId),
      path: pathDir,
      filename
    })
    
    let file: IProjectFile
    
    if (existingFile) {
      existingFile.content = content
      existingFile.size = Buffer.byteLength(content, 'utf8')
      existingFile.hash = hash
      existingFile.metadata.dependencies = dependencies
      existingFile.metadata.imports = imports
      
      if (existingFile.hash !== hash) {
        existingFile.history.push({
          version: existingFile.version,
          content: existingFile.content,
          timestamp: new Date(),
          changes: 'Updated via template generator'
        })
        existingFile.version += 1
      }
      
      await existingFile.save()
      file = existingFile
    } else {
      file = new ProjectFile({
        projectId: new ObjectId(request.projectId),
        path: pathDir,
        filename,
        content,
        language: template.language,
        size: Buffer.byteLength(content, 'utf8'),
        version: 1,
        hash,
        metadata: {
          generatedBy: 'template-engine',
          purpose: request.description || 'Generated from template',
          dependencies,
          imports
        },
        history: []
      })
      
      await file.save()
    }
    
    // Return result
    return {
      fileId: file._id?.toString() || '',
      projectId: request.projectId,
      path: file.path,
      filename: file.filename,
      content: file.content,
      size: file.size,
      totalTokens: templateTokens,
      language: file.language,
      success: true
    }
  } catch (error) {
    console.error('Error generating file:', error)
    return {
      fileId: '',
      projectId: request.projectId,
      path: request.filePath,
      filename: request.filename || 'error.txt',
      content: '',
      size: 0,
      language: 'text',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get generated files for a project
 * @param projectId Project ID to get files for
 * @returns Array of files
 */
export async function getGeneratedFiles(projectId: string): Promise<IProjectFile[]> {
  try {
    console.log(`Getting generated files for project ${projectId}`)
    await connectToDatabase()
    
    const files = await ProjectFile.find({
      projectId: new ObjectId(projectId)
    }).sort({ path: 1, filename: 1 })
    
    return files
  } catch (error) {
    console.error('Error getting generated files:', error)
    return []
  }
}

/**
 * Get a specific generated file by ID
 * @param fileId File ID to get
 * @returns File or null if not found
 */
export async function getGeneratedFile(fileId: string): Promise<IProjectFile | null> {
  try {
    console.log(`Getting generated file ${fileId}`)
    await connectToDatabase()
    
    const file = await ProjectFile.findById(fileId)
    
    return file
  } catch (error) {
    console.error('Error getting generated file:', error)
    return null
  }
}

/**
 * Batch generate multiple files
 * @param requests Array of file generation requests
 * @returns Array of file generation results
 */
export async function batchGenerateFiles(requests: FileGenerationRequest[]): Promise<FileGenerationResult[]> {
  try {
    console.log(`Batch generating ${requests.length} files`)
    
    const results: FileGenerationResult[] = []
    
    for (const request of requests) {
      const result = await generateFile(request)
      results.push(result)
    }
    
    return results
  } catch (error) {
    console.error('Error batch generating files:', error)
    return []
  }
}

/**
 * Get templates available for a file path
 * @param projectId Project ID
 * @param filePath File path to get templates for
 * @returns Array of suitable templates
 */
export async function getTemplatesForFilePath(projectId: string, filePath: string): Promise<ITemplate[]> {
  try {
    console.log(`Getting templates for file path ${filePath}`)
    
    // Get all templates
    const builtInTemplates = await loadBuiltInTemplates()
    const customTemplates = await loadCustomTemplates(projectId)
    
    const allTemplates = [...builtInTemplates, ...customTemplates]
    
    // Determine file type from path if possible
    const extension = filePath.split('.').pop()?.toLowerCase()
    
    // Filter templates based on file extension if available
    if (extension) {
      return allTemplates.filter(t => t.fileType === extension)
    }
    
    // If no extension, try to infer from path (e.g., components folder = React components)
    if (filePath.includes('/components/')) {
      return allTemplates.filter(t => t.id.includes('component'))
    }
    
    if (filePath.includes('/pages/') || filePath.includes('/app/')) {
      return allTemplates.filter(t => t.id.includes('page'))
    }
    
    if (filePath.includes('/api/')) {
      return allTemplates.filter(t => t.id.includes('api'))
    }
    
    if (filePath.includes('/utils/') || filePath.includes('/lib/')) {
      return allTemplates.filter(t => t.id.includes('utility'))
    }
    
    // No specific match, return all templates
    return allTemplates
  } catch (error) {
    console.error('Error getting templates for file path:', error)
    return []
  }
}

/**
 * Delete a generated file
 * @param fileId File ID to delete
 * @returns True if successful, false otherwise
 */
export async function deleteGeneratedFile(fileId: string): Promise<boolean> {
  try {
    console.log(`Deleting generated file ${fileId}`)
    await connectToDatabase()
    
    const result = await ProjectFile.findByIdAndDelete(fileId)
    
    return !!result
  } catch (error) {
    console.error('Error deleting generated file:', error)
    return false
  }
}

/**
 * Generate all files from project structure
 * @param projectId Project ID to generate files for
 * @returns Array of file generation results
 */
export async function generateAllFiles(projectId: string): Promise<FileGenerationResult[]> {
  try {
    console.log(`Generating all files for project ${projectId}`)
    
    // Get project structure
    const projectStructure = await getProjectStructure(projectId)
    if (!projectStructure) {
      throw new Error(`Project structure not found: ${projectId}`)
    }
    
    // Get all file nodes that have generationMetadata
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
    
    findFilesWithMetadata(projectStructure.fileHierarchy)
    
    // Sort by priority
    filesToGenerate.sort((a, b) => 
      (b.generationMetadata.priority || 0) - (a.generationMetadata.priority || 0)
    )
    
    // Generate each file
    const results: FileGenerationResult[] = []
    
    for (const fileNode of filesToGenerate) {
      // Create generation request
      const request: FileGenerationRequest = {
        projectId,
        filePath: fileNode.path,
        filename: fileNode.name,
        templateId: fileNode.generationMetadata.template,
        variables: fileNode.generationMetadata.variables || {},
        description: fileNode.generationMetadata.description
      }
      
      const result = await generateFile(request)
      results.push(result)
    }
    
    return results
  } catch (error) {
    console.error('Error generating all files:', error)
    return []
  }
} 