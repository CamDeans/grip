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

    const client = await clientPromise
    const db = client.db('test')

    // Check if this is a sandbox project
    const sandboxProject = await db.collection('sandboxProjects').findOne({
      _id: new ObjectId(id),
      userId: session.user.id
    })

    if (sandboxProject) {
      // Check sandboxAnalyses collection
      const sandboxAnalysis = await db.collection('sandboxAnalyses').findOne({
        projectId: new ObjectId(id)
      })
      return NextResponse.json({
        hasAnalysis: !!sandboxAnalysis?.repositoryAnalysis,
        analysis: sandboxAnalysis?.repositoryAnalysis || null,
        analysisCompleted: !!sandboxAnalysis?.repositoryAnalysis,
      })
    }

    // Check main projects
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(id),
      userId: session.user.id
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check analyses collection for main projects
    const analysis = await db.collection('analyses').findOne({
      projectId: new ObjectId(id)
    })

    return NextResponse.json({
      hasAnalysis: !!analysis?.repositoryAnalysis || !!project.analysis,
      analysis: analysis?.repositoryAnalysis || project.analysis || null,
      analysisCompleted: !!analysis?.repositoryAnalysis || !!project.analysisCompleted || false
    })
  } catch (error) {
    console.error('Error checking analysis status:', error)
    return NextResponse.json(
      { error: 'Failed to check analysis status' },
      { status: 500 }
    )
  }
}
