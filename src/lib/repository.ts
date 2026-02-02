import { clientPromise } from './mongodb'
import { ObjectId } from 'mongodb'
import { cloneRepository } from './github'

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

function decodeBase64(base64: string): string {
  try {
    console.log('Decoding base64 content:', {
      inputLength: base64.length,
      sampleInput: base64.substring(0, 50) + '...'
    });
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    console.log('Successfully decoded base64:', {
      outputLength: decoded.length,
      sampleOutput: decoded.substring(0, 50) + '...'
    });
    return decoded;
  } catch (error) {
    console.error('Error decoding base64:', {
      error: error instanceof Error ? error.message : error,
      sampleInput: base64.substring(0, 50) + '...'
    });
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

    // Map files to the correct format with proper content handling
    console.log('Processing cloned files...');
    const repoFiles = files.map(file => {
      const processed = {
        path: file.path,
        content: file.encoding === 'base64' && file.content ? decodeBase64(file.content) : null,
        type: file.type || 'file',
        sha: file.sha || '',
        lastModified: new Date(),
        encoding: file.encoding || 'utf8'
      };
      console.log(`Processed file ${file.path}:`, {
        hasContent: !!processed.content,
        encoding: processed.encoding,
        type: processed.type
      });
      return processed;
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
