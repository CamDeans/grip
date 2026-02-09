import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { cloneRepository } from './github'
import { isImagePath, validateImageContent } from './imageValidation'

interface RepositoryFile {
  path: string
  content: string | null
  type: string
  sha?: string
  lastModified?: Date
  encoding?: string
}

interface CachedRepository {
  _id?: ObjectId
  owner: string
  repo: string
  files: RepositoryFile[]
  linkedProjects: ObjectId[]
  createdAt: Date
  lastUpdated: Date
  lastAccessed: Date
}

/** File extensions that are binary; we keep base64 and do not decode to UTF-8 (which would corrupt them). */
const BINARY_EXTENSIONS = /\.(png|jpg|jpeg|gif|ico|webp|bmp|woff|woff2|ttf|eot|otf|cur)(\?.*)?$/i

function decodeBase64(base64: string): string {
  try {
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    return decoded;
  } catch {
    return '';
  }
}

export async function getOrCloneRepository(owner: string, repo: string, projectId: string): Promise<RepositoryFile[]> {
  try {
    console.log('=== Repository Service: getOrCloneRepository ===');
    console.log(`Parameters: owner=${owner}, repo=${repo}, projectId=${projectId}`);
    
    const db = await clientPromise;
    const collection = db.db('test').collection('repositories');
    
    // Check if repository already exists
    console.log('Checking for existing repository...');
    const existingRepo = await collection.findOne({ 
      owner, 
      repo,
      linkedProjects: { $exists: true }  // Ensure linkedProjects field exists
    });

    if (existingRepo) {
      console.log('Found existing repository:', {
        id: existingRepo._id,
        fileCount: existingRepo.files?.length || 0,
        linkedProjects: existingRepo.linkedProjects
      });
      
      // Add new project ID if not already linked
      if (!existingRepo.linkedProjects.some((id: ObjectId) => id.equals(new ObjectId(projectId)))) {
        console.log('Linking new project to existing repository...');
        await collection.updateOne(
          { _id: existingRepo._id },
          { 
            $addToSet: { linkedProjects: new ObjectId(projectId) },
            $set: { lastAccessed: new Date() }
          }
        );
        console.log('Repository updated with new project link');
      } else {
        console.log('Project already linked to repository');
        await collection.updateOne(
          { _id: existingRepo._id },
          { $set: { lastAccessed: new Date() } }
        );
      }
      
      return existingRepo.files;
    }

    console.log('Repository not found, initiating GitHub clone...');
    const files = await cloneRepository(owner, repo);
    console.log('GitHub clone results:', {
      fileCount: files?.length || 0,
      sampleFiles: files?.slice(0, 3).map(f => f.path) || []
    });

    if (!Array.isArray(files)) {
      console.error('Error: cloneRepository did not return an array:', files);
      return [];
    }

    // Map files to the correct format. GitHub returns content as base64.
    // For binary files (images, fonts) keep base64 so they are not corrupted by UTF-8 decode; export/StackBlitz can use it.
    // For image paths, validate content is actual image data (not blank/encrypted/wrong format) and normalize base64.
    const repoFiles = files.map(file => {
      let content: string | null = null;
      if (file.content) {
        if (file.encoding === 'base64') {
          const isBinary = BINARY_EXTENSIONS.test(file.path);
          if (isBinary) {
            if (isImagePath(file.path)) {
              const { valid, normalized } = validateImageContent(file.content, file.path);
              if (valid && normalized) content = normalized;
              else if (!valid) {
                console.warn(`[repository] Image file has invalid content (blank or not image format), skipping: ${file.path}`);
                content = null;
              } else {
                content = file.content;
              }
            } else {
              content = file.content;
            }
          } else {
            content = decodeBase64(file.content);
          }
        } else if (typeof file.content === 'string') {
          content = file.content;
        }
      }
      return {
        path: file.path,
        content,
        type: file.type || 'file',
        sha: file.sha || '',
        lastModified: new Date(),
        encoding: file.encoding || 'utf8'
      };
    });

    // Create repository document
    console.log('Creating repository document...');
    const repoData = {
      owner,
      repo,
      files: repoFiles,
      linkedProjects: [new ObjectId(projectId)],
      languages: getLanguageStats(repoFiles),
      createdAt: new Date(),
      lastUpdated: new Date(),
      lastAccessed: new Date()
    };

    console.log('Saving repository to MongoDB...', {
      fileCount: repoFiles.length,
      samplePaths: repoFiles.slice(0, 3).map(f => f.path),
      languages: Object.keys(repoData.languages)
    });
    
    const result = await collection.insertOne(repoData);
    console.log('Repository saved successfully:', {
      id: result.insertedId,
      fileCount: repoFiles.length
    });
    
    return repoFiles;
  } catch (error) {
    console.error('=== Repository Service Error ===');
    console.error('Error in getOrCloneRepository:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context: { owner, repo, projectId }
    });
    return [];
  }
}

