import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import clientPromise from '@/lib/db'

/** GET /api/admin/system-health — DB, APIs health (admin only). Email admin on failure via cron or on-demand. */
export async function GET() {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const checks: { name: string; status: 'ok' | 'error'; message?: string; latencyMs?: number }[] = []
    let overallOk = true

    const t0 = Date.now()
    try {
      const client = await clientPromise
      const db = client.db(process.env.MONGODB_DB_NAME || 'test')
      await db.command({ ping: 1 })
      checks.push({ name: 'MongoDB', status: 'ok', latencyMs: Date.now() - t0 })
    } catch (e) {
      overallOk = false
      checks.push({ name: 'MongoDB', status: 'error', message: e instanceof Error ? e.message : 'Unknown' })
    }

    const t1 = Date.now()
    try {
      const r = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/health`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      checks.push({ name: 'App API', status: 'ok', latencyMs: Date.now() - t1 })
    } catch (e) {
      overallOk = false
      checks.push({ name: 'App API', status: 'error', message: e instanceof Error ? e.message : 'Unknown' })
    }

    if (process.env.ANTHROPIC_API_KEY) {
      const t2 = Date.now()
      try {
        const r = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/health/anthropic`)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        checks.push({ name: 'GRIP AI', status: 'ok', latencyMs: Date.now() - t2 })
      } catch (e) {
        overallOk = false
        checks.push({ name: 'GRIP AI', status: 'error', message: e instanceof Error ? e.message : 'Unknown' })
      }
    }

    return NextResponse.json({ ok: overallOk, checks })
  } catch (e) {
    console.error('System health error:', e)
    return NextResponse.json({ error: 'Failed to run health checks' }, { status: 500 })
  }
}
