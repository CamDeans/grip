import { ObjectId } from 'mongodb'
import { clientPromise } from '../mongodb'
import { getRepositoryFiles, getOrCloneRepository } from '../repository'
import { analyzeRepositoryStructureWithTreeSitter } from '@/lib/treeSitter/treeSitterAnalysis'
import { buildTechnicalAnalysisPromptFromIdeation } from '@/lib/sandbox/ideationToTechnicalPrompt'

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const analysisCache = new Map<string, { data: ProjectAnalysis | null; timestamp: number }>()

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100
const requestCounts = new Map<string, { count: number; timestamp: number }>()

interface RepositoryFile {
  path: string
  type: string
  language?: string
}

interface CodeStructure {
  fileCount: number
  directoryStructure: string[]
  mainLanguages: { [key: string]: number }
  components: any[] // TODO: Define proper component type
  features: any[] // TODO: Define proper feature type
}

interface ComplexityMetrics {
  linesOfCode: number
  averageFileSize: number
  cyclomaticComplexity: number
}

export interface AnalysisStage {
  name: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  progress: number
}

function getLanguageStats(files: RepositoryFile[]): { [key: string]: number } {
  return files.reduce((acc, file) => {
    const lang = file.path.split('.').pop()?.toLowerCase() || 'unknown'
    acc[lang] = (acc[lang] || 0) + 1
    return acc
  }, {} as { [key: string]: number })
}

