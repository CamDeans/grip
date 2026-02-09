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
    const db = client.db()

    const project = await db.collection('projects').findOne({
      _id: new ObjectId(id),
      userId: session.user.id
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({
      hasAnalysis: !!project.analysis,
      analysis: project.analysis || null,
      analysisCompleted: project.analysisCompleted || false
    })
  } catch (error) {
    console.error('Error checking analysis status:', error)
    return NextResponse.json(
      { error: 'Failed to check analysis status' },
      { status: 500 }
    )
  }
}
