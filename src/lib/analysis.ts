import Anthropic from '@anthropic-ai/sdk'
import { getRepositoryContentServer } from './github'
import { getAnthropicApiKey, ANTHROPIC_MODEL_OPUS } from '@/lib/anthropicConfig'

function getAnthropicClient() {
  const apiKey = getAnthropicApiKey()
  if (!apiKey) return null
  return new Anthropic({ apiKey })
}

interface FileAnalysis {
  path: string
  content: string
  analysis: string
}

interface GitHubContent {
  type: 'file' | 'dir' | 'submodule' | 'symlink'
  size: number
  name: string
  path: string
  content?: string
  sha: string
  url: string
  git_url: string | null
  html_url: string | null
  download_url: string | null
  _links: {
    self: string
    git: string
    html: string
  }
  target?: string
  submodule_git_url?: string
}

interface GitHubFileContent extends Omit<GitHubContent, 'type' | 'content'> {
  type: 'file'
  encoding: string
  content: string
  target?: undefined
  submodule_git_url?: undefined
}

export async function analyzeRepositoryStructure(owner: string, repo: string, projectId: string) {
  try {
    // Get repository content
    const content = await getRepositoryContentServer(owner, repo)
    
    // Process files
    const files = Array.isArray(content) ? content : [content]
    
    // Filter for file content only
    const fileContents = files.filter((f): f is GitHubFileContent => 
      f.type === 'file' && 'encoding' in f && typeof f.content === 'string'
    )

    // Analyze important files (limit to first 5 for performance)
    const fileAnalyses = await Promise.all(
      fileContents
        .filter(f => {
          // Focus on key files like package.json, tsconfig.json, and main source files
          const isConfigFile = /\.(json|ya?ml|env)$/.test(f.path)
          const isSourceFile = /\.(ts|tsx|js|jsx)$/.test(f.path)
          const isRootFile = !f.path.includes('/')
          return (isConfigFile && isRootFile) || (isSourceFile && f.path.includes('src/'))
        })
        .slice(0, 5)
        .map(async (file) => ({
          path: file.path,
          content: file.content,
          analysis: await analyzeFile(file.content, file.path)
        }))
    )

    // Generate project-level analysis
    const projectAnalysis = await generateProjectAnalysis(
      fileAnalyses.map(f => ({
        path: f.path,
        content: f.content,
        analysis: extractTextFromResponse(f.analysis)
      }))
    )
    
    // Build analysis structure
    const analysis = {
      projectId,
      fileCount: fileContents.length,
      directoryStructure: fileContents.map(f => f.path),
      mainLanguages: getLanguageStats(fileContents),
      components: [],
      features: [],
      fileAnalyses: fileAnalyses.map(f => ({
        path: f.path,
        analysis: extractTextFromResponse(f.analysis)
      })),
      projectAnalysis: extractTextFromResponse(projectAnalysis)
    }
    
    return analysis
  } catch (error) {
    console.error('Repository analysis error:', error)
    throw new Error('Failed to analyze repository')
  }
}

function getLanguageStats(files: GitHubContent[]) {
  const stats: Record<string, number> = {}
  files.forEach(file => {
    const ext = file.path.split('.').pop()?.toLowerCase()
    if (ext) {
      stats[ext] = (stats[ext] || 0) + 1
    }
  })
  return stats
}

async function analyzeFile(content: string, path: string) {
  try {
    const anthropic = getAnthropicClient()
    if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not set')
    return await anthropic.messages.create({
      model: ANTHROPIC_MODEL_OPUS,
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `
          Analyze this code file (${path}) and provide:
          1. Code Structure Overview
          2. Key Components/Functions
          3. Potential Improvements
          4. Security Considerations
          5. Best Practices Adherence
          6. Dependencies and Integration Points

          Code:
          ${content}
        `
      }]
    })
  } catch (error) {
    console.error('File analysis error:', error)
    throw new Error('Failed to analyze file')
  }
}

async function generateProjectAnalysis(analyses: FileAnalysis[]) {
  try {
    const projectOverview = analyses.map(a => `
      File: ${a.path}
      Content: ${a.content}
      Analysis: ${a.analysis}
    `).join('\n\n')

    const anthropic = getAnthropicClient()
    if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not set')
    return await anthropic.messages.create({
      model: ANTHROPIC_MODEL_OPUS,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `
          Based on the following repository analysis, provide:
          1. Overall Project Architecture
          2. Main Technologies Used
          3. Project Structure Recommendations
          4. Integration Patterns
          5. Scalability Considerations
          6. Development Recommendations

          Repository Analysis:
          ${projectOverview}
        `
      }]
    })
  } catch (error) {
    console.error('Project analysis error:', error)
    throw new Error('Failed to generate project analysis')
  }
}

function extractTextFromResponse(response: Anthropic.Message) {
  if (!response.content || response.content.length === 0) {
    return ''
  }

  const content = response.content[0]
  if ('text' in content) {
    return content.text
  }

  return ''
}

export async function generateCodeSuggestions(analysis: string) {
  try {
    const anthropic = getAnthropicClient()
    if (!anthropic) throw new Error('ANTHROPIC_API_KEY is not set')
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL_OPUS,
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `
          Based on the repository analysis, suggest:
          1. Code Improvements
          2. New Features
          3. Refactoring Opportunities
          4. Performance Optimizations
          5. Security Enhancements
          
          Analysis Context:
          ${analysis}
        `
      }]
    })

    return extractTextFromResponse(response)
  } catch (error) {
    console.error('Code suggestions error:', error)
    throw new Error('Failed to generate code suggestions')
  }
}

// Export for potential standalone use
export { generateProjectAnalysis }
