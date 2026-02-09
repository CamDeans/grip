import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'

// Phase 2, Step 3: Create API for project files retrieval

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401 }
      )
    }

    // Get query parameters
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    const limitParam = url.searchParams.get('limit')
    const path = url.searchParams.get('path')
    const filename = url.searchParams.get('filename')

    if (!projectId) {
      return new NextResponse(
        JSON.stringify({ error: 'Project ID is required' }),
        { status: 400 }
      )
    }

    // Parse limit parameter
    const limit = limitParam ? parseInt(limitParam, 10) : undefined
    
    // Connect to database
    const client = await clientPromise
    const db = client.db('test')

    // Build query
    const query: any = { 
      projectId: new ObjectId(projectId) 
    }
    
    if (path) {
      query.path = path
    }
    
    if (filename) {
      query.filename = filename
    }

    // Fetch files from projectFiles collection
    let filesQuery = db.collection('projectFiles').find(query)
    
    // Apply sort (most recent first) and limit
    filesQuery = filesQuery.sort({ updatedAt: -1 })
    
    if (limit) {
      filesQuery = filesQuery.limit(limit)
    }
    
    const files = await filesQuery.toArray()

    // Format the response
    const formattedFiles = files.map(file => ({
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
    }))

    return NextResponse.json(formattedFiles)
  } catch (error: any) {
    console.error('Error fetching project files:', error)
    
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Something went wrong' }),
      { status: 500 }
    )
  }
} 