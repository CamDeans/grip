import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'

// Phase 8, Step 4: API Endpoint for Action Buttons

// Mock actions response data
const mockActionResponses: Record<string, { success: boolean, message: string }> = {
  'generate-code': {
    success: true,
    message: 'I would be happy to generate some code for your project. Let me understand what you need.'
  },
  'analyze-code': {
    success: true,
    message: 'I\'ll help analyze your code to find improvements and optimizations.'
  },
  'run-build': {
    success: true,
    message: 'Building your project now. I\'ll monitor the process and let you know when it\'s done.'
  },
  'create-component': {
    success: true,
    message: 'Let\'s create a new component. What kind of component would you like to build?'
  },
  'install-package': {
    success: true,
    message: 'I can help you install a package. Which package would you like to add to your project?'
  },
  'fix-issues': {
    success: true,
    message: 'I\'ll help you fix issues in your code. Please describe the problems you\'re experiencing.'
  },
  'git-operations': {
    success: true,
    message: 'I can assist with Git operations. What would you like to do? (commit, push, create branch, etc.)'
  }
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, action } = await request.json()
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      )
    }
    
    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      )
    }
    
    // Special case for demo project
    if (projectId === 'demo-project-123') {
      if (action && mockActionResponses[action]) {
        // Simulate processing delay (300-800ms)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 300))
        return NextResponse.json(mockActionResponses[action])
      } else {
        return NextResponse.json({
          success: false,
          error: 'Unknown action requested for demo project'
        }, { status: 400 })
      }
    }
    
    // Make sure projectId is a valid ObjectId
    if (!ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project ID format' },
        { status: 400 }
      )
    }
    
    // Connect to database
    const client = await clientPromise
    const db = client.db('test')
    
    // Log the action in activityLogs collection
    await db.collection('activityLogs').insertOne({
      projectId: new ObjectId(projectId),
      action,
      timestamp: new Date(),
      status: 'pending'
    })
    
    // Process different types of actions
    let responseMessage = ''
    let success = true
    
    switch (action) {
      case 'generate-code':
        responseMessage = 'Code generation started. Check the Tasks section for progress.'
        // Create entry in Tasks collection
        await db.collection('tasks').insertOne({
          projectId: new ObjectId(projectId),
          name: 'Generate Code',
          description: 'Generating code based on project context',
          type: 'generate',
          status: 'queued',
          priority: 'normal',
          command: 'generate-code',
          retryCount: 0,
          maxRetries: 3,
          dependencies: [],
          metadata: {
            createdBy: 'user',
            phase: 'Code Generation',
            step: 'Generate Code'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        })
        break
        
      case 'analyze-code':
        responseMessage = 'Code analysis started. Check the Tasks section for progress.'
        // Create entry in Tasks collection
        await db.collection('tasks').insertOne({
          projectId: new ObjectId(projectId),
          name: 'Analyze Code',
          description: 'Analyzing project code structure and quality',
          type: 'analyze',
          status: 'queued',
          priority: 'normal',
          command: 'analyze-code',
          retryCount: 0,
          maxRetries: 3,
          dependencies: [],
          metadata: {
            createdBy: 'user',
            phase: 'Code Analysis',
            step: 'Analyze Code'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        })
        break
        
      case 'run-build':
        responseMessage = 'Build process started. Check the Tasks section for progress.'
        // Create entry in Tasks collection
        await db.collection('tasks').insertOne({
          projectId: new ObjectId(projectId),
          name: 'Run Build',
          description: 'Building the project',
          type: 'build',
          status: 'queued',
          priority: 'high',
          command: 'npm run build',
          retryCount: 0,
          maxRetries: 2,
          dependencies: [],
          metadata: {
            createdBy: 'user',
            phase: 'Build',
            step: 'Run Build'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        })
        break
        
      case 'create-component':
        responseMessage = 'Component creation wizard has been initiated. Check the chat for further instructions.'
        break
        
      case 'install-package':
        responseMessage = 'Package installation wizard has been initiated. Check the chat for further instructions.'
        break
        
      case 'fix-issues':
        responseMessage = 'Issue analysis started. G.R.I.P. will analyze the codebase for issues.'
        // Create entry in Tasks collection
        await db.collection('tasks').insertOne({
          projectId: new ObjectId(projectId),
          name: 'Fix Issues',
          description: 'Analyzing and fixing code issues',
          type: 'analyze',
          status: 'queued',
          priority: 'high',
          command: 'analyze-issues',
          retryCount: 0,
          maxRetries: 3,
          dependencies: [],
          metadata: {
            createdBy: 'user',
            phase: 'Code Quality',
            step: 'Fix Issues'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        })
        break
        
      case 'git-operations':
        responseMessage = 'Git operations wizard has been initiated. Check the chat for further instructions.'
        break
        
      default:
        success = false
        responseMessage = 'Unsupported action requested.'
        break
    }
    
    // Update the action log status
    await db.collection('activityLogs').updateOne(
      { 
        projectId: new ObjectId(projectId),
        action,
        status: 'pending'
      },
      {
        $set: {
          status: success ? 'completed' : 'failed',
          completedAt: new Date(),
          message: responseMessage
        }
      }
    )
    
    return NextResponse.json({
      success,
      message: responseMessage
    })
    
  } catch (error: any) {
    console.error('Error processing action:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to process action' 
      },
      { status: 500 }
    )
  }
} 