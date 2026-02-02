import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'

// Phase 8, Step 3: Create API endpoint for retrieving a specific file for preview

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  // Get the file ID directly from the params object
  const fileId = params.id;
  
  try {
    if (!fileId || !ObjectId.isValid(fileId)) {
      return NextResponse.json(
        { error: 'Invalid file ID format' },
        { status: 400 }
      )
    }
    
    // Connect to database
    const client = await clientPromise
    const db = client.db('test')
    
    // Find file in projectFiles collection
    const file = await db.collection('projectFiles').findOne({
      _id: new ObjectId(fileId)
    })
    
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }
    
    // Format the response
    const formattedFile = {
      id: file._id.toString(),
      projectId: file.projectId.toString(),
      path: file.path,
      filename: file.filename,
      content: file.content,
      language: file.language,
      size: file.size,
      version: file.version,
      metadata: file.metadata || {},
      createdAt: file.createdAt,
      updatedAt: file.updatedAt
    }
    
    return NextResponse.json(formattedFile)
  } catch (error: any) {
    console.error('Error retrieving project file:', error)
    
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    )
  }
} 