export async function analyzeProject(projectId: string, repository: { owner: string, name: string }) {
  try {
    console.log('=== Analysis Service: analyzeProject ===');
    console.log('Parameters:', { projectId, repository });
    
    const projectObjectId = new ObjectId(projectId);
    
    // Get files from cached repository
    console.log('Fetching repository files...');
    const files = await getOrCloneRepository(repository.owner, repository.name, projectId);
    
    console.log('Repository files result:', {
      fileCount: files?.length || 0,
      sampleFiles: files?.slice(0, 3).map(f => f.path) || []
    });

    if (!files || files.length === 0) {
      console.error('No files returned from getOrCloneRepository');
      throw new Error('No files found in repository');
    }

    const client = await clientPromise;
    const db = client.db();

    // Optional: use project ideation to shape tree-sitter analysis (same as sandbox)
    let repositoryAnalysis: any | null = null
    let analysisTokensUsed = 0
    try {
      const projectDoc = await db.collection('projects').findOne(
        { _id: projectObjectId },
        { projection: { ideation: 1 } }
      ) as { ideation?: { goals?: string; targetAudience?: string; keyFeatures?: string; technicalRequirements?: string } } | null
      const { prompt: technicalPrompt, totalTokens: ideationTokens } = await buildTechnicalAnalysisPromptFromIdeation(projectDoc?.ideation ?? null)
      analysisTokensUsed += ideationTokens
      const treeResult = await analyzeRepositoryStructureWithTreeSitter(
        repository.owner,
        repository.name,
        projectId,
        { technicalPrompt: technicalPrompt || undefined, repoFiles: files }
      )
      const { totalTokens: treeTokens, ...analysisForDb } = treeResult
      analysisTokensUsed += treeTokens ?? 0
      repositoryAnalysis = analysisForDb
    } catch (treeErr) {
      console.warn('Main analysis: tree-sitter repository analysis failed (falling back to basic structure only):', treeErr)
    }

    try {
      console.log('Creating or replacing analysis document...');
      const analysisDoc = {
        projectId: projectObjectId,
        stages: [
          { name: 'Repository Analysis', status: 'in-progress', progress: 0 },
          { name: 'Code Structure Analysis', status: 'pending', progress: 0 },
          { name: 'Feature Mapping', status: 'pending', progress: 0 }
        ],
        repositoryStructure: {
          files: files.map(f => ({
            path: f.path,
            type: f.type,
            language: f.path.split('.').pop() || 'unknown'
          })),
          totalFiles: files.length,
          languages: getLanguageStats(files)
        },
        codeStructure: {
          fileCount: files.length,
          directoryStructure: files.map(f => f.path),
          mainLanguages: getLanguageStats(files),
          components: Array.isArray(repositoryAnalysis?.components) ? repositoryAnalysis.components : [],
          features: Array.isArray(repositoryAnalysis?.features) ? repositoryAnalysis.features : []
        },
        // New: sandbox-style tree-sitter analysis + structured JSON for main GRIP
        repositoryAnalysis: repositoryAnalysis || undefined,
        metrics: {
          linesOfCode: files.reduce((acc, f) => acc + (f.content?.split('\n').length || 0), 0),
          averageFileSize: files.reduce((acc, f) => acc + (f.content?.length || 0), 0) / files.length,
          cyclomaticComplexity: 1
        },
        recommendations: [
          'Initialize project structure',
          'Set up development environment',
          'Configure testing framework',
          'Implement CI/CD pipeline'
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const analysis = await db.collection('analyses').replaceOne(
        { projectId: projectObjectId },
        analysisDoc,
        { upsert: true }
      );

      console.log('Analysis document created or replaced:', {
        id: analysis.upsertedId ?? analysis.insertedId,
        fileCount: files.length,
        languages: Object.keys(getLanguageStats(files))
      });

      return {
        analysisId: analysis.upsertedId ?? analysis.insertedId,
        repositoryStructure: {
          files: files.map(f => f.path),
          totalFiles: files.length,
          languages: getLanguageStats(files)
        },
        totalTokens: analysisTokensUsed
      };
    } catch (dbError) {
      console.error('=== Analysis Service: Database Error ===');
      console.error('Error details:', {
        error: dbError instanceof Error ? dbError.message : dbError,
        stack: dbError instanceof Error ? dbError.stack : undefined
      });
      
      if (dbError instanceof Error && dbError.message.includes('Document failed validation')) {
        console.log('Attempting to save minimal analysis...');
        const minimalAnalysis = {
          projectId: projectObjectId,
          stages: [
            { name: 'Repository Analysis', status: 'pending', progress: 0 }
          ],
          repositoryStructure: {
            files: files.map(f => ({
              path: f.path,
              type: f.type
            })),
            totalFiles: files.length,
            languages: {}
          },
          codeStructure: {
            fileCount: files.length,
            directoryStructure: files.map(f => f.path),
            mainLanguages: {},
            components: [],
            features: []
          },
          repositoryAnalysis: repositoryAnalysis || undefined,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const analysis = await db.collection('analyses').replaceOne(
          { projectId: projectObjectId },
          minimalAnalysis,
          { upsert: true }
        );
        console.log('Minimal analysis saved:', {
          id: analysis.upsertedId ?? analysis.insertedId,
          fileCount: files.length
        });
        
        return {
          analysisId: analysis.upsertedId ?? analysis.insertedId,
          repositoryStructure: {
            files: files.map(f => f.path),
            totalFiles: files.length,
            languages: {}
          },
          totalTokens: analysisTokensUsed
        };
      }
      throw dbError;
    }
  } catch (error) {
    console.error('=== Analysis Service: Fatal Error ===');
    console.error('Error details:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context: { projectId, repository }
    });
    throw error;
  }
}

export interface ProjectAnalysis {
  projectId: ObjectId
  stages: AnalysisStage[]
  codeStructure: {
    fileCount: number
    directoryStructure: string[]
    mainLanguages: { [key: string]: number }
    components: any[]
    features: any[]
  }
  dependencies: {
    [key: string]: string
  }
  complexity: {
    linesOfCode: number
    averageFileSize: number
    cyclomaticComplexity: number
  }
  featureMapping: {
    matchedFeatures: any[]
    potentialIntegrations: any[]
    technicalRequirements: any[]
  }
  securityIssues: string[]
  recommendations: string[]
  chatContext: string
  createdAt: Date
  updatedAt: Date
}

export interface ProjectIdeation {
  goals: string
  targetAudience: string
  keyFeatures: string
  technicalRequirements: string
}

/**
 * Get analysis data for a project with caching and rate limiting
 */
export async function getProjectAnalysis(projectId: string): Promise<ProjectAnalysis | null> {
  try {
    // Check rate limit
    const now = Date.now()
    const userRequests = requestCounts.get(projectId)
    
    if (userRequests) {
      if (now - userRequests.timestamp > RATE_LIMIT_WINDOW) {
        // Reset if window expired
        requestCounts.set(projectId, { count: 1, timestamp: now })
      } else if (userRequests.count >= MAX_REQUESTS_PER_WINDOW) {
        throw new Error('Rate limit exceeded. Please try again later.')
      } else {
        // Increment request count
        userRequests.count++
      }
    } else {
      // Initialize request count
      requestCounts.set(projectId, { count: 1, timestamp: now })
    }

    // Check cache first
    const cached = analysisCache.get(projectId)
    if (cached && now - cached.timestamp < CACHE_TTL) {
      console.log(`Cache hit for analysis ${projectId}`)
      return cached.data
    }

    console.log(`Fetching analysis data for project ${projectId}`)
    const client = await clientPromise
    const db = client.db()

    const analysis = await db.collection<ProjectAnalysis>('analyses').findOne({
      projectId: new ObjectId(projectId)
    })

    // Update cache
    analysisCache.set(projectId, {
      data: analysis,
      timestamp: now
    })

    return analysis
  } catch (error) {
    console.error('Error getting project analysis:', error)
    // Attempt recovery
    try {
      // Clear potentially corrupted cache entry
      analysisCache.delete(projectId)
      // Retry once
      const client = await clientPromise
      const db = client.db()
      return await db.collection<ProjectAnalysis>('analyses').findOne({
        projectId: new ObjectId(projectId)
      })
    } catch (retryError) {
      console.error('Recovery attempt failed:', retryError)
      throw error
    }
  }
}

export function generateInitialAnalysis(ideation: ProjectIdeation, projectId: string): ProjectAnalysis {
  return {
    projectId: new ObjectId(projectId), // Convert string ID to ObjectId
    stages: [
      { name: 'Repository Cloning', status: 'pending', progress: 0 },
      { name: 'Code Structure Analysis', status: 'pending', progress: 0 },
      { name: 'Feature Mapping', status: 'pending', progress: 0 },
      { name: 'Integration Planning', status: 'pending', progress: 0 }
    ],
    codeStructure: {
      fileCount: 0,
      directoryStructure: [],
      mainLanguages: {},
      components: [],
      features: []
    },
    dependencies: {},
    complexity: {
      linesOfCode: 0,
      averageFileSize: 0,
      cyclomaticComplexity: 0
    },
    featureMapping: {
      matchedFeatures: [],
      potentialIntegrations: [],
      technicalRequirements: []
    },
    securityIssues: [],
    recommendations: [
      `Based on the technical requirements (${ideation.technicalRequirements}), consider setting up:`,
      '- Development environment configuration',
      '- CI/CD pipeline',
      '- Testing framework',
      '- Documentation structure'
    ],
    chatContext: '',
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

export function generateProjectContext(ideation: ProjectIdeation, analysis?: ProjectAnalysis): string {
  return `
Project Context:
Goals: ${ideation.goals}
Target Audience: ${ideation.targetAudience}
Key Features: ${ideation.keyFeatures}
Technical Requirements: ${ideation.technicalRequirements}

${analysis ? `
Analysis:
- Main Languages: ${Object.keys(analysis.codeStructure?.mainLanguages || {}).join(', ')}
- Dependencies: ${Object.keys(analysis.dependencies || {}).join(', ')}
- Complexity: ${analysis.complexity?.linesOfCode || 0} lines of code
- Security Issues: ${analysis.securityIssues?.length || 0} identified
- Recommendations: ${analysis.recommendations?.join('\n  ')}
` : ''}

As the Lead Developer AI Assistant, I'll help guide this project's development with best practices and architectural decisions.
`
}

/**
 * Get project context with error handling and caching
 */
export async function getProjectContext(projectId: string): Promise<string> {
  try {
    // Check cache first
    const cached = analysisCache.get(projectId)
    if (cached?.data?.chatContext) {
      console.log(`Cache hit for project context ${projectId}`)
      return cached.data.chatContext
    }

    console.log(`Fetching project context for ${projectId}`)
    const response = await fetch(`/api/projects/${projectId}/context`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch project context: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Update cache if we have analysis data
    const cachedAnalysis = analysisCache.get(projectId)
    if (cachedAnalysis?.data) {
      cachedAnalysis.data.chatContext = data.context
    }
    
    return data.context
  } catch (error) {
    console.error('Error getting project context:', error)
    // Attempt recovery
    try {
      // Try to get context from analysis cache
      const cached = analysisCache.get(projectId)
      if (cached?.data?.chatContext) {
        return cached.data.chatContext
      }
      throw error
    } catch (retryError) {
      console.error('Recovery attempt failed:', retryError)
      throw error
    }
  }
}

export async function initializeAnalysis(projectId: string, files: RepositoryFile[]) {
  try {
    const projectObjectId = new ObjectId(projectId)
    const client = await clientPromise
    const db = client.db()

    const analysis = await db.collection('analysis').insertOne({
      projectId: projectObjectId,
      stages: [
        { name: 'Repository Analysis', status: 'in-progress', progress: 0 },
        { name: 'Code Structure Analysis', status: 'pending', progress: 0 },
        { name: 'Feature Mapping', status: 'pending', progress: 0 }
      ],
      repositoryStructure: {
        files: files.map((f: RepositoryFile) => ({
          path: f.path,
          type: f.type,
          language: f.path.split('.').pop() || 'unknown'
        })),
        totalFiles: files.length,
        languages: getLanguageStats(files)
      },
      codeStructure: {
        fileCount: 0,
        directoryStructure: [],
        mainLanguages: {},
        components: [],
        features: []
      } as CodeStructure,
      recommendations: [],
      createdAt: new Date(),
      updatedAt: new Date()
    })

    return {
      analysisId: analysis.insertedId,
      repositoryStructure: {
        files: files.map((f: RepositoryFile) => f.path),
        totalFiles: files.length,
        languages: getLanguageStats(files)
      }
    }
  } catch (error) {
    console.error('Analysis error:', error)
    throw error
  }
}
