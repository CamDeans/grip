import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { clientPromise } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Loading analysis for project:', id)
    const client = await clientPromise
    const db = client.db()

    const project = await db.collection('projects').findOne({
      _id: new ObjectId(id)
    })

    if (!project) {
      console.log('Project not found for analysis:', id)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Transform the analysis data into the expected format
    const transformedAnalysis = {
      repositoryStructure: {
        totalFiles: project.analysis.fileCount,
        languages: Object.entries(project.analysis.mainLanguages).reduce((acc, [key, value]) => {
          if (key === 'lua') {
            acc[key] = value as number
          }
          return acc
        }, {} as Record<string, number>),
        files: project.analysis.directoryStructure
      },
      fileCount: project.analysis.fileCount,
      directoryStructure: project.analysis.directoryStructure,
      mainLanguages: project.analysis.mainLanguages,
      components: project.analysis.components,
      features: project.analysis.features
    }

    console.log('Transformed analysis:', transformedAnalysis)
    return NextResponse.json({ 
      analysis: transformedAnalysis
    })
  } catch (error) {
    console.error('Error loading analysis:', error)
    return NextResponse.json(
      { error: 'Failed to load analysis' },
      { status: 500 }
    )
  }
}
