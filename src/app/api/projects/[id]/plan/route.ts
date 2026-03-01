import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireAppAccess, requireTokenBalance, getAppAccess } from '@/lib/access'
import { addTokenUsage } from '@/lib/tokenUsage'
import { buildTokenBudgetPromptFragment } from '@/lib/constants/tokenBudgetPlan'
import { generateProjectPlan, getProjectPlan } from '@/lib/services/projectPlanningService'
import { ObjectId } from 'mongodb'
import clientPromise, { DB_NAME } from '@/lib/db'
import { gripLog } from '@/lib/gripLogger'

/**
 * GET /api/projects/[id]/plan
 * Get a project's planning data (works for both main and sandbox projects)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params;

    // Validate id
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    // Check if this is a sandbox project
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const sandboxProject = await db.collection('sandboxProjects').findOne({
      _id: new ObjectId(id)
    })

    if (sandboxProject) {
      // Get sandbox plan
      const sandboxPlan = await db.collection('legalSandboxPlans').findOne({
        projectId: new ObjectId(id)
      })
      if (sandboxPlan?.plan) {
        // Convert to main plan format for compatibility
        return NextResponse.json({
          plan: {
            phases: sandboxPlan.plan.phases || [],
          },
          structure: null,
          dependencyTree: null,
        })
      }
      // No plan yet — return 200 with empty so overview doesn't log 404
      return NextResponse.json({ plan: null, phases: [] })
    }

    // Get the project plan for main projects
    const plan = await getProjectPlan(id)

    if (!plan) {
      // No plan yet — return 200 with empty so overview doesn't log 404
      return NextResponse.json({ plan: null, phases: [] })
    }

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error fetching project plan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project plan' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/projects/[id]/plan
 * Generate a project plan
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

    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const accessDenied = await requireAppAccess(session)
    if (accessDenied) {
      console.warn('[GRIP Plan] POST /plan blocked: requireAppAccess denied (403). Anthropic will not be called.')
      return accessDenied
    }
    const tokenExhausted = await requireTokenBalance(session)
    if (tokenExhausted) {
      console.warn('[GRIP Plan] POST /plan blocked: requireTokenBalance denied (403). Anthropic will not be called.')
      return tokenExhausted
    }

    const access = await getAppAccess(session)
    const remainingTokens = Math.max(0, (access.tokenAllowance ?? 0) - (access.tokensUsedThisPeriod ?? 0))
    const tokenBudgetHint = buildTokenBudgetPromptFragment(remainingTokens, access.tier ?? 'starter', 'plan')

    console.info('[GRIP Stage 3] plan POST start', { projectId: id })
    console.info('[GRIP Plan] Calling generateProjectPlan (Anthropic will be used for plan phases). Ensure ANTHROPIC_API_KEY is set in .env.local or deployment env.')
    const result = await generateProjectPlan(id, { tokenBudgetHint, tier: access.tier ?? 'starter' })
    const totalTokens = (result as { totalTokens?: number }).totalTokens ?? 0
    console.info('[GRIP Stage 3] plan POST complete', { projectId: id, totalTokens })
    gripLog(3, 'plan POST complete', { projectId: id, totalTokens })
    if (totalTokens > 0 && session.user?.id) {
      await addTokenUsage(session.user.id, totalTokens).catch((err) =>
        console.warn('Project plan: failed to record token usage', err)
      )
    }

    const { totalTokens: _drop, ...plan } = result as { totalTokens?: number; [k: string]: unknown }
    return NextResponse.json(plan)
  } catch (error) {
    gripLog(3, 'plan POST error', { error: error instanceof Error ? error.message : String(error) })
    console.error('[GRIP Stage 3] plan POST error:', error)
    return NextResponse.json(
      { error: 'Failed to generate project plan' },
      { status: 500 }
    )
  }
} 