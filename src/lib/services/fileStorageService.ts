import { ObjectId } from 'mongodb'
import { clientPromise } from '@/lib/mongodb'
import { connectToDatabase } from '@/lib/mongodb'
import { ProjectFile, IProjectFile } from '@/lib/models/ProjectFile'
import crypto from 'crypto'

/**
 * File Storage Service - Stores generated files in projectFiles collection
 * Part of Phase 4, Step 4 of the G.R.I.P. AI Assistant Enhancement Plan
 */

/**
 * Interface for file creation parameters
 */
export interface IFileCreateParams {
  projectId: string;
  path: string;
  filename: string;
  content: string;
  language: string;
  metadata: {
    generatedBy: string;
    purpose: string;
    dependencies?: string[];
    imports?: string[];
    exports?: string[];
  };
}

/**
 * Interface for file update parameters
 */
export interface IFileUpdateParams {
  content: string;
  changeDescription?: string;
  dependencies?: string[];
  imports?: string[];
  exports?: string[];
}

/**
 * Create a new file in the database
 * @param params File creation parameters
 * @returns Created file or null if error
 */
export async function createFile(params: IFileCreateParams): Promise<IProjectFile | null> {
  try {
    console.log(`Creating file ${params.path}/${params.filename} for project ${params.projectId}`)
    await connectToDatabase()
    
    // Check if file already exists
    const existingFile = await ProjectFile.findOne({
      projectId: new ObjectId(params.projectId),
      path: params.path,
      filename: params.filename
    })
    
    if (existingFile) {
      console.warn(`File ${params.path}/${params.filename} already exists, returning existing file`)
      return existingFile
    }
    
    // Calculate size and hash
    const size = Buffer.byteLength(params.content, 'utf8')
    const hash = crypto.createHash('md5').update(params.content).digest('hex')
    
    // Create new file
    const file = new ProjectFile({
      projectId: new ObjectId(params.projectId),
      path: params.path,
      filename: params.filename,
      content: params.content,
      language: params.language,
      size,
      version: 1,
      hash,
      metadata: params.metadata,
      history: []
    })
    
    await file.save()
    return file
  } catch (error) {
    console.error('Error creating file:', error)
    return null
  }
}

/**
 * Update an existing file
 * @param fileId File ID to update
 * @param params Update parameters
 * @returns Updated file or null if error
 */
export async function updateFile(fileId: string, params: IFileUpdateParams): Promise<IProjectFile | null> {
  try {
    console.log(`Updating file ${fileId}`)
    await connectToDatabase()
    
    // Get existing file
    const file = await ProjectFile.findById(fileId)
    if (!file) {
      console.error(`File ${fileId} not found`)
      return null
    }
    
    // Calculate new hash
    const hash = crypto.createHash('md5').update(params.content).digest('hex')
    
    // If content is different, add to history
    if (file.hash !== hash) {
      file.history.push({
        version: file.version,
        content: file.content,
        timestamp: new Date(),
        changes: params.changeDescription || 'File updated'
      })
      
      file.version += 1
    }
    
    // Update file properties
    file.content = params.content
    file.size = Buffer.byteLength(params.content, 'utf8')
    file.hash = hash
    
    // Update metadata if provided
    if (params.dependencies) {
      file.metadata.dependencies = params.dependencies
    }
    
    if (params.imports) {
      file.metadata.imports = params.imports
    }
    
    if (params.exports) {
      file.metadata.exports = params.exports
    }
    
    await file.save()
    return file
  } catch (error) {
    console.error('Error updating file:', error)
    return null
  }
}

/**
 * Get file by ID
 * @param fileId File ID to get
 * @returns File or null if not found
 */
export async function getFileById(fileId: string): Promise<IProjectFile | null> {
  try {
    console.log(`Getting file by ID ${fileId}`)
    await connectToDatabase()
    
    const file = await ProjectFile.findById(fileId)
    return file
  } catch (error) {
    console.error('Error getting file by ID:', error)
    return null
  }
}

/**
 * Get file by path and filename
 * @param projectId Project ID
 * @param path File path
 * @param filename File name
 * @returns File or null if not found
 */
