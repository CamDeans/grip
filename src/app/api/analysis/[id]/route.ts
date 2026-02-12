import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import clientPromise from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Phase 2, Step 3: Create Analysis Data Fetcher

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401 }
      )
    }

    const { id } = await params

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid project ID format' }),
        { status: 400 }
      )
    }

    // Connect to database
    const client = await clientPromise
    const db = client.db('test')

    // First check if project exists
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(id)
    })

    if (!project) {
      return new NextResponse(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404 }
      )
    }

    // Load analysis from analyses (main) or analysis (legacy) so UI and enhanced-chat use same source
    let analysis = await db.collection('analyses').findOne({
      projectId: new ObjectId(id)
    })
    if (!analysis) {
      analysis = await db.collection('analysis').findOne({
        projectId: new ObjectId(id)
      })
    }
    if (!analysis && (project as { analysis?: unknown }).analysis) {
      analysis = (project as { analysis: unknown }).analysis as Record<string, unknown>
    }

    if (!analysis) {
      return NextResponse.json({
        projectId: id,
        status: 'not_analyzed',
        repository: project.repository || null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    return NextResponse.json(analysis)
  } catch (error: any) {
    console.error('Error loading analysis:', error)
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Something went wrong' }),
      { status: 500 }
    )
  }
}