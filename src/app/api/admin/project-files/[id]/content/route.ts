import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ProjectFile } from '@/lib/models';
import { ObjectId } from 'mongodb';

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check authentication and admin
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminUser(session)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing file ID' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectToDatabase();
    
    // Find file by ID
    try {
      // Handle both ObjectId and string IDs
      let fileId: any = id;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        fileId = new ObjectId(id);
      } else if (id.startsWith('file-')) {
        // For sample files that use fileId pattern
        fileId = id;
      }
      
      const file = await (ProjectFile as any).findOne({ 
        $or: [
          { _id: fileId },
          { fileId: fileId }
        ]
      });
      
      if (!file) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }
      
      // Return file content
      return NextResponse.json({
        content: file.content,
        fileName: file.filename || file.fileName,
        fileType: file.language || file.fileType || getExtensionFromFilename(file.filename || file.fileName)
      });
    } catch (err) {
      console.error('Error finding file by ID:', err);
      // If ID is not a valid ObjectId, return 404
      return NextResponse.json(
        { error: 'File not found or invalid file ID' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error fetching file content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file content' },
      { status: 500 }
    );
  }
}

/**
 * Get file extension from filename
 */
function getExtensionFromFilename(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()! : '';
} 