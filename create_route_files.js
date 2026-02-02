const fs = require('fs');
const path = require('path');

// Define the file contents
const analysisRouteContent = `import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'

// Phase 2, Step 3: Create Analysis Data Fetcher

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401 }
      )
    }

    const { id } = params

    if (!id) {
      return new NextResponse(
        JSON.stringify({ error: 'Project ID is required' }),
        { status: 400 }
      )
    }

    // Connect to database
    const client = await clientPromise
    const db = client.db('test')

    // Query for analysis data
    // Convert id to ObjectId for the query
    let objectId: ObjectId
    try {
      objectId = new ObjectId(id)
    } catch (e) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid project ID format' }),
        { status: 400 }
      )
    }

    const analysis = await db.collection('analyses').findOne({ 
      projectId: objectId 
    })

    if (!analysis) {
      return new NextResponse(
        JSON.stringify({ error: 'Analysis not found' }),
        { status: 404 }
      )
    }

    // Format the response
    const formattedAnalysis = {
      id: analysis._id.toString(),
      projectId: analysis.projectId.toString(),
      repositoryStructure: analysis.repositoryStructure || null,
      codeStructure: analysis.codeStructure || null,
      recommendations: analysis.recommendations || [],
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt
    }

    return NextResponse.json(formattedAnalysis)
  } catch (error: any) {
    console.error('Error fetching analysis data:', error)
    
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Something went wrong' }),
      { status: 500 }
    )
  }
}`;

const projectStructureRouteContent = `import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'

// Phase 2, Step 3: Create Project Structure Data Fetcher

export async function GET(
  _request: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401 }
      )
    }

    const { id } = params

    if (!id) {
      return new NextResponse(
        JSON.stringify({ error: 'Project ID is required' }),
        { status: 400 }
      )
    }

    // Connect to database
    const client = await clientPromise
    const db = client.db('test')

    // Query for project structure data
    // Convert id to ObjectId for the query
    let objectId: ObjectId
    try {
      objectId = new ObjectId(id)
    } catch (e) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid project ID format' }),
        { status: 400 }
      )
    }

    const structure = await db.collection('projectStructures').findOne({ 
      projectId: objectId 
    })

    if (!structure) {
      return new NextResponse(
        JSON.stringify({ error: 'Project structure not found' }),
        { status: 404 }
      )
    }

    // Format the response
    const formattedStructure = {
      id: structure._id.toString(),
      projectId: structure.projectId.toString(),
      name: structure.name,
      description: structure.description,
      fileHierarchy: structure.fileHierarchy,
      dependencies: structure.dependencies || {},
      buildConfig: structure.buildConfig || {
        commands: {},
        environment: {}
      },
      createdAt: structure.createdAt,
      updatedAt: structure.updatedAt
    }

    return NextResponse.json(formattedStructure)
  } catch (error: any) {
    console.error('Error fetching project structure:', error)
    
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Something went wrong' }),
      { status: 500 }
    )
  }
}`;

const chatHistoryRouteContent = `import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { clientPromise } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(
  _: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db('test')

    // Get chat history from projectState
    const projectState = await db.collection('projectState').findOne({
      projectId: new ObjectId(params.id)
    })

    return NextResponse.json({ messages: projectState?.chatHistory || [] })
  } catch (error) {
    console.error('Error loading chat history:', error)
    return NextResponse.json(
      { error: 'Failed to load chat history' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authSession = await getServerAuthSession()
    if (!authSession?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages } = await request.json()
    const client = await clientPromise
    const db = client.db('test')

    // Update only projectState with new chat history
    const result = await db.collection('projectState').updateOne(
      { projectId: new ObjectId(params.id) },
      { 
        $set: { 
          chatHistory: messages,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )

    if (!result.acknowledged) {
      throw new Error('Failed to update chat history')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving chat history:', error)
    return NextResponse.json(
      { error: 'Failed to save chat history' },
      { status: 500 }
    )
  }
}`;

// Define the paths
const paths = [
  {
    dir: path.join('src', 'app', 'api', 'analysis', '[id]'),
    file: 'route.ts',
    content: analysisRouteContent
  },
  {
    dir: path.join('src', 'app', 'api', 'project-structure', '[id]'),
    file: 'route.ts',
    content: projectStructureRouteContent
  },
  {
    dir: path.join('src', 'app', 'api', 'chat', 'history', '[id]'),
    file: 'route.ts',
    content: chatHistoryRouteContent
  }
];

// Create directories and files
paths.forEach(({ dir, file, content }) => {
  try {
    // Ensure the directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }

    // Write the file
    const filePath = path.join(dir, file);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Created file: ${filePath}`);
  } catch (error) {
    console.error(`Error creating ${dir}/${file}:`, error);
  }
}); 