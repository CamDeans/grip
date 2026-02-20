import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { connectToDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { ProjectState } from '@/types/chat'
import { clientPromise } from '@/lib/mongodb'

export async function GET(request: Request) {
  try {
    // Get session
    const session = await getServerAuthSession()
    if (!session) {
      console.log('API: Unauthorized access attempt')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get project ID from query params
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      console.log('API: Missing project ID')
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    console.log('API: Fetching project state for ID:', projectId)

    // Connect to MongoDB using clientPromise
    const client = await clientPromise
    const db = client.db('test')
    
    const projectObjectId = new ObjectId(projectId)
    
    // IMPORTANT - Look for project state document using _id field that matches project ID
    const projectState = await db.collection('projectStates').findOne({
      _id: projectObjectId
    })
    
    console.log(`API: ProjectState lookup by _id: ${projectObjectId}`, !!projectState ? 'FOUND' : 'NOT FOUND')

    if (!projectState) {
      return NextResponse.json(null)
    }

    // Get chat history
    const chatHistory = await db.collection('chatHistory')
      .findOne({ projectId: projectId })

    console.log('API: Found chatHistory document:', chatHistory ? 'Yes' : 'No')
    
    // Extract messages from the chatHistory document
    const messages = chatHistory?.messages || []
    console.log('API: Found', messages.length, 'messages for project', projectId)

    return NextResponse.json({
      ...projectState,
      chatHistory: messages
    })
  } catch (error) {
    console.error('API Error in GET /api/project-state:', error)
    return NextResponse.json({ error: 'Failed to fetch project state' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Get session
    const session = await getServerAuthSession()
    if (!session) {
      console.log('API: Unauthorized access attempt')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { projectId } = body

    if (!projectId || !ObjectId.isValid(projectId)) {
      console.error('Invalid project ID format:', projectId)
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 })
    }

    console.log('API: Initializing project state for ID:', projectId)

    // Connect to MongoDB using clientPromise
    const client = await clientPromise
    const db = client.db('test')
    
    const projectObjectId = new ObjectId(projectId)
    
    // IMPORTANT - Look for project state document using _id field that matches project ID
    const existingState = await db.collection('projectStates').findOne({
      _id: projectObjectId
    })
    
    console.log(`API: Existing state check by _id: ${projectObjectId}`, !!existingState ? 'FOUND' : 'NOT FOUND')

    if (existingState) {
      // Get existing chat history
      const chatHistory = await db.collection('chatHistory')
        .findOne({ projectId: projectId })
      
      // Extract messages from the chatHistory document
      const messages = chatHistory?.messages || []
      console.log('API: Project state exists with', messages.length, 'messages')
      
      return NextResponse.json({
        ...existingState,
        chatHistory: messages
      })
    }

    // Get project details
    const project = await db.collection('projects').findOne({ _id: projectObjectId })
    if (!project) {
      console.error('Project not found:', projectId)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get repository data - reuse existing if available
    const repository = await db.collection('repositories').findOne({
      linkedProjects: projectObjectId
    })

    // Get analysis data if it exists
    const analysis = await db.collection('analyses').findOne({
      projectId: projectObjectId
    })

    // Create initial state without chatHistory array
    const initialState = {
      _id: projectObjectId, // IMPORTANT - Use the project's ID as the _id of this document
      projectId: projectObjectId, // Keep projectId as a reference field
      currentPhase: 'Development Environment Setup',
      phases: [
        {
          name: 'Development Environment Setup',
          status: 'in_progress' as const,
          steps: [
            {
              id: 1,
              title: 'Initialize Project',
              status: 'pending' as const,
              action: 'Initialize new project with selected tech stack',
              dependencies: [],
              progress: '0'
            }
          ]
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Insert new project state
    console.log('API: Creating new project state...')
    console.log('API: Using project ID as _id:', projectObjectId.toString())
    
    const stateResult = await db.collection('projectStates').insertOne(initialState)
    if (!stateResult.acknowledged) {
      throw new Error('Failed to insert project state')
    }
    
    console.log('API: Project state created with ID:', stateResult.insertedId.toString())

    // Create welcome message with analysis data
    const welcomeMessage = {
      _id: new ObjectId(),
      projectId: projectId, // Use string ID for chat history lookup consistency
      id: new ObjectId().toString(),
      role: 'assistant',
      content: `Welcome! I am G.R.I.P., your GitHub Repo-Analysis Intellectual Partner. I have analyzed your project:

📋 Project Overview
-----------------
${project.title}
${project.description}

🎯 Project Requirements
--------------------
• Goals: ${project.ideation?.goals || 'Not specified'}
• Target Audience: ${project.ideation?.targetAudience || 'Not specified'}
• Key Features: ${project.ideation?.keyFeatures || 'Not specified'}
• Technical Stack: ${project.ideation?.technicalRequirements || 'Not specified'}

${repository ? `
🔍 Repository Analysis
-------------------
• Total Files: ${repository.files?.length || 0}
• Languages: ${Object.keys(repository.languages || {}).join(', ') || 'None detected'}
• Status: Repository cloned and analyzed successfully
` : '⚠️ Repository pending analysis'}

${analysis ? `
📊 Code Analysis
-------------
• File Count: ${analysis.codeStructure?.fileCount || 0}
• Main Languages: ${Object.keys(analysis.codeStructure?.mainLanguages || {}).join(', ') || 'None detected'}
• Components: ${analysis.codeStructure?.components?.length || 0}
• Features: ${analysis.codeStructure?.features?.length || 0}

🎯 Recommendations
---------------
${analysis.recommendations?.map((rec: string) => `• ${rec}`).join('\n') || 'No recommendations available yet'}
` : '⚠️ Code analysis pending'}

Would you like to begin with the development environment setup?`,
      timestamp: new Date()
    }

    // Log the structure of the welcome message for debugging
    console.log('Welcome message structure:', JSON.stringify({
      _id: welcomeMessage._id.toString(),
      projectId: welcomeMessage.projectId,
      id: welcomeMessage.id,
      role: welcomeMessage.role,
      content: welcomeMessage.content.substring(0, 100) + '...',
      timestamp: welcomeMessage.timestamp
    }, null, 2))

    // Save welcome message to chatHistory collection
    console.log('API: Creating welcome message...')
    
    try {
      // The schema expects: 
      // 1. projectId as string (not ObjectId)
      // 2. messages array
      // 3. specific fields
      const chatHistoryDoc = {
        projectId: projectId, // String ID instead of ObjectId
        messages: [{
          id: new ObjectId().toString(),
          role: 'assistant',
          content: welcomeMessage.content,
          timestamp: new Date()
        }],
        updatedAt: new Date()
      }
      
      console.log('API: Chat document before insert:', JSON.stringify({
        _id: 'new document',
        projectId: chatHistoryDoc.projectId,
        messagesCount: chatHistoryDoc.messages.length,
        firstMessageRole: chatHistoryDoc.messages[0].role,
        firstMessageLength: chatHistoryDoc.messages[0].content.length
      }, null, 2))
      
      // Check if a document already exists for this project
      const existingChatDoc = await db.collection('chatHistory').findOne({ projectId: projectId })
      if (existingChatDoc) {
        console.log('API: Found existing chat document for project:', projectId)
        console.log('API: Existing document has', existingChatDoc.messages?.length || 0, 'messages')
      }
      
      const insertResult = await db.collection('chatHistory').insertOne(chatHistoryDoc)
      console.log('Successfully inserted welcome message with corrected structure:', JSON.stringify({
        acknowledged: insertResult.acknowledged,
        insertedId: insertResult.insertedId?.toString()
      }, null, 2))
      
      // Verify the document was inserted correctly
      const verifyDoc = await db.collection('chatHistory').findOne({ _id: insertResult.insertedId })
      console.log('API: Inserted document verification:', JSON.stringify({
        found: !!verifyDoc,
        projectId: verifyDoc?.projectId,
        messageCount: verifyDoc?.messages?.length || 0
      }, null, 2))
    } catch (error: any) {
      console.error('Error inserting chatHistory:', error.message)
      console.log('Detailed error info:', JSON.stringify(error.errInfo?.details || {}, null, 2))
      throw new Error('Failed to insert chat history')
    }

    // Get all chat history for response
    const chatHistory = await db.collection('chatHistory')
      .findOne({ projectId: projectId })
    
    // Extract messages from the chatHistory document
    const messages = chatHistory?.messages || []
    console.log('API: Project state initialized with', messages.length, 'messages')

    console.log('API: Project state initialized with welcome message')
    return NextResponse.json({
      ...initialState,
      chatHistory: messages
    })
  } catch (error) {
    console.error('API Error in POST /api/project-state:', error)
    return NextResponse.json({ error: 'Failed to initialize project state' }, { status: 500 })
  }
}