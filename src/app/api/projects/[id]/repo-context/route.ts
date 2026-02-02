import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { getOrBuildRepoContextDocument } from '@/lib/services/repoContextService'

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
