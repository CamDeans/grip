import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { anthropicService } from '@/lib/services/anthropicService'
import { getOrBuildRepoContextDocument } from '@/lib/services/repoContextService'

// Phase 2, Step 2: Create Project Data Fetcher for enhanced chat

// Build a custom system prompt with project context
const buildSystemPrompt = (projectContext: any, analysisContext: any, repoReferenceDoc?: string) => {
  let prompt = `You are G.R.I.P. (Guided Real-time Intelligence Partner) designed to help with software development projects. 
You are not Claude or an Anthropic AI. You are G.R.I.P., an AI assistant built specifically for helping developers automate project creation.

Your primary purpose is to help guide users through building out projects by writing code, creating files, and implementing features
based on the project ideation, repository structure, and existing code in the cloned GitHub repository.

`

  // Add project context if available
  if (projectContext) {
    prompt += `## Project Information
- Title: "${projectContext.title}"
- Description: "${projectContext.description}"
`

    if (projectContext.repository) {
      prompt += `- Repository: ${projectContext.repository.owner}/${projectContext.repository.name}
`
    }

    if (projectContext.ideation) {
      prompt += `
### Project Goals
${projectContext.ideation.goals}

### Target Audience
${projectContext.ideation.targetAudience}

### Key Features
${projectContext.ideation.keyFeatures}

### Technical Requirements
${projectContext.ideation.technicalRequirements}
`
    }
  }

  // Add analysis context if available - enhanced to provide more actionable insights
  if (analysisContext) {
    prompt += `\n## Repository Analysis\n`

    if (analysisContext.repositoryStructure) {
      prompt += `- Total Files: ${analysisContext.repositoryStructure.totalFiles}
`

      if (analysisContext.repositoryStructure.languages) {
        prompt += `- Languages: `
        prompt += Object.entries(analysisContext.repositoryStructure.languages)
          .map(([lang, value]) => `${lang} (${typeof value === 'number' ? Math.round(value) + '%' : value})`)
          .join(', ')
        prompt += `\n`
      }
      
      // Add file structure information to help with understanding the codebase
      if (analysisContext.repositoryStructure.files && analysisContext.repositoryStructure.files.length > 0) {
        prompt += `\n### Key Project Files\n`
        
        // Group files by type/directory for better organization
        const filesByType: Record<string, string[]> = {};
        analysisContext.repositoryStructure.files.forEach((file: any) => {
          const ext = file.path.split('.').pop() || 'other';
          if (!filesByType[ext]) {
            filesByType[ext] = [];
          }
          filesByType[ext].push(file.path);
        });
        
        // Include important files by type in the prompt
        Object.entries(filesByType).forEach(([type, files]) => {
          if (files.length > 0) {
            prompt += `- ${type.toUpperCase()} files: ${files.slice(0, 5).join(', ')}${files.length > 5 ? ` (and ${files.length - 5} more)` : ''}\n`
          }
        });
      }
    }

    if (analysisContext.codeStructure) {
      prompt += `\n### Code Structure
- File Count: ${analysisContext.codeStructure.fileCount}
`

      if (analysisContext.codeStructure.components && analysisContext.codeStructure.components.length > 0) {
        prompt += `- Components: ${analysisContext.codeStructure.components.join(', ')}
`
      }

      if (analysisContext.codeStructure.features && analysisContext.codeStructure.features.length > 0) {
        prompt += `- Features: ${analysisContext.codeStructure.features.join(', ')}
`
      }
      
      // Add main entry points and architecture information
      if (analysisContext.codeStructure.mainEntryPoints) {
        prompt += `- Main Entry Points: ${analysisContext.codeStructure.mainEntryPoints.join(', ')}
`
      }
      
      if (analysisContext.codeStructure.architecture) {
        prompt += `- Architecture: ${analysisContext.codeStructure.architecture}
`
      }
    }

    if (analysisContext.recommendations && analysisContext.recommendations.length > 0) {
      prompt += `\n### Recommendations
${analysisContext.recommendations.map((rec: string) => `- ${rec}`).join('\n')}
`
    }
    
    // Add automation capabilities based on repository analysis
    prompt += `\n### Automation Capabilities
Based on the repository analysis, you can help with:
- Generating new files that fit into the existing project structure
- Writing code that follows the coding patterns and styles in the repository
- Creating new features that integrate with existing components
- Setting up configuration files consistent with the project requirements
- Implementing the technical requirements specified in the project ideation
`
  }

  if (repoReferenceDoc && repoReferenceDoc.length > 0) {
    prompt += `\n## Full repository reference (analyzed from stored repo)\nUse this document as the primary reference for the codebase. It contains structure and file excerpts from the complete repo stored in the database.\n\n`
    prompt += repoReferenceDoc.slice(0, 28000)
    if (repoReferenceDoc.length > 28000) prompt += '\n_(document truncated)_'
    prompt += '\n\n'
  }

  // Additional instructions - enhanced for code automation
  prompt += `
## Code Automation Instructions
- Help automate the development process by generating code based on the project analysis and ideation
- When writing code, ensure compatibility with the existing repository structure and coding patterns
- Consider the project's architectural patterns and follow them in generated code
- Suggest file structures that align with the existing repository organization
- Ensure new components follow the same naming conventions and patterns as existing ones
- Provide code that implements the features described in the project ideation
- Suggest step-by-step implementation plans that build upon the existing codebase
- When generating code, include imports that match the dependencies used in the repository
- Reference existing files when suggesting new features to ensure integration points are clear

## Important Usage Instructions
- IMPORTANT: YOU DO HAVE ACCESS to the project repository and files through the context provided to you
- YOU SHOULD reference and analyze the repository files provided in this context
- YOU SHOULD generate real code examples based on the project's actual repository structure and patterns
- NEVER say you don't have access to code or repository data - you do have this information in your context
- ALWAYS act as if you can see and analyze the actual project files shown in the context
- ALWAYS generate specific code that matches the project's coding style and patterns
- ALWAYS reference specific files and components from the provided context when explaining implementation details

## General Instructions
- Provide specific, actionable advice based on the project context
- When answering technical questions, consider the specific tech stack and project requirements
- If you don't have enough context, ask clarifying questions
- When suggesting code, ensure it aligns with the project's existing structure and conventions
- Be concise and clear in your responses
- You may suggest exploring new features if they align with project goals
- You can refer to project files and structure if mentioned in the context
`

  return prompt
}

