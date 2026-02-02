import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { access } from 'fs/promises'
import { constants } from 'fs'
import path from 'path'
import { clientPromise } from '@/lib/mongodb'

// Helper function to format title for directory name
function formatTitleForDirectory(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export async function POST(request: Request) {
  try {
    const { projectId, path: basePath } = await request.json()

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    if (!basePath) {
      return NextResponse.json(
        { error: 'Base path is required' },
        { status: 400 }
      )
    }

    // Connect to MongoDB and find project
    const client = await clientPromise
    const db = client.db('grip')
    
    let projectObjectId: ObjectId
    try {
      projectObjectId = new ObjectId(projectId)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }

    // Find project in database
    const project = await db.collection('projects').findOne({ _id: projectObjectId })
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found in database' },
        { status: 404 }
      )
    }

    // Format project title for directory name
    const dirName = formatTitleForDirectory(project.title)
    const projectPath = path.join(basePath, dirName)
    
    // Check if directory exists
    let exists = false
    try {
      await access(projectPath, constants.F_OK)
      exists = true
    } catch {
      exists = false
    }

    // Return both the formatted directory name and whether it exists
    return NextResponse.json({
      exists,
      projectName: dirName,
      originalTitle: project.title
    })

  } catch (error: any) {
    console.error('Error in check-directory:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
} 