export async function getFileByPath(
  projectId: string,
  path: string,
  filename: string
): Promise<IProjectFile | null> {
  try {
    console.log(`Getting file by path ${path}/${filename} for project ${projectId}`)
    await connectToDatabase()
    
    const file = await ProjectFile.findOne({
      projectId: new ObjectId(projectId),
      path,
      filename
    })
    
    return file
  } catch (error) {
    console.error('Error getting file by path:', error)
    return null
  }
}

/**
 * List all files for a project
 * @param projectId Project ID
 * @returns Array of files
 */
export async function listProjectFiles(projectId: string): Promise<IProjectFile[]> {
  try {
    console.log(`Listing files for project ${projectId}`)
    await connectToDatabase()
    
    const files = await ProjectFile.find({
      projectId: new ObjectId(projectId)
    }).sort({ path: 1, filename: 1 })
    
    return files
  } catch (error) {
    console.error('Error listing project files:', error)
    return []
  }
}

/**
 * List files in a specific directory
 * @param projectId Project ID
 * @param path Directory path
 * @returns Array of files
 */
export async function listDirectoryFiles(projectId: string, path: string): Promise<IProjectFile[]> {
  try {
    console.log(`Listing files in directory ${path} for project ${projectId}`)
    await connectToDatabase()
    
    // Add trailing slash if not present
    const dirPath = path.endsWith('/') ? path : `${path}/`
    
    // Find files that start with the directory path
    const files = await ProjectFile.find({
      projectId: new ObjectId(projectId),
      path: { $regex: `^${dirPath}` }
    }).sort({ path: 1, filename: 1 })
    
    return files
  } catch (error) {
    console.error('Error listing directory files:', error)
    return []
  }
}

/**
 * Delete a file
 * @param fileId File ID to delete
 * @returns True if successful, false otherwise
 */
export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    console.log(`Deleting file ${fileId}`)
    await connectToDatabase()
    
    const result = await ProjectFile.findByIdAndDelete(fileId)
    
    return !!result
  } catch (error) {
    console.error('Error deleting file:', error)
    return false
  }
}

/**
 * Search for files by content
 * @param projectId Project ID
 * @param searchTerm Search term
 * @returns Array of matching files
 */
export async function searchFileContent(projectId: string, searchTerm: string): Promise<IProjectFile[]> {
  try {
    console.log(`Searching for "${searchTerm}" in project ${projectId}`)
    await connectToDatabase()
    
    const files = await ProjectFile.find({
      projectId: new ObjectId(projectId),
      content: { $regex: searchTerm, $options: 'i' }
    }).sort({ path: 1, filename: 1 })
    
    return files
  } catch (error) {
    console.error('Error searching file content:', error)
    return []
  }
}

/**
 * Get file version history
 * @param fileId File ID
 * @returns Array of history items
 */
export async function getFileHistory(fileId: string): Promise<Array<{
  version: number;
  content: string;
  timestamp: Date;
  changes?: string;
}>> {
  try {
    console.log(`Getting history for file ${fileId}`)
    await connectToDatabase()
    
    const file = await ProjectFile.findById(fileId)
    if (!file) {
      return []
    }
    
    // Sort history by version in descending order
    return [...file.history].sort((a, b) => b.version - a.version)
  } catch (error) {
    console.error('Error getting file history:', error)
    return []
  }
}

/**
 * Revert to a specific file version
 * @param fileId File ID
 * @param version Version to revert to
 * @returns Updated file or null if error
 */
export async function revertToVersion(fileId: string, version: number): Promise<IProjectFile | null> {
  try {
    console.log(`Reverting file ${fileId} to version ${version}`)
    await connectToDatabase()
    
    const file = await ProjectFile.findById(fileId)
    if (!file) {
      return null
    }
    
    // Find the history item with the specified version
    const historyItem = file.history.find((item: { version: number; content: string; timestamp: Date; changes?: string }) => item.version === version)
    if (!historyItem) {
      console.error(`Version ${version} not found in file history`)
      return null
    }
    
    // Save current version to history
    file.history.push({
      version: file.version,
      content: file.content,
      timestamp: new Date(),
      changes: `Reverted to version ${version}`
    })
    
    // Update file with historical content
    file.content = historyItem.content
    file.size = Buffer.byteLength(historyItem.content, 'utf8')
    file.hash = crypto.createHash('md5').update(historyItem.content).digest('hex')
    file.version += 1
    
    await file.save()
    return file
  } catch (error) {
    console.error('Error reverting to version:', error)
    return null
  }
} 