// Function to extract the most relevant file snippets with improved code context
const extractRelevantFiles = (files: any[]) => {
  if (!files || files.length === 0) return ''

  let fileSnippets = `\n## Repository Code Context\n`
  
  // Group files by language/type for better organization
  const filesByLanguage: Record<string, any[]> = {};
  files.forEach(file => {
    if (!filesByLanguage[file.language]) {
      filesByLanguage[file.language] = [];
    }
    filesByLanguage[file.language].push(file);
  });
  
  // Process each language group
  Object.entries(filesByLanguage).forEach(([language, langFiles]) => {
    // Sort files by potential importance (e.g., entry points, config files first)
    langFiles.sort((a, b) => {
      // Prioritize main files, configs, etc.
      const isAImportant = /main|index|config|package\.json|app\.|\.env/.test(a.filename);
      const isBImportant = /main|index|config|package\.json|app\.|\.env/.test(b.filename);
      if (isAImportant && !isBImportant) return -1;
      if (!isAImportant && isBImportant) return 1;
      return 0;
    });

    // Include a more substantial number of important files per language
    const topFiles = langFiles.slice(0, 5);
    
    if (topFiles.length > 0) {
      fileSnippets += `\n### ${language.toUpperCase()} Files\n`;
      
      topFiles.forEach(file => {
        const fullPath = `${file.path}/${file.filename}`;
        fileSnippets += `\n#### ${fullPath}\n`;
        
        // Get a meaningful snippet (prioritize imports and main declarations)
        const contentLines = file.content.split('\n');
        
        // Extract imports and main declarations
        const importLines: string[] = [];
        const declarationLines: string[] = [];
        const otherImportantLines: string[] = [];
        
        // Pattern for finding important code parts
        const importPattern = /^import|^const|^function|^class|^interface|^type|^export/;
        
        contentLines.forEach((line: string, index: number) => {
          // Capture imports
          if (line.trim().startsWith('import ')) {
            importLines.push(line);
          } 
          // Capture main declarations
          else if (importPattern.test(line.trim())) {
            declarationLines.push(line);
            // Add the next few lines for context (increased from 3 to 5)
            const nextLines = contentLines.slice(index+1, index+6).filter((l: string) => l.trim() !== '');
            declarationLines.push(...nextLines);
          }
          // Other potentially important lines 
          else if (line.includes('function') || line.includes('class') || line.includes('interface')) {
            otherImportantLines.push(line);
            // Add surrounding context for better understanding
            const prevLine = index > 0 ? contentLines[index-1] : '';
            const nextLine = index < contentLines.length - 1 ? contentLines[index+1] : '';
            if (prevLine.trim() !== '') otherImportantLines.push(prevLine);
            if (nextLine.trim() !== '') otherImportantLines.push(nextLine);
          }
        });
        
        // Build a meaningful snippet that shows structure without overwhelming
        fileSnippets += "```" + language + "\n";
        
        // Add imports
        if (importLines.length > 0) {
          fileSnippets += "// Imports\n";
          fileSnippets += importLines.slice(0, 10).join('\n');
          if (importLines.length > 10) {
            fileSnippets += `\n// ... ${importLines.length - 10} more imports ...\n`;
          }
          fileSnippets += "\n\n";
        }
        
        // Add key declarations
        if (declarationLines.length > 0) {
          fileSnippets += "// Key declarations\n";
          fileSnippets += declarationLines.slice(0, 15).join('\n');
          if (declarationLines.length > 15) {
            fileSnippets += `\n// ... ${declarationLines.length - 15} more declarations ...\n`;
          }
          fileSnippets += "\n";
        }
        
        // Add other important code fragments that might have been missed
        if (otherImportantLines.length > 0 && declarationLines.length < 10) {
          fileSnippets += "\n// Other important code\n";
          fileSnippets += otherImportantLines.slice(0, 10).join('\n');
          fileSnippets += "\n";
        }
        
        // Add a small code sample if the above extraction didn't yield much
        if (importLines.length + declarationLines.length + otherImportantLines.length < 10) {
          fileSnippets += "\n// Sample code excerpt\n";
          // Get a substantial middle portion of the file for better context
          const middleIndex = Math.floor(contentLines.length / 2);
          const excerptStart = Math.max(0, middleIndex - 10);
          fileSnippets += contentLines.slice(excerptStart, excerptStart + 20).join('\n');
          fileSnippets += "\n";
        }
        
        // Add file length info for context
        fileSnippets += `\n// Total file length: ${contentLines.length} lines\n`;
        fileSnippets += "```\n";
      });
    }
  });
  
  // Add guidance for using the code context
  fileSnippets += `
### Code Integration Guidelines
- When generating new code, follow the patterns and styles from these existing files
- Match the import patterns and component structures shown in the relevant files
- Ensure new code maintains consistency with the project's coding standards
- Reference these files when suggesting implementation approaches
`;
  
  return fileSnippets
}

