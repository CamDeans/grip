import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { getAppAccess } from '@/lib/access'

/** GET /api/me/access — current user's app access and token usage (for dashboard UI). */
export async function GET() {
  const session = await getServerAuthSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const access = await getAppAccess(session)
  return NextResponse.json({
    ...access,
    subscriptionPeriodEnd: access.subscriptionPeriodEnd?.toISOString() ?? null,
  })
}
