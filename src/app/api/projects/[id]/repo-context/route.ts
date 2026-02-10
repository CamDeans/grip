import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { getOrBuildRepoContextDocument } from '@/lib/services/repoContextService'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

/**
 * GET /api/projects/[id]/repo-context
 * Returns whether the project has repo context built (so UI can show "In GRIP context: Yes").
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    if (!projectId) {
      return NextResponse.json({ error: 'Missing project ID' }, { status: 400 })
    }

    const analysis = await (await clientPromise).db('test').collection('analyses').findOne(
      { projectId: new ObjectId(projectId) },
      { projection: { projectContextDocument: 1 } }
    ) as { projectContextDocument?: string } | null

    const hasDocument = !!(analysis?.projectContextDocument && analysis.projectContextDocument.length > 0)

    return NextResponse.json({
      hasDocument,
      length: analysis?.projectContextDocument?.length ?? 0,
    })
  } catch (error) {
    console.error('Repo context GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get repo context status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects/[id]/repo-context
 * Build or refresh the repo reference document for this project (from stored repo in DB).
 * Call after cloning a repo so the document is ready at chat start.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    if (!projectId) {
      return NextResponse.json({ error: 'Missing project ID' }, { status: 400 })
    }

    const doc = await getOrBuildRepoContextDocument(projectId)

    return NextResponse.json({
      success: true,
      hasDocument: doc.length > 0,
      length: doc.length,
    })
  } catch (error) {
    console.error('Repo context build error:', error)
    return NextResponse.json(
      { error: 'Failed to build repo context document' },
      { status: 500 }
    )
  }
}
