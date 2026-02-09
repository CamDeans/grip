import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { setupProject } from '@/lib/scripts/projectSetup'
import path from 'path'

export async function POST(request: Request) {
  try {
    // On Vercel there is no persistent filesystem; Setup cannot create a project folder.
    if (process.env.VERCEL === '1') {
      return NextResponse.json(
        {
          error: 'Setup project is not available on Vercel. There is no persistent filesystem. Export your project (project overview) and run npm install and npm run dev in your local terminal or CI.',
        },
        { status: 503 }
      )
    }

    // Get session
    const session = await getServerAuthSession()
    if (!session) {
      console.log('API: Unauthorized access attempt')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      console.log('API: Missing project ID')
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    console.log('API: Setting up project:', projectId)

    // Connect to MongoDB
    const { db } = await connectToDatabase()
    
    // Get project and repository data
    const project = await db.collection('projects').findOne({ _id: projectId })
    const repository = await db.collection('repositories').findOne({ projectId })

    if (!project || !repository) {
      return NextResponse.json({ error: 'Project or repository not found' }, { status: 404 })
    }

    // Setup project
    const documentsPath = process.env.DOCUMENTS_PATH || path.join(process.env.HOME || process.env.USERPROFILE || '', 'Documents')
    const projectPath = path.join(documentsPath, project.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase())

    const result = await setupProject({
      projectId,
      projectName: project.title,
      projectPath,
      repoUrl: repository.url,
      techStack: project.techStack
    })

    if (!result.success) {
      throw new Error(result.message)
    }

    // Update project status
    await db.collection('projects').updateOne(
      { _id: projectId },
      { 
        $set: {
          status: 'setup_completed',
          projectPath,
          updatedAt: new Date()
        }
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Project setup completed',
      projectPath
    })
  } catch (error: any) {
    console.error('API Error in POST /api/project/setup:', error)
    return NextResponse.json({ 
      error: error?.message || 'Failed to setup project'
    }, { status: 500 })
  }
} 