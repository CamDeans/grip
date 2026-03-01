import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getProjectPlan } from '@/lib/services/projectPlanningService'
import { syncProjectStateFromPlan } from '@/lib/services/projectStateService'
import { ObjectId } from 'mongodb'
import { gripLog } from '@/lib/gripLogger'

/**
 * POST /api/projects/[id]/plan/sync-state
 * Sync project state (phases/steps) from the current development plan.
 * Use this for projects created before plan→state sync was added.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    console.info('[GRIP Stage 3] plan/sync-state start', { projectId: id })
    const planResult = await getProjectPlan(id)
    if (!planResult?.plan) {
      gripLog(3, 'plan/sync-state no plan found', { projectId: id })
      console.warn('[GRIP Stage 3] plan/sync-state no plan found', { projectId: id })
      return NextResponse.json(
        { error: 'No plan found. Generate a plan first from the Planning tab.' },
        { status: 404 }
      )
    }

    const ok = await syncProjectStateFromPlan(id, planResult.plan)
    if (!ok) {
      gripLog(3, 'plan/sync-state syncProjectStateFromPlan returned false', { projectId: id })
      console.error('[GRIP Stage 3] plan/sync-state syncProjectStateFromPlan returned false', { projectId: id })
      return NextResponse.json(
        { error: 'Failed to sync project state from plan' },
        { status: 500 }
      )
    }

    console.info('[GRIP Stage 3] plan/sync-state complete', { projectId: id })
    gripLog(3, 'plan/sync-state complete', { projectId: id })
    return NextResponse.json({
      success: true,
      message: 'Build steps synced from plan. Chat and project state now use the same phases.',
    })
  } catch (error) {
    gripLog(3, 'plan/sync-state error', { error: error instanceof Error ? error.message : String(error) })
    console.error('[GRIP Stage 3] plan/sync-state error:', error)
    return NextResponse.json(
      { error: 'Failed to sync project state' },
      { status: 500 }
    )
  }
}
