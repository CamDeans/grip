import { getServerAuthSession } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { clientPromise } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { analyzeRepository } from '@/lib/ai'

export async function POST(req: Request) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, owner, repo } = await req.json()
    console.log('Starting analysis for:', { owner, repo, projectId })

    const client = await clientPromise
    const db = client.db()

    // Check if recent analysis exists
    const existingAnalysis = await db.collection('analyses').findOne({
      projectId: new ObjectId(projectId),
      createdAt: { 
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    })

    if (existingAnalysis) {
      console.log('Found recent analysis, skipping')
      return NextResponse.json({
        analysis: existingAnalysis.analysis,
        status: 'completed'
      })
    }

    // Get repository files
    const repository = await db.collection('repositories').findOne({
      projectId: new ObjectId(projectId)
    })

    if (!repository) {
      throw new Error('Repository not found')
    }

    // Generate repository content string for analysis
    const repoContent = repository.files.map((file: any) => 
      `File: ${file.path}\n${file.content}\n---\n`
    ).join('\n')

    // Perform analysis
    console.log('Analyzing repository content')
    const analysis = await analyzeRepository(repoContent)

    // Save analysis results
    await db.collection('analyses').insertOne({
      projectId: new ObjectId(projectId),
      analysis,
      status: 'completed',
      createdAt: new Date(),
      repository: {
        owner,
        repo
      }
    })

    console.log('Analysis completed')
    console.log('Analysis saved to database')

    // Update project status
    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { 
        $set: { 
          status: 'analysis_completed',
          lastAnalysis: new Date()
        }
      }
    )

    return NextResponse.json({
      analysis,
      status: 'completed'
    })
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze repository' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    console.log('\n=== BACKEND LOGS ===');
    console.log('Timestamp:', new Date().toISOString());
    
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    console.log('Request received:', {
      endpoint: '/api/analysis',
      method: 'GET',
      projectId
    });

    if (!projectId) {
      console.error('Error: Project ID is missing in request');
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db('test') // Explicitly use 'test' database
    console.log('Database connection:', {
      name: db.databaseName,
      status: 'connected'
    });

    // Convert projectId to ObjectId
    const projectObjectId = new ObjectId(projectId)
    console.log('Project ID conversion:', {
      original: projectId,
      objectId: projectObjectId.toString()
    });

    // First check the test.analyses collection
    const testAnalysis = await db.collection('analyses').findOne({
      projectId: projectObjectId
    });
    console.log('Test analyses check:', {
      found: !!testAnalysis,
      collection: 'test.analyses'
    });

    // If not found in test.analyses, check projects collection as fallback
    const project = !testAnalysis ? await db.collection('projects').findOne(
      { _id: projectObjectId },
      { projection: { analysis: 1 } }
    ) : null;
    console.log('Project check:', {
      found: !!project,
      hasAnalysis: !!project?.analysis,
      collection: 'projects'
    });

    // Get analysis data from the appropriate source
    let analysisData = testAnalysis || project?.analysis;
    let source = testAnalysis ? 'test.analyses' : project?.analysis ? 'projects' : null;

    console.log('Analysis data source:', {
      source,
      found: !!analysisData
    });

    if (!analysisData) {
      console.error('Error: No analysis data found in any location', {
        projectId,
        checkedLocations: ['test.analyses', 'projects']
      });
      return NextResponse.json(
        { error: 'No analysis data found' },
        { status: 404 }
      )
    }

    // Log the structure of the found data
    console.log('Raw analysis data structure:', {
      keys: Object.keys(analysisData),
      hasRepositoryStructure: !!analysisData.repositoryStructure,
      hasFiles: !!analysisData.files,
      hasLanguages: !!analysisData.languages,
      hasTotalFiles: typeof analysisData.totalFiles !== 'undefined'
    });

    // Format the response data
    const responseData = {
      repositoryStructure: {
        totalFiles: analysisData.codeStructure?.fileCount || analysisData.repositoryStructure?.totalFiles || 0,
        languages: analysisData.codeStructure?.mainLanguages || analysisData.repositoryStructure?.languages || {},
        files: analysisData.codeStructure?.directoryStructure || analysisData.repositoryStructure?.files || []
      },
      stages: analysisData.stages || [],
      codeStructure: analysisData.codeStructure || {},
      recommendations: analysisData.recommendations || [],
      createdAt: analysisData.createdAt,
      updatedAt: analysisData.updatedAt
    }
    
    console.log('Response prepared:', {
      keys: Object.keys(responseData),
      repositoryStructure: {
        totalFiles: responseData.repositoryStructure.totalFiles,
        languageCount: Object.keys(responseData.repositoryStructure.languages).length,
        fileCount: responseData.repositoryStructure.files.length
      },
      stages: responseData.stages.length,
      hasRecommendations: responseData.recommendations.length > 0
    });
    
    console.log('=== END BACKEND LOGS ===\n');
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('\n=== BACKEND ERROR LOGS ===');
    console.error('Error in analysis GET endpoint:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
    
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    console.error('=== END BACKEND ERROR LOGS ===\n');
    return NextResponse.json(
      { error: 'Failed to fetch analysis data' },
      { status: 500 }
    )
  }
}
