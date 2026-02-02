import { Anthropic } from '@anthropic-ai/sdk'
import { ObjectId } from 'mongodb'
import clientPromise from '../db'
import { serializeDocument } from '../utils'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface AIAnalysisResult {
  projectId: string
  analysis: {
    codebase: {
      structure: any
      dependencies: any
      features: string[]
    }
    recommendations: string[]
    nextSteps: string[]
  }
  timestamp: Date
}

export async function analyzeProject(projectId: string): Promise<AIAnalysisResult> {
  try {
    const client = await clientPromise
    const db = client.db()

    // Get project data
    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) })
    if (!project) {
      throw new Error('Project not found')
    }

    // Get project files and structure
    const files = await db.collection('files').find({ projectId }).toArray()
    
    // Prepare context for AI analysis
    const context = {
      project: serializeDocument(project),
      files: files.map(f => serializeDocument(f)),
    }

    // Get AI analysis
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Analyze this project context and provide recommendations:
          ${JSON.stringify(context, null, 2)}
        `
      }]
    })

    // Parse and structure the analysis
    const analysis = {
      codebase: {
        structure: response.content[0].text,
        dependencies: project.dependencies,
        features: []
      },
      recommendations: [],
      nextSteps: []
    }

    // Save analysis result
    const result: AIAnalysisResult = {
      projectId,
      analysis,
      timestamp: new Date()
    }

    await db.collection('analyses').insertOne(result)

    return result
  } catch (error) {
    console.error('Error in AI analysis:', error)
    throw error
  }
}

export async function getProjectSuggestions(projectId: string) {
  try {
    const client = await clientPromise
    const db = client.db()

    // Get latest analysis
    const analysis = await db.collection('analyses')
      .findOne({ projectId }, { sort: { timestamp: -1 } })

    if (!analysis) {
      return {
        suggestions: [],
        timestamp: null
      }
    }

    return {
      suggestions: analysis.recommendations,
      timestamp: analysis.timestamp
    }
  } catch (error) {
    console.error('Error getting project suggestions:', error)
    throw error
  }
}

export async function generateCode(prompt: string, context: any) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Generate code based on this prompt and context:
          Prompt: ${prompt}
          Context: ${JSON.stringify(context, null, 2)}
        `
      }]
    })

    return {
      code: response.content[0].text,
      explanation: response.content[0].text
    }
  } catch (error) {
    console.error('Error generating code:', error)
    throw error
  }
}

export {
  anthropic
} 