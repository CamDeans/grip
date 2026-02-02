import { ObjectId } from 'mongodb'
import { clientPromise } from '@/lib/mongodb'
import { connectToDatabase } from '@/lib/mongodb'
import { ProjectFile, IProjectFile } from '@/lib/models/ProjectFile'
import { 
  getFileById, 
  getFileHistory, 
  revertToVersion, 
  updateFile
} from '@/lib/services/fileStorageService'
import crypto from 'crypto'

/**
 * Version Control Service - Implements version tracking for generated files
 * Part of Phase 4, Step 5 of the G.R.I.P. AI Assistant Enhancement Plan
 */

/**
 * Interface for file version
 */
export interface FileVersion {
  fileId: string;
  version: number;
  content: string;
  timestamp: Date;
  changes?: string;
  metadata?: {
    hash: string;
    size: number;
  };
}

/**
 * Interface for version diff
 */
export interface VersionDiff {
  fileId: string;
  fromVersion: number;
  toVersion: number;
  changes: Array<{
    type: 'addition' | 'deletion' | 'modification';
    lineNumber: number;
    content: string;
    previous?: string;
  }>;
}

/**
 * Get file versions
 * @param fileId File ID
 * @returns Array of file versions
 */
export async function getFileVersions(fileId: string): Promise<FileVersion[]> {
  try {
    console.log(`Getting versions for file ${fileId}`)
    
    // Get current file
    const file = await getFileById(fileId)
    if (!file) {
      return []
    }
    
    // Get history
    const history = await getFileHistory(fileId)
    
    // Add current version to versions
    const versions: FileVersion[] = [
      {
        fileId,
        version: file.version,
        content: file.content,
        timestamp: file.updatedAt,
        changes: 'Current version',
        metadata: {
          hash: file.hash,
          size: file.size
        }
      },
      ...history.map(item => ({
        fileId,
        version: item.version,
        content: item.content,
        timestamp: item.timestamp,
        changes: item.changes,
        metadata: {
          hash: crypto.createHash('md5').update(item.content).digest('hex'),
          size: Buffer.byteLength(item.content, 'utf8')
        }
      }))
    ]
    
    return versions.sort((a, b) => b.version - a.version)
  } catch (error) {
    console.error('Error getting file versions:', error)
    return []
  }
}

/**
 * Create a new version of a file
 * @param fileId File ID
 * @param content New content
 * @param changeDescription Description of changes
 * @returns Updated file or null if error
 */
export async function createVersion(
  fileId: string,
  content: string,
  changeDescription: string
): Promise<IProjectFile | null> {
  try {
    console.log(`Creating new version for file ${fileId}`)
    
    return await updateFile(fileId, {
      content,
      changeDescription
    })
  } catch (error) {
    console.error('Error creating version:', error)
    return null
  }
}

/**
 * Compare two versions of a file
 * @param fileId File ID
 * @param fromVersion Version to compare from
 * @param toVersion Version to compare to
 * @returns Version diff or null if error
 */
export async function compareVersions(
  fileId: string,
  fromVersion: number,
  toVersion: number
): Promise<VersionDiff | null> {
  try {
    console.log(`Comparing versions ${fromVersion} and ${toVersion} for file ${fileId}`)
    
    // Get versions
    const versions = await getFileVersions(fileId)
    if (versions.length === 0) {
      return null
    }
    
    // Find the two versions
    const fromVersionData = versions.find(v => v.version === fromVersion)
    const toVersionData = versions.find(v => v.version === toVersion)
    
    if (!fromVersionData || !toVersionData) {
      console.error('Versions not found')
      return null
    }
    
    // Split content into lines
    const fromLines = fromVersionData.content.split('\n')
    const toLines = toVersionData.content.split('\n')
    
    // Simple line-by-line diff algorithm
    const changes: VersionDiff['changes'] = []
    
    // Find maximum length
    const maxLines = Math.max(fromLines.length, toLines.length)
    
    for (let i = 0; i < maxLines; i++) {
      const fromLine = i < fromLines.length ? fromLines[i] : null
      const toLine = i < toLines.length ? toLines[i] : null
      
      if (fromLine === null && toLine !== null) {
        // Line added
        changes.push({
          type: 'addition',
          lineNumber: i + 1,
          content: toLine
        })
      } else if (fromLine !== null && toLine === null) {
        // Line deleted
        changes.push({
          type: 'deletion',
          lineNumber: i + 1,
          content: fromLine
        })
      } else if (fromLine !== toLine) {
        // Line modified
        changes.push({
          type: 'modification',
          lineNumber: i + 1,
          content: toLine!,
          previous: fromLine
        })
      }
    }
    
    return {
      fileId,
      fromVersion,
      toVersion,
      changes
    }
  } catch (error) {
    console.error('Error comparing versions:', error)
    return null
  }
}

/**
 * Get files modified in the last N days
 * @param projectId Project ID
 * @param days Number of days to look back
 * @returns Array of files
 */
