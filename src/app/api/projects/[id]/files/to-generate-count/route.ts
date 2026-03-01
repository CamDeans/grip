import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { requireAppAccess } from '@/lib/access'
import { getFilesToGenerate } from '@/lib/services/projectPlanningService'
import { ObjectId } from 'mongodb'

/**
 * GET /api/projects/[id]/files/to-generate-count
 * Returns the number of files that will be generated (same source as files/generate).
 * Used by the Overview in-flight modal to show an accurate total before the stream starts.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const appDenied = await requireAppAccess(session)
    if (appDenied) return appDenied

    const { id } = await params
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const filesToGenerate = await getFilesToGenerate(id)
    const count = Array.isArray(filesToGenerate) ? filesToGenerate.length : 0

    return NextResponse.json({ count })
  } catch (error) {
    console.error('[files/to-generate-count]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get file count' },
      { status: 500 }
    )
  }
}
