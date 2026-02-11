import { NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { isAdminUser } from '@/lib/utils/auth'
import clientPromise from '@/lib/db'

/** GET /api/admin/reports — data for tax reports: revenue events, payouts (admin only) */
export async function GET() {
  try {
    const session = await getServerAuthSession()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminUser(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME || 'test')

    const revenueEvents = await db.collection('revenue_events').find({}).sort({ createdAt: 1 }).toArray()
    const payouts = await db.collection('payouts').find({}).sort({ createdAt: 1 }).toArray()

    const totalRevenueCents = revenueEvents
      .filter((e: { type?: string }) => e.type === 'invoice_paid' || e.type === 'subscription_started')
      .reduce((sum: number, e: { amountCents?: number }) => sum + (e.amountCents || 0), 0)
    const totalPayoutCents = payouts
      .filter((p: { status?: string }) => p.status === 'closed')
      .reduce((sum: number, p: { amountCents?: number }) => sum + (p.amountCents || 0), 0)

    return NextResponse.json({
      revenueEvents,
      payouts,
      summary: {
        totalRevenueCents,
        totalPayoutCents,
        totalRevenueDollars: (totalRevenueCents / 100).toFixed(2),
        totalPayoutDollars: (totalPayoutCents / 100).toFixed(2),
      },
    })
  } catch (e) {
    console.error('Admin reports error:', e)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}
