import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { getServerAuthSession } from '@/lib/auth'
import { ObjectId } from 'mongodb'
import path from 'path'

export const dynamic = 'force-dynamic'

/**
 * Terminal Command Suggestions API
 * Part of Phase 6, Step 5 of G.R.I.P. Enhancement Plan - Add Command Suggestions
 * 
 * This endpoint provides intelligent command suggestions based on:
 * - Project context (framework, technologies, etc.)
 * - Current directory context
 * - Previously executed commands
 */

export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const directory = searchParams.get('directory') || '/'
    
    // Connect to MongoDB
    await connectToDatabase()
    
    // Prepare response with default suggestions
    const result: {
      suggestions: Array<{
        command: string
        description: string
        relevance: number
        example?: string
      }>
    } = {
      suggestions: []
    }
    
    // If no project ID is provided, return default suggestions
    if (!projectId) {
      result.suggestions = getDefaultSuggestions(directory)
      return NextResponse.json(result)
    }
    
    // Get project info from database to determine technology stack
    let projectTech: string[] = []
    try {
      const db = (global as any).mongoConnection.db('test')
      const projectsCollection = db.collection('projects')
      
      const project = await projectsCollection.findOne({ 
        _id: new ObjectId(projectId) 
      })
      
      if (project) {
        // Extract technology information
        projectTech = [
          ...(project.technologies || []),
          ...(project.frameworks || []),
          ...(project.languages || [])
        ]
      }
    } catch (error) {
      console.error('Error fetching project info:', error)
      // Fall back to default suggestions if project lookup fails
      result.suggestions = getDefaultSuggestions(directory)
      return NextResponse.json(result)
    }
    
    // Get project-specific suggestions based on tech stack
    const projectSuggestions = await getProjectSuggestions(projectTech)
    
    // Combine with default suggestions
    result.suggestions = [
      ...projectSuggestions,
      ...getDefaultSuggestions(directory)
    ]
    
    // Remove duplicates and sort by relevance
    result.suggestions = Array.from(
      new Map(result.suggestions.map(s => [s.command, s])).values()
    ).sort((a, b) => b.relevance - a.relevance)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}

/**
 * Get default suggestions based on directory context
 */
function getDefaultSuggestions(directory: string): Array<{
  command: string
  description: string
  relevance: number
  example?: string
}> {
  const suggestions: Array<{
    command: string
    description: string
    relevance: number
    example?: string
  }> = []
  
  // Add directory-specific suggestions
  const dirName = path.basename(directory)
  
  if (directory === '/') {
    // Root directory suggestions
    suggestions.push(
      { 
        command: 'ls -la', 
        description: 'List all files including hidden ones', 
        relevance: 90 
      },
      { 
        command: 'mkdir project', 
        description: 'Create a new project directory', 
        relevance: 85 
      }
    )
  }
  
  // Check for common directories and add relevant suggestions
  if (dirName === 'node_modules' || directory.includes('node_modules')) {
    suggestions.push(
      { 
        command: 'cd ..', 
        description: 'Navigate out of node_modules directory', 
        relevance: 95 
      },
      { 
        command: 'ls -l | wc -l', 
        description: 'Count number of packages', 
        relevance: 75 
      }
    )
  } else if (dirName === 'src' || directory.includes('/src')) {
    suggestions.push(
      { 
        command: 'find . -name "*.js" | wc -l', 
        description: 'Count JavaScript files', 
        relevance: 80 
      },
      { 
        command: 'grep -r "import" --include="*.js" .', 
        description: 'Find all imports in JS files', 
        relevance: 75 
      }
    )
  } else if (dirName === 'test' || directory.includes('/test')) {
    suggestions.push(
      { 
        command: 'npm test', 
        description: 'Run tests', 
        relevance: 90 
      },
      { 
        command: 'grep -r "describe" --include="*.js" .', 
        description: 'Find test suites', 
        relevance: 80 
      }
    )
  }
  
  return suggestions
}

/**
 * Get project-specific suggestions based on technology stack
 */
async function getProjectSuggestions(
  technologies: string[]
): Promise<Array<{
  command: string
  description: string
  relevance: number
  example?: string
}>> {
  const suggestions: Array<{
    command: string
    description: string
    relevance: number
    example?: string
  }> = []
  
  // Check for specific technologies and add relevant suggestions
  if (technologies.some(tech => ['react', 'next.js', 'nextjs'].includes(tech.toLowerCase()))) {
    suggestions.push(
      { 
        command: 'npm run dev', 
        description: 'Start Next.js development server', 
        relevance: 95 
      },
      { 
        command: 'npm run build', 
        description: 'Build Next.js production bundle', 
        relevance: 90 
      },
      { 
        command: 'npx next telemetry disable', 
        description: 'Disable Next.js telemetry', 
        relevance: 70 
      }
    )
  }
  
  if (technologies.some(tech => ['node', 'nodejs', 'express'].includes(tech.toLowerCase()))) {
    suggestions.push(
      { 
        command: 'node server.js', 
        description: 'Start Node.js server', 
        relevance: 90 
      },
      { 
        command: 'npm start', 
        description: 'Start Node application', 
        relevance: 90 
      },
      { 
        command: 'npm run dev', 
        description: 'Start development server', 
        relevance: 85 
      }
    )
  }
  
  if (technologies.some(tech => ['typescript', 'ts'].includes(tech.toLowerCase()))) {
    suggestions.push(
      { 
        command: 'npx tsc', 
        description: 'Compile TypeScript files', 
        relevance: 90 
      },
      { 
        command: 'npx tsc --watch', 
        description: 'Watch and compile TypeScript files', 
        relevance: 85 
      },
      { 
        command: 'npx ts-node index.ts', 
        description: 'Run TypeScript file directly', 
        relevance: 80 
      }
    )
  }
  
  if (technologies.some(tech => ['mongodb', 'mongo'].includes(tech.toLowerCase()))) {
    suggestions.push(
      { 
        command: 'mongosh', 
        description: 'Start MongoDB shell', 
        relevance: 85 
      },
      { 
        command: 'mongodump --db test', 
        description: 'Backup MongoDB database', 
        relevance: 80 
      },
      { 
        command: 'mongorestore --db test dump/test', 
        description: 'Restore MongoDB database', 
        relevance: 80 
      }
    )
  }
  
  if (technologies.some(tech => ['docker', 'container'].includes(tech.toLowerCase()))) {
    suggestions.push(
      { 
        command: 'docker ps', 
        description: 'List running containers', 
        relevance: 90 
      },
      { 
        command: 'docker-compose up', 
        description: 'Start containers with docker-compose', 
        relevance: 90 
      },
      { 
        command: 'docker build -t myapp .', 
        description: 'Build Docker image', 
        relevance: 85 
      }
    )
  }
  
  return suggestions
} 