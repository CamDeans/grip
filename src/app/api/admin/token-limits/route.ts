import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import { getTokenLimits, setTokenLimits } from '@/lib/tokenUsage'

/** GET /api/admin/token-limits — get admin and valued-tester token allowances (admin only). */
export async function GET() {
  const session = await getServerAuthSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const limits = await getTokenLimits()
    return NextResponse.json(limits)
  } catch (e) {
    console.error('Token limits GET error:', e)
    return NextResponse.json({ error: 'Failed to get token limits' }, { status: 500 })
  }
}

/** PATCH /api/admin/token-limits — update admin and/or valued-tester token allowances (admin only). */
export async function PATCH(request: NextRequest) {
  const session = await getServerAuthSession()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await request.json().catch(() => ({})) as {
      adminTokenAllowance?: number
      valuedTesterTokenAllowance?: number
    }
    const updates: { adminTokenAllowance?: number; valuedTesterTokenAllowance?: number } = {}
    if (typeof body.adminTokenAllowance === 'number' && body.adminTokenAllowance >= 0) {
      updates.adminTokenAllowance = body.adminTokenAllowance
    }
    if (typeof body.valuedTesterTokenAllowance === 'number' && body.valuedTesterTokenAllowance >= 0) {
      updates.valuedTesterTokenAllowance = body.valuedTesterTokenAllowance
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid limits to update' }, { status: 400 })
    }
    await setTokenLimits(updates)
    const limits = await getTokenLimits()
    return NextResponse.json(limits)
  } catch (e) {
    console.error('Token limits PATCH error:', e)
    return NextResponse.json({ error: 'Failed to update token limits' }, { status: 500 })
  }
}