function getLanguageStats(files: RepositoryFile[]): { [key: string]: number } {
  const stats: { [key: string]: number } = {};
  files.forEach(file => {
    const ext = file.path.split('.').pop()?.toLowerCase() || 'unknown';
    stats[ext] = (stats[ext] || 0) + 1;
  });
  return stats;
}

export async function getRepositoryFiles(owner: string, repo: string, projectId: string | ObjectId) {
  try {
    const client = await clientPromise
    const db = client.db('test')

    // Check if repository is already cached
    const cachedRepo = await db.collection('repositories').findOne({
      owner,
      repo,
      linkedProjects: { $in: [new ObjectId(projectId)] }
    })

    if (!cachedRepo) {
      throw new Error('Repository not found in cache')
    }

    return cachedRepo.files
  } catch (error) {
    console.error('Error getting repository files:', error)
    throw error
  }
}

export async function updateRepositoryFile(
  projectId: string,
  filePath: string,
  content: string
) {
  const client = await clientPromise
  const db = client.db('test')

  console.log('Updating repository file:', { projectId, filePath })

  const repository = await db.collection<CachedRepository>('repositories').findOne({
    linkedProjects: new ObjectId(projectId)
  })

  if (!repository || !repository._id) {
    throw new Error('Repository not found')
  }

  const result = await db.collection('repositories').updateOne(
    {
      _id: repository._id,
      'files.path': filePath
    },
    {
      $set: {
        'files.$.content': content,
        'files.$.lastModified': new Date(),
        lastUpdated: new Date()
      }
    }
  )

  if (result.matchedCount === 0) {
    // Add new file
    const updateOperation = {
      $push: {
        files: {
          path: filePath,
          content: content,
          type: 'file',
          lastModified: new Date()
        } as RepositoryFile
      },
      $set: { lastUpdated: new Date() }
    }

    await db.collection('repositories').updateOne(
      { _id: repository._id },
      updateOperation as any
    )
  }

  console.log('File updated successfully')
  return true
}

/** Remove one file from the cached repo by path */
export async function deleteRepositoryFile(projectId: string, filePath: string): Promise<boolean> {
  const client = await clientPromise
  const db = client.db('test')
  const repository = await db.collection<CachedRepository>('repositories').findOne({
    linkedProjects: new ObjectId(projectId),
  })
  if (!repository?.files) return false
  const filtered = repository.files.filter((f: RepositoryFile) => f.path !== filePath)
  if (filtered.length === repository.files.length) return false
  await db.collection('repositories').updateOne(
    { _id: repository._id },
    { $set: { files: filtered, lastUpdated: new Date() } }
  )
  return true
}

/** Rename a file in the cached repo (oldPath → newPath) */
export async function renameRepositoryFile(projectId: string, oldPath: string, newPath: string): Promise<boolean> {
  const client = await clientPromise
  const db = client.db('test')
  const repository = await db.collection<CachedRepository>('repositories').findOne({
    linkedProjects: new ObjectId(projectId),
  })
  if (!repository?.files) return false
  const files = repository.files.map((f: RepositoryFile) =>
    f.path === oldPath ? { ...f, path: newPath, lastModified: new Date() } : f
  )
  if (files.every((f: RepositoryFile, i: number) => f.path === repository.files[i].path)) return false
  await db.collection('repositories').updateOne(
    { _id: repository._id },
    { $set: { files, lastUpdated: new Date() } }
  )
  return true
}

/** Remove all files under a folder path from the cached repo (folderPath and folderPath/*) */
export async function deleteRepositoryFolder(projectId: string, folderPath: string): Promise<number> {
  const client = await clientPromise
  const db = client.db('test')
  const repository = await db.collection<CachedRepository>('repositories').findOne({
    linkedProjects: new ObjectId(projectId),
  })
  if (!repository?.files) return 0
  const normalized = folderPath.replace(/^\/+|\/+$/g, '').trim() || ''
  const prefix = normalized === '' ? '/' : normalized.endsWith('/') ? normalized : normalized + '/'
  const before = repository.files.length
  const filtered = repository.files.filter(
    (f: RepositoryFile) => f.path !== normalized && f.path !== normalized + '/' && !f.path.startsWith(prefix)
  )
  const removed = before - filtered.length
  if (removed === 0) return 0
  await db.collection('repositories').updateOne(
    { _id: repository._id },
    { $set: { files: filtered, lastUpdated: new Date() } }
  )
  return removed
}

export async function getFileHistory(projectId: string, filePath: string) {
  const client = await clientPromise
  const db = client.db()

  return db.collection('fileHistory').find({
    projectId: new ObjectId(projectId),
    filePath
  }).sort({ timestamp: -1 }).toArray()
}

export async function saveFileVersion(
  projectId: string,
  filePath: string,
  content: string,
  commitMessage: string
) {
  const client = await clientPromise
  const db = client.db()

  console.log('Saving file version:', { projectId, filePath, commitMessage })

  await db.collection('fileHistory').insertOne({
    projectId: new ObjectId(projectId),
    filePath,
    content,
    commitMessage,
    timestamp: new Date()
  })

  console.log('File version saved successfully')
}