export async function getRecentlyModifiedFiles(projectId: string, days = 7): Promise<IProjectFile[]> {
  try {
    console.log(`Getting files modified in the last ${days} days for project ${projectId}`)
    await connectToDatabase()
    
    // Calculate date N days ago
    const date = new Date()
    date.setDate(date.getDate() - days)
    
    // Find files modified after date
    const files = await ProjectFile.find({
      projectId: new ObjectId(projectId),
      updatedAt: { $gt: date }
    }).sort({ updatedAt: -1 })
    
    return files
  } catch (error) {
    console.error('Error getting recently modified files:', error)
    return []
  }
}

/**
 * Get most active files (most versions)
 * @param projectId Project ID
 * @param limit Number of files to return
 * @returns Array of files
 */
export async function getMostActiveFiles(projectId: string, limit = 10): Promise<IProjectFile[]> {
  try {
    console.log(`Getting ${limit} most active files for project ${projectId}`)
    await connectToDatabase()
    
    // Find files with most versions
    const files = await ProjectFile.find({
      projectId: new ObjectId(projectId)
    }).sort({ version: -1 }).limit(limit)
    
    return files
  } catch (error) {
    console.error('Error getting most active files:', error)
    return []
  }
}

/**
 * Tag a specific version of a file
 * @param fileId File ID
 * @param version Version to tag
 * @param tag Tag name
 * @returns True if successful, false otherwise
 */
export async function tagVersion(fileId: string, version: number, tag: string): Promise<boolean> {
  try {
    console.log(`Tagging version ${version} of file ${fileId} as ${tag}`)
    await connectToDatabase()
    
    // Get file
    const file = await ProjectFile.findById(fileId)
    if (!file) {
      return false
    }
    
    // Check if version exists
    let versionExists = false
    if (file.version === version) {
      versionExists = true
    } else {
      versionExists = file.history.some(item => item.version === version)
    }
    
    if (!versionExists) {
      console.error(`Version ${version} not found`)
      return false
    }
    
    // Add tag to file metadata
    if (!file.metadata.tags) {
      file.metadata.tags = {}
    }
    
    file.metadata.tags[tag] = version
    
    await file.save()
    return true
  } catch (error) {
    console.error('Error tagging version:', error)
    return false
  }
}

/**
 * Get versions tagged with specific tag
 * @param projectId Project ID
 * @param tag Tag name
 * @returns Array of tagged files with version info
 */
export async function getTaggedVersions(
  projectId: string,
  tag: string
): Promise<Array<{ fileId: string, path: string, filename: string, version: number }>> {
  try {
    console.log(`Getting files tagged with ${tag} for project ${projectId}`)
    await connectToDatabase()
    
    // Find files with the tag
    const files = await ProjectFile.find({
      projectId: new ObjectId(projectId),
      'metadata.tags': { $exists: true }
    })
    
    // Filter files that have the specific tag
    const taggedFiles = files
      .filter(file => file.metadata.tags && file.metadata.tags[tag] !== undefined)
      .map(file => ({
        fileId: file._id.toString(),
        path: file.path,
        filename: file.filename,
        version: file.metadata.tags![tag]
      }))
    
    return taggedFiles
  } catch (error) {
    console.error('Error getting tagged versions:', error)
    return []
  }
}

/**
 * Create a snapshot of project files at a point in time
 * @param projectId Project ID
 * @param name Snapshot name
 * @param description Snapshot description
 * @returns Snapshot ID or null if error
 */
export async function createSnapshot(
  projectId: string,
  name: string,
  description: string
): Promise<string | null> {
  try {
    console.log(`Creating snapshot "${name}" for project ${projectId}`)
    await connectToDatabase()
    
    const db = (await clientPromise).db()
    
    // Get all files for the project
    const files = await ProjectFile.find({
      projectId: new ObjectId(projectId)
    })
    
    // Create snapshot object
    const snapshot = {
      projectId: new ObjectId(projectId),
      name,
      description,
      files: files.map(file => ({
        fileId: file._id,
        path: file.path,
        filename: file.filename,
        version: file.version,
        hash: file.hash
      })),
      createdAt: new Date()
    }
    
    // Insert snapshot
    const result = await db.collection('snapshots').insertOne(snapshot)
    
    return result.insertedId.toString()
  } catch (error) {
    console.error('Error creating snapshot:', error)
    return null
  }
}

/**
 * Get snapshot details
 * @param snapshotId Snapshot ID
 * @returns Snapshot details or null if not found
 */
export async function getSnapshot(snapshotId: string): Promise<any | null> {
  try {
    console.log(`Getting snapshot ${snapshotId}`)
    await connectToDatabase()
    
    const db = (await clientPromise).db()
    
    // Find snapshot
    const snapshot = await db.collection('snapshots').findOne({
      _id: new ObjectId(snapshotId)
    })
    
    return snapshot
  } catch (error) {
    console.error('Error getting snapshot:', error)
    return null
  }
}

/**
 * List snapshots for a project
 * @param projectId Project ID
 * @returns Array of snapshots
 */
export async function listSnapshots(projectId: string): Promise<any[]> {
  try {
    console.log(`Listing snapshots for project ${projectId}`)
    await connectToDatabase()
    
    const db = (await clientPromise).db()
    
    // Find snapshots
    const snapshots = await db.collection('snapshots').find({
      projectId: new ObjectId(projectId)
    }).sort({ createdAt: -1 }).toArray()
    
    return snapshots
  } catch (error) {
    console.error('Error listing snapshots:', error)
    return []
  }
} 