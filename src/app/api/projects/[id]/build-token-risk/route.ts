import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { getAppAccess, requireAppAccess } from '@/lib/access'
import { getFilesToGenerate } from '@/lib/services/projectPlanningService'
import { ObjectId } from 'mongodb'

/**
 * GET /api/projects/[id]/build-token-risk
 * Returns whether this build is at risk of running out of tokens (mandatory concrete rule:
 * warn user before run and allow continue; if we run out mid-build, pause and show add/upgrade modal).
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

    const access = await getAppAccess(session)
    const allowance = access.tokenAllowance ?? 0
    const used = access.tokensUsedThisPeriod ?? 0
    const remainingTokens = Math.max(0, allowance - used)
    const tier = (access.tier ?? 'starter').toLowerCase()
    const isAdmin = access.isAdmin === true

    const upgradeSuggestions: { action: 'upgrade' | 'add_tokens'; targetTier?: string; label: string }[] = []
    if (!isAdmin && tier === 'starter') {
      upgradeSuggestions.push({ action: 'upgrade', targetTier: 'pro', label: 'Upgrade to Pro (3.5M tokens/month)' })
      upgradeSuggestions.push({ action: 'upgrade', targetTier: 'team', label: 'Upgrade to Team (7M tokens/month)' })
      upgradeSuggestions.push({ action: 'add_tokens', label: 'Add more tokens to this period' })
    } else if (!isAdmin && tier === 'pro') {
      upgradeSuggestions.push({ action: 'upgrade', targetTier: 'team', label: 'Upgrade to Team (7M tokens/month)' })
      upgradeSuggestions.push({ action: 'add_tokens', label: 'Add more tokens to this period' })
    } else if (!isAdmin && tier === 'team') {
      upgradeSuggestions.push({ action: 'add_tokens', label: 'Add more tokens to this period' })
    }

    let fileCount = 0
    try {
      const filesToGenerate = await getFilesToGenerate(id)
      fileCount = Array.isArray(filesToGenerate) ? filesToGenerate.length : 0
    } catch {
      // use 0 if we can't get count
    }

    // Conservative estimate so the token-risk modal reliably warns users (GRIP uses full context; no tier caps).
    // Plan + analysis context can be large; each file gen uses full scope; build/fix may retry.
    const ESTIMATE_PLAN_AND_ANALYSIS = 180_000
    const ESTIMATE_PER_FILE = 35_000
    const ESTIMATE_BUFFER = 120_000
    const estimatedNeeded = ESTIMATE_PLAN_AND_ANALYSIS + ESTIMATE_PER_FILE * Math.max(fileCount, 1) + ESTIMATE_BUFFER
    // Also warn when balance is below this (mandatory: user must be informed before GRIP runs).
    const WARN_WHEN_REMAINING_BELOW = 450_000
    const atRisk =
      allowance > 0 &&
      (remainingTokens < estimatedNeeded || remainingTokens < WARN_WHEN_REMAINING_BELOW)
    const message = atRisk
      ? `This build may use around ${estimatedNeeded.toLocaleString()} tokens (plan + ${fileCount} files + build). You have ${remainingTokens.toLocaleString()} remaining. You may run out and need to add tokens or upgrade to complete the build.`
      : undefined

    return NextResponse.json({
      atRisk: !!atRisk,
      remainingTokens,
      estimatedNeeded,
      fileCount,
      tier,
      upgradeSuggestions,
      message,
    })
  } catch (error) {
    console.error('[build-token-risk]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get token risk' },
      { status: 500 }
    )
  }
}
