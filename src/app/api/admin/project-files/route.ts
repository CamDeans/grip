import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { isAdminUser } from '@/lib/utils/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ProjectFile } from '@/lib/models';
import { ObjectId } from 'mongodb';
import { seedSampleFiles } from '@/lib/db/seedData';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Get project ID from query parameters
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Query all files for the project
    let files = await (ProjectFile as any).find({ 
      projectId: projectId 
    }).lean();
    
    // If no files found, attempt to seed sample files for this project
    if (!files || files.length === 0) {
      const environment = process.env.NODE_ENV as 'development' | 'production' | 'all';
      console.log(`No files found for project ${projectId}, seeding sample files...`);
      
      const seedResult = await seedSampleFiles(environment, projectId);
      console.log('Seed result:', seedResult);
      
      // Try querying again after seeding
      files = await (ProjectFile as any).find({ 
        projectId: projectId 
      }).lean();
      
      // If still no files, return empty structure
      if (!files || files.length === 0) {
        return NextResponse.json({ structure: [] });
      }
    }
    
    // Convert flat list of files to directory structure
    const fileStructure = convertToDirectoryStructure(files);
    
    return NextResponse.json({ structure: fileStructure });
  } catch (error) {
    console.error('Error fetching project files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project files' },
      { status: 500 }
    );
  }
}

/**
 * Convert a flat list of files to a directory structure
 */
function convertToDirectoryStructure(files: any[]) {
  // Map to store directories
  const directories: Record<string, any> = {
    '/': {
      id: 'root',
      name: '/',
      path: '/',
      type: 'directory',
      children: [],
      updatedAt: new Date().toISOString()
    }
  };
  
  // Process each file
  files.forEach(file => {
    // Create file object
    const fileObj = {
      id: file._id.toString(),
      name: file.filename || file.fileName,
      path: file.path,
      type: 'file',
      extension: file.language || file.fileType || getExtension(file.filename || file.fileName),
      size: file.size || (file.content ? file.content.length : 0) || 0,
      updatedAt: file.updatedAt?.toISOString() || new Date().toISOString(),
      createdBy: file.metadata?.generatedBy || file.metadata?.createdBy || 'G.R.I.P. AI'
    };
    
    // Get directory path
    const pathParts = file.path.split('/').filter(Boolean);
    const fileName = pathParts.pop(); // Remove filename from path
    
    // Ensure all directories in the path exist
    let currentPath = '/';
    pathParts.forEach((part: string) => {
      const parentPath = currentPath;
      currentPath = currentPath === '/' ? `/${part}` : `${currentPath}/${part}`;
      
      if (!directories[currentPath]) {
        const dirObj = {
          id: `dir_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: part,
          path: currentPath,
          type: 'directory',
          children: [],
          updatedAt: new Date().toISOString()
        };
        directories[currentPath] = dirObj;
        
        // Add to parent directory
        directories[parentPath].children.push(dirObj);
      }
    });
    
    // Add file to its directory
    const dirPath = pathParts.length === 0 ? '/' : '/' + pathParts.join('/');
    directories[dirPath].children.push(fileObj);
  });
  
  // Return root directory children
  return directories['/'].children;
}

/**
 * Get file extension from filename
 */
function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()! : '';
} 