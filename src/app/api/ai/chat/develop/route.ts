import { getServerAuthSession } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { clientPromise } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function POST(req: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      console.error('No session found in AI chat endpoint')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, message, history, context } = await req.json()
    console.log(`Processing request for project: ${projectId}`)

    // Get project data including ideation
    const client = await clientPromise
    const db = client.db()

    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId)
    })

    if (!project) {
      console.error('Project not found:', projectId)
      throw new Error('Project not found')
    }

    // Get repository data
    const repository = await db.collection('repositories').findOne({
      projectId: new ObjectId(projectId)
    })

    // Get latest analysis
    const analysis = await db.collection('analyses')
      .findOne(
        { projectId: new ObjectId(projectId) },
        { sort: { createdAt: -1 } }
      )

    // Check if this is an identity question
    if (message.toLowerCase().includes('who are you') || 
        message.toLowerCase().includes('what are you') ||
        message.toLowerCase().includes('introduce yourself')) {
      return NextResponse.json({
        message: `I am G.R.I.P. (GitHub Repo-Analysis Intellectual Partner), your AI development assistant created by Master Cameron. I'm here to help you build and improve your projects with:

• Intelligent code generation and analysis
• Step-by-step project guidance
• Best practices implementation
• Modern development workflows
• Real-time collaboration

I combine advanced AI capabilities with deep technical knowledge to provide you with the best development experience. How can I assist you with your project today?`
      })
    }

    // Format the response based on the current step in the sequence
    const currentStep = determineCurrentStep(message, history)
    const response = await generateStepResponse(currentStep, {
      project,
      repository,
      analysis,
      context,
      message,
      history
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in AI chat development:', error)
    return NextResponse.json(
      { error: 'Failed to process AI chat request' },
      { status: 500 }
    )
  }
}

function determineCurrentStep(message: string, history: any[]) {
  // Check for progress-related questions
  if (message.toLowerCase().includes('where are we') || 
      message.toLowerCase().includes('progress') ||
      message.toLowerCase().includes('status')) {
    return 'progress'
  }

  // Analyze the message and history to determine which step we're on
  const lastMessage = history[history.length - 1]
  const isInitialMessage = history.length === 0 || 
    (lastMessage?.role === 'assistant' && lastMessage?.id === 'initial')

  if (isInitialMessage) {
    return 'initial'
  }

  // Check message content for step indicators
  const messageLower = message.toLowerCase()
  if (messageLower.includes('setup') || messageLower.includes('initialize')) {
    return 'setup'
  } else if (messageLower.includes('development') || messageLower.includes('build')) {
    return 'development'
  } else if (messageLower.includes('component') || messageLower.includes('structure')) {
    return 'component'
  } else if (messageLower.includes('feature') || messageLower.includes('implement')) {
    return 'feature'
  } else if (messageLower.includes('style') || messageLower.includes('design')) {
    return 'styling'
  } else if (messageLower.includes('test') || messageLower.includes('quality')) {
    return 'testing'
  } else if (messageLower.includes('optimize') || messageLower.includes('performance')) {
    return 'optimization'
  } else if (messageLower.includes('deploy') || messageLower.includes('launch')) {
    return 'deployment'
  } else if (messageLower.includes('document') || messageLower.includes('maintain')) {
    return 'documentation'
  }

  // Default to current step based on history
  return 'development'
}

function analyzeProgress(history: any[]) {
  // Initialize progress tracking
  const progress = {
    currentPhase: 'Project Setup',
    lastCompletedStep: '',
    nextSteps: [] as string[],
    completedSteps: [] as string[],
    overallProgress: 0,
    phaseStatus: {
      'Project Analysis': 'Pending',
      'Environment Setup': 'Pending',
      'Development Tools': 'Pending',
      'Feature Implementation': 'Pending',
      'Testing & Deployment': 'Pending'
    }
  }

  // Analyze each message in history
  history.forEach(message => {
    if (message.role === 'assistant') {
      const content = message.content.toLowerCase()
      
      // Check for completed steps
      if (content.includes('analysis loaded successfully')) {
        progress.completedSteps.push('Load Project Analysis')
        progress.phaseStatus['Project Analysis'] = '✓'
      }
      if (content.includes('project environment initialized')) {
        progress.completedSteps.push('Initialize Project Environment')
        progress.phaseStatus['Environment Setup'] = 'In Progress'
      }
      if (content.includes('repository cloned')) {
        progress.completedSteps.push('Clone Repository')
      }
      if (content.includes('build system configured')) {
        progress.completedSteps.push('Configure Build System')
        progress.phaseStatus['Development Tools'] = 'In Progress'
      }
      // Add more step completion checks as needed
    }
  })

  // Determine last completed step
  progress.lastCompletedStep = progress.completedSteps[progress.completedSteps.length - 1] || 'None'

  // Determine next steps based on last completed step
  const allSteps = [
    'Load Project Analysis',
    'Initialize Project Environment',
    'Clone Repository',
    'Configure Build System',
    'Set up Testing Framework',
    'Configure Development Tools'
  ]

  const lastStepIndex = allSteps.indexOf(progress.lastCompletedStep)
  progress.nextSteps = allSteps.slice(lastStepIndex + 1)

  // Calculate overall progress
  progress.overallProgress = Math.round((progress.completedSteps.length / allSteps.length) * 100)

  return progress
}

async function generateStepResponse(step: string, data: any) {
  const { history } = data

  switch (step) {
    case 'progress':
      const progress = analyzeProgress(history)
      return {
        message: `I am G.R.I.P., your GitHub Repo-Analysis Intellectual Partner. Let me check our current build progress...

Current Phase: ${progress.currentPhase}
Last Completed Step: ${progress.lastCompletedStep}
Next Steps:
${progress.nextSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

Overall Progress: ${progress.overallProgress}% Complete
• Project Analysis: ${progress.phaseStatus['Project Analysis']}
• Environment Setup: ${progress.phaseStatus['Environment Setup']}
• Development Tools: ${progress.phaseStatus['Development Tools']}
• Feature Implementation: ${progress.phaseStatus['Feature Implementation']}
• Testing & Deployment: ${progress.phaseStatus['Testing & Deployment']}

Would you like to continue with the next step?`
      }

    case 'initial':
      return {
        message: `I am G.R.I.P., your GitHub Repo-Analysis Intellectual Partner. Let's start with the initial project setup:

[1. Load Project Analysis]
  Status: Ready
  Action: Loading analysis from MongoDB "test" collection
  Progress: [Loading...]
  Result: ✓ Analysis loaded successfully

[2. Initialize Project Environment]
  Status: Ready
  Action: Creating project structure
  Dependencies: Project Analysis
  [Initialize Environment] [View Details]

[3. Clone Repository]
  Status: Ready
  Action: Downloading code from MongoDB
  Dependencies: Project Environment
  [Clone Repository] [View Details]`
      }

    case 'development':
      return {
        message: `I am G.R.I.P., your GitHub Repo-Analysis Intellectual Partner. Now, let's set up your development environment:

[4. Configure Build System]
  Status: Pending
  Action: Setting up build tools
  Dependencies: Repository
  [Configure Build] [View Details]

[5. Set up Testing Framework]
  Status: Pending
  Action: Configuring test environment
  Dependencies: Build System
  [Setup Testing] [View Details]

[6. Configure Development Tools]
  Status: Pending
  Action: Setting up development tools
  Dependencies: Testing Framework
  [Configure Tools] [View Details]`
      }

    default:
      return {
        message: 'I am G.R.I.P., your GitHub Repo-Analysis Intellectual Partner. I understand your request. How would you like to proceed with the project setup?'
      }
  }
}