// Define the ChatMessage type
interface ChatMessage {
  role: string;
  content: string;
  timestamp?: Date;
  metadata?: {
    projectId?: string;
    userId?: string;
    type?: string;
    status?: string;
  };
}

// Define the MongoDB document type
interface ChatMessageDocument extends ChatMessage {
  _id: ObjectId;
}

// Define the ChatHistory document type
interface ChatHistoryDocument {
  _id: ObjectId;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessageDocument[];
  metadata: {
    lastMessage: ChatMessageDocument | null;
    totalMessages: number;
    lastUpdated: Date;
  };
}

// Helper function to save chat message to MongoDB
async function saveChatMessage(projectId: string, message: ChatMessage) {
  try {
    console.log('DB: Starting saveChatMessage function')
    console.log('DB: Project ID:', projectId)
    console.log('DB: Message:', JSON.stringify(message, null, 2))

    const client = await clientPromise
    const db = client.db()
    console.log('DB: Connected to database')

    // Convert projectId to ObjectId
    const projectObjectId = new ObjectId(projectId)
    console.log('DB: Converted projectId to ObjectId:', projectObjectId)

    // Create the new message with proper structure
    const newMessage = {
      _id: new ObjectId(),
      id: new ObjectId().toString(),
      content: message.content,
      role: message.role,
      timestamp: new Date(),
      metadata: {
        projectId: projectId,
        userId: message.metadata?.userId,
        type: 'chat',
        status: 'sent'
      }
    }
    console.log('DB: Created new message document:', JSON.stringify(newMessage, null, 2))

    // First, ensure the chat history document exists with proper structure
    console.log('DB: Attempting to create/update chat history document')
    const initialDoc = {
      projectId: projectObjectId,
      id: new ObjectId().toString(),
      role: 'system',
      content: 'Chat history initialized',
      timestamp: new Date(),
      messages: [],
      metadata: {
        lastMessage: null,
        totalMessages: 0,
        lastUpdated: new Date()
      }
    }
    console.log('DB: Initial document structure:', JSON.stringify(initialDoc, null, 2))

    // Check if message already exists to prevent duplicates
    const existingMessage = await db.collection('chatHistory').findOne({
      projectId: projectObjectId,
      'messages.content': message.content,
      'messages.role': message.role,
      'messages.timestamp': {
        $gte: new Date(Date.now() - 5000) // Within last 5 seconds
      }
    })

    if (existingMessage) {
      console.log('DB: Message already exists, skipping save')
      return existingMessage.messages[existingMessage.messages.length - 1]
    }

    await db.collection('chatHistory').updateOne(
      { projectId: projectObjectId },
      {
        $setOnInsert: initialDoc
      },
      { upsert: true }
    )
    console.log('DB: Create/update completed')

    // Then update the document with the new message
    console.log('DB: Attempting to update document with new message')
    const result = await db.collection('chatHistory').updateOne(
      { projectId: projectObjectId },
      {
        $push: { messages: newMessage as any },
        $set: { 
          updatedAt: new Date(),
          'metadata.lastMessage': newMessage,
          'metadata.lastUpdated': new Date()
        },
        $inc: { 'metadata.totalMessages': 1 }
      }
    )
    console.log('DB: Update result:', JSON.stringify(result, null, 2))

    if (result.modifiedCount === 0) {
      console.error('DB: Failed to save chat message - no documents modified')
      throw new Error('Failed to save chat message')
    }

    console.log('DB: Successfully saved chat message')
    return newMessage
  } catch (error) {
    console.error('DB: Error saving chat message:', error)
    console.error('DB: Error details:', JSON.stringify(error, null, 2))
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, projectId } = await request.json()

    if (!projectId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if the message is development-related
    const developmentKeywords = [
      'code', 'programming', 'development', 'build', 'create', 'implement',
      'function', 'component', 'file', 'database', 'api', 'server', 'client',
      'react', 'next', 'typescript', 'javascript', 'python', 'java', 'c++',
      'git', 'repository', 'deploy', 'test', 'debug', 'error', 'fix', 'update',
      'install', 'package', 'dependency', 'framework', 'library', 'tool',
      'config', 'setup', 'environment', 'server', 'database', 'api', 'endpoint'
    ]

    const isDevelopmentRelated = developmentKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    )

    if (!isDevelopmentRelated) {
      return NextResponse.json({
        message: `I am G.R.I.P. (Guided Real-time Intelligence Partner), your AI development assistant created by Master Cameron. I'm specifically designed to help with software development projects, including:

• Code generation and implementation
• Project structure and architecture
• Development best practices
• Technical problem-solving
• Software testing and debugging
• Project automation and deployment

I focus on providing technical guidance and development assistance. For questions about other topics, I recommend consulting appropriate resources or experts in those fields. How can I help you with your development project today?`
      })
    }

    // Get project context
    const client = await clientPromise
    const db = client.db('test')
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId)
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get analysis context
    const analysis = await db.collection('analyses').findOne({
      projectId: new ObjectId(projectId)
    })

    // Get or build repo reference document (full repo analyzed and submitted to Claude at chat start)
    const repoReferenceDoc = await getOrBuildRepoContextDocument(projectId)

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(project, analysis, repoReferenceDoc)

    // Initialize Anthropic service
    await anthropicService.initialize()

    // Generate response using G.R.I.P.
    const response = await anthropicService.createMessage([
      {
        role: 'user',
        content: message
      }
    ], {
      system: systemPrompt
    })

    const aiMessage = response.content || 'I apologize, but I could not generate a response.'

    // Save AI response
    await saveChatMessage(projectId, {
      role: 'assistant',
      content: aiMessage,
      timestamp: new Date()
    })

    return NextResponse.json({
      message: aiMessage,
      refreshContext: false
    })
  } catch (error) {
    console.error('Error in enhanced chat:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
} 